import { createElement } from '../utils/dom.js';

export class ParamGui {
    constructor({ key, label, min, max, step, value, onChange, onLinkToggle }) {
        this.key = key;
        this.onChange = onChange;
        this.onLinkToggle = onLinkToggle;
        this.min = min;
        this.max = max;
        this.step = step;

        // Internal state tracking to avoid echo-back loops
        this.lastValue = value;
        this.isLinked = false;

        this.render({ label, min, max, step, value });
    }

    render({ label, min, max, step, value }) {
        // Container: Grid Layout
        // Label | Slider | Value Input | Link Button
        this.container = createElement('div', 'grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center mb-3');

        // 1. Label
        this.labelEl = createElement('label', 'text-xs text-gray-400 w-16 truncate', {
            textContent: label,
            title: label
        });

        // 2. Slider
        this.slider = createElement('input', 'w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer', {
            type: 'range',
            min, max, step,
            value
        });

        // 3. Number Input
        this.numberInput = createElement('input', 'w-16 bg-gray-800 text-blue-400 font-mono text-xs border border-gray-600 rounded px-1 py-0.5 text-right', {
            type: 'number',
            min, max, step,
            value
        });

        // 4. Link Button
        this.linkBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors', {
            title: 'Link Parameter'
        });
        // Link Icon (Chain)
        this.linkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

        // --- Event Listeners ---

        // Slider Input
        this.slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.handleUserChange(val);
        });

        // Number Input
        this.numberInput.addEventListener('change', (e) => { // 'change' for commit, 'input' for rapid firing? usually change or blur for numbers
            let val = parseFloat(e.target.value);
            // optional: clamp?
            // val = Math.max(this.min, Math.min(this.max, val));
            this.handleUserChange(val);
        });

        // Key down enter
        this.numberInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleUserChange(parseFloat(e.target.value));
                this.numberInput.blur();
            }
        });

        // Link Toggle
        this.linkBtn.addEventListener('click', () => {
            this.toggleLink();
        });

        // Assemble
        this.container.appendChild(this.labelEl);
        this.container.appendChild(this.slider);
        this.container.appendChild(this.numberInput);
        this.container.appendChild(this.linkBtn);
    }

    handleUserChange(val) {
        if (isNaN(val)) return;

        // Update local UI immediately for responsiveness
        this.updateInternalUI(val);

        // Notify parent
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
            this.linkBtn.classList.remove('text-gray-500');
            this.linkBtn.classList.add('text-green-400', 'bg-gray-700');
        } else {
            this.linkBtn.classList.add('text-gray-500');
            this.linkBtn.classList.remove('text-green-400', 'bg-gray-700');
        }
    }

    updateInternalUI(val) {
        this.lastValue = val;
        // Only update if not the active element to avoid fighting cursor
        if (document.activeElement !== this.slider) {
            this.slider.value = val;
        }
        if (document.activeElement !== this.numberInput) {
            this.numberInput.value = val;
        }
    }

    // --- API ---

    getElement() {
        return this.container;
    }

    setMax(val) {
        this.max = val;
        this.slider.max = val;
        this.numberInput.max = val;
        // Optionally clamp current value?
        // if (this.lastValue > val) this.handleUserChange(val); 
    }

    setMin(val) {
        this.min = val;
        this.slider.min = val;
        this.numberInput.min = val;
    }

    setStep(val) {
        this.step = val;
        this.slider.step = val;
        this.numberInput.step = val;
    }

    /**
     * Updates the value from an external source (Store)
     * @param {number} val 
     */
    setValue(val) {
        // Prevent loops: if the value is what we just set, ignore (or barely different?)
        if (Math.abs(val - this.lastValue) < Number.EPSILON) return;

        this.updateInternalUI(val);
    }

    setLinkActive(isActive) {
        if (this.isLinked !== isActive) {
            this.isLinked = isActive;
            this.updateLinkVisuals();
        }
    }
}
