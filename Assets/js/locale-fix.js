(function (window) {
    'use strict';

    var config = window.MauticLocaleFixConfig || {};
    var calendarEnabled = config.calendarEnabled === true;
    var campaignDateTimeUtcSubmit = config.campaignDateTimeUtcSubmit === true;
    if (!calendarEnabled && !campaignDateTimeUtcSubmit) {
        return;
    }

    var weekStart = parseInt(config.weekStart, 10);
    if (isNaN(weekStart) || weekStart < 0 || weekStart > 6) {
        weekStart = 1;
    }

    var dateDisplayFormat = String(config.dateFormat || 'locale_medium');
    var allowedDateDisplayFormats = [
        'locale_medium',
        'locale_long',
        'iso',
        'numeric_dmy',
        'numeric_mdy'
    ];
    if (allowedDateDisplayFormats.indexOf(dateDisplayFormat) === -1) {
        dateDisplayFormat = 'locale_medium';
    }

    var mauticTimezone = String(config.mauticTimezone || '').trim();

    var pickerFormatByDisplayFormat = {
        locale_medium: 'd M Y',
        locale_long: 'd F Y',
        iso: 'Y-m-d',
        numeric_dmy: 'd.m.Y',
        numeric_mdy: 'm/d/Y'
    };

    var monthNumbers = {
        jan: 0,
        january: 0,
        'янв': 0,
        'январь': 0,
        'января': 0,
        feb: 1,
        february: 1,
        'фев': 1,
        'февраль': 1,
        'февраля': 1,
        mar: 2,
        march: 2,
        'мар': 2,
        'март': 2,
        'марта': 2,
        apr: 3,
        april: 3,
        'апр': 3,
        'апрель': 3,
        'апреля': 3,
        may: 4,
        'май': 4,
        'мая': 4,
        jun: 5,
        june: 5,
        juni: 5,
        'июн': 5,
        'июнь': 5,
        'июня': 5,
        jul: 6,
        july: 6,
        juli: 6,
        'июл': 6,
        'июль': 6,
        'июля': 6,
        aug: 7,
        august: 7,
        avgust: 7,
        'авг': 7,
        'август': 7,
        'августа': 7,
        sep: 8,
        sept: 8,
        september: 8,
        septembar: 8,
        'сен': 8,
        'сентябрь': 8,
        'сентября': 8,
        oct: 9,
        october: 9,
        oktobar: 9,
        'окт': 9,
        'октябрь': 9,
        'октября': 9,
        nov: 10,
        november: 10,
        novembar: 10,
        'ноя': 10,
        'ноябрь': 10,
        'ноября': 10,
        dec: 11,
        december: 11,
        decembar: 11,
        'дек': 11,
        'декабрь': 11,
        'декабря': 11
    };

    var localeAliases = {
        en_US: 'en',
        en: 'en',
        ru_RU: 'ru',
        ru: 'ru',
        sr_RS: 'sr-YU',
        sr_Latn: 'sr-YU',
        sr_Latn_RS: 'sr-YU',
        pt_BR: 'pt-BR',
        zh_CN: 'zh',
        zh_TW: 'zh-TW'
    };

    function getQuery() {
        return window.mQuery || window.jQuery || window.$;
    }

    function getConfiguredLocale() {
        return config.locale || document.documentElement.getAttribute('lang') || 'en';
    }

    function getIntlLocale() {
        var locale = String(getConfiguredLocale() || 'en').replace('_', '-');
        var aliases = {
            en: 'en-US',
            ru: 'ru-RU',
            'ru-RU': 'ru-RU',
            sr: 'sr-Latn-RS',
            'sr-RS': 'sr-Latn-RS',
            'sr-Latn': 'sr-Latn-RS',
            'sr-Latn-RS': 'sr-Latn-RS',
            pt: 'pt-BR',
            'pt-BR': 'pt-BR'
        };

        return aliases[locale] || locale || 'en-US';
    }

    function getPickerLocales($) {
        if (!$ || !$.fn || !$.fn.datetimepicker || !$.fn.datetimepicker.defaults) {
            return {};
        }

        return $.fn.datetimepicker.defaults.i18n || {};
    }

    function getLocaleCandidates(locale) {
        locale = String(locale || '').trim();
        if (!locale) {
            return ['en'];
        }

        var normalized = locale.replace('-', '_');
        var dashed = locale.replace('_', '-');
        var language = normalized.split('_')[0];
        var candidates = [
            localeAliases[normalized],
            localeAliases[dashed],
            localeAliases[language],
            dashed,
            normalized,
            language
        ];

        return candidates.filter(function (candidate, index) {
            return candidate && candidates.indexOf(candidate) === index;
        });
    }

    function resolvePickerLocale($) {
        var locales = getPickerLocales($);
        var candidates = getLocaleCandidates(getConfiguredLocale());
        for (var i = 0; i < candidates.length; i += 1) {
            if (locales[candidates[i]]) {
                return candidates[i];
            }
        }

        return 'en';
    }

    function applyLocale($) {
        if (!$ || !$.datetimepicker || typeof $.datetimepicker.setLocale !== 'function') {
            return;
        }

        $.datetimepicker.setLocale(resolvePickerLocale($));
    }

    function withWeekStart($, options) {
        if (!options || typeof options !== 'object' || Array.isArray(options)) {
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

    function getPickerFormat() {
        return pickerFormatByDisplayFormat[dateDisplayFormat] || pickerFormatByDisplayFormat.locale_medium;
    }

    function isDateRangeInput(element) {
        if (!element || !element.matches) {
            return false;
        }

        return element.matches([
            '#daterange_date_from',
            '#daterange_date_to',
            'input[name="daterange[date_from]"]',
            'input[name="daterange[date_to]"]'
        ].join(','));
    }

    function shouldApplyDisplayFormatToElement(element) {
        if (!element || !element.getAttribute) {
            return false;
        }

        if (element.getAttribute('data-mautic-locale-fix-format') === '1') {
            return true;
        }

        return isDateRangeInput(element);
    }

    function shouldApplyDisplayFormatToElements(elements) {
        if (!elements || !elements.length) {
            return false;
        }

        for (var i = 0; i < elements.length; i += 1) {
            if (shouldApplyDisplayFormatToElement(elements[i])) {
                return true;
            }
        }

        return false;
    }

    function withDateFormat($, options, elements) {
        var formatted = withWeekStart($, options);
        if (!formatted || typeof formatted !== 'object' || Array.isArray(formatted)) {
            return formatted;
        }

        if (shouldApplyDisplayFormatToElements(elements)) {
            formatted.format = getPickerFormat();
        }

        return formatted;
    }

    function normalizeMonthToken(month) {
        return String(month || '').toLowerCase().replace(/\./g, '').trim();
    }

    function createDate(year, month, day) {
        var date = new Date(year, month, day);
        if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
            return null;
        }

        return date;
    }

    function parseDateText(value) {
        var text = String(value || '').replace(/\s+/g, ' ').trim();
        var match;
        var month;

        if (!text) {
            return null;
        }

        match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
            return createDate(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
        }

        match = text.match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);
        if (match) {
            return createDate(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
        }

        match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) {
            if (dateDisplayFormat === 'numeric_dmy') {
                return createDate(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
            }

            return createDate(parseInt(match[3], 10), parseInt(match[1], 10) - 1, parseInt(match[2], 10));
        }

        match = text.match(/^([A-Za-z\u00C0-\u024F\u0400-\u04FF.]+)\s+(\d{1,2}),?\s+(\d{4})$/);
        if (match) {
            month = monthNumbers[normalizeMonthToken(match[1])];
            if (month !== undefined) {
                return createDate(parseInt(match[3], 10), month, parseInt(match[2], 10));
            }
        }

        match = text.match(/^(\d{1,2})\s+([A-Za-z\u00C0-\u024F\u0400-\u04FF.]+),?\s+(\d{4})$/);
        if (match) {
            month = monthNumbers[normalizeMonthToken(match[2])];
            if (month !== undefined) {
                return createDate(parseInt(match[3], 10), month, parseInt(match[1], 10));
            }
        }

        return null;
    }

    function pad(number) {
        return String(number).padStart(2, '0');
    }

    function parseMauticDateTimeText(value) {
        var match = String(value || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!match) {
            return null;
        }

        return {
            year: parseInt(match[1], 10),
            month: parseInt(match[2], 10),
            day: parseInt(match[3], 10),
            hour: parseInt(match[4], 10),
            minute: parseInt(match[5], 10),
            second: parseInt(match[6] || '0', 10)
        };
    }

    function getTimeZoneDateParts(date, timezone) {
        var formatter;
        try {
            formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23'
            });
        } catch (e) {
            return null;
        }
        var raw = formatter.formatToParts(date);
        var parts = {};
        raw.forEach(function (part) {
            if (part.type !== 'literal') {
                parts[part.type] = parseInt(part.value, 10);
            }
        });

        return parts;
    }

    function localDateTimeToUtcDate(parts, timezone) {
        if (!timezone || !window.Intl || !Intl.DateTimeFormat) {
            return null;
        }

        var wanted = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
        var utc = wanted;
        for (var i = 0; i < 4; i += 1) {
            var actualParts = getTimeZoneDateParts(new Date(utc), timezone);
            if (!actualParts || !actualParts.year || !actualParts.month || !actualParts.day || isNaN(actualParts.hour)) {
                return null;
            }

            var actual = Date.UTC(
                actualParts.year,
                actualParts.month - 1,
                actualParts.day,
                actualParts.hour,
                actualParts.minute || 0,
                actualParts.second || 0
            );
            var delta = wanted - actual;
            if (delta === 0) {
                break;
            }
            utc += delta;
        }

        return new Date(utc);
    }

    function formatUtcForMautic(date) {
        return [
            date.getUTCFullYear(),
            pad(date.getUTCMonth() + 1),
            pad(date.getUTCDate())
        ].join('-') + ' ' + [
            pad(date.getUTCHours()),
            pad(date.getUTCMinutes()),
            pad(date.getUTCSeconds())
        ].join(':');
    }

    function normalizeCampaignTriggerDateInput(input) {
        if (!campaignDateTimeUtcSubmit || !input || !input.value || !mauticTimezone) {
            return null;
        }
        if (input.getAttribute('data-mautic-locale-fix-utc-submit') === '1') {
            return null;
        }

        var original = input.value.trim();
        var parts = parseMauticDateTimeText(original);
        if (!parts) {
            return null;
        }

        var utcDate = localDateTimeToUtcDate(parts, mauticTimezone);
        if (!utcDate || isNaN(utcDate.getTime())) {
            return null;
        }

        var converted = formatUtcForMautic(utcDate);
        if (converted === original) {
            return null;
        }

        input.value = converted;
        input.setAttribute('data-mautic-locale-fix-utc-submit', '1');

        return {
            input: input,
            original: original,
            converted: converted
        };
    }

    function restoreCampaignTriggerDateInput(state) {
        if (!state || !state.input || state.input.value !== state.converted) {
            return;
        }

        state.input.value = state.original;
        state.input.removeAttribute('data-mautic-locale-fix-utc-submit');
    }

    function normalizeCampaignTriggerDateForm(form) {
        if (!form || !form.querySelector) {
            return null;
        }

        return normalizeCampaignTriggerDateInput(form.querySelector('input[name="campaignevent[triggerDate]"]'));
    }

    function withNormalizedCampaignTriggerDate(form, callback) {
        var state = normalizeCampaignTriggerDateForm(form);
        try {
            return callback();
        } finally {
            if (state) {
                window.setTimeout(function () {
                    restoreCampaignTriggerDateInput(state);
                }, 250);
            }
        }
    }

    function formatDate(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }

        if (dateDisplayFormat === 'iso') {
            return [
                date.getFullYear(),
                pad(date.getMonth() + 1),
                pad(date.getDate())
            ].join('-');
        }

        if (dateDisplayFormat === 'numeric_dmy') {
            return [
                pad(date.getDate()),
                pad(date.getMonth() + 1),
                date.getFullYear()
            ].join('.');
        }

        if (dateDisplayFormat === 'numeric_mdy') {
            return [
                pad(date.getMonth() + 1),
                pad(date.getDate()),
                date.getFullYear()
            ].join('/');
        }

        try {
            var month = new Intl.DateTimeFormat(getIntlLocale(), {
                month: dateDisplayFormat === 'locale_long' ? 'long' : 'short'
            }).format(date).replace(/\.$/, '');

            return [
                date.getDate(),
                month,
                date.getFullYear()
            ].join(' ');
        } catch (e) {
            return null;
        }
    }

    function formatDateText(value) {
        var date = parseDateText(value);
        if (!date) {
            return null;
        }

        return formatDate(date);
    }

    function formatDateInputValue(input) {
        if (!input || !input.value) {
            return;
        }

        var formatted = formatDateText(input.value);
        if (formatted && formatted !== input.value.trim()) {
            input.value = formatted;
        }
    }

    function pickerOptionsSignature(options) {
        if (!options || typeof options !== 'object') {
            return '';
        }

        return [
            'weekStart=' + String(options.dayOfWeekStart),
            'format=' + String(options.format || '')
        ].join(';');
    }

    function setPickerOptionsOnce($, element, options) {
        var signature = pickerOptionsSignature(options);
        if (!element || !signature || element.getAttribute('data-mautic-locale-fix-options') === signature) {
            return;
        }

        try {
            $(element).datetimepicker('setOptions', options);
            element.setAttribute('data-mautic-locale-fix-options', signature);
        } catch (e) {
        }
    }

    function formatExistingDateValues($) {
        var inputs = document.querySelectorAll([
            '#daterange_date_from',
            '#daterange_date_to',
            'input[name="daterange[date_from]"]',
            'input[name="daterange[date_to]"]'
        ].join(','));

        Array.prototype.forEach.call(inputs, formatDateInputValue);

        if (!$ || typeof $.fn !== 'object') {
            return;
        }

        $('td, th').each(function () {
            if (this.children.length > 0) {
                return;
            }

            var original = this.textContent;
            var trimmed = original.replace(/\s+/g, ' ').trim();
            var formatted = formatDateText(trimmed);
            if (formatted && formatted !== trimmed) {
                this.textContent = original.replace(trimmed, formatted);
            }
        });
    }

    function updateExistingPickers($) {
        if (!$ || typeof $.fn.datetimepicker !== 'function') {
            formatExistingDateValues($);

            return;
        }

        applyLocale($);
        $([
            '#daterange_date_from',
            '#daterange_date_to',
            'input[name="daterange[date_from]"]',
            'input[name="daterange[date_to]"]',
            '[data-mautic-locale-fix-format="1"]'
        ].join(',')).each(function () {
            var options = {dayOfWeekStart: weekStart};
            var shouldFormatDateOnly = shouldApplyDisplayFormatToElement(this);
            if (shouldFormatDateOnly) {
                options.format = getPickerFormat();
            }

            setPickerOptionsOnce($, this, options);

            if (shouldFormatDateOnly) {
                formatDateInputValue(this);
            }
        });

        formatExistingDateValues($);
    }

    function patchMauticDateRangePicker($) {
        if (!window.Mautic || typeof window.Mautic.initDateRangePicker !== 'function') {
            return;
        }

        if (window.Mautic.initDateRangePicker.__mauticLocaleFixPatched === true) {
            return;
        }

        var original = window.Mautic.initDateRangePicker;
        var patched = function () {
            var result = original.apply(this, arguments);
            updateExistingPickers($);

            return result;
        };

        patched.__mauticLocaleFixPatched = true;
        patched.__mauticLocaleFixOriginal = original;
        window.Mautic.initDateRangePicker = patched;
    }

    function patchDateTimePicker($) {
        if (!$ || !$.fn || typeof $.fn.datetimepicker !== 'function') {
            return false;
        }

        applyLocale($);
        patchMauticDateRangePicker($);
        if ($.fn.datetimepicker.__mauticLocaleFixPatched === true) {
            updateExistingPickers($);

            return true;
        }

        var original = $.fn.datetimepicker;
        var patched = function () {
            var args = Array.prototype.slice.call(arguments);
            applyLocale($);
            if (args.length > 0 && typeof args[0] === 'object') {
                args[0] = withDateFormat($, args[0], this);
            } else if (args[0] === 'setOptions' && args.length > 1) {
                args[1] = withDateFormat($, args[1], this);
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

    function patchCampaignDateTimeSubmit() {
        if (!campaignDateTimeUtcSubmit || !mauticTimezone || !window.Mautic) {
            return false;
        }

        if (window.Mautic.submitCampaignEvent && window.Mautic.submitCampaignEvent.__mauticLocaleFixPatched === true) {
            return true;
        }

        if (typeof window.Mautic.submitCampaignEvent === 'function') {
            var originalSubmitCampaignEvent = window.Mautic.submitCampaignEvent;
            var patchedSubmitCampaignEvent = function () {
                var form = document.querySelector('form[name="campaignevent"]');
                var args = arguments;
                var context = this;

                return withNormalizedCampaignTriggerDate(form, function () {
                    return originalSubmitCampaignEvent.apply(context, args);
                });
            };

            patchedSubmitCampaignEvent.__mauticLocaleFixPatched = true;
            patchedSubmitCampaignEvent.__mauticLocaleFixOriginal = originalSubmitCampaignEvent;
            window.Mautic.submitCampaignEvent = patchedSubmitCampaignEvent;
        }

        if (document.__mauticLocaleFixCampaignDateSubmitPatched !== true) {
            document.addEventListener('submit', function (event) {
                var form = event.target;
                if (!form || !form.matches || !form.matches('form[name="campaignevent"]')) {
                    return;
                }

                var state = normalizeCampaignTriggerDateForm(form);
                if (state) {
                    window.setTimeout(function () {
                        restoreCampaignTriggerDateInput(state);
                    }, 250);
                }
            }, true);
            document.__mauticLocaleFixCampaignDateSubmitPatched = true;
        }

        return true;
    }

    function applyPatch() {
        var $ = getQuery();
        var patched = calendarEnabled ? patchDateTimePicker($) : false;
        var campaignPatched = patchCampaignDateTimeSubmit();
        if (calendarEnabled) {
            formatExistingDateValues($);
        }

        return patched || campaignPatched;
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

    if ('MutationObserver' in window) {
        var observerTimer = null;
        var observer = new MutationObserver(function () {
            window.clearTimeout(observerTimer);
            observerTimer = window.setTimeout(applyPatch, 50);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
})(window);
