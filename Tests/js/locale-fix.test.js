const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../../Assets/js/locale-fix.js'),
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
      return selector === 'form[name="campaignevent"]' ? form : null;
    },
    querySelectorAll() {
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
  const query = function () {
    return {
      length: elements.length,
      each(callback) {
        elements.forEach((element) => callback.call(element));
      },
    };
  };
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

function testMauticDateRangeGetsWeekStartWithoutChangingFormat() {
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

  query.fn.datetimepicker.call({
    0: coreInput,
    length: 1,
  }, {
    timepicker: false,
    format: 'Y-m-d',
  });

  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].dayOfWeekStart, 1);
  assert.strictEqual(seen[0].format, 'Y-m-d');
}

function testExplicitOptInDateRangeGetsConfiguredDisplayFormat() {
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

  query.fn.datetimepicker.call({
    0: optInInput,
    length: 1,
  }, {
    timepicker: false,
    format: 'Y-m-d',
  });

  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].dayOfWeekStart, 1);
  assert.strictEqual(seen[0].format, 'd M Y');
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

testDisabledConfigDoesNothing();
testCampaignSubmitConvertsLocalMauticTimeToUtc();
testCampaignSubmitDoesNotPatchDatepickerWhenCalendarFixIsOff();
testThirdPartyDatePickerKeepsItsOptionsUntouched();
testMauticDateRangeGetsWeekStartWithoutChangingFormat();
testExplicitOptInDateRangeGetsConfiguredDisplayFormat();
testActiveDisabledStopsAllFeaturePatches();

console.log('locale-fix tests passed');
