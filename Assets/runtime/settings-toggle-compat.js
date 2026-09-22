(function (window, document) {
    'use strict';

    var controlsSelector = 'input.mauticlocalefix-calendar-toggle, input.mauticlocalefix-feature-toggle';
    var controls = document.querySelectorAll(controlsSelector);

    if (!controls.length) {
        return;
    }

    function findParentToggle(element) {
        while (element && element !== document) {
            if (element.classList && element.classList.contains('toggle')) {
                return element;
            }
            element = element.parentNode;
        }

        return null;
    }

    function isPluginToggleInput(input) {
        if (!input) {
            return false;
        }
        if (typeof input.matches === 'function') {
            return input.matches(controlsSelector);
        }

        var classNames = ' ' + String(input.className || '') + ' ';

        return classNames.indexOf(' mauticlocalefix-calendar-toggle ') !== -1 ||
            classNames.indexOf(' mauticlocalefix-feature-toggle ') !== -1;
    }

    function getRadio(toggle, id) {
        var radio = id && typeof document.getElementById === 'function'
            ? document.getElementById(id)
            : null;

        return isPluginToggleInput(radio) && findParentToggle(radio) === toggle ? radio : null;
    }

    function updateAppearance(label, toggle, isYes) {
        label.setAttribute('aria-checked', isYes ? 'true' : 'false');

        var switchElement = toggle.querySelector('.toggle__switch');
        var textElement = toggle.querySelector('.toggle__text');
        if (switchElement && switchElement.classList) {
            switchElement.classList.toggle('toggle__switch--checked', isYes);
        }
        if (textElement) {
            textElement.textContent = toggle.getAttribute(isYes ? 'data-yes' : 'data-no');
        }
    }

    function toggleValue(label) {
        var toggle = findParentToggle(label);
        if (!toggle || (toggle.classList.contains('toggle--disabled') || toggle.classList.contains('toggle--readonly'))) {
            return;
        }

        var yesRadio = getRadio(toggle, label.getAttribute('data-yes-id'));
        var noRadio = getRadio(toggle, label.getAttribute('data-no-id'));
        if (!yesRadio || !noRadio || yesRadio.disabled || noRadio.disabled) {
            return;
        }

        var isYes = !yesRadio.checked;
        yesRadio.checked = isYes;
        noRadio.checked = !isYes;
        updateAppearance(label, toggle, isYes);

        // Keep Symfony's form and LocaleFix's dependent-setting listeners
        // informed without invoking the core theme's inline Mautic callback.
        dispatchChange(yesRadio);
    }

    function dispatchChange(input) {
        if (typeof input.dispatchEvent !== 'function' || typeof window.Event !== 'function') {
            return;
        }
        input.dispatchEvent(new window.Event('change', {bubbles: true}));
    }

    function handleClick(event) {
        var target = event && event.target;
        while (target && target !== document && !(target.classList && target.classList.contains('toggle__label'))) {
            target = target.parentNode;
        }
        if (!target || target === document) {
            return;
        }

        var toggle = findParentToggle(target);
        if (!toggle || !getRadio(toggle, target.getAttribute('data-yes-id'))) {
            return;
        }

        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
        toggleValue(target);
    }

    function handleKeydown(event) {
        var target = event && event.target;
        if (!target || !target.classList || !target.classList.contains('toggle__label')) {
            return;
        }
        var key = event.key || event.code;
        if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') {
            return;
        }
        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
        toggleValue(target);
    }

    // Mautic's form theme places the same toggle callback on the label and the
    // radio. Core dispatches a radio change from the label handler, which can
    // invoke that callback a second time. Own these plugin toggles locally on
    // every route so the selected value cannot be reversed by a duplicate call.
    Array.prototype.forEach.call(controls, function (input) {
        input.removeAttribute('onchange');
        var toggle = findParentToggle(input);
        var label = toggle && toggle.querySelector('.toggle__label');
        if (label) {
            label.removeAttribute('onclick');
            label.removeAttribute('onkeydown');
        }
    });

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
})(window, document);
