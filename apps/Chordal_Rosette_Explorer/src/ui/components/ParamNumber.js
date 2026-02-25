import { createElement } from '../utils/dom.js';
import { WaveformSelector } from './WaveformSelector.js';
import { AnimationController } from '../../logic/AnimationController.js';
import { persistenceManager } from '../../engine/state/PersistenceManager.js';
import { LINK_ICON_2, LINK_ICON_3 } from './linkIcons.js';



export class ParamNumber {
    constructor({ key, label, min, max, step, value, onChange, onLinkToggle, onTriLinkToggle, hardLimits }) {
        this.key = key;
        this.onChange = onChange;
        this.onLinkToggle = onLinkToggle;
        this.onTriLinkToggle = onTriLinkToggle;
        this.min = min;
        this.max = max;
        this.step = step;
        this.hardLimits = hardLimits || false;

        // Internal state tracking to avoid echo-back loops
        this.lastValue = value;
        this.isLinked = false;
        this.linkLevel = 0;

        this.animationController = new AnimationController((val) => {
            // Callback from animation loop
            // Round if needed based on step?
            // Heuristic rounded
            const decimals = (this.step && this.step.toString().split('.')[1]?.length) || 0;
            let rounded = parseFloat(val.toFixed(decimals));

            // Clamp to min/max to prevent unwanted auto-expansion of the slider range
            // especially for properties like 'weight' that must stay 0-1
            if (this.min !== undefined) rounded = Math.max(rounded, this.min);
            if (this.max !== undefined) rounded = Math.min(rounded, this.max);

            this.handleUserChange(rounded, { transient: true, isAnimation: true });
        });

        // Sync configuration defaults immediately
        this.animationController.setConfig({
            min: this.min !== undefined ? this.min : 0,
            max: this.max !== undefined ? this.max : 100,
            period: 10 // Default period
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

        // Slider Input (Transient)
        this.slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.handleUserChange(val, { transient: true });
        });

        // Slider Change (Final)
        this.slider.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            this.handleUserChange(val, { transient: false }); // Force save
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
        }

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

        this.animMinInput = createNumInput(this.min, (v) => {
            this.animationController.setConfig({ min: v });
            if (this.min !== undefined && v < this.min) this.setMin(v);
            persistenceManager.save();
        });


        this.animMaxInput = createNumInput(this.max, (v) => {
            this.animationController.setConfig({ max: v });
            if (this.max !== undefined && v > this.max) this.setMax(v);
            persistenceManager.save();
        });


        this.animPeriodInput = createNumInput(this.animationController.period, (v) => {
            this.animationController.setConfig({ period: v });
            // Update visualization scale
            this.waveformSelector.setPeriod(v);
            persistenceManager.save();
        });


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

        animControls.appendChild(wrap(this.animMinInput, 'Min'));
        animControls.appendChild(wrap(this.animMaxInput, 'Max'));
        animControls.appendChild(wrap(this.animPeriodInput, 'Period (s)'));

        // remove appendChild(animControls) - passed to selector instead
        // this.animPanel.appendChild(animControls);

