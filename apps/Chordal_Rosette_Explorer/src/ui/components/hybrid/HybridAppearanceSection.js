import { Accordion } from '../Accordion.js';
import { LayerRenderingModule } from '../modules/LayerRenderingModule.js';
import { GlobalRenderingModule } from '../modules/GlobalRenderingModule.js';
import { createElement } from '../../utils/dom.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamToggle } from '../ParamToggle.js';
import { dispatchDeep } from '../../../engine/state/stateAdapters.js';

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
        this.renderBaseCurve();

        // 5. Fill Rendering
        this.renderFill();

        // 6. Vertex Rendering
        this.renderVertexViz();

        // 7. Interpolation Paths
        this.renderInterpPaths();

        // 8. General Rendering
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
            null, // actionType unused — module uses dispatchDeep internally
            {
                // Mapping keys
                colorMethod: 'colorMethod',
                color: 'color',
                blendMode: 'blendMode',
                opacity: 'opacity',
                size: 'lineWidth',
                antiAlias: 'antiAlias'
            },
            {
                sizeLabel: 'Line Width',
                showConnectMode: true
            }
        );
        this.vizAccordion.append(this.hybridVizModule.container);

        // Eye toggle for hybrid line visibility
        this.hybridVizEyeToggle = this.vizAccordion.addEyeToggle(true, (val) => {
            dispatchDeep('showHybridLines', val, 'hybrid');
        });
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
            null,
            {
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
            null,
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

        // Labeled eye toggles for A and B
        this.baseChordalEyeA = this.baseChordalAccordion.addLabeledEyeToggle(false, (val) => {
            dispatchDeep('showRoseA', val, 'hybrid');
        }, 'A');
        this.baseChordalEyeB = this.baseChordalAccordion.addLabeledEyeToggle(false, (val) => {
            dispatchDeep('showRoseB', val, 'hybrid');
        }, 'B');
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
            null,
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
            null,
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

        // Labeled eye toggles for A and B
        this.baseCurveEyeA = this.baseCurveVizAccordion.addLabeledEyeToggle(false, (val) => {
            dispatchDeep('showBaseCurveA', val, 'hybrid');
        }, 'A');
        this.baseCurveEyeB = this.baseCurveVizAccordion.addLabeledEyeToggle(false, (val) => {
            dispatchDeep('showBaseCurveB', val, 'hybrid');
        }, 'B');
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
            null,
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
                hideSize: true,
                showToggle: { key: 'showFill', label: 'Show Fill' }
            }
        );
        this.fillAccordion.append(this.fillModule.container);

        // Eye toggle for fill visibility
        this.fillEyeToggle = this.fillAccordion.addEyeToggle(true, (val) => {
            dispatchDeep('showFill', val, 'hybrid');
        });
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
            null,
            {
                size: 'vertexRadius',
                color: 'vertexColor',
                opacity: 'vertexOpacity',
                blendMode: 'vertexBlendMode',
                colorMethod: 'vertexColorMethod',
                gradientType: 'vertexGradientType',
                gradientPreset: 'vertexGradientPreset',
                gradientStops: 'vertexGradientStops',
                colorEnd: 'vertexColorEnd',
                antiAlias: 'vertexAntiAlias'
            },
            {
                showToggle: { key: 'showVertices', label: 'Show Vertices', value: false },
                sizeLabel: 'Radius'
            }
        );
        this.vertexAccordion.append(this.vertexModule.container);

        // Eye toggle for vertex visibility
        this.vertexEyeToggle = this.vertexAccordion.addEyeToggle(false, (val) => {
            dispatchDeep('showVertices', val, 'hybrid');
        });
    }

    renderInterpPaths() {
        this.interpPathsAccordion = new Accordion('Interpolation Paths', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, 'hybrid-interp-paths');
        this.accordions.set('hybrid-interp-paths', this.interpPathsAccordion);
        this.orchestrator.controlsContainer.appendChild(this.interpPathsAccordion.element);

        this.interpPathsModule = new LayerRenderingModule(
            this.orchestrator,
            'hybrid',
            null,
            {
                size: 'interpPathsLineWidth',
                color: 'interpPathsColor',
                opacity: 'interpPathsOpacity',
                blendMode: 'interpPathsBlendMode',
                colorMethod: 'interpPathsColorMethod',
                gradientType: 'interpPathsGradientType',
                gradientPreset: 'interpPathsGradientPreset',
                gradientStops: 'interpPathsGradientStops',
                colorEnd: 'interpPathsColorEnd'
            },
            {
                showToggle: { key: 'showInterpPaths', label: 'Show Paths', value: false },
                sizeLabel: 'Line Width'
            }
        );
        this.interpPathsAccordion.append(this.interpPathsModule.container);

        // Eye toggle for interp paths visibility
        this.interpPathsEyeToggle = this.interpPathsAccordion.addEyeToggle(false, (val) => {
            dispatchDeep('showInterpPaths', val, 'hybrid');
        });

        // 'Selected Only' toggle — restrict interp paths to selected chords
        this.interpPathsSelectedOnlyControl = new ParamToggle({
            key: 'interpPathsSelectedOnly',
            label: 'Selected Chords Only',
            value: false,
            onChange: (val) => dispatchDeep('interpPathsSelectedOnly', val, 'hybrid')
        });
        this.interpPathsAccordion.append(this.interpPathsSelectedOnlyControl.getElement());

        // --- Interpolation Curve Mode controls ---
        const curveContainer = createElement('div', 'flex flex-col gap-1 mt-2');

        // Separator label
        const curveLabel = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider py-1');
        curveLabel.textContent = 'Path Curve';
        curveContainer.appendChild(curveLabel);

        // Curve Mode select
        const curveModeOptions = [
            { value: 'linear', label: 'Linear (Straight)' },
            { value: 'sine', label: 'Sine Wave' },
            { value: 'quadratic-bezier', label: 'Quadratic Bezier' },
            { value: 'arc', label: 'Arc' },
            { value: 'arc-flipped', label: 'Arc Flipped' }
        ];
        this.interpCurveModeControl = new ParamSelect({
            key: 'interpCurveMode',
            label: 'Curve Mode',
            options: curveModeOptions,
            value: 'linear',
            onChange: (val) => {
                dispatchDeep('interpCurveMode', val, 'hybrid');
                this.updateInterpCurveVisibility(val);
            }
        });
        curveContainer.appendChild(this.interpCurveModeControl.getElement());

        // Curve Detail slider
        this.interpCurveDetailControl = this.createSlider('interpCurveDetail', 4, 100, 1, 'Curve Detail');
        curveContainer.appendChild(this.interpCurveDetailControl.container);

        // Sine Wave params
        this.interpWaveAmplitudeControl = this.createSlider('interpWaveAmplitude', 0, 1, 0.01, 'Amplitude');
        curveContainer.appendChild(this.interpWaveAmplitudeControl.container);

        this.interpWaveFrequencyControl = this.createSlider('interpWaveFrequency', 0.5, 10, 0.5, 'Frequency');
        curveContainer.appendChild(this.interpWaveFrequencyControl.container);

        // Alternate Wave Mirror toggle
        this.interpWaveAlternateFlipControl = new ParamToggle({
            key: 'interpWaveAlternateFlip',
            label: 'Alternate Wave Mirror',
            value: false,
            onChange: (val) => dispatchDeep('interpWaveAlternateFlip', val, 'hybrid')
        });
        curveContainer.appendChild(this.interpWaveAlternateFlipControl.getElement());

        // Bezier params
        this.interpBezierBulgeControl = this.createSlider('interpBezierBulge', -2, 2, 0.05, 'Bulge');
        curveContainer.appendChild(this.interpBezierBulgeControl.container);

        this.interpPathsAccordion.append(curveContainer);

        // Initial visibility
        this.updateInterpCurveVisibility('linear');
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
            null,
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
                dispatchDeep(key, val, 'hybrid');
            }
        });
        if (this.orchestrator.registerParam) this.orchestrator.registerParam(paramGui);
        return { container: paramGui.getElement(), instance: paramGui };
    }

    updateInterpCurveVisibility(mode) {
        const isLinear = mode === 'linear';
        const isSine = mode === 'sine';
        const isQuadraticBezier = mode === 'quadratic-bezier';
        const isArc = mode === 'arc' || mode === 'arc-flipped';

        // Curve Detail is relevant for all non-linear curves
        if (this.interpCurveDetailControl) {
            this.interpCurveDetailControl.container.style.display = isLinear ? 'none' : 'flex';
        }

        // Sine Wave controls
        if (this.interpWaveAmplitudeControl) {
            this.interpWaveAmplitudeControl.container.style.display = isSine ? 'flex' : 'none';
        }
        if (this.interpWaveFrequencyControl) {
            this.interpWaveFrequencyControl.container.style.display = isSine ? 'flex' : 'none';
        }
        if (this.interpWaveAlternateFlipControl) {
            this.interpWaveAlternateFlipControl.getElement().style.display = isSine ? 'flex' : 'none';
        }

        // Bezier controls
        if (this.interpBezierBulgeControl) {
            this.interpBezierBulgeControl.container.style.display = isQuadraticBezier ? 'flex' : 'none';
        }
        // Arc controls (currently none specific, but could be added here)
    }

    update(flatParams) {
        // 1. Viz Module
        if (this.hybridVizModule) this.hybridVizModule.update(flatParams);

        // 2. Resampling
        if (this.resampleThresholdControl) {
            this.resampleThresholdControl.instance.setValue(flatParams.approxResampleThreshold ?? 20000);
        }

        // 3. Base Chordal (Underlays)
        if (this.underlayModuleA) this.underlayModuleA.update(flatParams);
        if (this.underlayModuleB) this.underlayModuleB.update(flatParams);

        // 4. Base Curve
        if (this.baseCurveModuleA) this.baseCurveModuleA.update(flatParams);
        if (this.baseCurveModuleB) this.baseCurveModuleB.update(flatParams);

        // 5. Fill
        if (this.fillModule) this.fillModule.update(flatParams);

        // 6. Vertex
        if (this.vertexModule) this.vertexModule.update(flatParams);

        // 7. Interpolation Paths
        if (this.interpPathsModule) this.interpPathsModule.update(flatParams);

        // 7b. Interpolation Curve Mode controls
        const curveMode = flatParams.interpCurveMode || 'linear';
        if (this.interpCurveModeControl) this.interpCurveModeControl.setValue(curveMode);
        if (this.interpCurveDetailControl) this.interpCurveDetailControl.instance.setValue(flatParams.interpCurveDetail ?? 20);
        if (this.interpWaveAmplitudeControl) this.interpWaveAmplitudeControl.instance.setValue(flatParams.interpWaveAmplitude ?? 0.2);
        if (this.interpWaveFrequencyControl) this.interpWaveFrequencyControl.instance.setValue(flatParams.interpWaveFrequency ?? 1);
        if (this.interpWaveAlternateFlipControl) this.interpWaveAlternateFlipControl.setValue(flatParams.interpWaveAlternateFlip || false);
        if (this.interpBezierBulgeControl) this.interpBezierBulgeControl.instance.setValue(flatParams.interpBezierBulge ?? 0.3);
        if (this.interpPathsSelectedOnlyControl) this.interpPathsSelectedOnlyControl.setValue(flatParams.interpPathsSelectedOnly || false);
        this.updateInterpCurveVisibility(curveMode);

        // 8. General
        if (this.generalModule) this.generalModule.update(flatParams);

        // Sync eye toggles
        if (this.hybridVizEyeToggle) this.hybridVizEyeToggle.setActive(flatParams.showHybridLines !== false);
        if (this.fillEyeToggle) this.fillEyeToggle.setActive(flatParams.showFill !== false);
        if (this.vertexEyeToggle) this.vertexEyeToggle.setActive(flatParams.showVertices || false);
        if (this.interpPathsEyeToggle) this.interpPathsEyeToggle.setActive(flatParams.showInterpPaths || false);
        if (this.baseChordalEyeA) this.baseChordalEyeA.setActive(flatParams.showRoseA || false);
        if (this.baseChordalEyeB) this.baseChordalEyeB.setActive(flatParams.showRoseB || false);
        if (this.baseCurveEyeA) this.baseCurveEyeA.setActive(flatParams.showBaseCurveA || false);
        if (this.baseCurveEyeB) this.baseCurveEyeB.setActive(flatParams.showBaseCurveB || false);
    }
}
