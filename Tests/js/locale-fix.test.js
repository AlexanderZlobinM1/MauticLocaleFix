const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../../Assets/runtime/locale-fix.js'),
  'utf8'
);

function createInput(value, options = {}) {
  const attrs = Object.assign({}, options.attrs || {});

  return {
    value,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name, nextValue) {
      attrs[name] = String(nextValue);
    },
    removeAttribute(name) {
      delete attrs[name];
    },
    matches(selector) {
      return typeof options.matches === 'function' ? options.matches(selector) : false;
    },
  };
}

function createTextElement(text, options = {}) {
  const attrs = Object.assign({}, options.attrs || {});

  return {
    textContent: text,
    children: options.children || [],
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    setAttribute(name, nextValue) {
      attrs[name] = String(nextValue);
    },
    matches(selector) {
      return typeof options.matches === 'function' ? options.matches(selector) : false;
    },
  };
}

function runPlugin(config, options = {}) {
  const timeouts = [];
  const submitListeners = [];
  const intervals = [];
  const input = options.input || createInput('2026-06-29 15:00');
  const form = {
    querySelector(selector) {
      return selector === 'input[name="campaignevent[triggerDate]"]' ? input : null;
    },
    matches(selector) {
      return selector === 'form[name="campaignevent"]';
    },
  };
  const document = {
    readyState: 'complete',
    documentElement: {
      getAttribute(name) {
        return name === 'lang' ? 'en' : null;
      },
    },
    querySelector(selector) {
      if (typeof options.querySelector === 'function') {
        const match = options.querySelector(selector);
        if (match) {
          return match;
        }
      }

      return selector === 'form[name="campaignevent"]' ? form : null;
    },
    querySelectorAll(selector) {
      if (typeof options.querySelectorAll === 'function') {
        return options.querySelectorAll(selector);
      }

      return [];
    },
    addEventListener(type, listener) {
      if (type === 'submit') {
        submitListeners.push(listener);
      }
    },
  };
  const window = {
    MauticLocaleFixConfig: config,
    Intl,
    Date,
    document,
    Mautic: options.mautic || {},
    setTimeout(callback) {
      timeouts.push(callback);
      return timeouts.length;
    },
    setInterval(callback) {
      intervals.push(callback);
      callback();
      return intervals.length;
    },
    clearInterval() {},
    mQuery: options.query,
  };

  const context = {
    window,
    document,
    Intl,
    Date,
    Array,
    Object,
    String,
    RegExp,
    parseInt,
    isNaN,
  };

  vm.runInNewContext(source, context, {filename: 'locale-fix.js'});

  return {
    input,
    form,
    window,
    submitListeners,
    flushTimeouts() {
      while (timeouts.length > 0) {
        timeouts.shift()();
      }
    },
  };
}

function testDisabledConfigDoesNothing() {
  const calls = [];
  const mautic = {
    submitCampaignEvent() {
      calls.push('original');
    },
  };

  const env = runPlugin({
    enabled: false,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    mauticTimezone: 'Europe/Belgrade',
  }, {mautic});

  assert.strictEqual(env.window.Mautic.submitCampaignEvent, mautic.submitCampaignEvent);
  env.window.Mautic.submitCampaignEvent();
  assert.deepStrictEqual(calls, ['original']);
  assert.strictEqual(env.submitListeners.length, 0);
}

function testCampaignSubmitConvertsLocalMauticTimeToUtc() {
  const seen = [];
  const env = runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: true,
    mauticTimezone: 'Europe/Belgrade',
  }, {
    mautic: {
      submitCampaignEvent() {
        seen.push(env.input.value);
      },
    },
  });

  env.window.Mautic.submitCampaignEvent();
  assert.deepStrictEqual(seen, ['2026-06-29 13:00:00']);
  assert.strictEqual(env.input.value, '2026-06-29 13:00:00');
  assert.strictEqual(env.input.getAttribute('data-mautic-locale-fix-utc-submit'), '1');

  env.submitListeners[0]({target: env.form});
  assert.strictEqual(env.input.value, '2026-06-29 13:00:00');

  env.flushTimeouts();
  assert.strictEqual(env.input.value, '2026-06-29 15:00');
  assert.strictEqual(env.input.getAttribute('data-mautic-locale-fix-utc-submit'), null);
}

