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
        this.labelEl = createElement('label', 'text-xs text-gray-400 whitespace-nowrap param-label min-w-[3rem]', {
            textContent: label,
            title: label
        });

        // 2. Slider
        this.slider = createElement('input', 'w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer', {
            type: 'range',
            min, max, step,
            value
        });

        // 3. Number Input Group
        this.inputWrapper = createElement('div', 'flex items-center bg-gray-900 border border-gray-600 rounded overflow-hidden w-20');

        this.numberInput = createElement('input', 'w-full bg-transparent text-blue-400 font-mono text-xs px-2 py-0.5 text-right outline-none appearance-none', {
            type: 'number',
            min, max, step,
            value
        });

        // Spin Buttons Wrapper
        const spinnerContainer = createElement('div', 'flex flex-col border-l border-gray-700 h-full w-5');

        const btnClass = 'flex-1 flex items-center justify-center hover:bg-gray-700 cursor-pointer text-gray-400 hover:text-white transition-colors h-3';

        this.upBtn = createElement('div', btnClass + ' border-b border-gray-800');
        this.upBtn.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;

        this.downBtn = createElement('div', btnClass);
        this.downBtn.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        spinnerContainer.appendChild(this.upBtn);
        spinnerContainer.appendChild(this.downBtn);

        this.inputWrapper.appendChild(this.numberInput);
        this.inputWrapper.appendChild(spinnerContainer);

        // --- Event Listeners ---

        // Spin Button Logic w/ Auto-Repeat
        const stepValue = (dir) => {
            let val = parseFloat(this.numberInput.value);
            if (isNaN(val)) val = (min || 0);
            val += dir * (this.step || 1);

            // Clamp
            if (this.max !== undefined) val = Math.min(val, this.max);
            if (this.min !== undefined) val = Math.max(val, this.min);

            // Round/Format to precision of step to avoid float errors
            // Simple heuristic: count decimals in step
            const decimals = (this.step && this.step.toString().split('.')[1]?.length) || 0;
            val = parseFloat(val.toFixed(decimals));

            this.handleUserChange(val);
        };

        let repeatTimer = null;
        let delayTimer = null;
        const REPEAT_DELAY = 500; // ms before auto-repeat starts
        const REPEAT_INTERVAL = 75; // ms between steps

        const startRepeating = (dir) => {
            // Immediate step
            stepValue(dir);
            // Delay then repeat
            delayTimer = setTimeout(() => {
                repeatTimer = setInterval(() => {
                    stepValue(dir);
                }, REPEAT_INTERVAL);
            }, REPEAT_DELAY);
        };

        const stopRepeating = () => {
            if (delayTimer) clearTimeout(delayTimer);
            if (repeatTimer) clearInterval(repeatTimer);
            delayTimer = null;
            repeatTimer = null;
        };

        const onMouseDown = (e, dir) => {
            e.preventDefault();
            // Cleanup any existing timers just in case
            stopRepeating();
            startRepeating(dir);

            // Listen for global mouseup to stop even if dragged off
            window.addEventListener('mouseup', onMouseUp, { once: true });
        };

        const onMouseUp = () => {
            stopRepeating();
            window.removeEventListener('mouseup', onMouseUp);
        };

        this.upBtn.addEventListener('mousedown', (e) => onMouseDown(e, 1));
        // Removed mouseleave to prevent premature stopping on micro-movements
        // this.upBtn.addEventListener('mouseleave', stopRepeating); 

        this.downBtn.addEventListener('mousedown', (e) => onMouseDown(e, -1));
        // this.downBtn.addEventListener('mouseleave', stopRepeating);

        // Slider Input
        this.slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.handleUserChange(val);
        });

        // Number Input
        this.numberInput.addEventListener('change', (e) => {
            let val = parseFloat(e.target.value);
            this.handleUserChange(val);
        });

        // Key down enter
        this.numberInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleUserChange(parseFloat(e.target.value));
                this.numberInput.blur();
            }
        });

        // 4. Link Button
        this.linkBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent', {
            title: 'Link Parameter'
        });
        // Link Icon (Chain)
        this.linkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

        this.linkBtn.addEventListener('click', () => {
            this.toggleLink();
        });

        // Assemble
        this.container.appendChild(this.labelEl);
        this.container.appendChild(this.slider);
        this.container.appendChild(this.inputWrapper);
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
            this.linkBtn.classList.remove('text-gray-500', 'border-transparent');
            this.linkBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        } else {
            this.linkBtn.classList.add('text-gray-500', 'border-transparent');
            this.linkBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
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
