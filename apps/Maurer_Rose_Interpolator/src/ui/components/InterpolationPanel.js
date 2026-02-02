import { Panel } from './Panel.js';
import { Accordion } from './Accordion.js';
import { createElement } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd, lcm, getLinesToClose } from '../../engine/math/MathOps.js';
import { generateMaurerPolyline } from '../../engine/math/maurer.js';
import { CurveRegistry } from '../../engine/math/curves/CurveRegistry.js'; // Needed if we generate points to count
import { ParamGui } from './ParamGui.js';

export class InterpolationPanel extends Panel {
    constructor(id, title) {
        super(id, title);
        this.renderContent();
        store.subscribe(this.updateUI.bind(this));
    }

    renderContent() {
        // Scrollable Controls Container (Matches ChordalRosettePanel)
        this.controlsContainer = createElement('div', 'flex-1 overflow-y-auto w-full');
        this.element.appendChild(this.controlsContainer);

        // Info Accordion
        this.infoAccordion = new Accordion('Hybrid Info', false);
        this.infoContent = createElement('div', 'p-2 text-xs text-gray-300 font-mono flex flex-col gap-1');
        this.infoAccordion.append(this.infoContent);
        this.controlsContainer.appendChild(this.infoAccordion.element);

        // Create "Animation" Accordion for Hybrid controls
        this.animationAccordion = new Accordion('Animation', true, (isOpen) => {
            if (isOpen) requestAnimationFrame(() => this.alignLabels(this.animationAccordion.content));
        });
        this.controlsContainer.appendChild(this.animationAccordion.element);

        // Morph Weight Slider
        this.morphControl = this.createSlider('weight', 0, 1, 0.001, 'Morph Weight'); // Step was 0.001 in original input
        this.animationAccordion.append(this.morphControl.container);

        // Interpolation Opacity Slider
        this.opacityControl = this.createSlider('opacity', 0, 1, 0.01, 'Interpolation Opacity');
        this.animationAccordion.append(this.opacityControl.container);

        // Align labels initially
        requestAnimationFrame(() => {
            this.alignLabels(this.animationAccordion.content);
        });

        // Interpolation Color & Method
        // Interpolation Color & Method
        const colorContainer = createElement('div', 'flex flex-col mb-2 p-2');

        // Row 1: Method
        const methodRow = createElement('div', 'flex items-center justify-between mb-2');
        const methodLabel = createElement('label', 'text-sm text-gray-300 mr-2', { textContent: 'Rosette Coloring Method' });

        this.methodSelect = createElement('select', 'flex-1 bg-gray-700 text-white text-xs rounded border border-gray-600 px-1');
        ['solid', 'length', 'angle', 'sequence'].forEach(m => {
            const opt = createElement('option', '', { value: m, textContent: m.charAt(0).toUpperCase() + m.slice(1) });
            this.methodSelect.appendChild(opt);
        });
        this.methodSelect.addEventListener('change', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_HYBRID,
                payload: { colorMethod: e.target.value }
            });
        });

        methodRow.appendChild(methodLabel);
        methodRow.appendChild(this.methodSelect);
        colorContainer.appendChild(methodRow);

        // Row 2: Color
        const colorRow = createElement('div', 'flex items-center justify-between');
        const colorLabel = createElement('label', 'text-sm text-gray-300 mr-2', { textContent: 'Colors' });

        this.colorInput = createElement('input', 'w-8 h-8 rounded cursor-pointer border-0', { type: 'color' });
        this.colorInput.addEventListener('input', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_HYBRID,
                payload: { color: e.target.value }
            });
        });

        colorRow.appendChild(colorLabel);
        colorRow.appendChild(this.colorInput);
        colorContainer.appendChild(colorRow);

        // Row 3: Blend Mode
        const blendContainer = createElement('div', 'flex items-center justify-between mt-2');
        const blendLabel = createElement('label', 'text-sm text-gray-300 mr-2', { textContent: 'Blend Mode' });
        this.blendSelect = createElement('select', 'bg-gray-700 text-white text-xs rounded border border-gray-600 px-1 py-1 flex-1');
        const blendModes = [
            { value: 'source-over', label: 'Normal' },
            { value: 'lighter', label: 'Lighter (Add)' },
            { value: 'multiply', label: 'Multiply' },
            { value: 'screen', label: 'Screen' },
            { value: 'overlay', label: 'Overlay' },
            { value: 'darken', label: 'Darken' },
            { value: 'lighten', label: 'Lighten' },
            { value: 'color-dodge', label: 'Color Dodge' },
            { value: 'color-burn', label: 'Color Burn' },
            { value: 'hard-light', label: 'Hard Light' },
            { value: 'soft-light', label: 'Soft Light' },
            { value: 'difference', label: 'Difference' },
            { value: 'exclusion', label: 'Exclusion' },
            { value: 'hue', label: 'Hue' },
            { value: 'saturation', label: 'Saturation' },
            { value: 'color', label: 'Color' },
            { value: 'luminosity', label: 'Luminosity' }
        ];
        blendModes.forEach(m => {
            const opt = createElement('option', '', { value: m.value, textContent: m.label });
            this.blendSelect.appendChild(opt);
        });
        this.blendSelect.addEventListener('change', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_HYBRID,
                payload: { blendMode: e.target.value }
            });
        });
        blendContainer.appendChild(blendLabel);
        blendContainer.appendChild(this.blendSelect);
        colorContainer.appendChild(blendContainer);

        // We need a place for this colorContainer. 
        // Previously it was in `container`. Let's create an accordion for it or append to animationAccordion? 
        // RosettePanel puts it in "Chordal Line Viz".
        // InterpolationPanel had it loose in `container`.
        // Let's create a "Visualization" Accordion to better organize it.
        this.vizAccordion = new Accordion('Visualization', true);
        this.vizAccordion.append(colorContainer);
        this.controlsContainer.appendChild(this.vizAccordion.element);


        // Resampling Fallback Section
        // Previously loose. Move to Viz or its own? 
        // Let's put it in Visualization for now.
        const resampleContainer = createElement('div', 'flex flex-col mb-4 p-2 border border-gray-700 rounded bg-gray-900/50');
        resampleContainer.appendChild(createElement('label', 'text-sm text-gray-300 mb-1', { textContent: 'Resampling Fallback' }));

        // Approx Resample Threshold
        // 0 = Always On, >0 = LCM Threshold
        this.resampleThresholdControl = this.createSlider('approxResampleThreshold', 0, 50000, 1000, 'Threshold (0=Always)');
        resampleContainer.appendChild(this.resampleThresholdControl.container);

        this.vizAccordion.append(resampleContainer);


        // Coset Visualization Accordion (Hybrid)
        this.cosetAccordion = new Accordion('Coset Visualization', false);
        // Removed manual margin-top
        // this.cosetAccordion.element.style.marginTop = '1rem'; 

        // Info text
        this.cosetInfo = createElement('div', 'text-xs text-gray-400 mb-2 p-1', { textContent: 'Cosets Match (k): -' });
        this.cosetAccordion.append(this.cosetInfo);

        // LCM Match Toggle
        this.lcmMatchCheck = this.createCheckbox('matchCosetsByLCM', 'Match Cosets by LCM');
        this.cosetAccordion.append(this.lcmMatchCheck.container);

        // Coset Count
        this.cosetCountControl = this.createSlider('cosetCount', 1, 1, 1, 'Cosets to Show');
        this.cosetAccordion.append(this.cosetCountControl.container);

        // Coset Index
        this.cosetIndexControl = this.createSlider('cosetIndex', 0, 1, 1, 'Starting Coset Index');
        this.cosetAccordion.append(this.cosetIndexControl.container);

        // Distribution
        const distContainer = createElement('div', 'flex flex-col mb-2');
        const distLabel = createElement('label', 'text-xs text-gray-400 mb-1', { textContent: 'Distribution' });
        this.distSelect = createElement('select', 'bg-gray-700 text-white text-xs rounded border border-gray-600 px-1 py-1');

        ['Sequential', 'Distributed', 'Two-Way'].forEach(m => {
            const val = m.toLowerCase();
            const opt = createElement('option', '', { value: val, textContent: m });
            this.distSelect.appendChild(opt);
        });

        this.distSelect.addEventListener('change', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_HYBRID,
                payload: { cosetDistribution: e.target.value }
            });
        });

        distContainer.appendChild(distLabel);
        distContainer.appendChild(this.distSelect);
        this.cosetAccordion.append(distContainer);

        // Append accordion to main container
        this.controlsContainer.appendChild(this.cosetAccordion.element);



        // Underlays Section
        const underlayContainer = createElement('div', 'mt-4 pt-4 border-t border-gray-700');
        underlayContainer.appendChild(createElement('h3', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Underlays' }));

        // Toggles
        const toggleRow = createElement('div', 'flex gap-4 mb-2');
        this.showACheck = this.createCheckbox('showRoseA', 'Show A');
        this.showBCheck = this.createCheckbox('showRoseB', 'Show B');
        toggleRow.appendChild(this.showACheck.container);
        toggleRow.appendChild(this.showBCheck.container);
        underlayContainer.appendChild(toggleRow);

        // Opacity
        this.underlayOpacityControl = this.createSlider('underlayOpacity', 0, 1, 0.01, 'Underlay Opacity');
        underlayContainer.appendChild(this.underlayOpacityControl.container);

        // Add to Viz Accordion instead of loose
        this.vizAccordion.append(underlayContainer);

        // Recording Controls Section
        // Use an Accordion for Recording? Or append to controlsContainer
        // Rosette panels don't have recording.
        // Let's make a Recording Accordion for consistency.
        this.recordingAccordion = new Accordion('Recording', false);
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
        // this.element.appendChild(container); // Remove old container append
    }

    updateUI(state) {
        if (this.morphControl) {
            this.morphControl.instance.setValue(state.hybrid.weight);
        }

        if (this.opacityControl) {
            this.opacityControl.instance.setValue(state.hybrid.opacity ?? 1);
        }

        // --- Hybrid Coset Logic ---
        // Helper to get k
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
        const useLCM = state.hybrid.matchCosetsByLCM;
        const ringsLCM = lcm(kA, kB);
        const isMatching = (kA === kB && kA > 1);
        const isLCMMatching = (useLCM && ringsLCM > 1 && (kA > 1 || kB > 1));

        // Always show the panel
        this.cosetAccordion.element.style.display = 'block';
        this.lcmMatchCheck.input.checked = useLCM;

        let effectiveK = 1;

        if (isMatching) {
            effectiveK = kA;
            this.cosetInfo.textContent = `Cosets Match (k): ${kA}`;
        } else if (isLCMMatching) {
            effectiveK = ringsLCM;
            this.cosetInfo.textContent = `Counts: A=${kA}, B=${kB} [LCM=${effectiveK}]`;
        } else if (kA > 1 || kB > 1) {
            // Mismatch and NOT using LCM
            this.cosetInfo.textContent = `Mismatch: A=${kA}, B=${kB} (Single Ring Mode)`;
            effectiveK = 1;
        } else {
            // Both are single coset (kA=1, kB=1)
            this.cosetInfo.textContent = `Cosets (k): 1`;
            effectiveK = 1;
        }

        // --- Enable/Disable Controls ---

        // Multi-view controls (Count, Dist) apply ONLY when we have a full hybrid set (Exact or LCM)
        const enableMultiControls = (isMatching || isLCMMatching);

        // Index control applies if we have choices on either side, even if mapped 1-to-1 fallback
        // If kA > 1 or kB > 1, the user might want to rotate the "Single Ring" choice.
        const enableIndexControl = (kA > 1 || kB > 1);

        this.cosetCountControl.container.style.opacity = enableMultiControls ? '1' : '0.5';
        this.cosetCountControl.input.disabled = !enableMultiControls;

        this.distSelect.disabled = !enableMultiControls;
        this.distSelect.parentElement.style.opacity = enableMultiControls ? '1' : '0.5';

        this.cosetIndexControl.container.style.opacity = enableIndexControl ? '1' : '0.5';
        this.cosetIndexControl.input.disabled = !enableIndexControl;

        // Update Max Ranges
        if (this.cosetCountControl) {
            this.cosetCountControl.instance.setMax(effectiveK);
            this.cosetCountControl.instance.setValue(Math.min(state.hybrid.cosetCount || 1, effectiveK));
        }

        // Index Max: ideally wrapping max(kA, kB)
        const indexMax = (enableMultiControls) ? effectiveK : Math.max(kA, kB);
        if (this.cosetIndexControl) {
            this.cosetIndexControl.instance.setMax(Math.max(1, indexMax - 1));
            this.cosetIndexControl.instance.setValue((state.hybrid.cosetIndex || 0) % (indexMax || 1));
        }

        if (this.distSelect.value !== state.hybrid.cosetDistribution) {
            this.distSelect.value = state.hybrid.cosetDistribution || 'sequential';
        }

        // Update Threshold Slider
        if (this.resampleThresholdControl) {
            this.resampleThresholdControl.instance.setValue(state.hybrid.approxResampleThreshold ?? 20000);
        }

        // Update Info Panel with Resampling Status
        // We defer this to this.updateInfo which reconstructs the strings
        this.updateInfo(state, kA, kB);
        // --------------------------

        if (this.colorInput.value !== state.hybrid.color) {
            this.colorInput.value = state.hybrid.color || '#ffffff';
        }
        if (this.methodSelect.value !== state.hybrid.colorMethod) {
            this.methodSelect.value = state.hybrid.colorMethod || 'solid';
        }
        if (this.blendSelect.value !== state.hybrid.blendMode) {
            this.blendSelect.value = state.hybrid.blendMode || 'source-over';
        }

        // Update Underlays
        this.showACheck.input.checked = state.hybrid.showRoseA;
        this.showBCheck.input.checked = state.hybrid.showRoseB;
        if (this.underlayOpacityControl) {
            this.underlayOpacityControl.instance.setValue(state.hybrid.underlayOpacity);
        }



        const isRecording = state.app.isRecording;
        this.recordBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        if (isRecording) {
            this.recordBtn.classList.remove('bg-green-700', 'hover:bg-green-600');
            this.recordBtn.classList.add('bg-red-700', 'hover:bg-red-600', 'animate-pulse');
        } else {
            this.recordBtn.classList.remove('bg-red-700', 'hover:bg-red-600', 'animate-pulse');
            this.recordBtn.classList.add('bg-green-700', 'hover:bg-green-600');
        }
    }

    updateInfo(state, kA, kB) {
        if (!this.infoContent) return;

        const getSegs = (params, k) => {
            const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];
            // Mock curve instance just for getPoint (though generateMaurerPolyline needs it)
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

            const points = generateMaurerPolyline(curve, seq, params.totalDivs, start, params);
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

    createCheckbox(key, label) {
        const container = createElement('div', 'flex items-center mb-2'); // Added mb-2
        const input = createElement('input', 'mr-2', { type: 'checkbox' });
        const labelEl = createElement('label', 'text-sm text-gray-300', { textContent: label }); // Changed text-xs to text-sm

        input.addEventListener('change', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_HYBRID,
                payload: { [key]: e.target.checked }
            });
        });

        container.appendChild(input);
        container.appendChild(labelEl);
        return { container, input };
    }

    createSlider(key, min, max, step, label) {
        // Use ParamGui
        const paramGui = new ParamGui({
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
        return {
            container: paramGui.getElement(),
            instance: paramGui,
            // Legacy support if needed, though we should use instance.setValue
            input: paramGui.slider
        };
    }
}
