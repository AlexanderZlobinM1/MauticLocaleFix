const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../../Assets/runtime/locale-fix.js'),
  'utf8'
);
const timezoneLabelStyles = fs.readFileSync(
  path.join(__dirname, '../../Assets/css/timezone-label.css'),
  'utf8'
);

function createInput(value, options = {}) {
    const attrs = Object.assign({}, options.attrs || {});

    return {
        value,
        id: options.id || '',
        name: options.name || '',
        parentElement: options.parentElement || null,
        disabled: options.disabled === true,
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

function createInputGroup(input) {
  const children = [input];
  const group = {
    children,
    className: 'input-group',
    classList: {
      contains(name) {
        return String(group.className || '').split(/\s+/).indexOf(name) !== -1;
      },
      toggle(name, force) {
        const classes = String(group.className || '').split(/\s+/).filter(Boolean);
        const has = classes.indexOf(name) !== -1;
        const shouldHave = force === undefined ? !has : force;
        if (shouldHave && !has) classes.push(name);
        if (!shouldHave && has) classes.splice(classes.indexOf(name), 1);
        group.className = classes.join(' ');
        return shouldHave;
      },
      remove(name) {
        group.className = String(group.className || '').split(/\s+/).filter((item) => item && item !== name).join(' ');
      },
    },
    insertBefore(child, reference) {
      const index = reference ? children.indexOf(reference) : -1;
      child.parentNode = group;
      if (index === -1) {
        children.push(child);
      } else {
        children.splice(index, 0, child);
      }
    },
    appendChild(child) {
      if (child.parentNode && child.parentNode.children) {
        const oldIndex = child.parentNode.children.indexOf(child);
        if (oldIndex !== -1) child.parentNode.children.splice(oldIndex, 1);
      }
      child.parentNode = group;
      child.parentElement = group;
      const previous = children.indexOf(child);
      if (previous !== -1) children.splice(previous, 1);
      children.push(child);
    },
    getBoundingClientRect() {
      return {width: input.timezoneControlWidth || 500};
    },
  };

  input.parentElement = group;
  const outerChildren = [group];
  const outer = {
    children: outerChildren,
    insertBefore(child, reference) {
      const index = reference ? outerChildren.indexOf(reference) : -1;
      child.parentNode = outer;
      child.parentElement = outer;
      if (child === group) {
        const oldIndex = outerChildren.indexOf(group);
        if (oldIndex !== -1) outerChildren.splice(oldIndex, 1);
      }
      outerChildren.splice(index < 0 ? outerChildren.length : index, 0, child);
    },
  };
  group.parentElement = outer;
  group.parentNode = outer;
  group.outer = outer;
  Object.defineProperty(input, 'nextSibling', {
    get() {
      const index = children.indexOf(input);
      return index === -1 ? null : children[index + 1] || null;
    },
  });

  return group;
}

function createLabel() {
  const children = [];
  return {
    children,
    appendChild(child) {
      child.parentNode = this;
      children.push(child);
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

function createTable(rows) {
  const rowObjects = rows.map((cells) => {
    const cellObjects = cells.map((cell) => typeof cell === 'string' ? createTextElement(cell) : cell);

    return {
      cells: cellObjects,
      querySelectorAll(selector) {
        if (selector === 'th,td' || selector === 'td,th') {
          return cellObjects;
        }

        return [];
      },
    };
  });

  return {
    rows: rowObjects,
    querySelectorAll(selector) {
      if (selector === 'tr') {
        return rowObjects;
      }
      if (selector === 'th,td' || selector === 'td,th') {
        return rowObjects.length ? rowObjects[0].cells : [];
      }

      return [];
    },
  };
}

function runPlugin(config, options = {}) {
  const timeouts = [];
  const submitListeners = [];
  const intervals = [];
  const resizeObservers = [];
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
        const matches = options.querySelectorAll(selector);
        if (matches) {
          return matches;
        }
      }

      if (selector === 'input[name="campaignevent[triggerDate]"]') {
        return [input];
      }

      return [];
    },
    addEventListener(type, listener) {
      if (type === 'submit') {
        submitListeners.push(listener);
      }
    },
    removeEventListener() {},
    createElement() {
      const element = {
        children: [],
        className: '',
        attributes: {},
        classList: {
          contains(name) {
            return String(element.className || '').split(/\s+/).indexOf(name) !== -1;
          },
        },
        appendChild(child) {
          const oldParent = child.parentNode;
          if (oldParent && oldParent.children) {
            const index = oldParent.children.indexOf(child);
            if (index !== -1) oldParent.children.splice(index, 1);
          }
          child.parentNode = this;
          child.parentElement = this;
          this.children.push(child);
        },
        insertBefore(child, reference) {
          child.parentNode = this;
          child.parentElement = this;
          const index = reference ? this.children.indexOf(reference) : -1;
          this.children.splice(index < 0 ? this.children.length : index, 0, child);
        },
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
        getAttribute(name) {
          return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
        },
        remove() {
          if (this.parentNode) {
            const index = this.parentNode.children.indexOf(this);
            if (index !== -1) {
              this.parentNode.children.splice(index, 1);
            }
            this.parentNode = null;
            this.parentElement = null;
          }
        },
      };
      return element;
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
      const interval = {callback, active: true};
      intervals.push(interval);
      callback();
      return interval;
    },
    clearInterval(interval) {
      if (interval) {
        interval.active = false;
      }
    },
    mQuery: options.query,
    Chart: options.Chart,
    ResizeObserver: class {
      constructor(callback) {
        this.callback = callback;
        this.targets = [];
        resizeObservers.push(this);
      }
      observe(target) {
        this.targets.push(target);
      }
      disconnect() {}
    },
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
    flushIntervals() {
      intervals.forEach((interval) => {
        if (interval.active) {
          interval.callback();
        }
      });
    },
    resize(target, width) {
      resizeObservers.forEach((observer) => {
        if (observer.targets.indexOf(target) !== -1) {
          observer.callback([{target, contentRect: {width}}]);
        }
      });
    },
  };
}

function createChartConstructor() {
  function Chart(context, config) {
    this.context = context;
    this.config = config || {};
    this.data = this.config.data || {};
    this.options = this.config.options || {};
    this.updateCalls = [];
    Chart.instances.push(this);
    Chart._plugins.forEach((plugin) => {
      if (typeof plugin.beforeInit === 'function') {
        plugin.beforeInit(this);
      }
      if (typeof plugin.beforeUpdate === 'function') {
        plugin.beforeUpdate(this);
      }
    });

    return this;
  }

  Chart.instances = [];
  Chart._plugins = [];
  Chart.plugins = {
    register(plugin) {
      if (!Chart._plugins.includes(plugin)) {
        Chart._plugins.push(plugin);
      }
    },
    unregister(plugin) {
      Chart._plugins = Chart._plugins.filter((registered) => registered !== plugin);
    },
  };
  Chart.defaults = {};
  Chart.version = '2.9.4-test';
  Chart.prototype.update = function update(mode) {
    this.updateCalls.push(mode);
  };

  return Chart;
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

function testCampaignSubmitTimezoneWorkaroundIsDisabledEvenIfSaved() {
  const seen = [];
  const input = createInput('2026-06-29 13:00');
  const env = runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: true,
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input,
    mautic: {
      submitCampaignEvent() {
        seen.push(env.input.value);
      },
    },
  });

  assert.strictEqual(env.input.value, '2026-06-29 13:00');
  assert.strictEqual(env.input.getAttribute('data-mautic-locale-fix-local-display'), null);
  assert.strictEqual(env.input.getAttribute('data-mautic-locale-fix-original-utc'), null);

  env.window.Mautic.submitCampaignEvent();
  assert.deepStrictEqual(seen, ['2026-06-29 13:00']);
  assert.strictEqual(env.input.value, '2026-06-29 13:00');
  assert.strictEqual(env.input.getAttribute('data-mautic-locale-fix-utc-submit'), null);
  assert.strictEqual(env.submitListeners.length, 0);

  env.flushTimeouts();
  assert.strictEqual(env.input.value, '2026-06-29 13:00');
  assert.strictEqual(env.input.getAttribute('data-mautic-locale-fix-utc-submit'), null);
}

function testCampaignTriggerDateDisplayIsLeftToMauticUserTimezone() {
  const input = createInput('2026-07-07 07:00');
  const env = runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: true,
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input,
    mautic: {
      submitCampaignEvent() {},
    },
  });

  assert.strictEqual(env.input.value, '2026-07-07 07:00');
  env.flushIntervals();
  assert.strictEqual(env.input.value, '2026-07-07 07:00');
}

