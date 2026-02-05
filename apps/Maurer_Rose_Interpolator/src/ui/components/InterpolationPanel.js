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
import { GlobalRenderingModule, LayerRenderingModule } from './modules/AppearanceModules.js';

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

        this.vertexModule = new LayerRenderingModule(
            this,      // Orchestrator
            'hybrid',  // roseId
            ACTIONS.UPDATE_HYBRID,
            {
                size: 'vertexRadius',
                color: 'vertexColor',
                opacity: 'vertexOpacity',
                blendMode: 'vertexBlendMode',
                colorMethod: 'vertexColorMethod', // New feature hook
                antiAlias: 'vertexAntiAlias'
            },
            {
                showToggle: { key: 'showVertices', label: 'Show Vertices', value: false },
                sizeLabel: 'Radius'
            }
        );
        this.vertexAccordion.append(this.vertexModule.container);


        // General Rendering Settings Accordion (Module)
        this.generalAccordion = new Accordion('General Rendering Settings', false, this.handleAccordionToggle.bind(this), 'hybrid-general');
        this.accordions.set('hybrid-general', this.generalAccordion);
        this.controlsContainer.appendChild(this.generalAccordion.element);

        this.generalModule = new GlobalRenderingModule(
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
        // Underlays Accordion
        this.underlaysAccordion = new Accordion('Underlays', false, (isOpen, id) => {
            if (this.handleAccordionToggle) this.handleAccordionToggle(isOpen, id);
        }, 'hybrid-underlays');

        // Register accordions if needed, InterpolationPanel uses generic manual set() usually
        this.accordions.set('hybrid-underlays', this.underlaysAccordion);

        // We previously appended to vizAccordion. Let's append to vizAccordion still but as a sub-accordion? 
        // Or just replace the "header" inside the container.

        // The original logic was: underlayContainer (div) -> appended to vizAccordion.
        // inside underlayContainer -> h3 header.
        // We want: underlayContainer is now the CONTENT of an Accordion.
        // But wait, vizAccordion is already an accordion.
        // Nesting accordions? 
        // Or just let "Underlays" be a group with a nice label.
        // User asked to "normalize top-level accordion dropdowns".
        // "Underlays" is INSIDE "Visualization" in my previous edit (lines 294+). 
        // Wait, "Visualization" IS top level.
        // "Underlays" was just a sub-section of Visualization.
        // If it's a sub-section, maybe it shouldn't be a full Accordion? 
        // But user said "top-level accordion dropdowns".
        // "Underlays" created a "h3" with "text-sm font-bold".
        // If I make it an Accordion, it becomes collapsible which is nice.

        // Let's make it a nested accordion inside Visualization? 
        // Or keep it as a labelled section but DIFFERENT style?
        // User's issue was "top-level accordions".
        // "Visualization" IS top level.
        // "Underlays" is inside it.
        // The only "Top Level" manual header might be "Underlay Reference" if it was top level.
        // In my logic above (lines 172), "Visualization" is the accordion.
        // "Underlays" is just content inside it.
        // So I don't need to change "Underlays" to an Accordion to satisfy "Top Level" normalization.
        // BUT, if I want to match the STYLE of headers, I should ensure the h3 matches?
        // Or maybe Underlays SHOULD be top level?
        // In Rosette Panel, "Base Curve Generator" is top level.
        // "Underlays" is specific to Hybrid.

        // Let's stick to the request: "top-level accordion dropdowns in Rosette and Hybrid panels".
        // "Underlays" is currently INSIDE "Visualization" (line 337: this.vizAccordion.append(underlayContainer)).
        // So strictly speaking it's not a top level accordion.
        // However, I suspect the User saw "Underlay Reference" as a header?
        // Wait, line 295: createElement('h3', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Underlays' })

        // I will keep Underlays as a subsection but maybe ensure the H3 style is consistent or distinctly SUB-section.
        // BUT, looking at the code around line 294, it mimics a header.
        // Let's just standardise the css of the h3 to be consistent with normal headers if it's meant to look like one.
        // 'text-sm font-bold text-gray-400 mb-2' -> 'text-xs font-bold uppercase tracking-wider text-gray-500 mb-2' (Sub-header style)

        const underlayContainer = createElement('div', 'mt-4 pt-4 border-t border-gray-700');
        underlayContainer.appendChild(createElement('h3', 'text-xs font-bold uppercase tracking-wider text-gray-500 mb-2', { textContent: 'Underlays' }));

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
            if (this.handleAccordionToggle) this.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => {
                if (this.alignLabels) this.alignLabels(this.baseCurveVizAccordion.content);
            });
        }, 'hybrid-base-viz');
        this.accordions.set('hybrid-base-viz', this.baseCurveVizAccordion);
        this.controlsContainer.appendChild(this.baseCurveVizAccordion.element);

        // --- Base Curve A Controls ---
        const groupA = createElement('div', 'flex flex-col mb-4 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupA.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source A Curve' }));

        this.baseCurveModuleA = new LayerRenderingModule(
            this,      // Orchestrator
            'hybrid',  // roseId
            ACTIONS.UPDATE_HYBRID,
            {
                colorMethod: 'baseCurveColorMethodA', // Placeholder if needed, though Hybrid manual didn't have Method? 
                // Wait, manual controls didn't have ColorMethod. Let's map it but ignore if not used?
                // Or does LayerRenderingModule force it? 
                // LayerRenderingModule renders Color Method first.
                // Hybrid "Source A" group didn't have Color Method.
                // It had: Toggle, Width, Color, Opacity, Blend.
                // If I map 'colorMethod' to something unused, it will still show the dropdown.
                // Is that desired? The user plan said "Reuse shared RenderingControlsModule".
                // Rosette Base Curve has Color Method.
                // Hybrid Base Curve previously did NOT.
                // Adding it is a FEATURE PARITY upgrade.
                colorMethod: 'baseCurveColorMethodA',
                color: 'baseCurveColorA',
                blendMode: 'baseCurveBlendModeA',
                opacity: 'baseCurveOpacityA',
                size: 'baseCurveLineWidthA',
                antiAlias: 'baseCurveAntiAliasA'
            },
            {
                showToggle: { key: 'showBaseCurveA', label: 'Show Base Curve' }
            }
        );
        groupA.appendChild(this.baseCurveModuleA.container);
        this.baseCurveVizAccordion.append(groupA);

        // --- Base Curve B Controls ---
        const groupB = createElement('div', 'flex flex-col mb-2 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupB.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source B Curve' }));

        this.baseCurveModuleB = new LayerRenderingModule(
            this,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
                colorMethod: 'baseCurveColorMethodB',
                color: 'baseCurveColorB',
                blendMode: 'baseCurveBlendModeB',
                opacity: 'baseCurveOpacityB',
                size: 'baseCurveLineWidthB',
                antiAlias: 'baseCurveAntiAliasB'
            },
            {
                showToggle: { key: 'showBaseCurveB', label: 'Show Base Curve' }
            }
        );
        groupB.appendChild(this.baseCurveModuleB.container);
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
        if (this.baseCurveModuleA) this.baseCurveModuleA.update(hybridParams);

        // Base Curve Viz Updates (B)
        if (this.baseCurveModuleB) this.baseCurveModuleB.update(hybridParams);

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
