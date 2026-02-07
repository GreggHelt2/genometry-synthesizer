import { createElement } from '../utils/dom.js';

export class ParamSelect {
    constructor({ key, label, options, value, onChange, onLinkToggle }) {
        this.key = key;
        this.options = options || [];
        this.onChange = onChange;
        this.onLinkToggle = onLinkToggle;
        this.lastValue = value;
        this.isLinked = false;

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

        // 3. Link Button (Optional)
        this.linkBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent', {
            title: 'Link Parameter'
        });
        // Link Icon
        this.linkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

        if (this.onLinkToggle) {
            this.linkBtn.addEventListener('click', () => {
                this.toggleLink();
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
        this.isLinked = !this.isLinked;
        this.updateLinkVisuals();
        if (this.onLinkToggle) {
            this.onLinkToggle(this.isLinked);
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
        if (this.isLinked !== isActive) {
            this.isLinked = isActive;
            this.updateLinkVisuals();
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