function testBlankCampaignTriggerDateIsNotNormalized() {
  const seen = [];
  const input = createInput('');
  const env = runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: true,
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input,
    mautic: {
      submitCampaignEvent() {
        seen.push(env.input.value);
      },
    },
  });

  assert.strictEqual(env.input.getAttribute('data-mautic-locale-fix-local-display'), null);
  env.input.value = '2026-07-07 09:00';
  env.flushIntervals();
  assert.strictEqual(env.input.value, '2026-07-07 09:00');

  env.window.Mautic.submitCampaignEvent();
  assert.deepStrictEqual(seen, ['2026-07-07 09:00']);
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

function testTimestampColumnsCanUse24HourTime() {
  const timeCell = createTextElement('Сегодня, 8:46 pm');
  const typeCell = createTextElement('Контакт обновлен 8:46 pm');
  const table = createTable([
    ['Имя пользователя / источник', 'Тип события', 'Отметка времени события'],
    ['Система', typeCell, timeCell],
  ]);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: '24h',
  }, {
    querySelectorAll(selector) {
      if (selector === 'table') {
        return [table];
      }

      return [];
    },
  });

  assert.strictEqual(timeCell.textContent, 'Сегодня, 20:46');
  assert.strictEqual(typeCell.textContent, 'Контакт обновлен 8:46 pm');
}

