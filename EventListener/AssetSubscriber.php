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
    private const ASSET_VERSION = '1.0.47';

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
        // Mautic's direct integration settings route can omit its global JS
        // facade in 7.2. Load this plugin-scoped fallback even while the
        // integration is unpublished so its own controls remain operable.
        $event->addScript(
            'plugins/MauticLocaleFixBundle/Assets/runtime/settings-toggle-compat.js?v='.self::ASSET_VERSION,
            'bodyClose',
            false,
            'mauticlocalefix-settings-toggle-compat'
        );

        $integration = $this->getIntegration();
        if (!$integration instanceof MauticLocaleFixIntegration) {
            $event->addScriptDeclaration($this->getLegacyCleanupScript(), 'bodyClose');

            return;
        }

        $published                 = $this->isIntegrationPublished($integration);
        if (!$published) {
            $event->addScriptDeclaration($this->getLegacyCleanupScript(), 'bodyClose');

            return;
        }

        $calendarEnabled           = $published && $integration->isCalendarFixEnabled();
        $gmailImageProxyOpen       = $published && $integration->isGmailImageProxyOpenEnabled();

        $config = [
            'enabled'                   => $published,
            'calendarEnabled'           => $calendarEnabled,
            'locale'                    => $this->getCurrentLocale(),
            'weekStart'                 => $integration->getCalendarWeekStart(),
            'dateFormat'                => $integration->getCalendarDateFormat(),
            'timeDisplayFormat'         => $integration->getTimeDisplayFormat(),
            'mauticTimezone'            => $this->getMauticTimezone(),
            'timezoneLabelMode'         => $integration->getTimezoneLabelMode(),
            'allowInactiveCampaignScheduleEdit' => $integration->isInactiveCampaignScheduleEditAllowed(),
            'gmailImageProxyOpen'       => $gmailImageProxyOpen,
        ];

        $event->addScriptDeclaration(
            'window.MauticLocaleFixConfig = '.json_encode(
                $config,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
            ).';'
        );
        $event->addStylesheet('plugins/MauticLocaleFixBundle/Assets/css/timezone-label.css?v='.self::ASSET_VERSION);
        $event->addScript(
            'plugins/MauticLocaleFixBundle/Assets/runtime/locale-fix.js?v='.self::ASSET_VERSION,
            'bodyClose',
            false,
            'mauticlocalefix-locale-fix'
        );
    }

    private function getLegacyCleanupScript(): string
    {
        return <<<'JS'
(function (window) {
    'use strict';
    var runtime = window.__mauticLocaleFixRuntime;
    var $ = window.mQuery || window.jQuery || window.$;
    if (runtime) {
        if (runtime.timer) {
            window.clearInterval(runtime.timer);
            runtime.timer = null;
        }
        if (runtime.observer) {
            runtime.observer.disconnect();
            runtime.observer = null;
        }
        if (runtime.observerTimer) {
            window.clearTimeout(runtime.observerTimer);
            runtime.observerTimer = null;
        }
        if (runtime.pageLoadedHandler) {
            document.removeEventListener('mauticPageLoaded', runtime.pageLoadedHandler);
            document.removeEventListener('ajaxComplete', runtime.pageLoadedHandler);
            runtime.pageLoadedHandler = null;
        }
        if (runtime.domContentLoadedHandler) {
            document.removeEventListener('DOMContentLoaded', runtime.domContentLoadedHandler);
            runtime.domContentLoadedHandler = null;
        }
        if (runtime.campaignSubmitHandler) {
            document.removeEventListener('submit', runtime.campaignSubmitHandler, true);
            runtime.campaignSubmitHandler = null;
            document.__mauticLocaleFixCampaignDateSubmitPatched = false;
        }
        if (runtime.dateRangeSubmitHandler) {
            document.removeEventListener('submit', runtime.dateRangeSubmitHandler, true);
            runtime.dateRangeSubmitHandler = null;
            document.__mauticLocaleFixDateRangeSubmitPatched = false;
        }
        if (runtime.timezoneLabelInputHandler) {
            document.removeEventListener('input', runtime.timezoneLabelInputHandler, true);
            document.removeEventListener('change', runtime.timezoneLabelInputHandler, true);
            runtime.timezoneLabelInputHandler = null;
        }
    }
    document.__mauticLocaleFixTimezoneLabelPatched = false;
    Array.prototype.forEach.call(document.querySelectorAll('[data-mautic-locale-fix-inactive-schedule-edit="1"]'), function (input) {
        input.disabled = true;
        input.setAttribute('disabled', 'disabled');
        input.removeAttribute('data-mautic-locale-fix-inactive-schedule-edit');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mautic-locale-fix-timezone-label'), function (badge) {
        badge.remove();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mautic-locale-fix-timezone-control--narrow'), function (group) {
        if (group.classList) {
            group.classList.remove('mautic-locale-fix-timezone-control--narrow');
        }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mautic-locale-fix-timezone-control'), function (wrapper) {
        var parent = wrapper.parentNode;
        if (parent && typeof parent.insertBefore === 'function' && wrapper.children && wrapper.children.length === 1) {
            parent.insertBefore(wrapper.children[0], wrapper);
            wrapper.remove();
        }
    });
    if ($ && $.fn && $.fn.datetimepicker && $.fn.datetimepicker.__mauticLocaleFixOriginal) {
        $.fn.datetimepicker = $.fn.datetimepicker.__mauticLocaleFixOriginal;
    }
    if (window.Mautic && window.Mautic.initDateRangePicker && window.Mautic.initDateRangePicker.__mauticLocaleFixOriginal) {
        window.Mautic.initDateRangePicker = window.Mautic.initDateRangePicker.__mauticLocaleFixOriginal;
    }
    if (window.Mautic && window.Mautic.submitCampaignEvent && window.Mautic.submitCampaignEvent.__mauticLocaleFixOriginal) {
        window.Mautic.submitCampaignEvent = window.Mautic.submitCampaignEvent.__mauticLocaleFixOriginal;
    }
    if (window.Chart && window.Chart.__mauticLocaleFixChartOriginal) {
        window.Chart = window.Chart.__mauticLocaleFixChartOriginal;
    }
})(window);
JS;
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
        $user     = $this->userHelper->getUser(true);
        $timezone = null !== $user && method_exists($user, 'getTimezone')
            ? trim((string) $user->getTimezone())
            : '';

        if ('' === $timezone) {
            $timezone = trim((string) $this->coreParametersHelper->get('default_timezone', ''));
        }

        return '' !== $timezone ? $timezone : trim((string) date_default_timezone_get());
    }
}
