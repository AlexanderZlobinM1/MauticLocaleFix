<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\EventListener;

use Mautic\CoreBundle\CoreEvents;
use Mautic\CoreBundle\Event\CustomAssetsEvent;
use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class AssetSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private IntegrationHelper $integrationHelper,
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
        $integration = $this->getReadyIntegration();
        if (!$integration instanceof MauticLocaleFixIntegration || !$integration->isCalendarFixEnabled()) {
            return;
        }

        $config = [
            'calendarEnabled' => true,
            'weekStart'       => $integration->getCalendarWeekStart(),
        ];

        $event->addScriptDeclaration(
            'window.MauticLocaleFixConfig = '.json_encode(
                $config,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
            ).';'
        );
        $event->addScript('plugins/MauticLocaleFixBundle/Assets/js/locale-fix.js');
    }

    private function getReadyIntegration(): ?MauticLocaleFixIntegration
    {
        $integration = $this->integrationHelper->getIntegrationObject(MauticLocaleFixIntegration::NAME);
        if (!$integration instanceof MauticLocaleFixIntegration || !$integration->isConfigured()) {
            return null;
        }

        $settings  = $integration->getIntegrationSettings();
        $published = false;
        if (is_object($settings)) {
            if (method_exists($settings, 'isPublished')) {
                $published = (bool) $settings->isPublished();
            } elseif (method_exists($settings, 'getIsPublished')) {
                $published = (bool) $settings->getIsPublished();
            }
        }

        return $published ? $integration : null;
    }
}

