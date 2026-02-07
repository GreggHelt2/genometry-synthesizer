// Imports mostly cleaned up, assuming submodules import what they need.
// Orchestrator needs basic utils + SubSections + Persistence.
import { StatsSection } from './chordal_rosette/StatsSection.js';
import { RelativesSection } from './chordal_rosette/RelativesSection.js';
import { CoreParamsSection } from './chordal_rosette/CoreParamsSection.js';
import { SequencerSection } from './chordal_rosette/SequencerSection.js';
import { AppearanceSection } from './chordal_rosette/AppearanceSection.js';
import { CosetVizSection } from './chordal_rosette/CosetVizSection.js';

import { persistenceManager } from '../../engine/state/PersistenceManager.js';


import { Panel } from './Panel.js';
import { createElement, $id } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd } from '../../engine/math/MathOps.js';

export class ChordalRosettePanel extends Panel {
    constructor(id, title, roseId) {
        super(id, title);
        this.roseId = roseId; // 'rosetteA' or 'rosetteB'
        this.actionType = roseId === 'rosetteA' ? ACTIONS.UPDATE_ROSETTE_A : ACTIONS.UPDATE_ROSETTE_B;

        // UI State Tracking
        this.uiState = {
            accordions: {} // Map id -> boolean (isOpen)
        };
        this.accordions = new Map(); // Keep refs for restoration

        this.renderContent();

        // Subscribe to store updates
        store.subscribe(this.updateUI.bind(this));

        // Subscribe to LinkManager updates
        import('../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            this.linkManager = linkManager;
            linkManager.subscribe(this.updateLinkVisuals.bind(this));
        });