function testCampaignSubmitDoesNotPatchDatepickerWhenCalendarFixIsOff() {
  const datetimepicker = function () {};
  const query = function () {
    return {each() {}};
  };
  query.fn = {datetimepicker};

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: true,
    mauticTimezone: 'Europe/Belgrade',
  }, {
    query,
    mautic: {
      submitCampaignEvent() {},
    },
  });

  assert.strictEqual(query.fn.datetimepicker, datetimepicker);
  assert.strictEqual(query.fn.datetimepicker.__mauticLocaleFixPatched, undefined);
}

function createDatepickerQuery(original, elements = []) {
  original.defaults = original.defaults || {};
  const setOptionsCalls = [];
  const query = function (target) {
    const collectionElements = typeof target === 'string' && target.indexOf('data-mautic-locale-fix-date-text') !== -1
      ? []
      : (target && target.getAttribute ? [target] : elements);
    const collection = {
      length: collectionElements.length,
      datetimepicker(command, options) {
        if (command === 'setOptions') {
          collectionElements.forEach((element) => {
            setOptionsCalls.push({element, options});
          });

          return collection;
        }

        return original.apply(collection, arguments);
      },
      each(callback) {
        collectionElements.forEach((element) => callback.call(element));
      },
    };

    return collection;
  };
  query.__setOptionsCalls = setOptionsCalls;
  query.fn = {datetimepicker: original};
  query.extend = function (target, ...sources) {
    return Object.assign(target, ...sources);
  };
  query.datetimepicker = {
    setLocale() {},
  };

  return query;
}

function testThirdPartyDatePickerKeepsItsOptionsUntouched() {
  const seen = [];
  const thirdPartyInput = createInput('', {
    attrs: {'data-toggle': 'date'},
  });
  const original = function (options) {
    seen.push(options);

    return this;
  };
  const query = createDatepickerQuery(original);

  runPlugin({
    enabled: true,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
  }, {query});

  query.fn.datetimepicker.call({
    0: thirdPartyInput,
    length: 1,
  }, {
    timepicker: false,
    format: 'Y-m-d',
    onSelectDate() {},
  });

  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].dayOfWeekStart, undefined);
  assert.strictEqual(seen[0].format, 'Y-m-d');
  assert.strictEqual(typeof seen[0].onSelectDate, 'function');
  assert.strictEqual(query.fn.datetimepicker.defaults.dayOfWeekStart, 1);
}

function testCalendarFixSetsDefaultWeekStartWithoutWrappingDatepicker() {
  const seen = [];
  const coreInput = createInput('', {
    matches(selector) {
      return selector.includes('#daterange_date_from');
    },
  });
  const original = function (options) {
    seen.push(options);

    return this;
  };
  const query = createDatepickerQuery(original);

  runPlugin({
    enabled: true,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
  }, {query});

  assert.strictEqual(query.fn.datetimepicker, original);
  query.fn.datetimepicker.call({
    0: coreInput,
    length: 1,
  }, {
    timepicker: false,
    format: 'Y-m-d',
  });

  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].dayOfWeekStart, undefined);
  assert.strictEqual(seen[0].format, 'Y-m-d');
  assert.strictEqual(query.fn.datetimepicker.defaults.dayOfWeekStart, 1);
}

function testExplicitOptInDateRangeDoesNotWrapDatepickerOptions() {
  const seen = [];
  const optInInput = createInput('', {
    attrs: {'data-mautic-locale-fix-format': '1'},
  });
  const original = function (options) {
    seen.push(options);

    return this;
  };
  const query = createDatepickerQuery(original);

  runPlugin({
    enabled: true,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
  }, {query});

  assert.strictEqual(query.fn.datetimepicker, original);
  query.fn.datetimepicker.call({
    0: optInInput,
    length: 1,
  }, {
    timepicker: false,
    format: 'Y-m-d',
  });

  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].dayOfWeekStart, undefined);
  assert.strictEqual(seen[0].format, 'Y-m-d');
  assert.strictEqual(query.fn.datetimepicker.defaults.dayOfWeekStart, 1);
}

