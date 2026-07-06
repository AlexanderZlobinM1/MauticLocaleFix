(function (window) {
    'use strict';

    var config = window.MauticLocaleFixConfig || {};
    var pluginEnabled = config.enabled === true;
    var calendarEnabled = pluginEnabled && config.calendarEnabled === true;
    var campaignDateTimeUtcSubmit = pluginEnabled && config.campaignDateTimeUtcSubmit === true;
    var runtime = window.__mauticLocaleFixRuntime = window.__mauticLocaleFixRuntime || {};

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

    var timeDisplayFormat = String(config.timeDisplayFormat || 'native').toLowerCase();
    if (['native', '12h', '24h'].indexOf(timeDisplayFormat) === -1) {
        timeDisplayFormat = 'native';
    }
    var timeDisplayEnabled = pluginEnabled && ['12h', '24h'].indexOf(timeDisplayFormat) !== -1;

    var mauticTimezone = String(config.mauticTimezone || '').trim();

    var pickerFormatByDisplayFormat = {
        locale_medium: 'd M Y',
        locale_long: 'd F Y',
        iso: 'Y-m-d',
        numeric_dmy: 'd.m.Y',
        numeric_mdy: 'm/d/Y'
    };
    var nativeMauticMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var pickerShortMonthNamesByLanguage = {
        ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        sr: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec']
    };
    var dateRangeFromSelector = '#daterange_date_from,input[name="daterange[date_from]"]';
    var dateRangeToSelector = '#daterange_date_to,input[name="daterange[date_to]"]';

    var monthNumbers = {
        jan: 0,
        january: 0,
        januar: 0,
        januara: 0,
        'янв': 0,
        'январь': 0,
        'января': 0,
        feb: 1,
        february: 1,
        februar: 1,
        februara: 1,
        'фев': 1,
        'февраль': 1,
        'февраля': 1,
        mar: 2,
        march: 2,
        mart: 2,
        marta: 2,
        'мар': 2,
        'март': 2,
        'марта': 2,
        apr: 3,
        april: 3,
        aprila: 3,
        'апр': 3,
        'апрель': 3,
        'апреля': 3,
        may: 4,
        maj: 4,
        maja: 4,
        'май': 4,
        'мая': 4,
        jun: 5,
        june: 5,
        juni: 5,
        juna: 5,
        'июн': 5,
        'июнь': 5,
        'июня': 5,
        jul: 6,
        july: 6,
        juli: 6,
        jula: 6,
        'июл': 6,
        'июль': 6,
        'июля': 6,
        aug: 7,
        august: 7,
        avgust: 7,
        avgusta: 7,
        'авг': 7,
        'август': 7,
        'августа': 7,
        sep: 8,
        sept: 8,
        september: 8,
        septembar: 8,
        septembra: 8,
        'сен': 8,
        'сентябрь': 8,
        'сентября': 8,
        oct: 9,
        october: 9,
        oktobar: 9,
        oktobra: 9,
        'окт': 9,
        'октябрь': 9,
        'октября': 9,
        nov: 10,
        november: 10,
        novembar: 10,
        novembra: 10,
        'ноя': 10,
        'ноябрь': 10,
        'ноября': 10,
        dec: 11,
        december: 11,
        decembar: 11,
        decembra: 11,
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

    function applyDateTimePickerDefaults($) {
        if (!$ || !$.fn || !$.fn.datetimepicker || !$.fn.datetimepicker.defaults) {
            return;
        }

        $.fn.datetimepicker.defaults.dayOfWeekStart = weekStart;
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

        return element.matches(dateRangeFromSelector + ',' + dateRangeToSelector);
    }

    function shouldApplyDisplayFormatToElement(element) {
        if (!element || !element.getAttribute) {
            return false;
        }

        return element.getAttribute('data-mautic-locale-fix-format') === '1';
    }

    function shouldApplyCalendarOptionsToElement(element) {
        if (!element || !element.getAttribute) {
            return false;
        }

        return isDateRangeInput(element) ||
            element.getAttribute('data-mautic-locale-fix-calendar') === '1' ||
            shouldApplyDisplayFormatToElement(element);
    }

    function shouldApplyCalendarOptionsToElements(elements) {
        if (!elements || !elements.length) {
            return false;
        }

        for (var i = 0; i < elements.length; i += 1) {
            if (shouldApplyCalendarOptionsToElement(elements[i])) {
                return true;
            }
        }

        return false;
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
        if (!shouldApplyCalendarOptionsToElements(elements)) {
            return options;
        }

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

    function formatNativeMauticDate(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }

        return nativeMauticMonthNames[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
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

    function isTimeColumnHeaderText(text) {
        var normalized = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!normalized) {
            return false;
        }

        return normalized.indexOf('timestamp') !== -1 ||
            normalized.indexOf('time stamp') !== -1 ||
            normalized.indexOf('date/time') !== -1 ||
            normalized.indexOf('date time') !== -1 ||
            normalized.indexOf('event time') !== -1 ||
            normalized.indexOf('врем') !== -1 ||
            normalized.indexOf('datum/vreme') !== -1 ||
            normalized.indexOf('datum vreme') !== -1 ||
            normalized.indexOf('vrijeme') !== -1 ||
            normalized.indexOf('vreme') !== -1 ||
            normalized.indexOf('hora') !== -1 ||
            normalized.indexOf('heure') !== -1 ||
            normalized.indexOf('zeit') !== -1 ||
            normalized.indexOf('czas') !== -1 ||
            /(^|[^a-z])time([^a-z]|$)/.test(normalized);
    }

    function elementHasTimeColumnAttribute(element) {
        var names = ['data-column-name', 'data-column-alias', 'data-field', 'data-sort'];
        var value;
        if (!element || !element.getAttribute) {
            return false;
        }

        for (var i = 0; i < names.length; i += 1) {
            value = String(element.getAttribute(names[i]) || '').toLowerCase();
            if (value && isTimeColumnHeaderText(value)) {
                return true;
            }
        }

        return false;
    }

    function formatTimeOnlyValue(hour, minute, second, meridiem) {
        var numericHour = parseInt(hour, 10);
        var normalizedMeridiem = String(meridiem || '').toLowerCase().replace(/[^apm]/g, '');
        var suffix;
        if (isNaN(numericHour)) {
            return null;
        }

        if (timeDisplayFormat === '24h') {
            if (normalizedMeridiem.indexOf('p') === 0 && numericHour < 12) {
                numericHour += 12;
            } else if (normalizedMeridiem.indexOf('a') === 0 && numericHour === 12) {
                numericHour = 0;
            }

            return pad(numericHour) + ':' + minute + (second ? ':' + second : '');
        }

        suffix = numericHour >= 12 ? 'pm' : 'am';
        numericHour %= 12;
        if (numericHour === 0) {
            numericHour = 12;
        }

        return String(numericHour) + ':' + minute + (second ? ':' + second : '') + ' ' + suffix;
    }

    function formatTimeText(value) {
        var text = String(value || '');
        if (!text) {
            return text;
        }

        if (timeDisplayFormat === '24h') {
            return text.replace(/\b(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\s*([AaPp]\.?\s*[Mm]\.?)\b/g, function (match, hour, minute, second, meridiem) {
                return formatTimeOnlyValue(hour, minute, second, meridiem) || match;
            });
        }

        return text.replace(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b(?!\s*[AaPp]\.?\s*[Mm]\.?)/g, function (match, hour, minute, second) {
            return formatTimeOnlyValue(hour, minute, second, '') || match;
        });
    }

    function formatTimeTextElement(element) {
        var original;
        var formatted;
        if (!timeDisplayEnabled || !element || element.children.length > 0) {
            return false;
        }

        original = element.textContent || '';
        if (!original || original.length > 120) {
            return false;
        }

        formatted = formatTimeText(original);
        if (formatted && formatted !== original) {
            element.textContent = formatted;

            return true;
        }

        return false;
    }

    function getTableTimeColumnIndexes(table) {
        var rows = queryAll('tr', table);
        var indexes = [];
        var headerCells;
        if (!rows.length) {
            return indexes;
        }

        headerCells = queryAll('th,td', rows[0]);
        Array.prototype.forEach.call(headerCells, function (cell, index) {
            if (isTimeColumnHeaderText(cell.textContent) || elementHasTimeColumnAttribute(cell)) {
                indexes.push(index);
            }
        });

        return indexes;
    }

    function formatTimeColumnTables() {
        var tables = queryAll('table');
        var changed = false;
        Array.prototype.forEach.call(tables, function (table) {
            var indexes = getTableTimeColumnIndexes(table);
            var rows;
            if (!indexes.length) {
                return;
            }

            rows = queryAll('tr', table);
            Array.prototype.forEach.call(rows, function (row, rowIndex) {
                var cells;
                if (rowIndex === 0) {
                    return;
                }

                cells = queryAll('td,th', row);
                indexes.forEach(function (cellIndex) {
                    changed = formatTimeTextElement(cells[cellIndex]) || changed;
                });
            });
        });

        return changed;
    }

    function formatTimeAttributedCells() {
        var cells = queryAll([
            'td[data-column-name]',
            'td[data-column-alias]',
            'td[data-field]',
            'td[data-sort]',
            '[role="cell"][data-column-name]',
            '[role="cell"][data-column-alias]',
            '[role="cell"][data-field]',
            '[role="cell"][data-sort]'
        ].join(','));
        var changed = false;

        Array.prototype.forEach.call(cells, function (cell) {
            if (elementHasTimeColumnAttribute(cell)) {
                changed = formatTimeTextElement(cell) || changed;
            }
        });

        return changed;
    }

    function formatPlainTimeTextElements() {
        var changed = false;
        if (!timeDisplayEnabled) {
            return false;
        }

        changed = formatTimeColumnTables() || changed;
        changed = formatTimeAttributedCells() || changed;

        return changed;
    }

    function formatChartTimeValue(value) {
        var formatted;
        if (!timeDisplayEnabled || typeof value !== 'string') {
            return value;
        }

        formatted = formatTimeText(value);

        return formatted || value;
    }

    function chartValueHasTimeText(value) {
        if (Array.isArray(value)) {
            return value.some(chartValueHasTimeText);
        }

        return typeof value === 'string' && formatTimeText(value) !== value;
    }

    function chartDataHasTimeLabels(data) {
        if (!data || !Array.isArray(data.labels)) {
            return false;
        }

        return data.labels.some(chartValueHasTimeText);
    }

    function formatChartCallbackResult(result) {
        if (Array.isArray(result)) {
            return result.map(formatChartCallbackResult);
        }

        return formatChartTimeValue(result);
    }

    function wrapChartCallback(callbacks, name) {
        var original;
        var wrapped;
        if (!callbacks || typeof callbacks !== 'object') {
            return false;
        }
        if (callbacks[name] && callbacks[name].__mauticLocaleFixChartTimePatched === true) {
            return false;
        }

        original = callbacks[name];
        if (typeof original !== 'function') {
            return false;
        }

        wrapped = function () {
            var result = original.apply(this, arguments);

            return formatChartCallbackResult(result);
        };
        wrapped.__mauticLocaleFixChartTimePatched = true;
        wrapped.__mauticLocaleFixChartTimeOriginal = original;
        callbacks[name] = wrapped;

        return true;
    }

    function wrapChartTickCallback(ticks, allowFallback) {
        var original;
        var wrapped;
        if (!ticks || typeof ticks !== 'object') {
            return false;
        }
        if (ticks.callback && ticks.callback.__mauticLocaleFixChartTimePatched === true) {
            return false;
        }

        original = ticks.callback;
        if (typeof original !== 'function' && allowFallback !== true) {
            return false;
        }

        wrapped = function () {
            var result = typeof original === 'function' ? original.apply(this, arguments) : arguments[0];

            return formatChartCallbackResult(result);
        };
        wrapped.__mauticLocaleFixChartTimePatched = true;
        wrapped.__mauticLocaleFixChartTimeHadOriginal = typeof original === 'function';
        wrapped.__mauticLocaleFixChartTimeOriginal = original;
        ticks.callback = wrapped;

        return true;
    }

    function restoreChartTickCallback(ticks) {
        var callback;
        if (!ticks || typeof ticks !== 'object') {
            return false;
        }

        callback = ticks.callback;
        if (!callback || callback.__mauticLocaleFixChartTimePatched !== true) {
            return false;
        }

        if (callback.__mauticLocaleFixChartTimeHadOriginal) {
            ticks.callback = callback.__mauticLocaleFixChartTimeOriginal;
        } else {
            delete ticks.callback;
        }

        return true;
    }

    function restoreChartCallback(callbacks, name) {
        var callback;
        if (!callbacks || typeof callbacks !== 'object') {
            return false;
        }

        callback = callbacks[name];
        if (!callback || callback.__mauticLocaleFixChartTimePatched !== true) {
            return false;
        }

        callbacks[name] = callback.__mauticLocaleFixChartTimeOriginal;

        return true;
    }

    function isLikelyChartXAxis(axisName, axis, index) {
        var normalizedName = String(axisName || '').toLowerCase();
        var id = axis && String(axis.id || axis.axis || '').toLowerCase();

        return normalizedName === 'xaxes' ||
            normalizedName === 'x' ||
            id === 'x' ||
            id.indexOf('x-') === 0 ||
            index === 0 && normalizedName !== 'yaxes' && normalizedName !== 'y';
    }

    function forEachChartTicks(options, callback) {
        var scales;
        if (!options || !options.scales) {
            return;
        }

        scales = options.scales;
        ['xAxes', 'yAxes'].forEach(function (axisName) {
            if (!Array.isArray(scales[axisName])) {
                return;
            }

            scales[axisName].forEach(function (axis) {
                if (axis && axis.ticks) {
                    callback(axis.ticks, isLikelyChartXAxis(axisName, axis, 0));
                }
            });
        });

        Object.keys(scales).forEach(function (key) {
            var scale = scales[key];
            if (scale && !Array.isArray(scale) && scale.ticks) {
                callback(scale.ticks, isLikelyChartXAxis(key, scale, 0));
            }
        });
    }

    function forEachChartTooltipCallbacks(options, callback) {
        var callbackNames = [
            'beforeTitle',
            'title',
            'afterTitle',
            'beforeLabel',
            'label',
            'afterLabel',
            'beforeFooter',
            'footer',
            'afterFooter'
        ];
        var containers = [];

        if (!options) {
            return;
        }

        if (options.tooltips && options.tooltips.callbacks) {
            containers.push(options.tooltips.callbacks);
        }
        if (options.plugins && options.plugins.tooltip && options.plugins.tooltip.callbacks) {
            containers.push(options.plugins.tooltip.callbacks);
        }

        containers.forEach(function (callbacks) {
            callbackNames.forEach(function (name) {
                callback(callbacks, name);
            });
        });
    }

    function wrapChartTimeCallbacks(options, allowFormatting) {
        var changed = false;
        if (!options || allowFormatting !== true) {
            return false;
        }

        forEachChartTicks(options, function (ticks, isXAxis) {
            changed = wrapChartTickCallback(ticks, isXAxis) || changed;
        });
        forEachChartTooltipCallbacks(options, function (callbacks, name) {
            changed = wrapChartCallback(callbacks, name) || changed;
        });

        return changed;
    }

    function restoreChartTimeCallbacks(options) {
        var changed = false;
        if (!options) {
            return false;
        }

        forEachChartTicks(options, function (ticks) {
            changed = restoreChartTickCallback(ticks) || changed;
        });
        forEachChartTooltipCallbacks(options, function (callbacks, name) {
            changed = restoreChartCallback(callbacks, name) || changed;
        });

        return changed;
    }

    function getChartConfigOptions(config) {
        if (!config || typeof config !== 'object') {
            return null;
        }

        return config.options || (config.config && config.config.options) || null;
    }

    function getChartConfigData(config) {
        if (!config || typeof config !== 'object') {
            return null;
        }

        return config.data || (config.config && config.config.data) || null;
    }

    function chartHasTimeLabels(chart) {
        return chartDataHasTimeLabels(chart && chart.data) ||
            chartDataHasTimeLabels(getChartConfigData(chart && chart.config));
    }

    function applyChartTimeFormattingToConfig(config, allowFormatting) {
        var changed = false;
        if (!timeDisplayEnabled || !config || typeof config !== 'object') {
            return false;
        }

        changed = wrapChartTimeCallbacks(
            getChartConfigOptions(config),
            allowFormatting === true || chartDataHasTimeLabels(getChartConfigData(config))
        ) || changed;

        return changed;
    }

    function restoreChartTimeFormattingFromConfig(config) {
        var changed = false;
        if (!config || typeof config !== 'object') {
            return false;
        }

        changed = restoreChartTimeCallbacks(getChartConfigOptions(config)) || changed;

        return changed;
    }

    function getChartConstructor() {
        return window.Chart && window.Chart.__mauticLocaleFixChartOriginal ?
            window.Chart.__mauticLocaleFixChartOriginal :
            window.Chart;
    }

    function getChartInstances() {
        var ChartConstructor = getChartConstructor();
        var instances = [];
        var seen = [];

        function pushInstance(instance) {
            if (!instance || seen.indexOf(instance) !== -1) {
                return;
            }

            seen.push(instance);
            instances.push(instance);
        }

        if (ChartConstructor && ChartConstructor.instances) {
            if (Array.isArray(ChartConstructor.instances)) {
                ChartConstructor.instances.forEach(pushInstance);
            } else {
                Object.keys(ChartConstructor.instances).forEach(function (key) {
                    pushInstance(ChartConstructor.instances[key]);
                });
            }
        }

        if (ChartConstructor && typeof ChartConstructor.getChart === 'function') {
            Array.prototype.forEach.call(queryAll('canvas'), function (canvas) {
                try {
                    pushInstance(ChartConstructor.getChart(canvas));
                } catch (e) {
                }
            });
        }

        return instances;
    }

    function getChartTimePlugin() {
        if (!runtime.chartTimePlugin) {
            runtime.chartTimePlugin = {
                id: 'mauticLocaleFixTimeDisplay',
                beforeInit: function (chart) {
                    applyChartTimeFormattingToInstance(chart);
                },
                beforeUpdate: function (chart) {
                    applyChartTimeFormattingToInstance(chart);
                }
            };
        }

        return runtime.chartTimePlugin;
    }

    function registerChartTimePlugin() {
        var ChartConstructor = getChartConstructor();
        var plugin;
        if (!ChartConstructor) {
            return false;
        }
        if (ChartConstructor.__mauticLocaleFixChartTimePluginRegistered === true) {
            return true;
        }

        plugin = getChartTimePlugin();

        try {
            if (typeof ChartConstructor.register === 'function') {
                ChartConstructor.register(plugin);
                ChartConstructor.__mauticLocaleFixChartTimePluginRegistered = true;

                return true;
            }
        } catch (e) {
        }

        try {
            if (ChartConstructor.plugins && typeof ChartConstructor.plugins.register === 'function') {
                ChartConstructor.plugins.register(plugin);
                ChartConstructor.__mauticLocaleFixChartTimePluginRegistered = true;

                return true;
            }
        } catch (e) {
        }

        return false;
    }

    function unregisterChartTimePlugin() {
        var ChartConstructor = getChartConstructor();
        var plugin = runtime.chartTimePlugin;
        if (!ChartConstructor || !plugin || ChartConstructor.__mauticLocaleFixChartTimePluginRegistered !== true) {
            return;
        }

        try {
            if (typeof ChartConstructor.unregister === 'function') {
                ChartConstructor.unregister(plugin);
            }
        } catch (e) {
        }

        try {
            if (ChartConstructor.plugins && typeof ChartConstructor.plugins.unregister === 'function') {
                ChartConstructor.plugins.unregister(plugin);
            }
        } catch (e) {
        }

        ChartConstructor.__mauticLocaleFixChartTimePluginRegistered = false;
    }

    function applyChartTimeFormattingToInstance(chart) {
        var changed = false;
        var allowFormatting;
        if (!chart) {
            return false;
        }

        allowFormatting = chartHasTimeLabels(chart);
        changed = applyChartTimeFormattingToConfig(chart.config, allowFormatting) || changed;
        changed = wrapChartTimeCallbacks(chart.options, allowFormatting) || changed;

        return changed;
    }

    function restoreChartTimeFormattingFromInstance(chart) {
        var changed = false;
        if (!chart) {
            return false;
        }

        changed = restoreChartTimeFormattingFromConfig(chart.config) || changed;
        changed = restoreChartTimeCallbacks(chart.options) || changed;

        return changed;
    }

    function patchChartTimeFormatting() {
        var chartInstances;
        var changed = false;
        var pluginRegistered = false;
        if (!timeDisplayEnabled || typeof window.Chart !== 'function') {
            return false;
        }

        restoreChartWrapper();
        pluginRegistered = registerChartTimePlugin();
        chartInstances = getChartInstances();

        chartInstances.forEach(function (chart) {
            changed = applyChartTimeFormattingToInstance(chart) || changed;
        });
        runtime.chartTimeFormattingPatched = pluginRegistered || chartInstances.length > 0;

        return runtime.chartTimeFormattingPatched || changed;
    }

    function restoreChartWrapper() {
        var ChartConstructor = window.Chart;
        if (ChartConstructor && ChartConstructor.__mauticLocaleFixChartOriginal) {
            window.Chart = ChartConstructor.__mauticLocaleFixChartOriginal;
        }
    }

    function restoreChartTimeFormatting() {
        getChartInstances().forEach(restoreChartTimeFormattingFromInstance);
        unregisterChartTimePlugin();
        restoreChartWrapper();
        runtime.chartTimeFormattingPatched = false;
    }

    function getDateRangeMonthName(date) {
        var locale = String(getConfiguredLocale() || '').replace('_', '-').toLowerCase();
        var language = locale.split('-')[0];
        var monthNames = pickerShortMonthNamesByLanguage[language];
        var month;
        if (monthNames) {
            return monthNames[date.getMonth()];
        }

        try {
            month = new Intl.DateTimeFormat(getIntlLocale(), {month: 'short'}).format(date).replace(/\.$/, '');
            return month || nativeMauticMonthNames[date.getMonth()];
        } catch (e) {
            return nativeMauticMonthNames[date.getMonth()];
        }
    }

    function formatDateRangeDisplayDate(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }

        return getDateRangeMonthName(date) + ' ' + date.getDate() + ', ' + date.getFullYear();
    }

    function formatDateRangeInputValue(input) {
        var date;
        var formatted;
        if (!input || !input.value) {
            return;
        }

        date = parseDateText(input.value);
        formatted = date ? formatDateRangeDisplayDate(date) : null;
        if (formatted && formatted !== input.value.trim()) {
            input.value = formatted;
        }
    }

    function normalizeDateRangeInputForSubmit(input) {
        if (!input || !input.value) {
            return null;
        }

        var original = input.value.trim();
        var date = parseDateText(original);
        var converted = date ? formatNativeMauticDate(date) : null;
        if (!converted || converted === original) {
            return null;
        }

        input.value = converted;

        return {
            input: input,
            original: original,
            converted: converted
        };
    }

    function restoreDateRangeInput(state) {
        if (!state || !state.input || state.input.value !== state.converted) {
            return;
        }

        state.input.value = state.original;
    }

    function queryOne(selector, root) {
        try {
            return (root || document).querySelector(selector);
        } catch (e) {
            return null;
        }
    }

    function queryAll(selector, root) {
        try {
            return (root || document).querySelectorAll(selector);
        } catch (e) {
            return [];
        }
    }

    function closestDateRangeForm(element) {
        if (!element || typeof element.closest !== 'function') {
            return null;
        }

        try {
            return element.closest('form');
        } catch (e) {
            return null;
        }
    }

    function parseDateRangeLimit(value) {
        var parsed = parseDateText(value);
        if (parsed) {
            return parsed;
        }

        var nativeDate = new Date(value);
        if (nativeDate instanceof Date && !isNaN(nativeDate.getTime())) {
            return nativeDate;
        }

        return false;
    }

    function setDateRangePickerOptionsOnce($, element, role, pairedElement) {
        var signature = 'range=' + role + ';weekStart=' + String(weekStart);
        var options;
        if (!element || element.getAttribute('data-mautic-locale-fix-range-options') === signature) {
            return;
        }

        options = {
            dayOfWeekStart: weekStart,
            onShow: function () {
                var pairedDate = pairedElement && pairedElement.value ? parseDateRangeLimit(pairedElement.value) : false;
                if (role === 'from') {
                    this.setOptions({maxDate: pairedDate || false});
                } else {
                    this.setOptions({
                        maxDate: new Date(),
                        minDate: pairedDate || false
                    });
                }
            }
        };

        try {
            $(element).datetimepicker('setOptions', options);
            element.setAttribute('data-mautic-locale-fix-range-options', signature);
        } catch (e) {
        }
    }

    function findDateRangePair(fromInput) {
        var form = closestDateRangeForm(fromInput);
        var toInput = form ? queryOne(dateRangeToSelector, form) : null;
        if (!toInput) {
            toInput = queryOne(dateRangeToSelector);
        }

        return {
            from: fromInput,
            to: toInput
        };
    }

    function applyDateRangePair($, fromInput, toInput) {
        if (!fromInput || !toInput) {
            return;
        }

        if ($ && typeof $.fn === 'object' && typeof $.fn.datetimepicker === 'function') {
            setDateRangePickerOptionsOnce($, fromInput, 'from', toInput);
            setDateRangePickerOptionsOnce($, toInput, 'to', fromInput);
        }

        formatDateRangeInputValue(fromInput);
        formatDateRangeInputValue(toInput);
    }

    function updateDateRangeInputs($) {
        var seen = [];
        var fromInputs = queryAll(dateRangeFromSelector);

        Array.prototype.forEach.call(fromInputs, function (fromInput) {
            var pair = findDateRangePair(fromInput);
            if (!pair.from || !pair.to || seen.indexOf(pair.from) !== -1) {
                return;
            }
            seen.push(pair.from);
            applyDateRangePair($, pair.from, pair.to);
        });
    }

    function isDateRangeForm(form) {
        if (!form || typeof form.querySelector !== 'function') {
            return false;
        }

        return !!(queryOne(dateRangeFromSelector, form) || queryOne(dateRangeToSelector, form));
    }

    function normalizeDateRangeForm(form) {
        var states = [];
        var state;
        if (!isDateRangeForm(form)) {
            return null;
        }

        state = normalizeDateRangeInputForSubmit(queryOne(dateRangeFromSelector, form));
        if (state) {
            states.push(state);
        }

        state = normalizeDateRangeInputForSubmit(queryOne(dateRangeToSelector, form));
        if (state) {
            states.push(state);
        }

        return states.length ? states : null;
    }

    function restoreDateRangeInputs(states) {
        if (!states || !states.length) {
            return;
        }

        states.forEach(restoreDateRangeInput);
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
        var inputs = document.querySelectorAll('[data-mautic-locale-fix-format="1"]');

        Array.prototype.forEach.call(inputs, formatDateInputValue);
        updateDateRangeInputs($);
        formatPlainTimeTextElements();
        formatPlainDateTextElements([
            'table td',
            'table th',
            '[role="cell"]',
            '[data-column-name*="date"]',
            '[data-column-alias*="date"]'
        ].join(','));

        if (!$ || typeof $.fn !== 'object') {
            return;
        }

        $('[data-mautic-locale-fix-date-text="1"]').each(function () {
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

    function formatPlainDateTextElements(selector) {
        var elements;
        try {
            elements = document.querySelectorAll(selector);
        } catch (e) {
            return;
        }

        Array.prototype.forEach.call(elements, function (element) {
            var original;
            var trimmed;
            var formatted;
            if (!element || element.children.length > 0) {
                return;
            }

            original = element.textContent || '';
            trimmed = original.replace(/\s+/g, ' ').trim();
            if (!trimmed || trimmed.length > 40) {
                return;
            }

            formatted = formatDateText(trimmed);
            if (formatted && formatted !== trimmed) {
                element.textContent = original.replace(trimmed, formatted);
            }
        });
    }

    function updateExistingPickers($) {
        if (!$ || typeof $.fn.datetimepicker !== 'function') {
            formatExistingDateValues($);

            return;
        }

        applyLocale($);
        updateDateRangeInputs($);
        $([
            '#daterange_date_from',
            '#daterange_date_to',
            'input[name="daterange[date_from]"]',
            'input[name="daterange[date_to]"]',
            '[data-mautic-locale-fix-calendar="1"]',
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
            var fromSelector = arguments.length > 0 && arguments[0] ? arguments[0] : dateRangeFromSelector;
            var toSelector = arguments.length > 1 && arguments[1] ? arguments[1] : dateRangeToSelector;
            applyDateRangePair($, queryOne(fromSelector), queryOne(toSelector));
            updateExistingPickers($);

            return result;
        };

        patched.__mauticLocaleFixPatched = true;
        patched.__mauticLocaleFixOriginal = original;
        window.Mautic.initDateRangePicker = patched;
    }

    function patchDateTimePicker($) {
        restoreLegacyDatePickerWrappers($);

        if (!$ || !$.fn || typeof $.fn.datetimepicker !== 'function') {
            return false;
        }

        applyLocale($);
        applyDateTimePickerDefaults($);
        runtime.calendarDefaultsApplied = true;

        return true;
    }

    function patchDateRangeSubmit() {
        if (document.__mauticLocaleFixDateRangeSubmitPatched === true) {
            return true;
        }

        runtime.dateRangeSubmitHandler = function (event) {
            var states = normalizeDateRangeForm(event.target);
            if (!states) {
                return;
            }

            window.setTimeout(function () {
                restoreDateRangeInputs(states);
            }, 250);
        };
        document.addEventListener('submit', runtime.dateRangeSubmitHandler, true);
        document.__mauticLocaleFixDateRangeSubmitPatched = true;

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
            runtime.campaignSubmitHandler = function (event) {
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
            };
            document.addEventListener('submit', runtime.campaignSubmitHandler, true);
            document.__mauticLocaleFixCampaignDateSubmitPatched = true;
        }

        return true;
    }

    function getQueryCollection(selector) {
        try {
            return document.querySelectorAll(selector);
        } catch (e) {
            return [];
        }
    }

    function isTruthyControl(control) {
        if (!control) {
            return false;
        }

        if (control.type === 'checkbox') {
            return control.checked && control.value !== '0' && control.value !== 'false';
        }

        if ((control.type === 'radio') && !control.checked) {
            return false;
        }

        return ['1', 'true', 'yes', 'on'].indexOf(String(control.value || '').toLowerCase()) !== -1 || control.checked === true;
    }

    function findTruthyNamedControl(selector) {
        var controls = getQueryCollection(selector);
        for (var i = 0; i < controls.length; i += 1) {
            if (isTruthyControl(controls[i])) {
                return controls[i];
            }
        }

        return null;
    }

    function findFieldContainer(input) {
        var node = input;
        while (node && node !== document.documentElement) {
            if (node.classList && (
                node.classList.contains('form-group') ||
                node.classList.contains('row') ||
                node.classList.contains('control-group')
            )) {
                return node;
            }
            node = node.parentElement;
        }

        return input && input.parentElement ? input.parentElement : input;
    }

    function setDimmed(container, dimmed) {
        if (!container || !container.classList) {
            return;
        }

        container.classList.toggle('mauticlocalefix-dimmed', dimmed);
        container.setAttribute('aria-disabled', dimmed ? 'true' : 'false');
    }

    function ensureSettingsStyle() {
        if (document.getElementById('mauticlocalefix-settings-style')) {
            return;
        }

        var style = document.createElement('style');
        style.id = 'mauticlocalefix-settings-style';
        style.textContent = [
            '.mauticlocalefix-dimmed{opacity:.45;filter:grayscale(.2);}',
            '.mauticlocalefix-dimmed select,.mauticlocalefix-dimmed input,.mauticlocalefix-dimmed button{pointer-events:none;}'
        ].join('');
        document.head.appendChild(style);
    }

    function syncSettingsFormState() {
        var featureInputs = getQueryCollection([
            'input[name*="calendar_enabled"]',
            'select[name*="calendar_week_start"]',
            'select[name*="calendar_date_format"]',
            'select[name*="time_display_format"]',
            'input[name*="campaign_datetime_utc_submit"]',
            'input[name*="gmail_image_proxy_open"]'
        ].join(','));
        if (!featureInputs.length) {
            return;
        }

        ensureSettingsStyle();

        var publishedControl = findTruthyNamedControl([
            'input[name$="[isPublished]"]',
            'input[name*="[isPublished]"]',
            'input[id$="_isPublished"]',
            'input[name*="isPublished"]'
        ].join(','));
        var integrationActive = !!publishedControl;
        var calendarControl = findTruthyNamedControl('input[name*="calendar_enabled"]');
        var calendarActive = !!calendarControl;

        Array.prototype.forEach.call(featureInputs, function (input) {
            var name = String(input.name || input.id || '');
            var container = findFieldContainer(input);
            var dimmed = !integrationActive;

            if (integrationActive && (
                name.indexOf('calendar_week_start') !== -1 ||
                name.indexOf('calendar_date_format') !== -1
            )) {
                dimmed = !calendarActive;
            }

            setDimmed(container, dimmed);
        });
    }

    function deactivateRuntime() {
        var $ = getQuery();
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
        restoreChartTimeFormatting();
        restoreLegacyDatePickerWrappers($);
        restoreCampaignSubmitWrapper();
    }

    function applyPatch() {
        var $ = getQuery();
        var patched = calendarEnabled ? patchDateTimePicker($) : false;
        var campaignPatched = patchCampaignDateTimeSubmit();
        var chartPatched = false;
        var timeFormatted = false;
        if (calendarEnabled) {
            patchMauticDateRangePicker($);
            patchDateRangeSubmit();
            updateExistingPickers($);
        }
        if (timeDisplayEnabled) {
            timeFormatted = formatPlainTimeTextElements();
            chartPatched = patchChartTimeFormatting();
        }

        return patched ||
            campaignPatched ||
            chartPatched ||
            (timeFormatted && (!timeDisplayEnabled || runtime.chartTimeFormattingPatched === true));
    }

    function installRuntimeLoop() {
        var attempts = 0;
        runtime.timer = window.setInterval(function () {
            attempts += 1;
            if (applyPatch() || attempts >= 100) {
                window.clearInterval(runtime.timer);
                runtime.timer = null;
            }
        }, 100);

        runtime.domContentLoadedHandler = applyPatch;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runtime.domContentLoadedHandler);
        } else {
            applyPatch();
        }

        runtime.pageLoadedHandler = applyPatch;
        document.addEventListener('mauticPageLoaded', runtime.pageLoadedHandler);
        document.addEventListener('ajaxComplete', runtime.pageLoadedHandler);

        if ('MutationObserver' in window) {
            runtime.observer = new MutationObserver(function () {
                window.clearTimeout(runtime.observerTimer);
                runtime.observerTimer = window.setTimeout(applyPatch, 50);
            });

            runtime.observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    }

    restoreLegacyDatePickerWrappers(getQuery());
    restoreCampaignSubmitWrapper();
    restoreChartWrapper();

    syncSettingsFormState();
    document.addEventListener('change', syncSettingsFormState, true);
    document.addEventListener('mauticPageLoaded', syncSettingsFormState);

    if (!pluginEnabled || (!calendarEnabled && !campaignDateTimeUtcSubmit && !timeDisplayEnabled)) {
        deactivateRuntime();
        return;
    }

    deactivateRuntime();
    installRuntimeLoop();
})(window);
