import { createElement } from '../utils/dom.js';
import { LINK_ICON_2, LINK_ICON_3 } from './linkIcons.js';

export class ParamSelect {
    constructor({ key, label, options, value, onChange, onLinkToggle, onTriLinkToggle }) {
        this.key = key;
        this.options = options || [];
        this.onChange = onChange;
        this.onLinkToggle = onLinkToggle;
        this.onTriLinkToggle = onTriLinkToggle;
        this.lastValue = value;
        this.isLinked = false;
        this.linkLevel = 0; // 0, 2, or 3

        this.render({ label, value });
    }

    render({ label, value }) {
        // Container matching ParamNumber vertical rhythm
        this.container = createElement('div', 'flex flex-col mb-3');

        // Grid Layout: Label | Select | Link (Optional)
        // Using same grid structure as ParamNumber but simplistic
        const row = createElement('div', 'grid grid-cols-[auto_1fr_auto] gap-2 items-center');

        // 1. Label
        this.labelEl = createElement('label', 'text-xs text-gray-400 whitespace-nowrap param-label min-w-[3rem]', {
            textContent: label,
            title: label
        });

        // 2. Select Wrapper (for custom arrow if needed, but standard select is fine for now)
        this.selectEl = createElement('select', 'w-full bg-gray-900 text-blue-400 text-xs px-2 py-1 rounded border border-gray-600 appearance-none outline-none focus:border-blue-500 cursor-pointer');

        // Populate specific options
        this.populateOptions(this.options, value);

        this.selectEl.addEventListener('change', (e) => {
            this.handleUserChange(e.target.value);
        });

        this.linkBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent', {
            title: 'Link Parameter'
        });
        // Link Icon
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
            // Hide if no link handler provided
            this.linkBtn.classList.add('invisible');
        }

        row.appendChild(this.labelEl);
        row.appendChild(this.selectEl);
        row.appendChild(this.linkBtn);

        this.container.appendChild(row);
    }

    populateOptions(options, selectedValue) {
        this.selectEl.innerHTML = '';
        options.forEach(opt => {
            // Support both string "Option" and object { label: "Option", value: "opt" }
            const label = typeof opt === 'object' ? opt.label : opt;
            const value = typeof opt === 'object' ? opt.value : opt;

            const optionEl = document.createElement('option');
            optionEl.value = value;
            optionEl.textContent = label;
            if (value === selectedValue) {
                optionEl.selected = true;
            }
            this.selectEl.appendChild(optionEl);
        });
    }

    handleUserChange(val) {
        this.lastValue = val;
        if (this.onChange) {
            this.onChange(val);
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
            this.selectEl.value = val;
        }
    }

    setOptions(newOptions) {
        // preserve current value if possible
        const current = this.selectEl.value;
        this.options = newOptions;
        this.populateOptions(newOptions, current);
    }

    setLinkActive(isActive) {
        this.setLinkLevel(isActive ? 2 : 0);
    }

    /**
     * Set link level: 0 (unlinked), 2 (pairwise), 3 (tri-linked).
     */
    setLinkLevel(level) {
        this.linkLevel = level;
        this.isLinked = level > 0;

        // Update icon
        this.linkBtn.innerHTML = (level === 3) ? LINK_ICON_3 : LINK_ICON_2;

        // Update styling
        if (level > 0) {
            this.linkBtn.classList.remove('text-gray-500', 'border-transparent');
            this.linkBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        } else {
            this.linkBtn.classList.add('text-gray-500', 'border-transparent');
            this.linkBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
        }
    }
    setDisabled(isDisabled) {
        this.selectEl.disabled = isDisabled;
        if (isDisabled) {
            this.container.classList.add('opacity-50', 'pointer-events-none');
        } else {
            this.container.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
}
