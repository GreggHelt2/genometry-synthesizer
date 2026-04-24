// Imports mostly cleaned up, assuming submodules import what they need.
// Orchestrator needs basic utils + SubSections + Persistence.
import { StatsSection } from './chordal_rosette/StatsSection.js';
import { RelativesSection } from './chordal_rosette/RelativesSection.js';
import { CoreParamsSection } from './chordal_rosette/CoreParamsSection.js';
import { SequencerSection } from './chordal_rosette/SequencerSection.js';
import { AppearanceSection } from './chordal_rosette/AppearanceSection.js';
import { CosetVizSection } from './chordal_rosette/CosetVizSection.js';
import { CoincidentFinderSection } from './chordal_rosette/CoincidentFinderSection.js';
import { SpecialPointsSection } from './chordal_rosette/SpecialPointsSection.js';
import { ZoneContainer } from './ZoneContainer.js';

import { persistenceManager } from '../../engine/state/PersistenceManager.js';
import { linkManager } from '../../engine/logic/LinkManager.js';
import { flattenRoseParams } from '../../engine/state/stateAdapters.js';

import { Panel } from './Panel.js';
import { createElement, $id } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd } from '../../engine/math/MathOps.js';

export class ChordalRosettePanel extends Panel {
    constructor(id, title, roseId, options = {}) {
        super(id, title);
        this.roseId = roseId; // 'rosetteA' or 'rosetteB'
        this._options = options;
        this.chordSelection = options.chordSelection || null;

        // UI State Tracking
        this.uiState = {
            accordions: {} // Map id -> boolean (isOpen)
        };
        this.accordions = new Map(); // Keep refs for restoration

        this.renderContent();

        // Subscribe to store updates
        store.subscribe(this.updateUI.bind(this));

        // Subscribe to LinkManager updates
        this.linkManager = linkManager;
        linkManager.subscribe(this.updateLinkVisuals.bind(this));

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
        if (!state) return;

        this.uiState = state;

        // Apply to existing accordions
        if (state.accordions) {
            for (const [id, isOpen] of Object.entries(state.accordions)) {
                const acc = this.accordions.get(id);
                if (acc) {
                    if (acc.isOpen !== isOpen) {
                        acc.toggle();
                    }
                }
            }
        }

        // Restore zone collapse states
        if (state.zones) {
            if (this.geometryZone && state.zones.geometry !== undefined) {
                this.geometryZone.setOpen(state.zones.geometry);
            }
            if (this.styleZone && state.zones.style !== undefined) {
                this.styleZone.setOpen(state.zones.style);
            }
            if (this.analysisZone && state.zones.analysis !== undefined) {
                this.analysisZone.setOpen(state.zones.analysis);
            }
        }

        // Restore tab states
        if (state.tabs) {
            const tabKey = `${this.roseId}-appearance`;
            if (state.tabs[tabKey] && this.appearanceSection && this.appearanceSection.restoreTabState) {
                this.appearanceSection.restoreTabState(state.tabs[tabKey]);
            }
        }
    }

    renderContent() {
        const title = createElement('h2', 'text-xl font-bold p-4 text-center', { textContent: this.title });
        this.element.appendChild(title);

        // Preview Canvas
        const canvasContainer = createElement('div', 'w-full aspect-square bg-black border-b border-gray-700 relative');
        this.canvas = createElement('canvas', 'w-full h-full block bg-black');
        this.canvas.width = 320;
        this.canvas.height = 320;

        canvasContainer.appendChild(this.canvas);
        this.element.appendChild(canvasContainer);

        // Scrollable Controls Container
        this.controlsContainer = createElement('div', 'flex-1 overflow-y-auto w-full');
        this.element.appendChild(this.controlsContainer);

        // ═══════════════════════════════════════════
        // 🔷 GEOMETRY Zone
        // ═══════════════════════════════════════════
        this.geometryZone = new ZoneContainer('Geometry', '🔷', {
            color: '#60a5fa',
            collapsible: true,
            onToggle: (isOpen) => {
                this.uiState.zones = this.uiState.zones || {};
                this.uiState.zones.geometry = isOpen;
                persistenceManager.save();
            },
            id: `${this.roseId}-geometry`
        });
        this.controlsContainer.appendChild(this.geometryZone.element);

        // Stats (Info + Chord Analysis)
        this.statsSection = new StatsSection(this, this.roseId, {
            chordSelection: this._options.chordSelection || null
        });
        this.geometryZone.append(this.statsSection.element);

        // Core Params (Base Curve Generator)
        this.coreParamsSection = new CoreParamsSection(this, this.roseId);
        this.geometryZone.append(this.coreParamsSection.element);

        // Sequencer
        this.sequencerSection = new SequencerSection(this, this.roseId);
        this.geometryZone.append(this.sequencerSection.element);

        // Relatives Navigation
        this.relativesSection = new RelativesSection(this);
        this.geometryZone.append(this.relativesSection.element);

        // ═══════════════════════════════════════════
        // 🎨 STYLE Zone
        // ═══════════════════════════════════════════
        this.styleZone = new ZoneContainer('Style', '🎨', {
            color: '#c084fc',
            collapsible: true,
            onToggle: (isOpen) => {
                this.uiState.zones = this.uiState.zones || {};
                this.uiState.zones.style = isOpen;
                persistenceManager.save();
            },
            id: `${this.roseId}-style`
        });
        this.controlsContainer.appendChild(this.styleZone.element);

        // Appearance (Chordal Line, Vertex, Base Curve, Fill, General, Trails)
        this.appearanceSection = new AppearanceSection(this, this.roseId);
        this.styleZone.append(this.appearanceSection.element);

        // ═══════════════════════════════════════════
        // 📊 ANALYSIS Zone (collapsible, starts collapsed)
        // ═══════════════════════════════════════════
        this.analysisZone = new ZoneContainer('Analysis', '📊', {
            color: '#34d399',
            collapsible: true,
            defaultCollapsed: true,
            onToggle: (isOpen, id) => {
                this.uiState.zones = this.uiState.zones || {};
                this.uiState.zones.analysis = isOpen;
                persistenceManager.save();
            },
            id: `${this.roseId}-analysis`
        });
        this.controlsContainer.appendChild(this.analysisZone.element);

        // Coset Visualization
        this.cosetVizSection = new CosetVizSection(this, this.roseId);
        this.analysisZone.append(this.cosetVizSection.element);

        // Coincident Finder
        this.coincidentFinderSection = new CoincidentFinderSection(this, this.roseId);
        this.analysisZone.append(this.coincidentFinderSection.element);

        // Special Points (Erb self-intersection analysis)
        this.specialPointsSection = new SpecialPointsSection(this, this.roseId);
        this.analysisZone.append(this.specialPointsSection.element);
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

        // 7. Coincident Finder
        if (this.coincidentFinderSection) {
            this.coincidentFinderSection.update(params);
        }

        // 8. Special Points
        if (this.specialPointsSection) {
            this.specialPointsSection.update(params);
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
        if (this.specialPointsSection && this.specialPointsSection.updateLinkVisuals) {
            this.specialPointsSection.updateLinkVisuals();
        }
    }
}