function testLastLoginColumnsCanUse24HourTime() {
  const timeCell = createTextElement('Сегодня, 11:45 am');
  const table = createTable([
    ['Имя', 'Имя пользователя', 'email', 'Роль', 'Последний вход', 'ID'],
    ['Zlobin, Alexander', 'zlobin', 'alexander.zlobin@m1.rs', 'Administrator', timeCell, '1'],
  ]);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: '24h',
  }, {
    querySelectorAll(selector) {
      if (selector === 'table') {
        return [table];
      }

      return [];
    },
  });

  assert.strictEqual(timeCell.textContent, 'Сегодня, 11:45');
}

function testTimestampColumnsCanUse12HourTime() {
  const timeCell = createTextElement('Today, 20:46');
  const table = createTable([
    ['User/source', 'Event type', 'Event timestamp'],
    ['System', 'Contact updated', timeCell],
  ]);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: '12h',
  }, {
    querySelectorAll(selector) {
      if (selector === 'table') {
        return [table];
      }

      return [];
    },
  });

  assert.strictEqual(timeCell.textContent, 'Today, 8:46 pm');
}

function testTimeFormattingDoesNotRunWhenPluginIsDisabled() {
  const timeCell = createTextElement('Сегодня, 8:46 pm');
  const table = createTable([
    ['Отметка времени события'],
    [timeCell],
  ]);

  runPlugin({
    enabled: false,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: '24h',
  }, {
    querySelectorAll(selector) {
      if (selector === 'table') {
        return [table];
      }

      return [];
    },
  });

  assert.strictEqual(timeCell.textContent, 'Сегодня, 8:46 pm');
}

function testNativeTimeFormattingLeavesTablesUntouched() {
  const timeCell = createTextElement('Сегодня, 8:46 pm');
  const table = createTable([
    ['Отметка времени события'],
    [timeCell],
  ]);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: 'native',
  }, {
    querySelectorAll(selector) {
      if (selector === 'table') {
        return [table];
      }

      return [];
    },
  });

  assert.strictEqual(timeCell.textContent, 'Сегодня, 8:46 pm');
}

