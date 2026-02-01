import { createElement } from '../utils/dom.js';
import { WaveformSelector } from './WaveformSelector.js';
import { AnimationController } from '../../logic/AnimationController.js';


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

        // Initialize Animation Controller BEFORE render
        this.animationController = new AnimationController((val) => {
            // Callback from animation loop
            // Round if needed based on step?
            // Heuristic rounded
            const decimals = (this.step && this.step.toString().split('.')[1]?.length) || 0;
            const rounded = parseFloat(val.toFixed(decimals));
            this.handleUserChange(rounded);
        });

        // Sync configuration defaults immediately
        this.animationController.setConfig({
            min: this.min !== undefined ? this.min : 0,
            max: this.max !== undefined ? this.max : 100,
            period: 5 // Default period
        });

        this.render({ label, min, max, step, value });
    }

    render({ label, min, max, step, value }) {
        // Container: Main Grid + Animation Panel
        this.container = createElement('div', 'flex flex-col mb-3');

        // Top Row: Grid Layout
        // Label | Slider | Value Input | Link Button | Play Button | Anim Button
        const topRow = createElement('div', 'grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 items-center');

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

        // 5. Play/Pause Button (Moved to Main Row)
        this.playBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent', {
            title: 'Play/Pause Animation'
        });
        // Initial Icon: Play
        this.playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        this.playBtn.onclick = () => this.togglePlayback();

        // Assemble
        // 6. Animation Toggle Button
        this.animBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent', {
            title: 'Animation Tools'
        });
        // Oscilloscope / Activity Icon
        this.animBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;

        this.animBtn.addEventListener('click', () => {
            this.toggleAnimationPanel();
        });

        // Assemble Top Row
        topRow.appendChild(this.labelEl);
        topRow.appendChild(this.slider);
        topRow.appendChild(this.inputWrapper);
        topRow.appendChild(this.linkBtn);
        topRow.appendChild(this.playBtn); // Insert Play Button
        topRow.appendChild(this.animBtn);

        this.container.appendChild(topRow);

        // --- Animation Panel (Collapsible) ---
        // Reduced margin (mt-1) and added relative positioning for the notch
        // Brightened border to border-gray-500
        this.animPanel = createElement('div', 'hidden flex-col gap-2 mt-1 p-2 bg-gray-800 rounded border border-gray-500 relative');

        // Visual Notch/Arrow pointing to the Anim Button (Far right)
        // Positioned absolute top-outside
        const notch = createElement('div', 'absolute -top-[6px] right-[6px] w-3 h-3 bg-gray-800 border-l border-t border-gray-500 transform rotate-45');
        this.animPanel.appendChild(notch);

        // Row 1: Controls (Min, Max, Speed)
        const animControls = createElement('div', 'flex items-center gap-2');

        // Inputs helper
        const createNumInput = (val, callback) => {
            const inp = createElement('input', 'w-16 bg-gray-900 border border-gray-600 rounded px-1 text-xs text-blue-400 font-mono focus:border-blue-500 outline-none');
            inp.type = 'number';
            inp.value = val;
            inp.step = 'any';
            inp.addEventListener('change', (e) => callback(parseFloat(e.target.value)));
            return inp;
        };

        const minInput = createNumInput(this.min, (v) => {
            this.animationController.setConfig({ min: v });
            if (this.min !== undefined && v < this.min) this.setMin(v);
        });

        const maxInput = createNumInput(this.max, (v) => {
            this.animationController.setConfig({ max: v });
            if (this.max !== undefined && v > this.max) this.setMax(v);
        });

        const speedInput = createNumInput(this.animationController.period, (v) => this.animationController.setConfig({ period: v }));

        // Labels
        const lblClass = 'text-[10px] text-gray-500 uppercase tracking-widest';

        // Removed playBtn append

        const wrap = (el, lbl) => {
            const d = createElement('div', 'flex flex-col gap-0.5');
            const l = createElement('span', lblClass);
            l.textContent = lbl;
            d.appendChild(l);
            d.appendChild(el);
            return d;
        }

        animControls.appendChild(wrap(minInput, 'Min'));
        animControls.appendChild(wrap(maxInput, 'Max'));
        animControls.appendChild(wrap(speedInput, 'Period (s)'));

        // remove appendChild(animControls) - passed to selector instead
        // this.animPanel.appendChild(animControls);

        // Row 2: Waveform Selector
        this.waveformSelector = new WaveformSelector({
            type: this.animationController.easingType,
            shape: this.animationController.easingShape,
            extraControls: animControls, // Pass the controls to be injected
            onChange: (type, shape) => {
                this.animationController.setConfig({ type, shape });
            }
        });

        this.animPanel.appendChild(this.waveformSelector.getElement());
        this.container.appendChild(this.animPanel);

        // Hook up animation loop to UI (phase indicator)
        // Wraps the user callback to *also* update the UI
        const originalLoop = this.animationController.onUpdate;
        this.animationController.onUpdate = (val) => {
            originalLoop(val); // Does the standardized valid update
            // Update phase indicator
            const phase = this.animationController.getPhase();
            this.waveformSelector.setPhase(phase);
        };

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

        // Auto-expand range if value exceeds bounds (e.g. from animation)
        if (this.max !== undefined && val > this.max) {
            this.setMax(val);
        }
        if (this.min !== undefined && val < this.min) {
            this.setMin(val);
        }

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

    toggleAnimationPanel() {
        const isHidden = this.animPanel.classList.contains('hidden');
        if (isHidden) {
            this.animPanel.classList.remove('hidden');
            // Active: Green Text + Green Border + Gray Background
            this.animBtn.classList.remove('text-gray-500', 'border-transparent');
            this.animBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
            // Refresh canvas incase hidden broke layout
            this.waveformSelector.drawWaveform();
        } else {
            this.animPanel.classList.add('hidden');
            // Inactive: Gray Text + Transparent Border
            this.animBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
            this.animBtn.classList.add('text-gray-500', 'border-transparent');
        }
    }

    togglePlayback() {
        if (this.animationController.isPlaying) {
            this.animationController.stop();
            // Revert into inactive state (Gray)
            this.playBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
            this.playBtn.classList.add('text-gray-500', 'border-transparent');
        } else {
            this.animationController.start();
            // Active state (Green + Highlight)
            this.playBtn.classList.remove('text-gray-500', 'border-transparent');
            this.playBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        }
    }

    dispose() {
        if (this.animationController) {
            this.animationController.stop();
        }
        // Remove global event listeners if any (mouseup is temporary so safe)
        // Remove internal timers
        if (this.downBtn) {
            // we have anonymous listeners so we can't remove them easily, but they are attached to DOM elements which will be GC'd.
            // window mouseup is the only risk, but it removes itself.
        }
    }
}
