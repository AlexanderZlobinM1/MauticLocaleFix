const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../../Assets/js/locale-fix.js'),
  'utf8'
);

function createInput(value) {
  const attrs = {};

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

testDisabledConfigDoesNothing();
testCampaignSubmitConvertsLocalMauticTimeToUtc();
testCampaignSubmitDoesNotPatchDatepickerWhenCalendarFixIsOff();

console.log('locale-fix tests passed');