function testChartTicksCanUse24HourTime() {
  const Chart = createChartConstructor();
  const env = runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: '24h',
  }, {Chart});
  const config = {
    data: {
      labels: ['12:00 am', '4:00 am', '12:00 pm', '8:00 pm'],
    },
    options: {
      scales: {
        xAxes: [{
          ticks: {
            callback(value) {
              return value;
            },
          },
        }],
      },
      tooltips: {
        callbacks: {
          title() {
            return '4:00 pm';
          },
        },
      },
    },
  };

  const chart = new env.window.Chart(null, config);
  env.flushIntervals();

  assert.deepStrictEqual(chart.data.labels, ['12:00 am', '4:00 am', '12:00 pm', '8:00 pm']);
  assert.strictEqual(config.options.scales.xAxes[0].ticks.callback('8:00 pm'), '20:00');
  assert.strictEqual(config.options.tooltips.callbacks.title(), '16:00');
  assert.strictEqual(env.window.Chart, Chart);
}

function testChartTicksCanUse12HourTime() {
  const Chart = createChartConstructor();
  const env = runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: '12h',
  }, {Chart});
  const config = {
    data: {
      labels: ['00:00', '04:00', '12:00', '20:00'],
    },
    options: {
      scales: {
        x: {
          ticks: {
            callback(value) {
              return value;
            },
          },
        },
      },
    },
  };

  const chart = new env.window.Chart(null, config);
  env.flushIntervals();

  assert.deepStrictEqual(chart.data.labels, ['00:00', '04:00', '12:00', '20:00']);
  assert.strictEqual(config.options.scales.x.ticks.callback('16:00'), '4:00 pm');
}

function testExistingChartTicksAreFormattedWithoutMutatingLabels() {
  const Chart = createChartConstructor();
  const config = {
    data: {
      labels: ['12:00 am', '8:00 pm'],
    },
    options: {
      scales: {
        xAxes: [{ticks: {}}],
      },
    },
  };
  const chart = new Chart(null, config);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: '24h',
  }, {Chart});

  assert.deepStrictEqual(chart.data.labels, ['12:00 am', '8:00 pm']);
  assert.strictEqual(config.options.scales.xAxes[0].ticks.callback('8:00 pm'), '20:00');
  assert.strictEqual(chart.updateCalls.length, 0);
}

function testChartDateLabelsUseLocaleWithoutMutatingLabelsOrRedrawing() {
  const Chart = createChartConstructor();
  const config = {
    data: {
      labels: ['Jun 6, 26', 'Jul 6, 26'],
    },
    options: {
      scales: {
        xAxes: [{ticks: {}}],
      },
    },
  };
  const chart = new Chart(null, config);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: 'native',
    locale: 'ru',
  }, {Chart});

  assert.deepStrictEqual(chart.data.labels, ['Jun 6, 26', 'Jul 6, 26']);
  assert.strictEqual(config.options.scales.xAxes[0].ticks.callback('Jun 6, 26'), '6 Июн 26');
  assert.strictEqual(config.options.scales.xAxes[0].ticks.callback('Jul 6, 26'), '6 Июл 26');
  assert.strictEqual(chart.updateCalls.length, 0);
}

function testNativeTimeFormattingLeavesChartsUntouched() {
  const Chart = createChartConstructor();
  const env = runPlugin({
    enabled: true,
    calendarEnabled: false,
    campaignDateTimeUtcSubmit: false,
    timeDisplayFormat: 'native',
  }, {Chart});
  const config = {
    data: {
      labels: ['12:00 am', '8:00 pm'],
    },
  };
  const chart = new env.window.Chart(null, config);

  assert.strictEqual(env.window.Chart, Chart);
  assert.deepStrictEqual(chart.data.labels, ['12:00 am', '8:00 pm']);
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

function testInactiveCampaignScheduleEditIsExplicitAndReversible() {
  const input = createInput('2026-09-02 21:35', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
    disabled: true,
  });
  createInputGroup(input);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'hidden',
    allowInactiveCampaignScheduleEdit: true,
  }, {
    input,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [input] : [];
    },
  });

  assert.strictEqual(input.disabled, false);
  assert.strictEqual(input.getAttribute('data-mautic-locale-fix-inactive-schedule-edit'), '1');

  const standardInput = createInput('2026-09-02 21:35', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
    disabled: true,
  });
  createInputGroup(standardInput);
  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'hidden',
    allowInactiveCampaignScheduleEdit: false,
  }, {
    input: standardInput,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [standardInput] : [];
    },
  });

  assert.strictEqual(standardInput.disabled, true);
  assert.strictEqual(standardInput.getAttribute('data-mautic-locale-fix-inactive-schedule-edit'), null);
}

