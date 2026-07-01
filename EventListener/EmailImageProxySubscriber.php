<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\EventListener;

use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class EmailImageProxySubscriber implements EventSubscriberInterface
{
    private const ORIGINAL_USER_AGENT_HEADER = 'X-Mautic-Locale-Fix-Original-User-Agent';

    private const TRACKABLE_USER_AGENT = 'Mozilla/5.0';

    public function __construct(
        private IntegrationHelper $integrationHelper,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 96],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (method_exists($event, 'isMainRequest') && !$event->isMainRequest()) {
            return;
        }

        if (method_exists($event, 'isMasterRequest') && !$event->isMasterRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!$request->isMethod('GET') || !$this->isEmailTrackingPixelPath($request->getPathInfo())) {
            return;
        }

        $userAgent = trim((string) $request->headers->get('User-Agent', ''));
        if (!$this->isGmailImageProxyUserAgent($userAgent)) {
            return;
        }

        $integration = $this->getIntegration();
        if (!$integration instanceof MauticLocaleFixIntegration ||
            !$this->isIntegrationPublished($integration) ||
            !$integration->isGmailImageProxyOpenEnabled()
        ) {
            return;
        }

        $request->headers->set(self::ORIGINAL_USER_AGENT_HEADER, $userAgent);
        $request->server->set('HTTP_'.strtoupper(str_replace('-', '_', self::ORIGINAL_USER_AGENT_HEADER)), $userAgent);
        $request->attributes->set('_mautic_locale_fix_original_user_agent', $userAgent);
        $request->headers->set('User-Agent', self::TRACKABLE_USER_AGENT);
        $request->server->set('HTTP_USER_AGENT', self::TRACKABLE_USER_AGENT);
    }

    private function isEmailTrackingPixelPath(string $path): bool
    {
        return 1 === preg_match('#^/email/[A-Za-z0-9]+\.gif$#', $path);
    }

    private function isGmailImageProxyUserAgent(string $userAgent): bool
    {
        return '' !== $userAgent && (
            false !== stripos($userAgent, 'GoogleImageProxy') ||
            false !== stripos($userAgent, 'ggpht.com') ||
            false !== stripos($userAgent, 'Gmail Image Proxy')
        );
    }

    private function getIntegration(): ?MauticLocaleFixIntegration
    {
        $integration = $this->integrationHelper->getIntegrationObject(MauticLocaleFixIntegration::NAME);
        if (!$integration instanceof MauticLocaleFixIntegration) {
            return null;
        }

        return $integration;
    }

    private function isIntegrationPublished(MauticLocaleFixIntegration $integration): bool
    {
        $settings  = $integration->getIntegrationSettings();
        $known     = false;
        $published = false;
        if (is_object($settings)) {
            if (method_exists($settings, 'isPublished')) {
                $published = (bool) $settings->isPublished();
                $known     = true;
            } elseif (method_exists($settings, 'getIsPublished')) {
                $published = (bool) $settings->getIsPublished();
                $known     = true;
            } elseif (method_exists($settings, 'getPublished')) {
                $published = (bool) $settings->getPublished();
                $known     = true;
            }
        } elseif (is_array($settings)) {
            $published = (bool) ($settings['isPublished'] ?? $settings['is_published'] ?? $settings['published'] ?? false);
            $known     = array_key_exists('isPublished', $settings) ||
                array_key_exists('is_published', $settings) ||
                array_key_exists('published', $settings);
        }

        if (!$known && method_exists($integration, 'isPublished')) {
            return (bool) $integration->isPublished();
        }

        return $published;
    }
}
