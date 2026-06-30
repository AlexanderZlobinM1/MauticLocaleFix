<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\EventListener;

use Mautic\CoreBundle\CoreEvents;
use Mautic\CoreBundle\Event\CustomAssetsEvent;
use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Mautic\CoreBundle\Helper\UserHelper;
use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class AssetSubscriber implements EventSubscriberInterface
{
    private const ASSET_VERSION = '1.0.11';

    public function __construct(
        private IntegrationHelper $integrationHelper,
        private UserHelper $userHelper,
        private CoreParametersHelper $coreParametersHelper,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            CoreEvents::VIEW_INJECT_CUSTOM_ASSETS => ['injectAssets', 0],
        ];
    }

    public function injectAssets(CustomAssetsEvent $event): void
    {
        $integration = $this->getIntegration();
        if (!$integration instanceof MauticLocaleFixIntegration) {
            return;
        }

        $published                 = $this->isIntegrationPublished($integration);
        $calendarEnabled           = $published && $integration->isCalendarFixEnabled();
        $campaignDateTimeUtcSubmit = $published && $integration->isCampaignDateTimeUtcSubmitEnabled();

        $config = [
            'enabled'                   => $published,
            'calendarEnabled'           => $calendarEnabled,
            'locale'                    => $this->getCurrentLocale(),
            'weekStart'                 => $integration->getCalendarWeekStart(),
            'dateFormat'                => $integration->getCalendarDateFormat(),
            'mauticTimezone'            => $this->getMauticTimezone(),
            'campaignDateTimeUtcSubmit' => $campaignDateTimeUtcSubmit,
        ];

        $event->addScriptDeclaration(
            'window.MauticLocaleFixConfig = '.json_encode(
                $config,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
            ).';'
        );
        $event->addScript(
            'plugins/MauticLocaleFixBundle/Assets/js/locale-fix.js?v='.self::ASSET_VERSION,
            'head',
            false,
            'mauticlocalefix-locale-fix'
        );
    }

    private function getIntegration(): ?MauticLocaleFixIntegration
    {
        $integration = $this->integrationHelper->getIntegrationObject(MauticLocaleFixIntegration::NAME);
        if (!$integration instanceof MauticLocaleFixIntegration || !$integration->isConfigured()) {
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

    private function getCurrentLocale(): string
    {
        $user   = $this->userHelper->getUser(true);
        $locale = null !== $user && method_exists($user, 'getLocale') ? trim((string) $user->getLocale()) : '';

        if ('' === $locale) {
            $locale = trim((string) $this->coreParametersHelper->get('locale', ''));
        }

        return '' !== $locale ? $locale : 'en_US';
    }

    private function getMauticTimezone(): string
    {
        $timezone = trim((string) $this->coreParametersHelper->get('default_timezone', ''));

        return '' !== $timezone ? $timezone : trim((string) date_default_timezone_get());
    }
}
