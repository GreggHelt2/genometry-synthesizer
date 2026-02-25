import { createElement } from '../utils/dom.js';
import { LINK_ICON_2, LINK_ICON_3 } from './linkIcons.js';

export class ParamColor {
    constructor({ key, label, value, onChange, onLinkToggle, onTriLinkToggle }) {
        this.key = key;
        this.onChange = onChange;
        this.onLinkToggle = onLinkToggle;
        this.onTriLinkToggle = onTriLinkToggle;
        this.lastValue = value || '#ffffff';
        this.isLinked = false;
        this.linkLevel = 0;

        this.render({ label, value: this.lastValue });
    }

    render({ label, value }) {
        this.container = createElement('div', 'flex flex-col mb-3');

        // Grid: Label | Swatch | Hex Input | Link
        const row = createElement('div', 'grid grid-cols-[auto_auto_1fr_auto] gap-2 items-center');

        // 1. Label
        this.labelEl = createElement('label', 'text-xs text-gray-400 whitespace-nowrap param-label min-w-[3rem]', {
            textContent: label,
            title: label
        });

        // 2. Color Swatch (Actual Input)
        this.colorInput = createElement('input', 'w-8 h-6 p-0 border-0 rounded cursor-pointer bg-transparent', {
            type: 'color',
            value
        });

        // 3. Hex Text Input
        this.textInput = createElement('input', 'w-full bg-gray-900 text-blue-400 text-xs px-2 py-1 rounded border border-gray-600 outline-none focus:border-blue-500 font-mono uppercase', {
            type: 'text',
            value,
            maxLength: 7
        });

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
            this.linkBtn.classList.add('invisible');
        }

        // Events
        this.colorInput.addEventListener('input', (e) => {
            this.handleUserChange(e.target.value);
        });

        this.textInput.addEventListener('change', (e) => {
            let val = e.target.value;
            // Basic Hex validation
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                this.handleUserChange(val);
            } else {
                // Revert if invalid
                this.textInput.value = this.lastValue;
            }
        });

        row.appendChild(this.labelEl);
        row.appendChild(this.colorInput);
        row.appendChild(this.textInput);
        row.appendChild(this.linkBtn);

        this.container.appendChild(row);
    }

    handleUserChange(val) {
        this.lastValue = val;
        // Sync inputs
        this.updateInternalUI(val);

        if (this.onChange) {
            this.onChange(val);
        }
    }

    updateInternalUI(val) {
        if (document.activeElement !== this.colorInput) {
            this.colorInput.value = val;
        }
        if (document.activeElement !== this.textInput) {
            this.textInput.value = val;
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
        if (val !== this.lastValue) {
            this.lastValue = val;
            this.updateInternalUI(val);
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
        this.colorInput.disabled = isDisabled;
        this.textInput.disabled = isDisabled;
        if (isDisabled) {
            this.container.classList.add('opacity-50', 'pointer-events-none');
        } else {
            this.container.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
}
