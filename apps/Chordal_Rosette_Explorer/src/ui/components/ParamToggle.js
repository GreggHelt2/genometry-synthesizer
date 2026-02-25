import { createElement } from '../utils/dom.js';
import { LINK_ICON_2, LINK_ICON_3 } from './linkIcons.js';

export class ParamToggle {
    constructor({ key, label, value, onChange, onLinkToggle, onTriLinkToggle }) {
        this.key = key;
        this.onChange = onChange;
        this.onLinkToggle = onLinkToggle;
        this.onTriLinkToggle = onTriLinkToggle;
        this.lastValue = !!value;
        this.isLinked = false;
        this.linkLevel = 0;

        this.render({ label, value: this.lastValue });
    }

    render({ label, value }) {
        this.container = createElement('div', 'flex items-center justify-between mb-2');

        // 1. Label
        this.labelEl = createElement('label', 'text-xs text-gray-400 select-none cursor-pointer', {
            textContent: label
        });

        // 2. Toggle Switch Container
        const toggleWrapper = createElement('div', 'flex items-center gap-2');

        this.linkBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent', {
            title: 'Link Parameter'
        });
        this.linkBtn.innerHTML = LINK_ICON_2;

        if (this.onLinkToggle || this.onTriLinkToggle) {
            this.linkBtn.addEventListener('click', () => {
                if (this.onLinkToggle) this.toggleLink();
            });
            this.linkBtn.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onTriLinkToggle) this.onTriLinkToggle();
            });
        } else {
            this.linkBtn.classList.add('hidden');
        }

        // The Switch
        this.switchEl = createElement('div', `w-8 h-4 rounded-full relative transition-colors duration-200 ease-in-out cursor-pointer ${value ? 'bg-blue-600' : 'bg-gray-700'}`);

        // The Knob
        this.knobEl = createElement('div', `absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out transform ${value ? 'translate-x-4' : 'translate-x-0'}`);

        this.switchEl.appendChild(this.knobEl);

        // Events
        const toggleHandler = () => {
            const newValue = !this.lastValue;
            this.handleUserChange(newValue);
        };

        this.switchEl.addEventListener('click', toggleHandler);
        // Also allow clicking label
        this.labelEl.addEventListener('click', toggleHandler);

        toggleWrapper.appendChild(this.linkBtn);
        toggleWrapper.appendChild(this.switchEl);

        this.container.appendChild(this.labelEl);
        this.container.appendChild(toggleWrapper);
    }

    handleUserChange(val) {
        this.lastValue = !!val;
        this.updateInternalUI(this.lastValue);

        if (this.onChange) {
            this.onChange(this.lastValue);
        }
    }

    updateInternalUI(val) {
        if (val) {
            this.switchEl.classList.remove('bg-gray-700');
            this.switchEl.classList.add('bg-blue-600');
            this.knobEl.classList.remove('translate-x-0');
            this.knobEl.classList.add('translate-x-4');
        } else {
            this.switchEl.classList.remove('bg-blue-600');
            this.switchEl.classList.add('bg-gray-700');
            this.knobEl.classList.remove('translate-x-4');
            this.knobEl.classList.add('translate-x-0');
        }
    }

    toggleLink() {
        if (this.onLinkToggle) {
            this.onLinkToggle();
        }
    }

    updateLinkVisuals() {
        if (this.isLinked) {
            this.linkBtn.classList.remove('text-gray-500', 'border-transparent');
            this.linkBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        } else {
            this.linkBtn.classList.add('text-gray-500', 'border-transparent');
            this.linkBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
        }
    }

    // --- API ---

    getElement() {
        return this.container;
    }

    setValue(val) {
        const boolVal = !!val;
        if (boolVal !== this.lastValue) {
            this.lastValue = boolVal;
            this.updateInternalUI(boolVal);
        }
    }

    setLinkActive(isActive) {
        this.setLinkLevel(isActive ? 2 : 0);
    }

    setLinkLevel(level) {
        this.linkLevel = level;
        this.isLinked = level > 0;
        this.linkBtn.innerHTML = (level === 3) ? LINK_ICON_3 : LINK_ICON_2;
        if (level > 0) {
            this.linkBtn.classList.remove('text-gray-500', 'border-transparent');
            this.linkBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        } else {
            this.linkBtn.classList.add('text-gray-500', 'border-transparent');
            this.linkBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
        }
    }
    setDisabled(isDisabled) {
        if (isDisabled) {
            this.container.classList.add('opacity-50', 'pointer-events-none');
        } else {
            this.container.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
}
