import { Panel } from './Panel.js';
import { Accordion } from './Accordion.js';
import { createElement } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd, lcm, getLinesToClose } from '../../engine/math/MathOps.js';
import { generateMaurerPolyline } from '../../engine/math/maurer.js';
import { CurveRegistry } from '../../engine/math/curves/CurveRegistry.js'; // Needed if we generate points to count
import { ParamNumber } from './ParamNumber.js';
import { ParamSelect } from './ParamSelect.js';
import { ParamColor } from './ParamColor.js';
import { ParamToggle } from './ParamToggle.js';
import { GeneralRenderingModule, VertexVizModule } from './modules/AppearanceModules.js';

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

        // Info Accordion
        this.infoAccordion = new Accordion('Hybrid Info', false, this.handleAccordionToggle.bind(this), 'hybrid-info');
        this.accordions.set('hybrid-info', this.infoAccordion);
        this.infoContent = createElement('div', 'p-2 text-xs text-gray-300 font-mono flex flex-col gap-1');
        this.infoAccordion.append(this.infoContent);
        this.controlsContainer.appendChild(this.infoAccordion.element);

        // Create "Animation" Accordion for Hybrid controls
        this.animationAccordion = new Accordion('Animation', true, (isOpen, id) => {
            this.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => this.alignLabels(this.animationAccordion.content));
        }, 'hybrid-anim');
        this.accordions.set('hybrid-anim', this.animationAccordion);
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

        // Interpolation Color & Method

        // 1. Method
        const methodOptions = [
            { value: 'solid', label: 'Single Color' },
            { value: 'length', label: 'Length' },
            { value: 'angle', label: 'Angle' },
            { value: 'sequence', label: 'Sequence' }
        ];

        this.methodSelect = new ParamSelect({
            key: 'colorMethod',
            label: 'Color Method',
            options: methodOptions,
            value: 'solid',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { colorMethod: val }
                });
            }
        });
        colorContainer.append(this.methodSelect.getElement());

        // 2. Color
        this.colorInput = new ParamColor({
            key: 'color',
            label: 'Color',
            value: '#ffffff',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { color: val }
                });
            }
        });
        colorContainer.append(this.colorInput.getElement());

        // 3. Blend Mode
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

        this.blendSelect = new ParamSelect({
            key: 'blendMode',
            label: 'Blend Mode',
            options: blendModes,
            value: 'source-over',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { blendMode: val }
                });
            }
        });
        colorContainer.append(this.blendSelect.getElement());

        // We need a place for this colorContainer. 
        // Previously it was in `container`. Let's create an accordion for it or append to animationAccordion? 
        // RosettePanel puts it in "Chordal Line Viz".
        // InterpolationPanel had it loose in `container`.
        // Let's create a "Visualization" Accordion to better organize it.
        // Let's create a "Visualization" Accordion to better organize it.
        this.vizAccordion = new Accordion('Visualization', true, this.handleAccordionToggle.bind(this), 'hybrid-viz');
        this.accordions.set('hybrid-viz', this.vizAccordion);
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


        // Vertex Rendering Accordion - Use Module
        this.vertexAccordion = new Accordion('Vertex Rendering', false, (isOpen, id) => {
            if (this.handleAccordionToggle) this.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => {
                if (this.alignLabels) this.alignLabels(this.vertexAccordion.content);
            });
        }, 'hybrid-vertex');
        this.accordions.set('hybrid-vertex', this.vertexAccordion);
        this.controlsContainer.appendChild(this.vertexAccordion.element);

        this.vertexModule = new VertexVizModule(
            this,      // Orchestrator
            'hybrid',  // roseId
            ACTIONS.UPDATE_HYBRID,
            {
                showVertices: 'showVertices',
                vertexRadius: 'vertexRadius',
                vertexColor: 'vertexColor',
                vertexOpacity: 'vertexOpacity',
                vertexBlendMode: 'vertexBlendMode'
            }
        );
        this.vertexAccordion.append(this.vertexModule.container);


        // General Rendering Settings Accordion (Module)
        this.generalAccordion = new Accordion('General Rendering Settings', false, this.handleAccordionToggle.bind(this), 'hybrid-general');
        this.accordions.set('hybrid-general', this.generalAccordion);
        this.controlsContainer.appendChild(this.generalAccordion.element);

        this.generalModule = new GeneralRenderingModule(
            this,      // Orchestrator
            'hybrid',  // roseId
            ACTIONS.UPDATE_HYBRID,
            {
                autoScale: 'autoScale',
                scaleLineWidth: 'scaleLineWidth',
                backgroundOpacity: 'backgroundOpacity',
                backgroundColor: 'backgroundColor'
            }
        );
        this.generalAccordion.append(this.generalModule.container);

        // Coset Visualization Accordion (Hybrid)
        this.cosetAccordion = new Accordion('Coset Visualization', false, this.handleAccordionToggle.bind(this), 'hybrid-coset');
        this.accordions.set('hybrid-coset', this.cosetAccordion);
        // Removed manual margin-top
        // this.cosetAccordion.element.style.marginTop = '1rem'; 

        // Info text
        this.cosetInfo = createElement('div', 'text-xs text-gray-400 mb-2 p-1', { textContent: 'Cosets Match (k): -' });
        this.cosetAccordion.append(this.cosetInfo);

        // LCM Match Toggle
        this.lcmMatchCheck = new ParamToggle({
            key: 'matchCosetsByLCM',
            label: 'Match Cosets by LCM',
            value: false,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { matchCosetsByLCM: val }
                });
            }
        });
        this.cosetAccordion.append(this.lcmMatchCheck.getElement());

        // Coset Count
        this.cosetCountControl = this.createSlider('cosetCount', 1, 1, 1, 'Cosets to Show');
        this.cosetAccordion.append(this.cosetCountControl.container);

        // Coset Index
        this.cosetIndexControl = this.createSlider('cosetIndex', 0, 1, 1, 'Starting Coset Index');
        this.cosetAccordion.append(this.cosetIndexControl.container);

        // Distribution
        const distOptions = [
            { value: 'sequential', label: 'Sequential' },
            { value: 'distributed', label: 'Distributed' },
            { value: 'two-way', label: 'Two-Way' }
        ];

        this.distSelect = new ParamSelect({
            key: 'cosetDistribution',
            label: 'Distribution',
            options: distOptions,
            value: 'sequential',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { cosetDistribution: val }
                });
            }
        });
        this.cosetAccordion.append(this.distSelect.getElement());

        // Append accordion to main container
        this.controlsContainer.appendChild(this.cosetAccordion.element);



        // Underlays Section
        const underlayContainer = createElement('div', 'mt-4 pt-4 border-t border-gray-700');
        underlayContainer.appendChild(createElement('h3', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Underlays' }));

        // Toggles
        // Toggles
        // const toggleRow = createElement('div', 'flex gap-4 mb-2');

        // Use individual rows for toggle consistency since they are block-level styled now? 
        // Actually ParamToggle is flex row.
        // Let's just stack them.

        this.showACheck = new ParamToggle({
            key: 'showRoseA',
            label: 'Show Source A',
            value: true,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { showRoseA: val }
                });
            }
        });

        this.showBCheck = new ParamToggle({
            key: 'showRoseB',
            label: 'Show Source B',
            value: true,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { showRoseB: val }
                });
            }
        });

        underlayContainer.appendChild(this.showACheck.getElement());
        underlayContainer.appendChild(this.showBCheck.getElement());

        // Opacity
        this.underlayOpacityControl = this.createSlider('underlayOpacity', 0, 1, 0.01, 'Underlay Opacity');
        underlayContainer.appendChild(this.underlayOpacityControl.container);

        // Add to Viz Accordion instead of loose
        this.vizAccordion.append(underlayContainer);

        // Base Curve Viz Accordion (Hybrid)
        this.baseCurveVizAccordion = new Accordion('Base Curve Rendering', false, (isOpen, id) => {
            this.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => this.alignLabels(this.baseCurveVizAccordion.content));
        }, 'hybrid-base-viz');
        this.accordions.set('hybrid-base-viz', this.baseCurveVizAccordion);
        this.controlsContainer.appendChild(this.baseCurveVizAccordion.element);

        // --- Base Curve A Controls ---
        const groupA = createElement('div', 'flex flex-col mb-4 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupA.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source A Curve' }));

        // Toggle A
        this.showBaseCurveControlA = new ParamToggle({
            key: 'showBaseCurveA',
            label: 'Show Base Curve',
            value: false,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { showBaseCurveA: val }
                });
            }
        });
        groupA.appendChild(this.showBaseCurveControlA.getElement());

        // Width A
        this.baseCurveWidthControlA = this.createSlider('baseCurveLineWidthA', 0.1, 10, 0.1, 'Line Width');
        groupA.appendChild(this.baseCurveWidthControlA.container);

        // Color A
        this.baseCurveColorControlA = new ParamColor({
            key: 'baseCurveColorA',
            label: 'Color',
            value: '#666666',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { baseCurveColorA: val }
                });
            }
        });
        groupA.appendChild(this.baseCurveColorControlA.getElement());

        // Opacity A
        this.baseCurveOpacityControlA = this.createSlider('baseCurveOpacityA', 0, 1, 0.01, 'Opacity');
        groupA.appendChild(this.baseCurveOpacityControlA.container);

        // Blend Mode A
        // Reusing options is fine if defined, but local options safe
        const baseCurveBlendModes = [
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
        this.baseCurveBlendSelectA = new ParamSelect({
            key: 'baseCurveBlendModeA',
            label: 'Blend Mode',
            options: baseCurveBlendModes,
            value: 'source-over',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { baseCurveBlendModeA: val }
                });
            }
        });
        groupA.appendChild(this.baseCurveBlendSelectA.getElement());

        this.baseCurveVizAccordion.append(groupA);


        // --- Base Curve B Controls ---
        const groupB = createElement('div', 'flex flex-col mb-2 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupB.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source B Curve' }));

        // Toggle B
        this.showBaseCurveControlB = new ParamToggle({
            key: 'showBaseCurveB',
            label: 'Show Base Curve',
            value: false,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { showBaseCurveB: val }
                });
            }
        });
        groupB.appendChild(this.showBaseCurveControlB.getElement());

        // Width B
        this.baseCurveWidthControlB = this.createSlider('baseCurveLineWidthB', 0.1, 10, 0.1, 'Line Width');
        groupB.appendChild(this.baseCurveWidthControlB.container);

        // Color B
        this.baseCurveColorControlB = new ParamColor({
            key: 'baseCurveColorB',
            label: 'Color',
            value: '#666666',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { baseCurveColorB: val }
                });
            }
        });
        groupB.appendChild(this.baseCurveColorControlB.getElement());

        // Opacity B
        this.baseCurveOpacityControlB = this.createSlider('baseCurveOpacityB', 0, 1, 0.01, 'Opacity');
        groupB.appendChild(this.baseCurveOpacityControlB.container);

        // Blend Mode B
        this.baseCurveBlendSelectB = new ParamSelect({
            key: 'baseCurveBlendModeB',
            label: 'Blend Mode',
            options: baseCurveBlendModes, // Reusing local variable which now has full list
            value: 'source-over',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { baseCurveBlendModeB: val }
                });
            }
        });
        groupB.appendChild(this.baseCurveBlendSelectB.getElement());

        this.baseCurveVizAccordion.append(groupB);


        // Recording Controls Section
        // Use an Accordion for Recording? Or append to controlsContainer
        // Rosette panels don't have recording.
        // Let's make a Recording Accordion for consistency.
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
        // this.element.appendChild(container); // Remove old container append
    }

    updateUI(state) {
        const hybridParams = state.hybrid;

        if (this.morphControl) {
            this.morphControl.instance.setValue(hybridParams.weight);
        }

        if (this.opacityControl) {
            this.opacityControl.instance.setValue(hybridParams.opacity ?? 1);
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
        const useLCM = hybridParams.matchCosetsByLCM;
        const ringsLCM = lcm(kA, kB);
        const isMatching = (kA === kB && kA > 1);
        const isLCMMatching = (useLCM && ringsLCM > 1 && (kA > 1 || kB > 1));

        // Always show the panel
        this.cosetAccordion.element.style.display = 'block';
        this.lcmMatchCheck.setValue(useLCM);

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

        this.distSelect.setDisabled(!enableMultiControls);
        this.distSelect.getElement().style.opacity = enableMultiControls ? '1' : '0.5';

        this.cosetIndexControl.container.style.opacity = enableIndexControl ? '1' : '0.5';
        this.cosetIndexControl.input.disabled = !enableIndexControl;

        // Update Max Ranges
        if (this.cosetCountControl) {
            this.cosetCountControl.instance.setMax(effectiveK);
            this.cosetCountControl.instance.setValue(Math.min(hybridParams.cosetCount || 1, effectiveK));
        }

        // Index Max: ideally wrapping max(kA, kB)
        const indexMax = (enableMultiControls) ? effectiveK : Math.max(kA, kB);
        if (this.cosetIndexControl) {
            this.cosetIndexControl.instance.setMax(Math.max(1, indexMax - 1));
            this.cosetIndexControl.instance.setValue((hybridParams.cosetIndex || 0) % (indexMax || 1));
        }

        if (this.distSelect) {
            this.distSelect.setValue(hybridParams.cosetDistribution || 'sequential');
        }

        // Update Threshold Slider
        if (this.resampleThresholdControl) {
            this.resampleThresholdControl.instance.setValue(hybridParams.approxResampleThreshold ?? 20000);
        }

        // Update Info Panel with Resampling Status
        // We defer this to this.updateInfo which reconstructs the strings
        this.updateInfo(state, kA, kB);
        // --------------------------

        if (this.colorInput) {
            this.colorInput.setValue(hybridParams.color || '#ffffff');
        }
        if (this.methodSelect) {
            this.methodSelect.setValue(hybridParams.colorMethod || 'solid');
        }
        if (this.blendSelect) {
            this.blendSelect.setValue(hybridParams.blendMode || 'source-over');
        }

        // Update Underlays
        this.showACheck.setValue(hybridParams.showRoseA);
        this.showBCheck.setValue(hybridParams.showRoseB);
        if (this.underlayOpacityControl) {
            this.underlayOpacityControl.instance.setValue(hybridParams.underlayOpacity);
        }
        if (this.underlayOpacityControl) {
            this.underlayOpacityControl.instance.setValue(hybridParams.underlayOpacity);
        }

        // Base Curve Viz Updates (A)
        if (this.showBaseCurveControlA) this.showBaseCurveControlA.setValue(hybridParams.showBaseCurveA);
        if (this.baseCurveWidthControlA) this.baseCurveWidthControlA.instance.setValue(hybridParams.baseCurveLineWidthA ?? 2);
        if (this.baseCurveColorControlA) this.baseCurveColorControlA.setValue(hybridParams.baseCurveColorA || '#666666');
        if (this.baseCurveOpacityControlA) this.baseCurveOpacityControlA.instance.setValue(hybridParams.baseCurveOpacityA ?? 1);
        if (this.baseCurveBlendSelectA) this.baseCurveBlendSelectA.setValue(hybridParams.baseCurveBlendModeA || 'source-over');

        // Base Curve Viz Updates (B)
        if (this.showBaseCurveControlB) this.showBaseCurveControlB.setValue(hybridParams.showBaseCurveB);
        if (this.baseCurveWidthControlB) this.baseCurveWidthControlB.instance.setValue(hybridParams.baseCurveLineWidthB ?? 2);
        if (this.baseCurveColorControlB) this.baseCurveColorControlB.setValue(hybridParams.baseCurveColorB || '#666666');
        if (this.baseCurveOpacityControlB) this.baseCurveOpacityControlB.instance.setValue(hybridParams.baseCurveOpacityB ?? 1);
        if (this.baseCurveBlendSelectB) {
            this.baseCurveBlendSelectB.setValue(hybridParams.baseCurveBlendModeB || 'source-over');
        }

        // Vertex Rendering Updates
        if (this.vertexModule) {
            this.vertexModule.update(hybridParams);
        }
        // General Rendering Updates
        if (this.generalModule) {
            this.generalModule.update(hybridParams);
        }
        if (this.vertexBlendSelect) {
            this.vertexBlendSelect.setValue(hybridParams.vertexBlendMode || 'source-over');
        }

        // General Rendering Updates (Restored)
        if (this.generalModule) {
            this.generalModule.update(hybridParams);
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