        // Row 2: Waveform Selector
        this.waveformSelector = new WaveformSelector({
            type: this.animationController.easingType,
            shape: this.animationController.easingShape,
            period: this.animationController.period, // Pass initial period
            extraControls: animControls, // Pass the controls to be injected
            onChange: (type, shape) => {
                this.animationController.setConfig({ type, shape });
                persistenceManager.save();
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

    handleUserChange(val, meta = {}) {
        if (isNaN(val)) return;

        // Strict limit enforcement on output
        if (this.hardLimits) {
            if (this.max !== undefined) val = Math.min(val, this.max);
            if (this.min !== undefined) val = Math.max(val, this.min);
        }

        // Update local UI immediately for responsiveness
        this.updateInternalUI(val);

        // Notify parent
        if (this.onChange) {
            this.onChange(val, meta);
        }
    }

    toggleLink() {
        // Don't manage state here — linkManager notifications handle visuals via setLinkLevel
        if (this.onLinkToggle) {
            this.onLinkToggle();
        }
    }

    setLinkActive(isActive) {
        this.setLinkLevel(isActive ? 2 : 0);
    }

    setLinkLevel(level) {
        this.linkLevel = level;
        this.isLinked = level > 0;
        if (this.linkBtn) {
            this.linkBtn.innerHTML = (level === 3) ? LINK_ICON_3 : LINK_ICON_2;
            if (level > 0) {
                this.linkBtn.classList.remove('text-gray-500', 'border-transparent');
                this.linkBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
            } else {
                this.linkBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
                this.linkBtn.classList.add('text-gray-500', 'border-transparent');
            }
        }
    }

    updateInternalUI(val) {
        this.lastValue = val;

        if (this.hardLimits) {
            // Strict clamping
            if (this.max !== undefined) val = Math.min(val, this.max);
            if (this.min !== undefined) val = Math.max(val, this.min);
        } else {
            // Auto-expand range if value exceeds bounds (e.g. from animation)
            if (this.max !== undefined && val > this.max) {
                this.setMax(val);
            }
            if (this.min !== undefined && val < this.min) {
                this.setMin(val);
            }
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

    setDisabled(isDisabled) {
        this.slider.disabled = isDisabled;
        this.numberInput.disabled = isDisabled;
        if (isDisabled) {
            this.container.classList.add('opacity-50', 'pointer-events-none');
        } else {
            this.container.classList.remove('opacity-50', 'pointer-events-none');
        }
    }

    setValue(val) {
        // Prevent loops: if the value is what we just set, ignore
        if (Math.abs(val - this.lastValue) < Number.EPSILON) return;
        this.updateInternalUI(val);
    }

    getAnimationConfig() {
        if (!this.animationController) return null;
        return {
            ...this.animationController.getConfig(),
            // Persist UI state of the panel
            isOpen: this.isAnimPanelOpen || false
        };
    }

    setAnimationConfig(config) {
        if (!this.animationController || !config) return;
        this.animationController.setConfig(config);

        // Update UI logic for range?
        if (config.min !== undefined && config.min < this.min) this.setMin(config.min);
        if (config.max !== undefined && config.max > this.max) this.setMax(config.max);

        // Sync Waveform selector?
        if (this.waveformSelector) {
            if (config.type || config.shape) {
                if (this.waveformSelector && this.waveformSelector.setShape) {
                    this.waveformSelector.setShape(config.type, config.shape);
                }
            }
        }
        if (config.period) {
            if (this.waveformSelector) this.waveformSelector.setPeriod(config.period);
            if (this.animPeriodInput) this.animPeriodInput.value = config.period;
        }
        if (config.min !== undefined && this.animMinInput) this.animMinInput.value = config.min;
        if (config.max !== undefined && this.animMaxInput) this.animMaxInput.value = config.max;

        // Restore Panel Open State
        if (config.isOpen !== undefined) {
            if (config.isOpen && !this.isAnimPanelOpen) {
                this.toggleAnimationPanel();
            } else if (!config.isOpen && this.isAnimPanelOpen) {
                // Close if currently open
                this.toggleAnimationPanel();
            }
        }
    }

    // ... (rest of methods)

    updateLinkVisuals() {
        // Delegate to setLinkLevel for consistency
        this.setLinkLevel(this.linkLevel);
    }

    toggleAnimationPanel() {
        const isHidden = this.animPanel.classList.contains('hidden');
        if (isHidden) {
            this.animPanel.classList.remove('hidden');
            this.isAnimPanelOpen = true; // Track state
            // Active: Green Text + Green Border + Gray Background
            this.animBtn.classList.remove('text-gray-500', 'border-transparent');
            this.animBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
            // Refresh canvas incase hidden broke layout
            this.waveformSelector.drawWaveform();
        } else {
            this.animPanel.classList.add('hidden');
            this.isAnimPanelOpen = false; // Track state
            // Inactive: Gray Text + Transparent Border
            this.animBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
            this.animBtn.classList.add('text-gray-500', 'border-transparent');
        }
        persistenceManager.save();
    }

    togglePlayback() {
        console.log('Toggle Playback clicked. Current state:', this.animationController.isPlaying);
        if (this.animationController.isPlaying) {
            this.animationController.stop();
            // Revert into inactive state (Gray)
            this.playBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
            this.playBtn.classList.add('text-gray-500', 'border-transparent');
        } else {
            console.log('Starting animation controller...');
            this.animationController.start();
            // Active state (Green + Highlight)
            this.playBtn.classList.remove('text-gray-500', 'border-transparent');
            this.playBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        }
        persistenceManager.save();
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