        // Initial UI update
        this.updateUI(store.getState());
    }

    handleAccordionToggle(isOpen, id) {
        if (!id) return;
        this.uiState.accordions[id] = isOpen;
        persistenceManager.save();
    }

    /**
     * Registers an accordion for UI state persistence
     * @param {string} id - unique persistence key
     * @param {Accordion} accordionInstance 
     */
    registerAccordion(id, accordionInstance) {
        this.accordions.set(id, accordionInstance);
    }

    /**
     * Registers an animation param/control for persistence
     * @param {Object} paramInstance - must implement getAnimationConfig/setAnimationConfig/dispose
     */
    registerParam(paramInstance) {
        if (!this.animationParams) this.animationParams = new Set();
        this.animationParams.add(paramInstance);

        // Auto-cleanup on dispose
        // We wrap the dispose method to auto-remove from our set
        const originalDispose = paramInstance.dispose.bind(paramInstance);
        paramInstance.dispose = () => {
            this.animationParams.delete(paramInstance);
            if (originalDispose) originalDispose();
        };
    }

    getUIState() {
        return this.uiState;
    }

    restoreUIState(state) {
        if (!state || !state.accordions) return;

        this.uiState = state;

        // Apply to existing accordions
        for (const [id, isOpen] of Object.entries(state.accordions)) {
            const acc = this.accordions.get(id);
            if (acc) {
                // Only toggle if state differs (avoid animation glitches)
                if (acc.isOpen !== isOpen) {
                    acc.toggle();
                }
            }
        }
    }

    renderContent() {
        const title = createElement('h2', 'text-xl font-bold p-4 text-center', { textContent: this.title });
        this.element.appendChild(title);

        // Preview Canvas
        const canvasContainer = createElement('div', 'w-full aspect-square bg-black border-b border-gray-700 relative');
        this.canvas = createElement('canvas', 'w-full h-full block');
        this.canvas.width = 320;
        this.canvas.height = 320;

        canvasContainer.appendChild(this.canvas);
        this.element.appendChild(canvasContainer);

        // Scrollable Controls Container
        this.controlsContainer = createElement('div', 'flex-1 overflow-y-auto w-full');
        this.element.appendChild(this.controlsContainer);

        // Create Sub-Sections (The new V3 architecture)

        // 1. Stats
        this.statsSection = new StatsSection(this, this.roseId);
        this.controlsContainer.appendChild(this.statsSection.element);

        // 2. Core Params
        this.coreParamsSection = new CoreParamsSection(this, this.roseId);
        this.controlsContainer.appendChild(this.coreParamsSection.element);

        // 3. Sequencer
        this.sequencerSection = new SequencerSection(this, this.roseId);
        this.controlsContainer.appendChild(this.sequencerSection.element);

        // 4. Relatives
        this.relativesSection = new RelativesSection(this);
        this.controlsContainer.appendChild(this.relativesSection.element);

        // 5. Appearance (Chordal, Vertex, General)
        this.appearanceSection = new AppearanceSection(this, this.roseId);
        this.controlsContainer.appendChild(this.appearanceSection.element);

        // 6. Coset Visualization
        this.cosetVizSection = new CosetVizSection(this, this.roseId);
        this.controlsContainer.appendChild(this.cosetVizSection.element);
    }



    createCurveTypeSelector(parent) {
        const options = Object.keys(CurveRegistry);

        this.curveTypeSelect = new ParamSelect({
            key: 'curveType',
            label: 'Curve Type',
            options: options,
            value: 'Rhodonea', // Default
            onChange: (val) => {
                store.dispatch({
                    type: this.actionType,
                    payload: { curveType: val }
                });
            }
        });

        // Insert at top? parent is Core Accordion
        // Accordion append adds to content
        parent.append(this.curveTypeSelect.getElement());
    }

    renderCoreParams(curveType, params) {
        // Cleanup old controls
        if (this.paramControls) {
            Object.values(this.paramControls).forEach(wrapper => {
                if (wrapper.instance && wrapper.instance.dispose) {
                    wrapper.instance.dispose();
                }
            });
        }

        this.dynamicParamsContainer.innerHTML = '';
        this.paramControls = {};

        const CurveClass = CurveRegistry[curveType] || CurveRegistry['Rhodonea'];
        const schema = CurveClass.getParamsSchema();

        schema.forEach(item => {
            const control = this.createSlider(item.key, item.min, item.max, item.step, item.label);
            this.paramControls[item.key] = control;
            this.dynamicParamsContainer.appendChild(control.container);

            const val = params[item.key] ?? item.default;
            this.updateControl(control, val);
        });

        // Align labels in this container
        // Use double RAF to ensure layout is fully stable
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.alignLabels(this.dynamicParamsContainer);
            });
        });
    }

    createSequencerTypeSelector(containerAccordion) {
        const options = Object.keys(SequencerRegistry);

        this.sequencerSelector = new ParamSelect({
            key: 'sequencerType',
            label: 'Sequence Generator',
            options: options,
            value: 'Cyclic Additive Group Modulo N', // Default
            onChange: (val) => {
                store.dispatch({
                    type: this.actionType,
                    payload: { sequencerType: val }
                });
            }
        });

        const container = this.sequencerSelector.getElement();

        // Insert at top of accordion
        if (containerAccordion.content.firstChild) {
            containerAccordion.content.insertBefore(container, containerAccordion.content.firstChild);
        } else {
            containerAccordion.append(container);
        }
    }

    updateSequencerParams(state) {
        // Clear existing dynamic params
        if (this.sequencerControls) {
            Object.values(this.sequencerControls).forEach(wrapper => {
                if (wrapper.instance && wrapper.instance.dispose) {
                    wrapper.instance.dispose();
                }
            });
        }
        this.sequencerParamsContainer.innerHTML = '';
        this.sequencerControls = {};

        const sequencerType = state[this.roseId].sequencerType || 'Cyclic Additive Group Modulo N';
        const SequencerClass = SequencerRegistry[sequencerType];

        if (!SequencerClass) return;

        // Instantiate temporarily to get schema (ideally schema is static, but pattern is instance method for now)
        const sequencerInstance = new SequencerClass();
        const schema = sequencerInstance.getParamsSchema();

        schema.forEach(param => {
            if (param.type === 'slider') {
                // Use existing createSlider helper
                // Map the param key to a top-level state key (assuming flat state for now as per plan)
                // Note: sliders expect 'stateKey' to dispatch payload { [key]: val }
                const control = this.createSlider(param.key, param.min, param.max, param.step, param.label);

                // Manually set value since createSlider inits to 0 and relies on updateUI loop
                // But updateUI loop might not have found this control yet if we just created it.
                // We will let the main updateUI loop handle value setting.

                this.sequencerControls[param.key] = control;
                this.sequencerParamsContainer.appendChild(control.container);
            }
        });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.alignLabels(this.sequencerParamsContainer);
            });
        });
    }

    createCheckbox(key, label) {
        const paramToggle = new ParamToggle({
            key,
            label,
            value: false, // Default, updated by updateUI
            onChange: (val) => {
                store.dispatch({
                    type: this.actionType,
                    payload: { [key]: val }
                });
            },
            onLinkToggle: (isActive) => {
                const myKey = `${this.roseId}.${key}`;
                const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
                const otherKey = `${otherRoseId}.${key}`;

                import('../../engine/logic/LinkManager.js').then(({ linkManager }) => {
                    const linked = linkManager.toggleLink(myKey, otherKey);
                    if (linked !== isActive) {
                        paramToggle.setLinkActive(linked);
                    }
                });
            }
        });

        // Initialize Link State
        import('../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const myKey = `${this.roseId}.${key}`;
            if (linkManager.isLinked(myKey)) {
                paramToggle.setLinkActive(true);
            }
        });

        return {
            container: paramToggle.getElement(),
            instance: paramToggle
        };
    }

    createColorInput(key, label) {
        const container = createElement('div', 'flex items-center justify-between mb-2 p-2');
        const labelEl = createElement('label', 'text-sm text-gray-300', { textContent: label });
        const input = createElement('input', 'w-8 h-8 rounded cursor-pointer border-0', { type: 'color' });

        input.addEventListener('input', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { [key]: e.target.value }
            });
        });

        container.appendChild(labelEl);
        container.appendChild(input);
        return { container, input };
    }

    createSlider(key, min, max, step, label) {
        // Use ParamNumber
        const paramGui = new ParamNumber({
            key,
            label,
            min,
            max,
            step,
            value: 0, // Default, will be updated by updateUI
            onChange: (val, meta) => {
                store.dispatch({
                    type: this.actionType,
                    payload: { [key]: val },
                    meta: meta
                });
            },
            onLinkToggle: (isActive) => {
                const myKey = `${this.roseId}.${key}`;
                const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
                const otherKey = `${otherRoseId}.${key}`;

                // Toggle link in manager
                import('../../engine/logic/LinkManager.js').then(({ linkManager }) => {
                    const linked = linkManager.toggleLink(myKey, otherKey);
                    if (linked !== isActive) {
                        paramGui.setLinkActive(linked);
                    }
                });
            }
        });

        // Initialize Link State
        // We need to check if this param is ALREADY linked (e.g. from persistence)
        // Since LinkManager might not be loaded yet if we rely on the constructor import,
        // we'll do a quick import here or rely on the fact that by the time this runs, 
        // main.js has likely initialized things. 
        // Ideally, we import linkManager statically at the top of this file to avoid this async mess.
        import('../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const myKey = `${this.roseId}.${key}`;
            if (linkManager.isLinked(myKey)) {
                paramGui.setLinkActive(true);
            }
        });

        // Track for Animation Persistence
        // Use central register method now
        this.registerParam(paramGui);

        // Hook dispose to cleanup - handled by registerParam now
        // But wait, createSlider returns { instance: paramGui }
        // The cleanup wrapper is inside registerParam.
        // We don't need to manually add to set or hook dispose here if we use registerParam.
        // However, we need to be careful not to double-wrap if registerParam already wraps.
        // Let's rely on registerParam completely.

        return {
            container: paramGui.getElement(),
            instance: paramGui,
            input: paramGui.slider
        };
    }

    getAnimationState() {
        const state = {};
        if (this.animationParams) {
            this.animationParams.forEach(param => {
                const config = param.getAnimationConfig();
                // Only save if it has meaningful config (e.g. playing or non-default)
                // But getAnimationConfig returns current config.
                // We should check if it's "active" or just save everything?
                // Save everything for consistency.
                if (config) {
                    // Only save if modified from defaults? 
                    // Defaults are local to AnimationController.
                    // Let's save if it exists.
                    // Use the key associated with the param. 
                    // ParamNumber stores 'key' in `this.key`?
                    // Let's check ParamNumber.js. Step 155: constructor({ key... }) -> this.key = key;
                    if (param.key) {
                        state[param.key] = config;
                    }
                }
            });
        }
        return state;
    }

    restoreAnimationState(savedState) {
        if (!savedState || !this.animationParams) return;
        this.animationParams.forEach(param => {
            if (param.key && savedState[param.key]) {
                param.setAnimationConfig(savedState[param.key]);
            }
        });
    }

    updateUI(state) {
        const params = state[this.roseId];

        // Sync visuals if subscribed
        this.updateLinkVisuals();

        // Calculate k (Coset Count) for Stats and Viz
        let k;
        const currentSequencerType = params.sequencerType || 'Cyclic Additive Group Modulo N';
        const SequencerClass = SequencerRegistry[currentSequencerType];
        if (SequencerClass) {
            const seqInstance = new SequencerClass();
            if (seqInstance.getCosets) {
                const cosets = seqInstance.getCosets(params.totalDivs, params);
                if (cosets) k = cosets.length;
            }
        }
        if (!k) {
            k = gcd(params.step || 1, params.totalDivs || 360);
        }

        // 1. Stats
        if (this.statsSection) {
            this.statsSection.update(params, k);
        }

        // 2. Core Params
        if (this.coreParamsSection) {
            this.coreParamsSection.update(params);
        }

        // 3. Sequencer
        if (this.sequencerSection) {
            this.sequencerSection.update(params);
        }

        // 4. Relatives
        if (this.relativesSection) {
            this.relativesSection.update(params);
        }

        // 5. Appearance
        if (this.appearanceSection) {
            this.appearanceSection.update(params);
        }

        // 6. Coset Viz
        if (this.cosetVizSection) {
            this.cosetVizSection.update(params);
        }
    }

    updateLinkVisuals() {
        if (this.coreParamsSection && this.coreParamsSection.updateLinkVisuals) {
            this.coreParamsSection.updateLinkVisuals();
        }
        if (this.sequencerSection && this.sequencerSection.updateLinkVisuals) {
            this.sequencerSection.updateLinkVisuals();
        }
        if (this.appearanceSection && this.appearanceSection.updateLinkVisuals) {
            this.appearanceSection.updateLinkVisuals();
        }
        if (this.cosetVizSection && this.cosetVizSection.updateLinkVisuals) {
            this.cosetVizSection.updateLinkVisuals();
        }
    }
}
