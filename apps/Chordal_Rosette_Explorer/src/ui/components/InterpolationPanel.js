import { Panel } from './Panel.js';
import { Accordion } from './Accordion.js';
import { createElement } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd, lcm, getLinesToClose } from '../../engine/math/MathOps.js';
import { generateChordalPolyline } from '../../engine/math/chordal_rosette.js';
import { CurveRegistry } from '../../engine/math/curves/CurveRegistry.js'; // Needed if we generate points to count
import { ParamNumber } from './ParamNumber.js';
import { ParamSelect } from './ParamSelect.js';
import { ParamColor } from './ParamColor.js';
import { ParamToggle } from './ParamToggle.js';

import { HybridAnimationSection } from './hybrid/HybridAnimationSection.js';
import { HybridCosetSection } from './hybrid/HybridCosetSection.js';
import { HybridAppearanceSection } from './hybrid/HybridAppearanceSection.js';

export class InterpolationPanel extends Panel {
    constructor(id, title) {
        super(id, title);

        // UI State Persistence
        this.uiState = {
            accordions: {}
        };
        this.accordions = new Map();

        this.renderContent();
        store.subscribe(this.updateUI.bind(this));

        // Initial UI update to sync with default state
        this.updateUI(store.getState());
    }

    handleAccordionToggle(isOpen, id) {
        if (!id) return;
        this.uiState.accordions[id] = isOpen;
        import('../../engine/state/PersistenceManager.js').then(({ persistenceManager }) => {
            persistenceManager.save();
        });
    }

    getUIState() {
        return this.uiState;
    }

    restoreUIState(state) {
        if (!state || !state.accordions) return;
        this.uiState = state;
        for (const [id, isOpen] of Object.entries(state.accordions)) {
            const acc = this.accordions.get(id);
            if (acc && acc.isOpen !== isOpen) {
                acc.toggle();
            }
        }
    }

