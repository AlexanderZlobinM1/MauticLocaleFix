(function (window) {
    'use strict';

    var config = window.MauticLocaleFixConfig || {};
    var runtime = window.__mauticLocaleFixRuntime;

    function getQuery() {
        return window.mQuery || window.jQuery || window.$;
    }

    function restoreLegacyDatePickerWrappers($) {
        if ($ && $.fn && $.fn.datetimepicker && $.fn.datetimepicker.__mauticLocaleFixOriginal) {
            $.fn.datetimepicker = $.fn.datetimepicker.__mauticLocaleFixOriginal;
        }

        if (window.Mautic && window.Mautic.initDateRangePicker && window.Mautic.initDateRangePicker.__mauticLocaleFixOriginal) {
            window.Mautic.initDateRangePicker = window.Mautic.initDateRangePicker.__mauticLocaleFixOriginal;
        }
    }

    function restoreCampaignSubmitWrapper() {
        if (window.Mautic && window.Mautic.submitCampaignEvent && window.Mautic.submitCampaignEvent.__mauticLocaleFixOriginal) {
            window.Mautic.submitCampaignEvent = window.Mautic.submitCampaignEvent.__mauticLocaleFixOriginal;
        }
    }

    function deactivateRuntime() {
        if (!runtime) {
            return;
        }

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
    }

    if (config.enabled === true) {
        return;
    }

    deactivateRuntime();
    restoreLegacyDatePickerWrappers(getQuery());
    restoreCampaignSubmitWrapper();
})(window);
