import { Accordion } from '../Accordion.js';
import { LayerRenderingModule } from '../modules/LayerRenderingModule.js';
import { GlobalRenderingModule } from '../modules/GlobalRenderingModule.js';
import { createElement } from '../../utils/dom.js';
import { ParamNumber } from '../ParamNumber.js';
import { store } from '../../../engine/state/Store.js';
import { ACTIONS } from '../../../engine/state/Actions.js';

export class HybridAppearanceSection {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.accordions = this.orchestrator.accordions; // Shortcut

        // We will append to orchestrator.controlsContainer directly
        // The order matters here as per user request/plan.

        // 1. Hybridization Visualization (Interpolated Curve)
        this.renderHybridViz();

        // 2. Interpolation Details (Resampling)
        this.renderInterpolationDetails();

        // 3. Base Chordal Rendering (Underlays)
        this.renderBaseChordal();

        // 4. Base Curve Rendering
        // 4. Base Curve Rendering
        this.renderBaseCurve();

        // 5. Fill Rendering
        this.renderFill();

        // 6. Vertex Rendering
        this.renderVertexViz();

        // 6. General Rendering
        this.renderGeneralHelper();
    }

    renderHybridViz() {
        this.vizAccordion = new Accordion('Hybridization Visualization', true, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, 'hybrid-viz');
        this.accordions.set('hybrid-viz', this.vizAccordion);
        this.orchestrator.controlsContainer.appendChild(this.vizAccordion.element);

        this.hybridVizModule = new LayerRenderingModule(
            this.orchestrator,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
                // Mapping keys
                colorMethod: 'colorMethod',
                color: 'color',
                blendMode: 'blendMode',
                opacity: 'opacity', // Moved from Animation
                size: 'lineWidth',  // New feature
                antiAlias: 'antiAlias' // New feature
            },
            {
                sizeLabel: 'Line Width'
            }
        );
        this.vizAccordion.append(this.hybridVizModule.container);
    }

    renderInterpolationDetails() {
        this.detailsAccordion = new Accordion('Interpolation Details', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.detailsAccordion.content);
            });
        }, 'hybrid-details');
        this.accordions.set('hybrid-details', this.detailsAccordion);
        this.orchestrator.controlsContainer.appendChild(this.detailsAccordion.element);

        // Resampling Fallback Slider
        this.resampleThresholdControl = this.createSlider('approxResampleThreshold', 0, 50000, 1000, 'Avg Resample Threshold (0=Always)');
        this.detailsAccordion.append(this.resampleThresholdControl.container);
    }

    renderBaseChordal() {
        this.baseChordalAccordion = new Accordion('Base Chordal Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.baseChordalAccordion.content);
            });
        }, 'hybrid-base-chordal');
        this.accordions.set('hybrid-base-chordal', this.baseChordalAccordion);
        this.orchestrator.controlsContainer.appendChild(this.baseChordalAccordion.element);

        // --- Source A ---
        const groupA = createElement('div', 'flex flex-col mb-4 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupA.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source A' }));

        this.underlayModuleA = new LayerRenderingModule(
            this.orchestrator,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
                // Keys map to hybrid state but logically control render of Source A
                // We reuse Rosette A concepts but store in Hybrid state?
                // Or are these overrides? State structure: hybrid.showRoseA, hybrid.underlayOpacity... 
                // Wait, previous 'Underlays' only had: Show A, Show B, single Opacity.
                // New plan implies FULL LayerRenderingModule capabilities for A and B.
                // Do we have state keys for this? NO.
                // We need to define NEW schema or reuse existing.
                // Plan: "Uses LayerRenderingModule for Source A and B".
                // We need to assume new keys will be created in updateUI/State?
                // Or are we mapping to existing?
                // Existing: showRoseA, showRoseB, underlayOpacity (shared).
                // To support individual full modules, we need separate keys for A & B opacity, color, width etc.
                // I will name them semantic keys like 'underlayColorA', 'underlayLineWidthA', etc.

                colorMethod: 'underlayColorMethodA',
                color: 'underlayColorA',
                blendMode: 'underlayBlendModeA',
                opacity: 'underlayOpacityA',
                size: 'underlayLineWidthA',
                antiAlias: 'underlayAntiAliasA'
            },
            {
                showToggle: { key: 'showRoseA', label: 'Show Source A' },
                sizeLabel: 'Line Width'
            }
        );
        groupA.appendChild(this.underlayModuleA.container);
        this.baseChordalAccordion.append(groupA);

        // --- Source B ---
        const groupB = createElement('div', 'flex flex-col mb-2 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupB.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source B' }));

        this.underlayModuleB = new LayerRenderingModule(
            this.orchestrator,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
                colorMethod: 'underlayColorMethodB',
                color: 'underlayColorB',
                blendMode: 'underlayBlendModeB',
                opacity: 'underlayOpacityB',
                size: 'underlayLineWidthB',
                antiAlias: 'underlayAntiAliasB'
            },
            {
                showToggle: { key: 'showRoseB', label: 'Show Source B' },
                sizeLabel: 'Line Width'
            }
        );
        groupB.appendChild(this.underlayModuleB.container);
        this.baseChordalAccordion.append(groupB);
    }

    renderBaseCurve() {
        this.baseCurveVizAccordion = new Accordion('Base Curve Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, 'hybrid-base-curve');
        this.accordions.set('hybrid-base-curve', this.baseCurveVizAccordion);
        this.orchestrator.controlsContainer.appendChild(this.baseCurveVizAccordion.element);

        // Source A
        const groupA = createElement('div', 'flex flex-col mb-4 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupA.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source A Curve' }));

        this.baseCurveModuleA = new LayerRenderingModule(
            this.orchestrator,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
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

        // Source B
        const groupB = createElement('div', 'flex flex-col mb-2 p-2 border border-gray-700 rounded bg-gray-900/50');
        groupB.appendChild(createElement('label', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Source B Curve' }));

        this.baseCurveModuleB = new LayerRenderingModule(
            this.orchestrator,
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
    }

    renderFill() {
        this.fillAccordion = new Accordion('Fill Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, 'hybrid-fill');
        this.accordions.set('hybrid-fill', this.fillAccordion);
        this.orchestrator.controlsContainer.appendChild(this.fillAccordion.element);

        this.fillModule = new LayerRenderingModule(
            this.orchestrator,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
                colorMethod: 'fillColorMethod',
                gradientType: 'fillGradientType',
                gradientPreset: 'fillGradientPreset',
                gradientStops: 'fillGradientStops',
                color: 'fillColor',
                colorEnd: 'fillColorEnd',
                blendMode: 'fillBlendMode',
                opacity: 'fillOpacity'
            },
            {
                hideSize: true
            }
        );
        this.fillAccordion.append(this.fillModule.container);
    }

    renderVertexViz() {
        this.vertexAccordion = new Accordion('Vertex Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, 'hybrid-vertex');
        this.accordions.set('hybrid-vertex', this.vertexAccordion);
        this.orchestrator.controlsContainer.appendChild(this.vertexAccordion.element);

        this.vertexModule = new LayerRenderingModule(
            this.orchestrator,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
                size: 'vertexRadius',
                color: 'vertexColor',
                opacity: 'vertexOpacity',
                blendMode: 'vertexBlendMode',
                colorMethod: 'vertexColorMethod',
                antiAlias: 'vertexAntiAlias'
            },
            {
                showToggle: { key: 'showVertices', label: 'Show Vertices', value: false },
                sizeLabel: 'Radius'
            }
        );
        this.vertexAccordion.append(this.vertexModule.container);
    }

    renderGeneralHelper() {
        this.generalAccordion = new Accordion('General Rendering Settings', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, 'hybrid-general');
        this.accordions.set('hybrid-general', this.generalAccordion);
        this.orchestrator.controlsContainer.appendChild(this.generalAccordion.element);

        this.generalModule = new GlobalRenderingModule(
            this.orchestrator,
            'hybrid',
            ACTIONS.UPDATE_HYBRID,
            {
                autoScale: 'autoScale',
                scaleLineWidth: 'scaleLineWidth',
                backgroundOpacity: 'backgroundOpacity',
                backgroundColor: 'backgroundColor'
            }
        );
        this.generalAccordion.append(this.generalModule.container);
    }

    createSlider(key, min, max, step, label) {
        const paramGui = new ParamNumber({
            key, label, min, max, step, value: 0,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { [key]: val }
                });
            }
        });
        if (this.orchestrator.registerParam) this.orchestrator.registerParam(paramGui);
        return { container: paramGui.getElement(), instance: paramGui };
    }

    update(state) {
        const hybridParams = state.hybrid;

        // 1. Viz Module
        if (this.hybridVizModule) this.hybridVizModule.update(hybridParams);

        // 2. Resampling
        if (this.resampleThresholdControl) {
            this.resampleThresholdControl.instance.setValue(hybridParams.approxResampleThreshold ?? 20000);
        }

        // 3. Base Chordal (Underlays)
        // We pass the entire hybridParams, but the modules are keyed to look for 'underlay...' keys.
        // We need to ensure logic for defaulting if these keys don't exist yet?
        // LayerRenderingModule generally handles missing keys gracefully by showing default/empty.
        if (this.underlayModuleA) this.underlayModuleA.update(hybridParams);
        if (this.underlayModuleB) this.underlayModuleB.update(hybridParams);

        // 4. Base Curve
        if (this.baseCurveModuleA) this.baseCurveModuleA.update(hybridParams);
        if (this.baseCurveModuleB) this.baseCurveModuleB.update(hybridParams);

        // 5. Fill
        if (this.fillModule) this.fillModule.update(hybridParams);

        // 6. Vertex
        if (this.vertexModule) this.vertexModule.update(hybridParams);

        // 6. General
        if (this.generalModule) this.generalModule.update(hybridParams);
    }
}
