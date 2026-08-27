<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\EventListener;

use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticLocaleFixBundle\Helper\SearchFilterNormalizer;
use MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Contracts\Translation\TranslatorInterface;

final class ImportSearchSubscriber implements EventSubscriberInterface
{
    private const SEARCH_COMMANDS = [
        'import_id'     => 'mautic.lead.lead.searchcommand.import_id',
        'import_action' => 'mautic.lead.lead.searchcommand.import_action',
    ];

    public function __construct(
        private IntegrationHelper $integrationHelper,
        private TranslatorInterface $translator,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        // Run after Symfony has selected the current user's locale and before the controller reads the search query.
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 0],
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
        if (!$request->isMethod('GET') || !$request->query->has('search')) {
            return;
        }

        $integration = $this->integrationHelper->getIntegrationObject(MauticLocaleFixIntegration::NAME);
        if (!$integration instanceof MauticLocaleFixIntegration || !$this->isIntegrationPublished($integration)) {
            return;
        }

        $search = $request->query->get('search');
        if (!is_string($search) || '' === trim($search)) {
            return;
        }

        $localizedCommands = [];
        foreach (self::SEARCH_COMMANDS as $canonical => $translationKey) {
            $localizedCommands[$canonical] = $this->translator->trans($translationKey);
        }

        $normalized = (new SearchFilterNormalizer())->normalize($search, $localizedCommands);
        if ($normalized !== $search) {
            $request->query->set('search', $normalized);
        }
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
