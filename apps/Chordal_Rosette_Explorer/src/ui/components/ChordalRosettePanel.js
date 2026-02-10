// Imports mostly cleaned up, assuming submodules import what they need.
// Orchestrator needs basic utils + SubSections + Persistence.
import { StatsSection } from './chordal_rosette/StatsSection.js';
import { RelativesSection } from './chordal_rosette/RelativesSection.js';
import { CoreParamsSection } from './chordal_rosette/CoreParamsSection.js';
import { SequencerSection } from './chordal_rosette/SequencerSection.js';
import { AppearanceSection } from './chordal_rosette/AppearanceSection.js';
import { CosetVizSection } from './chordal_rosette/CosetVizSection.js';

import { persistenceManager } from '../../engine/state/PersistenceManager.js';
import { flattenRoseParams } from '../../engine/state/stateAdapters.js';

import { Panel } from './Panel.js';
import { createElement, $id } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd } from '../../engine/math/MathOps.js';

export class ChordalRosettePanel extends Panel {
    constructor(id, title, roseId) {
        super(id, title);
        this.roseId = roseId; // 'rosetteA' or 'rosetteB'

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



    // Legacy createCurveTypeSelector, renderCoreParams, createSequencerTypeSelector,
    // updateSequencerParams, createCheckbox, createColorInput, createSlider
    // have been removed — all sub-sections now dispatch via stateAdapters.dispatchDeep().

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
        const roseState = state[this.roseId];
        if (!roseState) return;

        // Flatten nested v3.0 state → flat params for sub-sections
        const params = flattenRoseParams(roseState);

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