function testTimezoneOffsetLabelUsesScheduledDateDstOffset() {
  const input = createInput('2026-07-15 12:00', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
  });
  const group = createInputGroup(input);
  const outer = group.outer;
  const label = createLabel();

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'offset',
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input,
    querySelector(selector) {
      return selector === 'label[for="campaign_publishUp"]' ? label : null;
    },
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [input] : [];
    },
  });

  assert.strictEqual(label.children.length, 0);
  assert.strictEqual(outer.children[0], group);
  assert.strictEqual(group.children[0], input);
  assert.strictEqual(group.children[1].textContent, ' (UTC+02:00)');
  assert.ok(group.children[1].className.indexOf('input-group-addon') !== -1);
  assert.ok(!group.classList.contains('mautic-locale-fix-timezone-control--narrow'));
  assert.ok(timezoneLabelStyles.indexOf('.input-group.mautic-locale-fix-timezone-control--narrow') !== -1);

  const narrowInput = createInput('2026-07-15 12:00', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
  });
  narrowInput.timezoneControlWidth = 230;
  const narrowGroup = createInputGroup(narrowInput);
  const narrowRuntime = runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'offset',
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input: narrowInput,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [narrowInput] : [];
    },
  });
  assert.ok(narrowGroup.classList.contains('mautic-locale-fix-timezone-control--narrow'));
  assert.strictEqual(narrowGroup.children[0], narrowInput);
  assert.strictEqual(narrowGroup.children[1].textContent, ' (UTC+02:00)');
  assert.ok(timezoneLabelStyles.indexOf('flex-flow: row nowrap') !== -1);
  assert.ok(timezoneLabelStyles.indexOf('font-size: 11px') !== -1);
  assert.ok(timezoneLabelStyles.indexOf('padding: 4px 5px') !== -1);
  narrowRuntime.resize(narrowGroup, 500);
  assert.ok(!narrowGroup.classList.contains('mautic-locale-fix-timezone-control--narrow'));
  narrowRuntime.resize(narrowGroup, 230);
  assert.ok(narrowGroup.classList.contains('mautic-locale-fix-timezone-control--narrow'));
  assert.strictEqual(input.value, '2026-07-15 12:00');

  const timeOnlyInput = createInput('', {
    id: 'campaignevent_triggerHour',
    name: 'campaignevent[triggerHour]',
  });
  timeOnlyInput.timezoneControlWidth = 75;
  const timeOnlyGroup = createInputGroup(timeOnlyInput);
  const timeOnlyRuntime = runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'offset',
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input: timeOnlyInput,
    querySelectorAll(selector) {
      return selector.indexOf('[triggerHour]') !== -1 ? [timeOnlyInput] : [];
    },
  });
  const timeOnlyLabel = timeOnlyGroup.children[1];
  assert.ok(timeOnlyGroup.classList.contains('mautic-locale-fix-timezone-control--narrow'));
  assert.ok(timeOnlyGroup.classList.contains('mautic-locale-fix-timezone-control--time-only'));
  assert.ok(timeOnlyLabel.className.indexOf('mautic-locale-fix-timezone-label--stacked') !== -1);
  assert.strictEqual(timeOnlyLabel.children[0].textContent, 'UTC');
  const timeOnlyOffset = timeOnlyLabel.children[1].textContent;
  assert.ok(/^[+-]\d{2}:\d{2}$/.test(timeOnlyOffset));
  assert.strictEqual(timeOnlyLabel.getAttribute('aria-label'), 'UTC' + timeOnlyOffset);
  assert.ok(timezoneLabelStyles.indexOf('flex: 0 0 38px') !== -1);
  assert.ok(timezoneLabelStyles.indexOf('grid-template-columns: 1fr') !== -1);
  timeOnlyRuntime.resize(timeOnlyGroup, 500);
  assert.ok(!timeOnlyLabel.className.includes('mautic-locale-fix-timezone-label--stacked'));
  assert.strictEqual(timeOnlyGroup.classList.contains('mautic-locale-fix-timezone-control--time-only'), true);
  assert.strictEqual(timeOnlyLabel.textContent, ' (UTC' + timeOnlyOffset + ')');
  assert.strictEqual(timeOnlyLabel.getAttribute('aria-label'), ' (UTC' + timeOnlyOffset + ')');
  timeOnlyRuntime.resize(timeOnlyGroup, 75);
  assert.ok(timeOnlyLabel.className.indexOf('mautic-locale-fix-timezone-label--stacked') !== -1);
  assert.strictEqual(timeOnlyLabel.children[0].textContent, 'UTC');
  assert.strictEqual(timeOnlyLabel.children[1].textContent, timeOnlyOffset);

  const standaloneInput = createInput('2026-07-15 12:00', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
  });
  const datepickerButton = {className: 'btn-datepicker'};
  const standaloneParent = {
    children: [datepickerButton, standaloneInput],
    insertBefore(child, reference) {
      const index = this.children.indexOf(reference);
      child.parentNode = this;
      child.parentElement = this;
      this.children.splice(index, 0, child);
    },
  };
  standaloneInput.parentNode = standaloneParent;
  standaloneInput.parentElement = standaloneParent;
  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'offset',
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input: standaloneInput,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [standaloneInput] : [];
    },
  });
  assert.strictEqual(standaloneParent.children[0], datepickerButton);
  assert.ok(String(standaloneParent.children[1].className).indexOf('mautic-locale-fix-timezone-control') !== -1);
  assert.strictEqual(standaloneParent.children[1].children[0], standaloneInput);
  assert.strictEqual(standaloneParent.children[1].children[1].textContent, ' (UTC+02:00)');
}

