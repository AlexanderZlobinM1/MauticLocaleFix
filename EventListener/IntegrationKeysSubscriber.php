<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\EventListener;

use Mautic\PluginBundle\Event\PluginIntegrationKeyEvent;
use Mautic\PluginBundle\PluginEvents;
use MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class IntegrationKeysSubscriber implements EventSubscriberInterface
{
    private const ENABLED_VALUE = 'enabled';

    private const DISABLED_VALUE = 'disabled';

    private const TOGGLE_FIELDS = [
        MauticLocaleFixIntegration::CALENDAR_ENABLED_FIELD,
        MauticLocaleFixIntegration::CAMPAIGN_DATETIME_UTC_SUBMIT_FIELD,
        MauticLocaleFixIntegration::GMAIL_IMAGE_PROXY_OPEN_FIELD,
    ];

    public static function getSubscribedEvents(): array
    {
        return [
            PluginEvents::PLUGIN_ON_INTEGRATION_KEYS_ENCRYPT => ['encodeToggleKeys', 0],
            PluginEvents::PLUGIN_ON_INTEGRATION_KEYS_MERGE   => ['encodeToggleKeys', 0],
            PluginEvents::PLUGIN_ON_INTEGRATION_KEYS_DECRYPT => ['decodeToggleKeys', 0],
        ];
    }

    public function encodeToggleKeys(PluginIntegrationKeyEvent $event): void
    {
        if (MauticLocaleFixIntegration::NAME !== $event->getIntegrationName()) {
            return;
        }

        $keys = $event->getKeys() ?? [];
        foreach (self::TOGGLE_FIELDS as $field) {
            if (array_key_exists($field, $keys)) {
                $keys[$field] = $this->isTruthy($keys[$field]) ? self::ENABLED_VALUE : self::DISABLED_VALUE;
            }
        }

        $event->setKeys($keys);
    }

    public function decodeToggleKeys(PluginIntegrationKeyEvent $event): void
    {
        if (MauticLocaleFixIntegration::NAME !== $event->getIntegrationName()) {
            return;
        }

        $keys = $event->getKeys() ?? [];
        foreach (self::TOGGLE_FIELDS as $field) {
            if (!array_key_exists($field, $keys)) {
                continue;
            }

            if (self::ENABLED_VALUE === $keys[$field]) {
                $keys[$field] = true;
            } elseif (self::DISABLED_VALUE === $keys[$field]) {
                $keys[$field] = false;
            }
        }

        $event->setKeys($keys);
    }

    private function isTruthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on', self::ENABLED_VALUE], true);
    }
}