function testCalendarFixUpdatesExistingDateRangePickerOptions() {
  const dateRangeInput = createInput('2026-06-30', {
    matches(selector) {
      return selector.includes('#daterange_date_from');
    },
  });
  const original = function () {
    return this;
  };
  const query = createDatepickerQuery(original, [dateRangeInput]);

  runPlugin({
    enabled: true,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
  }, {query});

  assert.strictEqual(query.fn.datetimepicker, original);
  assert.strictEqual(query.__setOptionsCalls.length, 1);
  assert.strictEqual(query.__setOptionsCalls[0].element, dateRangeInput);
  assert.strictEqual(query.__setOptionsCalls[0].options.dayOfWeekStart, 1);
  assert.strictEqual(dateRangeInput.getAttribute('data-mautic-locale-fix-options'), 'weekStart=1;format=');
}

function testActiveDisabledStopsAllFeaturePatches() {
  const seen = [];
  const original = function (options) {
    seen.push(options);

    return this;
  };
  const query = createDatepickerQuery(original);
  const calls = [];

  const env = runPlugin({
    enabled: false,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: true,
    mauticTimezone: 'Europe/Belgrade',
  }, {
    query,
    mautic: {
      submitCampaignEvent() {
        calls.push(env.input.value);
      },
    },
  });

  query.fn.datetimepicker({format: 'Y-m-d'});
  env.window.Mautic.submitCampaignEvent();

  assert.strictEqual(query.fn.datetimepicker, original);
  assert.deepStrictEqual(seen, [{format: 'Y-m-d'}]);
  assert.deepStrictEqual(calls, ['2026-06-29 15:00']);
  assert.strictEqual(env.submitListeners.length, 0);
}

function testActiveDisabledRestoresLegacyDatepickerWrapper() {
  const original = function () {
    return this;
  };
  original.defaults = {};
  const staleWrapper = function () {
    return original.apply(this, arguments);
  };
  staleWrapper.defaults = original.defaults;
  staleWrapper.__mauticLocaleFixPatched = true;
  staleWrapper.__mauticLocaleFixOriginal = original;
  const query = createDatepickerQuery(staleWrapper);

  runPlugin({
    enabled: false,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
  }, {query});

  assert.strictEqual(query.fn.datetimepicker, original);
  assert.strictEqual(query.fn.datetimepicker.__mauticLocaleFixPatched, undefined);
}

function testCalendarFixRestoresLegacyDatepickerWrapper() {
  const original = function () {
    return this;
  };
  original.defaults = {};
  const staleWrapper = function () {
    return original.apply(this, arguments);
  };
  staleWrapper.defaults = original.defaults;
  staleWrapper.__mauticLocaleFixPatched = true;
  staleWrapper.__mauticLocaleFixOriginal = original;
  const query = createDatepickerQuery(staleWrapper);

  runPlugin({
    enabled: true,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
  }, {query});

  assert.strictEqual(query.fn.datetimepicker, original);
  assert.strictEqual(query.fn.datetimepicker.__mauticLocaleFixPatched, undefined);
  assert.strictEqual(query.fn.datetimepicker.defaults.dayOfWeekStart, 1);
}

function testCalendarFixFormatsPlainTableDateCells() {
  const dateCell = createTextElement('June 28, 2026');
  const campaignNameCell = createTextElement('Isporuka 29.07.2026. podsetnik 24h');

  runPlugin({
    enabled: true,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
    locale: 'en_US',
  }, {
    querySelectorAll(selector) {
      if (selector.includes('table td')) {
        return [dateCell, campaignNameCell];
      }

      return [];
    },
  });

  assert.strictEqual(dateCell.textContent, '28 Jun 2026');
  assert.strictEqual(campaignNameCell.textContent, 'Isporuka 29.07.2026. podsetnik 24h');
}