function testTimezoneLabelUsesTheDisplayedUsersTimezoneForTheSameInstant() {
  const moscowInput = createInput('2026-04-17 07:00', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
  });
  const moscowControl = createInputGroup(moscowInput);
  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'offset',
    mauticTimezone: 'Europe/Moscow',
  }, {
    input: moscowInput,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [moscowInput] : [];
    },
  });

  const cestInput = createInput('2026-04-17 06:00', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
  });
  const cestControl = createInputGroup(cestInput);
  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'offset',
    mauticTimezone: 'Europe/Belgrade',
  }, {
    input: cestInput,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [cestInput] : [];
    },
  });

  assert.strictEqual(moscowControl.outer.children[0].children[1].textContent, ' (UTC+03:00)');
  assert.strictEqual(cestControl.outer.children[0].children[1].textContent, ' (UTC+02:00)');
  assert.strictEqual(moscowInput.value, '2026-04-17 07:00');
  assert.strictEqual(cestInput.value, '2026-04-17 06:00');
}

function testTimezoneShortNameUsesInternationalAbbreviation() {
  const input = createInput('2026-04-17 08:00', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
  });
  const control = createInputGroup(input);

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'short',
    mauticTimezone: 'Europe/Moscow',
  }, {
    input,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [input] : [];
    },
  });

  assert.strictEqual(control.outer.children[0].children[1].textContent, ' (MSK)');
  assert.strictEqual(input.value, '2026-04-17 08:00');
}

function testTimezoneShortNameAndHiddenMode() {
  const input = createInput('2026-01-15 12:00', {
    id: 'campaign_publishDown',
    name: 'campaign[publishDown]',
  });
  const control = createInputGroup(input);
  const options = {
    input,
    querySelectorAll(selector) {
      return selector.indexOf('[publishDown]') !== -1 ? [input] : [];
    },
  };

  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'short',
    mauticTimezone: 'Europe/Belgrade',
  }, options);

  assert.strictEqual(control.outer.children[0].children.length, 2);
  assert.strictEqual(control.outer.children[0].children[1].textContent, ' (CET)');

  const hiddenInput = createInput('2026-01-15 12:00', {
    id: 'campaign_publishDown',
    name: 'campaign[publishDown]',
  });
  const hiddenControl = createInputGroup(hiddenInput);
  runPlugin({
    enabled: true,
    calendarEnabled: false,
    timezoneLabelMode: 'hidden',
    mauticTimezone: 'Europe/Belgrade',
  }, Object.assign({}, options, {
    input: hiddenInput,
    querySelectorAll(selector) {
      return selector.indexOf('[publishDown]') !== -1 ? [hiddenInput] : [];
    },
  }));

  assert.strictEqual(hiddenControl.outer.children.length, 1);
  assert.strictEqual(hiddenControl.outer.children[0], hiddenControl);
  assert.strictEqual(hiddenInput.value, '2026-01-15 12:00');
}

