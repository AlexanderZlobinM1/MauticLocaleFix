const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../../Assets/runtime/settings-toggle-compat.js'),
  'utf8'
);

function createEnvironment(existingMautic) {
  const attrs = {'data-yes-id': 'setting_1', 'data-no-id': 'setting_0', onclick: 'Mautic.toggleYesNo(this)', onkeydown: 'Mautic.handleKeyDown(event,this)'};
  const inputAttrs = {onchange: 'Mautic.toggleYesNo(this)'};
  const switchClasses = new Set();
  const text = {textContent: 'Yes'};
  const labelClasses = new Set(['toggle__label']);
  const label = {
    className: 'toggle__label',
    classList: {contains: (name) => labelClasses.has(name)},
    parentNode: null,
    getAttribute(name) { return attrs[name] || null; },
    setAttribute(name, value) { attrs[name] = value; },
    removeAttribute(name) { delete attrs[name]; },
  };
  const toggleClasses = new Set(['toggle']);
  const toggle = {
    classList: {contains: (name) => toggleClasses.has(name)},
    getAttribute(name) { return name === 'data-yes' ? 'Yes' : 'No'; },
    querySelector(selector) {
      if (selector === '.toggle__label') return label;
      if (selector === '.toggle__switch') return {classList: {toggle(name, enabled) { enabled ? switchClasses.add(name) : switchClasses.delete(name); }}};
      if (selector === '.toggle__text') return text;
      return null;
    },
  };
  label.parentNode = toggle;
  const yes = {
    tagName: 'INPUT', value: '1', disabled: false, checked: true, parentNode: toggle,
    className: 'mauticlocalefix-feature-toggle',
    removeAttribute(name) { delete inputAttrs[name]; },
    dispatchEvent(event) { this.lastEvent = event; },
  };
  const no = {
    tagName: 'INPUT', value: '0', disabled: false, checked: false, parentNode: toggle,
    className: 'mauticlocalefix-feature-toggle',
    removeAttribute(name) { delete inputAttrs[name]; },
  };
  const otherYes = {tagName: 'INPUT', value: '1', disabled: false, checked: true, className: '', parentNode: null};
  const otherNo = {tagName: 'INPUT', value: '0', disabled: false, checked: false, className: '', parentNode: null};
  const otherLabelClasses = new Set(['toggle__label']);
  const otherLabel = {
    classList: {contains: (name) => otherLabelClasses.has(name)},
    parentNode: null,
    getAttribute(name) { return name === 'data-yes-id' ? 'other_1' : name === 'data-no-id' ? 'other_0' : null; },
  };
  const otherToggle = {
    classList: {contains: (name) => name === 'toggle'},
    querySelector(selector) { return selector === '.toggle__label' ? otherLabel : null; },
  };
  otherLabel.parentNode = otherToggle;
  otherYes.parentNode = otherToggle;
  otherNo.parentNode = otherToggle;
  const handlers = {};
  const document = {
    querySelectorAll() { return [yes, no]; },
    getElementById(id) {
      return id === 'setting_1' ? yes : id === 'setting_0' ? no : id === 'other_1' ? otherYes : id === 'other_0' ? otherNo : null;
    },
    addEventListener(type, handler) { handlers[type] = handler; },
  };
  const window = {Mautic: existingMautic, Event: function Event(type, options) { this.type = type; this.bubbles = options.bubbles; }};
  vm.runInNewContext(source, {window, document, Array}, {filename: 'settings-toggle-compat.js'});

  return {window, document, yes, no, label, attrs, inputAttrs, handlers, text, switchClasses, otherYes, otherNo, otherLabel};
}

const directRoute = createEnvironment(undefined);
assert.strictEqual(directRoute.yes.checked, true);
assert.strictEqual(directRoute.attrs.onclick, undefined);
assert.strictEqual(directRoute.attrs.onkeydown, undefined);
assert.strictEqual(directRoute.inputAttrs.onchange, undefined);

directRoute.handlers.click({target: directRoute.label});
assert.strictEqual(directRoute.yes.checked, false);
assert.strictEqual(directRoute.no.checked, true);
assert.strictEqual(directRoute.label.getAttribute('aria-checked'), 'false');
assert.strictEqual(directRoute.text.textContent, 'No');
assert.strictEqual(directRoute.switchClasses.has('toggle__switch--checked'), false);
assert.strictEqual(directRoute.yes.lastEvent.type, 'change');

directRoute.handlers.keydown({
  target: directRoute.label,
  key: ' ',
  preventDefault() { this.prevented = true; },
});
assert.strictEqual(directRoute.yes.checked, true);
assert.strictEqual(directRoute.no.checked, false);
assert.strictEqual(directRoute.label.getAttribute('aria-checked'), 'true');
assert.strictEqual(directRoute.text.textContent, 'Yes');

directRoute.handlers.click({target: directRoute.otherLabel});
assert.strictEqual(directRoute.otherYes.checked, true);
assert.strictEqual(directRoute.otherNo.checked, false);

const existingToggle = function () {};
const existingKeyHandler = function () {};
const normalRoute = createEnvironment({toggleYesNo: existingToggle, handleKeyDown: existingKeyHandler});
assert.strictEqual(normalRoute.window.Mautic.toggleYesNo, existingToggle);
assert.strictEqual(normalRoute.attrs.onclick, undefined);
assert.strictEqual(normalRoute.attrs.onkeydown, undefined);
assert.strictEqual(normalRoute.inputAttrs.onchange, undefined);
normalRoute.handlers.click({target: normalRoute.label});
assert.strictEqual(normalRoute.yes.checked, false);
assert.strictEqual(normalRoute.no.checked, true);

console.log('settings toggle compatibility tests passed');
