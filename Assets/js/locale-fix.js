(function (window) {
    'use strict';

    var config = window.MauticLocaleFixConfig || {};
    if (config.calendarEnabled === false) {
        return;
    }

    var weekStart = parseInt(config.weekStart, 10);
    if (isNaN(weekStart) || weekStart < 0 || weekStart > 6) {
        weekStart = 1;
    }

    function getQuery() {
        return window.mQuery || window.jQuery || window.$;
    }

    function withWeekStart($, options) {
        if (!options || typeof options !== 'object' || Array.isArray(options)) {
            return options;
        }

        if (typeof options.dayOfWeekStart !== 'undefined') {
            return options;
        }

        if ($ && typeof $.extend === 'function') {
            return $.extend({}, options, {dayOfWeekStart: weekStart});
        }

        var cloned = {};
        Object.keys(options).forEach(function (key) {
            cloned[key] = options[key];
        });
        cloned.dayOfWeekStart = weekStart;

        return cloned;
    }

    function updateExistingPickers($) {
        if (!$ || typeof $.fn.datetimepicker !== 'function') {
            return;
        }

        $('.calendar-activated').each(function () {
            try {
                $(this).datetimepicker('setOptions', {dayOfWeekStart: weekStart});
            } catch (e) {
            }
        });
    }

    function patchDateTimePicker($) {
        if (!$ || !$.fn || typeof $.fn.datetimepicker !== 'function') {
            return false;
        }

        if ($.fn.datetimepicker.__mauticLocaleFixPatched === true) {
            updateExistingPickers($);

            return true;
        }

        var original = $.fn.datetimepicker;
        var patched = function () {
            var args = Array.prototype.slice.call(arguments);
            if (args.length > 0) {
                args[0] = withWeekStart($, args[0]);
            }

            return original.apply(this, args);
        };

        Object.keys(original).forEach(function (key) {
            patched[key] = original[key];
        });

        patched.__mauticLocaleFixPatched = true;
        patched.__mauticLocaleFixOriginal = original;
        $.fn.datetimepicker = patched;

        if ($.fn.datetimepicker.defaults) {
            $.fn.datetimepicker.defaults.dayOfWeekStart = weekStart;
        }

        updateExistingPickers($);

        return true;
    }

    function applyPatch() {
        return patchDateTimePicker(getQuery());
    }

    var attempts = 0;
    var timer = window.setInterval(function () {
        attempts += 1;
        if (applyPatch() || attempts >= 100) {
            window.clearInterval(timer);
        }
    }, 100);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyPatch);
    } else {
        applyPatch();
    }

    document.addEventListener('mauticPageLoaded', applyPatch);
    document.addEventListener('ajaxComplete', applyPatch);
})(window);