function testLegacyOuterTimezoneWrapperIsRemovedWhenPluginIsDisabled() {
  const input = createInput('2026-07-15 12:00', {
    id: 'campaign_publishUp',
    name: 'campaign[publishUp]',
  });
  const group = createInputGroup(input);
  const outer = group.outer;
  const legacyLabel = {
    className: 'input-group-addon mautic-locale-fix-timezone-label',
    parentElement: null,
    parentNode: null,
    remove() {
      const index = this.parentNode.children.indexOf(this);
      if (index !== -1) this.parentNode.children.splice(index, 1);
      this.parentElement = null;
      this.parentNode = null;
    },
  };
  const wrapper = {
    className: 'mautic-locale-fix-timezone-control',
    children: [group, legacyLabel],
    parentNode: outer,
    parentElement: outer,
    classList: {contains(name) { return name === 'mautic-locale-fix-timezone-control'; }},
    remove() {
      const index = outer.children.indexOf(this);
      if (index !== -1) outer.children.splice(index, 1);
    },
  };
  legacyLabel.parentNode = wrapper;
  legacyLabel.parentElement = wrapper;
  group.parentNode = wrapper;
  group.parentElement = wrapper;
  outer.children[0] = wrapper;

  runPlugin({enabled: false, timezoneLabelMode: 'hidden'}, {
    input,
    querySelectorAll(selector) {
      return selector.indexOf('[publishUp]') !== -1 ? [input] : [];
    },
  });

  assert.strictEqual(outer.children.length, 1);
  assert.strictEqual(outer.children[0], group);
  assert.strictEqual(group.children.length, 1);
  assert.strictEqual(group.children[0], input);
}

testDisabledConfigDoesNothing();
testCampaignSubmitTimezoneWorkaroundIsDisabledEvenIfSaved();
testCampaignTriggerDateDisplayIsLeftToMauticUserTimezone();
testBlankCampaignTriggerDateIsNotNormalized();
testCampaignSubmitDoesNotPatchDatepickerWhenCalendarFixIsOff();
testThirdPartyDatePickerKeepsItsOptionsUntouched();
testCalendarFixSetsDefaultWeekStartWithoutWrappingDatepicker();
testExplicitOptInDateRangeDoesNotWrapDatepickerOptions();
testCalendarFixUpdatesExistingDateRangePickerOptions();
testActiveDisabledStopsAllFeaturePatches();
testActiveDisabledRestoresLegacyDatepickerWrapper();
testCalendarFixRestoresLegacyDatepickerWrapper();
testCalendarFixFormatsPlainTableDateCells();
testTimestampColumnsCanUse24HourTime();
testLastLoginColumnsCanUse24HourTime();
testTimestampColumnsCanUse12HourTime();
testTimeFormattingDoesNotRunWhenPluginIsDisabled();
testNativeTimeFormattingLeavesTablesUntouched();
testChartTicksCanUse24HourTime();
testChartTicksCanUse12HourTime();
testExistingChartTicksAreFormattedWithoutMutatingLabels();
testChartDateLabelsUseLocaleWithoutMutatingLabelsOrRedrawing();
testNativeTimeFormattingLeavesChartsUntouched();
testDateRangeInitialValuesAreLocalizedButSubmitStaysNative();
testInactiveCampaignScheduleEditIsExplicitAndReversible();
testTimezoneOffsetLabelUsesScheduledDateDstOffset();
testTimezoneLabelUsesTheDisplayedUsersTimezoneForTheSameInstant();
testTimezoneShortNameUsesInternationalAbbreviation();
testTimezoneShortNameAndHiddenMode();
testLegacyOuterTimezoneWrapperIsRemovedWhenPluginIsDisabled();

console.log('locale-fix tests passed');