    renderContent() {
        // Scrollable Controls Container (Matches ChordalRosettePanel)
        this.controlsContainer = createElement('div', 'flex-1 overflow-y-auto w-full');
        this.element.appendChild(this.controlsContainer);

        // Info Accordion - Still manual/unique to this panel for now?
        // Or moved? Plan didn't specify checking 'Info'. I'll keep it.
        this.infoAccordion = new Accordion('Hybrid Info', false, this.handleAccordionToggle.bind(this), 'hybrid-info');
        this.accordions.set('hybrid-info', this.infoAccordion);
        this.infoContent = createElement('div', 'p-2 text-xs text-gray-300 font-mono flex flex-col gap-1');
        this.infoAccordion.append(this.infoContent);
        this.controlsContainer.appendChild(this.infoAccordion.element);

        // 1. Animation Section
        this.animationSection = new HybridAnimationSection(this);
        this.controlsContainer.appendChild(this.animationSection.element);

        // 2. Appearance Section (Visualizations, Base Chordal, Base Curve, Vertex, General)
        this.appearanceSection = new HybridAppearanceSection(this);
        // HybridAppearanceSection manages multiple accordions and appends them to orchestrator.controlsContainer directly?
        // Let's check HybridAppearanceSection code.
        // If it appends to controlsContainer, we don't need to append .element here if it doesn't have a single root.

        // 3. Coset Visualization Section
        this.cosetSection = new HybridCosetSection(this);
        this.controlsContainer.appendChild(this.cosetSection.element);

        // Recording Controls Section (Keep manual for now as per plan scope)
        this.recordingAccordion = new Accordion('Recording', false, this.handleAccordionToggle.bind(this), 'hybrid-recording');
        this.accordions.set('hybrid-recording', this.recordingAccordion);
        this.controlsContainer.appendChild(this.recordingAccordion.element);

        // Format Selector
        const formatWrapper = createElement('div', 'mb-3');
        const formatLabel = createElement('label', 'block text-xs text-gray-500 mb-1', { textContent: 'Format' });
        this.formatSelect = createElement('select', 'w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm');
        ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4'].forEach(opt => {
            if (MediaRecorder.isTypeSupported(opt)) {
                this.formatSelect.appendChild(createElement('option', '', { value: opt, textContent: opt }));
            }
        });
        formatWrapper.appendChild(formatLabel);
        formatWrapper.appendChild(this.formatSelect);
        this.recordingAccordion.append(formatWrapper);

        // Record Button
        this.recordBtn = createElement('button', 'w-full px-4 py-2 bg-green-700 rounded hover:bg-green-600 transition-colors flex items-center justify-center gap-2', {
            textContent: 'Start Recording'
        });

        this.recordBtn.addEventListener('click', () => {
            const isRecording = !store.getState().app.isRecording;
            store.dispatch({
                type: ACTIONS.SET_RECORDING,
                payload: isRecording
            });
        });

        this.recordingAccordion.append(this.recordBtn);




    }

    updateUI(state) {
        // Section Updates
        if (this.animationSection) this.animationSection.update(state);
        if (this.appearanceSection) this.appearanceSection.update(state);
        if (this.cosetSection) this.cosetSection.update(state);

        // Recording Button State (Keep manual)
        const isRecording = state.app.isRecording;
        this.recordBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        if (isRecording) {
            this.recordBtn.classList.remove('bg-green-700', 'hover:bg-green-600');
            this.recordBtn.classList.add('bg-red-700', 'hover:bg-red-600', 'animate-pulse');
        } else {
            this.recordBtn.classList.remove('bg-red-700', 'hover:bg-red-600', 'animate-pulse');
            this.recordBtn.classList.add('bg-green-700', 'hover:bg-green-600');
        }

        // Info Update
        const getK = (params) => {
            const seqType = params.sequencerType || 'Additive Group Modulo N';
            const SequencerClass = SequencerRegistry[seqType];
            if (SequencerClass) {
                const seq = new SequencerClass();
                if (seq.getCosets) {
                    const c = seq.getCosets(params.totalDivs, params);
                    if (c) return c.length;
                }
            }
            return gcd(params.step, params.totalDivs);
        };
        const kA = getK(state.rosetteA);
        const kB = getK(state.rosetteB);
        this.updateInfo(state, kA, kB);
    }

    updateInfo(state, kA, kB) {
        if (!this.infoContent) return;

        const getSegs = (params, k) => {
            const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];
            // Mock curve instance just for getPoint (though generateChordalPolyline needs it)
            // But we can just pass a dummy or reconstruct.
            // Reconstruct properly to be safe.
            const curve = (params.curveType === 'Rhodonea' || !params.curveType)
                ? new CurveClass(params.n, params.d, params.A, params.c, (params.rot * Math.PI) / 180)
                : new CurveClass(params);

            const SeqClass = SequencerRegistry[params.sequencerType || 'Additive Group Modulo N'];
            const seq = new SeqClass();

            // Get coset start param
            let start = 0;
            if (seq.getCosets && k > 1) {
                const cosets = seq.getCosets(params.totalDivs, params);
                if (cosets) {
                    const idx = (params.cosetIndex || 0) % cosets.length;
                    start = cosets[idx];
                }
            } else if (k > 1) {
                start = params.cosetIndex || 0;
            }

            const points = generateChordalPolyline(curve, seq, params.totalDivs, start, params);
            return points.length > 0 ? points.length - 1 : 0;
        };

        const segsA = getSegs(state.rosetteA, kA);
        const segsB = getSegs(state.rosetteB, kB);

        const lcmVal = lcm(segsA, segsB);
        let status = 'Exact Match';
        let detail = '(No Upsampling)';
        let color = 'text-green-400';

        // Check Approx Threshold
        const threshold = state.hybrid.approxResampleThreshold ?? 20000;
        const useApprox = (threshold === 0) || (segsA > 0 && segsB > 0 && segsA !== segsB && lcmVal > threshold);

        if (useApprox) {
            status = 'Approximate';
            const sampleCount = (threshold === 0) ? 20000 : threshold;
            detail = `(Resampled to ${sampleCount})`;
            color = 'text-yellow-400';
        } else if (segsA !== segsB) {
            status = 'Exact Resample';
            detail = `(Upsampled to LCM ${lcmVal})`;
            color = 'text-blue-400';
        }

        this.infoContent.innerHTML = `
            <div><span class="text-gray-400">Segments A:</span> <span class="text-blue-400">${segsA}</span></div>
            <div><span class="text-gray-400">Segments B:</span> <span class="text-blue-400">${segsB}</span></div>
            <div><span class="text-gray-400">LCM (Target):</span> <span class="text-blue-400">${lcmVal}</span></div>
            <div><span class="text-gray-400">Status:</span> <span class="${color}">${status}</span></div>
            <div class="text-[10px] text-gray-500">${detail}</div>
        `;
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
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { [key]: val }
                });
            }
        });

        // Adapter to match old structure expecting { container, input }
        // We attach the full instance so updateUI can use .setValue

        // Track for Animation Persistence
        if (!this.animationParams) this.animationParams = new Set();
        this.animationParams.add(paramGui);

        // Hook dispose to cleanup
        const originalDispose = paramGui.dispose.bind(paramGui);
        paramGui.dispose = () => {
            this.animationParams.delete(paramGui);
            originalDispose();
        };

        return {
            container: paramGui.getElement(),
            instance: paramGui,
            // Legacy support if needed, though we should use instance.setValue
            input: paramGui.slider
        };
    }

    getAnimationState() {
        const state = {};
        if (this.animationParams) {
            this.animationParams.forEach(param => {
                const config = param.getAnimationConfig();
                if (config && param.key) {
                    state[param.key] = config;
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
}