function testDateRangeInitialValuesAreLocalizedButSubmitStaysNative() {
  const fromInput = createInput('Jun 4, 2026', {
    matches(selector) {
      return selector.includes('#daterange_date_from') || selector.includes('daterange[date_from]');
    },
  });
  const toInput = createInput('Jul 3, 2026', {
    matches(selector) {
      return selector.includes('#daterange_date_to') || selector.includes('daterange[date_to]');
    },
  });
  const dateRangeForm = {
    querySelector(selector) {
      if (selector.includes('date_from')) {
        return fromInput;
      }
      if (selector.includes('date_to')) {
        return toInput;
      }

      return null;
    },
    matches(selector) {
      return selector === 'form[name="daterange"]';
    },
  };
  fromInput.closest = () => dateRangeForm;
  toInput.closest = () => dateRangeForm;

  const original = function () {
    return this;
  };
  const query = createDatepickerQuery(original, [fromInput, toInput]);
  const env = runPlugin({
    enabled: true,
    calendarEnabled: true,
    campaignDateTimeUtcSubmit: false,
    weekStart: 1,
    dateFormat: 'locale_medium',
    locale: 'ru',
  }, {
    query,
    querySelector(selector) {
      if (selector.includes('date_from')) {
        return fromInput;
      }
      if (selector.includes('date_to')) {
        return toInput;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('date_from')) {
        return [fromInput];
      }
      if (selector.includes('data-mautic-locale-fix-date-text')) {
        return [];
      }
      if (selector.includes('table td')) {
        return [];
      }

      return [];
    },
  });

  assert.strictEqual(fromInput.value, 'Июн 4, 2026');
  assert.strictEqual(toInput.value, 'Июл 3, 2026');

  const rangeCalls = query.__setOptionsCalls.filter((call) => typeof call.options.onShow === 'function');
  assert.ok(rangeCalls.length >= 2);

  const fromOptions = rangeCalls.find((call) => call.element === fromInput).options;
  const fromLimits = [];
  fromOptions.onShow.call({
    setOptions(options) {
      fromLimits.push(options);
    },
  });
  assert.strictEqual(fromLimits[0].maxDate.getFullYear(), 2026);
  assert.strictEqual(fromLimits[0].maxDate.getMonth(), 6);
  assert.strictEqual(fromLimits[0].maxDate.getDate(), 3);

  const toOptions = rangeCalls.find((call) => call.element === toInput).options;
  const toLimits = [];
  toOptions.onShow.call({
    setOptions(options) {
      toLimits.push(options);
    },
  });
  assert.strictEqual(toLimits[0].minDate.getFullYear(), 2026);
  assert.strictEqual(toLimits[0].minDate.getMonth(), 5);
  assert.strictEqual(toLimits[0].minDate.getDate(), 4);

  env.submitListeners[0]({target: dateRangeForm});
  assert.strictEqual(fromInput.value, 'Jun 4, 2026');
  assert.strictEqual(toInput.value, 'Jul 3, 2026');

  env.flushTimeouts();
  assert.strictEqual(fromInput.value, 'Июн 4, 2026');
  assert.strictEqual(toInput.value, 'Июл 3, 2026');
}

testDisabledConfigDoesNothing();
testCampaignSubmitConvertsLocalMauticTimeToUtc();
testCampaignSubmitDoesNotPatchDatepickerWhenCalendarFixIsOff();
testThirdPartyDatePickerKeepsItsOptionsUntouched();
testCalendarFixSetsDefaultWeekStartWithoutWrappingDatepicker();
testExplicitOptInDateRangeDoesNotWrapDatepickerOptions();
testCalendarFixUpdatesExistingDateRangePickerOptions();
testActiveDisabledStopsAllFeaturePatches();
testActiveDisabledRestoresLegacyDatepickerWrapper();
testCalendarFixRestoresLegacyDatepickerWrapper();
testCalendarFixFormatsPlainTableDateCells();
testDateRangeInitialValuesAreLocalizedButSubmitStaysNative();

console.log('locale-fix tests passed');
