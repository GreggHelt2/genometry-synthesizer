import { TabStrip } from '../TabStrip.js';
import { LayerRenderingModule } from '../modules/LayerRenderingModule.js';
import { GlobalRenderingModule } from '../modules/GlobalRenderingModule.js';
import { createElement } from '../../utils/dom.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamToggle } from '../ParamToggle.js';
import { dispatchDeep } from '../../../engine/state/stateAdapters.js';
import { TrailsSection } from '../chordal_rosette/TrailsSection.js';
import { persistenceManager } from '../../../engine/state/PersistenceManager.js';

export class HybridAppearanceSection {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.accordions = this.orchestrator.accordions; // Shortcut

        // Build all content panels first, then create the tab strip
        this.buildContentPanels();
        this.buildTabStrip();

        // Mount tab strip into the orchestrator's container
        this.orchestrator.controlsContainer.appendChild(this.tabStrip.element);
    }

    buildContentPanels() {
        // ── 1. Hybrid Viz (Interpolated Curve) ──
        this.hybridContent = createElement('div', 'p-0');
        this.hybridVizModule = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'colorMethod', color: 'color',
                blendMode: 'blendMode', opacity: 'opacity',
                size: 'lineWidth', antiAlias: 'antiAlias'
            },
            { sizeLabel: 'Line Width', showConnectMode: true }
        );
        this.hybridContent.appendChild(this.hybridVizModule.container);

        // ── 2. Fill ──
        this.fillContent = createElement('div', 'p-0');
        this.fillModule = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'fillColorMethod', gradientType: 'fillGradientType',
                gradientPreset: 'fillGradientPreset', gradientStops: 'fillGradientStops',
                color: 'fillColor', colorEnd: 'fillColorEnd',
                blendMode: 'fillBlendMode', opacity: 'fillOpacity'
            },
            { hideSize: true, showToggle: { key: 'showFill', label: 'Show Fill' } }
        );
        this.fillContent.appendChild(this.fillModule.container);

        // ── 3. Vertex ──
        this.vertexContent = createElement('div', 'p-0');
        this.vertexModule = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                size: 'vertexRadius', color: 'vertexColor', opacity: 'vertexOpacity',
                blendMode: 'vertexBlendMode', colorMethod: 'vertexColorMethod',
                gradientType: 'vertexGradientType', gradientPreset: 'vertexGradientPreset',
                gradientStops: 'vertexGradientStops', colorEnd: 'vertexColorEnd',
                antiAlias: 'vertexAntiAlias'
            },
            { showToggle: { key: 'showVertices', label: 'Show Vertices', value: false }, sizeLabel: 'Radius' }
        );
        this.vertexContent.appendChild(this.vertexModule.container);
        // Vertex label toggle
        this.vertexLabelsToggle = new ParamToggle({
            key: 'showVertexLabels', label: 'Show Labels', value: false,
            onChange: (val) => dispatchDeep('showVertexLabels', val, 'hybrid')
        });
        this.vertexContent.appendChild(this.vertexLabelsToggle.getElement());
        this.vertexLabelFontSizeControl = this.createSlider('vertexLabelFontSize', 5, 30, 1, 'Label Size');
        this.vertexContent.appendChild(this.vertexLabelFontSizeControl.container);

        // ── 4. Source A (Base Chordal A + Base Curve A) ──
        this.srcAContent = createElement('div', 'p-0');
        // Chordal A
        const chordalAHeader = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 border-b border-gray-700', { textContent: 'Chordal Lines A' });
        this.srcAContent.appendChild(chordalAHeader);
        this.underlayModuleA = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'underlayColorMethodA', color: 'underlayColorA',
                blendMode: 'underlayBlendModeA', opacity: 'underlayOpacityA',
                size: 'underlayLineWidthA', antiAlias: 'underlayAntiAliasA'
            },
            { showToggle: { key: 'showRoseA', label: 'Show Source A' }, sizeLabel: 'Line Width', enableLinking: false }
        );
        this.srcAContent.appendChild(this.underlayModuleA.container);
        // Curve A
        const curveAHeader = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 border-b border-t border-gray-700 mt-2', { textContent: 'Base Curve A' });
        this.srcAContent.appendChild(curveAHeader);
        this.baseCurveModuleA = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'baseCurveColorMethodA', color: 'baseCurveColorA',
                blendMode: 'baseCurveBlendModeA', opacity: 'baseCurveOpacityA',
                size: 'baseCurveLineWidthA', antiAlias: 'baseCurveAntiAliasA'
            },
            { showToggle: { key: 'showBaseCurveA', label: 'Show Base Curve' }, enableLinking: false }
        );
        this.srcAContent.appendChild(this.baseCurveModuleA.container);

        // ── 5. Source B ──
        this.srcBContent = createElement('div', 'p-0');
        const chordalBHeader = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 border-b border-gray-700', { textContent: 'Chordal Lines B' });
        this.srcBContent.appendChild(chordalBHeader);
        this.underlayModuleB = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'underlayColorMethodB', color: 'underlayColorB',
                blendMode: 'underlayBlendModeB', opacity: 'underlayOpacityB',
                size: 'underlayLineWidthB', antiAlias: 'underlayAntiAliasB'
            },
            { showToggle: { key: 'showRoseB', label: 'Show Source B' }, sizeLabel: 'Line Width', enableLinking: false }
        );
        this.srcBContent.appendChild(this.underlayModuleB.container);
        const curveBHeader = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 border-b border-t border-gray-700 mt-2', { textContent: 'Base Curve B' });
        this.srcBContent.appendChild(curveBHeader);
        this.baseCurveModuleB = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'baseCurveColorMethodB', color: 'baseCurveColorB',
                blendMode: 'baseCurveBlendModeB', opacity: 'baseCurveOpacityB',
                size: 'baseCurveLineWidthB', antiAlias: 'baseCurveAntiAliasB'
            },
            { showToggle: { key: 'showBaseCurveB', label: 'Show Base Curve' }, enableLinking: false }
        );
        this.srcBContent.appendChild(this.baseCurveModuleB.container);

        // ── 6. Blended ──
        this.blendContent = createElement('div', 'p-0');
        // Blended Curve
        const blendCurveHeader = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 border-b border-gray-700', { textContent: 'Blended Curve' });
        this.blendContent.appendChild(blendCurveHeader);
        this.baseCurveModuleBlend = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'baseCurveColorMethodBlend', color: 'baseCurveColorBlend',
                blendMode: 'baseCurveBlendModeBlend', opacity: 'baseCurveOpacityBlend',
                size: 'baseCurveLineWidthBlend', antiAlias: 'baseCurveAntiAliasBlend'
            },
            { showToggle: { key: 'showBaseCurveBlend', label: 'Show Blended Curve' }, enableLinking: false }
        );
        this.blendContent.appendChild(this.baseCurveModuleBlend.container);
        // Blended Rosette
        const blendRstHeader = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 border-b border-t border-gray-700 mt-2', { textContent: 'Blended Rosette' });
        this.blendContent.appendChild(blendRstHeader);
        this.blendedRosetteModule = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'blendedRosetteColorMethod', color: 'blendedRosetteColor',
                blendMode: 'blendedRosetteBlendMode', opacity: 'blendedRosetteOpacity',
                size: 'blendedRosetteLineWidth', antiAlias: 'blendedRosetteAntiAlias'
            },
            { sizeLabel: 'Line Width', showToggle: { key: 'showBlendedRosette', label: 'Show Blended Rosette' }, enableLinking: false }
        );
        this.blendContent.appendChild(this.blendedRosetteModule.container);
        // Blended Vertices
        const blendVtxHeader = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider p-2 border-b border-t border-gray-700 mt-2', { textContent: 'Blended Vertices' });
        this.blendContent.appendChild(blendVtxHeader);
        this.blendedVerticesModule = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                colorMethod: 'blendedVertexColorMethod', color: 'blendedVertexColor',
                blendMode: 'blendedVertexBlendMode', opacity: 'blendedVertexOpacity',
                size: 'blendedVertexRadius'
            },
            { sizeLabel: 'Radius', showToggle: { key: 'showBlendedVertices', label: 'Show Blended Vertices' }, enableLinking: false }
        );
        this.blendContent.appendChild(this.blendedVerticesModule.container);
        // Blended vertex labels
        this.blendedVertexLabelsToggle = new ParamToggle({
            key: 'showBlendedVertexLabels', label: 'Show Labels', value: false,
            onChange: (val) => dispatchDeep('showBlendedVertexLabels', val, 'hybrid')
        });
        this.blendContent.appendChild(this.blendedVertexLabelsToggle.getElement());
        this.blendedVertexLabelFontSizeControl = this.createSlider('blendedVertexLabelFontSize', 5, 30, 1, 'Label Size');
        this.blendContent.appendChild(this.blendedVertexLabelFontSizeControl.container);

        // ── 7. Interp Paths ──
        this.pathsContent = createElement('div', 'p-0');
        this.interpPathsModule = new LayerRenderingModule(
            this.orchestrator, 'hybrid', null,
            {
                size: 'interpPathsLineWidth', color: 'interpPathsColor',
                opacity: 'interpPathsOpacity', blendMode: 'interpPathsBlendMode',
                colorMethod: 'interpPathsColorMethod', gradientType: 'interpPathsGradientType',
                gradientPreset: 'interpPathsGradientPreset', gradientStops: 'interpPathsGradientStops',
                colorEnd: 'interpPathsColorEnd'
            },
            { showToggle: { key: 'showInterpPaths', label: 'Show Paths', value: false }, sizeLabel: 'Line Width', enableLinking: false }
        );
        this.pathsContent.appendChild(this.interpPathsModule.container);
        // Selected Only toggle
        this.interpPathsSelectedOnlyControl = new ParamToggle({
            key: 'interpPathsSelectedOnly', label: 'Selected Chords Only', value: false,
            onChange: (val) => dispatchDeep('interpPathsSelectedOnly', val, 'hybrid')
        });
        this.pathsContent.appendChild(this.interpPathsSelectedOnlyControl.getElement());
        // Curve mode controls
        this.buildInterpCurveControls();

        // ── 8. Details (Interpolation Details) ──
        this.detailsContent = createElement('div', 'p-0');
        this.resampleThresholdControl = this.createSlider('approxResampleThreshold', 0, 50000, 1000, 'Avg Resample Threshold (0=Always)');
        this.detailsContent.appendChild(this.resampleThresholdControl.container);

        // ── 9. General ──
        this.generalContent = createElement('div', 'p-0');
        this.generalModule = new GlobalRenderingModule(
            this.orchestrator, 'hybrid', null,
            { autoScale: 'autoScale', scaleLineWidth: 'scaleLineWidth', backgroundOpacity: 'backgroundOpacity', backgroundColor: 'backgroundColor' }
        );
        this.generalContent.appendChild(this.generalModule.container);

        // ── 10. Trails ──
        this.trailsContent = createElement('div', 'p-0');
        this.trailsSection = new TrailsSection(this.orchestrator, 'hybrid', {
            onClearCanvas: () => {
                const renderer = this.orchestrator._trailsRenderer;
                if (renderer) renderer.forceClear();
            }
        });
        this.trailsContent.appendChild(this.trailsSection.element);
    }

    buildInterpCurveControls() {
        const curveContainer = createElement('div', 'flex flex-col gap-1 mt-2');
        const curveLabel = createElement('div', 'text-xs font-semibold text-gray-400 uppercase tracking-wider py-1', { textContent: 'Path Curve' });
        curveContainer.appendChild(curveLabel);

        const curveModeOptions = [
            { value: 'linear', label: 'Linear (Straight)' },
            { value: 'sine', label: 'Sine Wave' },
            { value: 'quadratic-bezier', label: 'Quadratic Bezier' },
            { value: 'arc', label: 'Arc' },
            { value: 'arc-flipped', label: 'Arc Flipped' }
        ];
        this.interpCurveModeControl = new ParamSelect({
            key: 'interpCurveMode', label: 'Curve Mode', options: curveModeOptions, value: 'linear',
            onChange: (val) => {
                dispatchDeep('interpCurveMode', val, 'hybrid');
                this.updateInterpCurveVisibility(val);
            }
        });
        curveContainer.appendChild(this.interpCurveModeControl.getElement());

        this.interpCurveDetailControl = this.createSlider('interpCurveDetail', 4, 100, 1, 'Curve Detail');
        curveContainer.appendChild(this.interpCurveDetailControl.container);
        this.interpWaveAmplitudeControl = this.createSlider('interpWaveAmplitude', 0, 1, 0.01, 'Amplitude');
        curveContainer.appendChild(this.interpWaveAmplitudeControl.container);
        this.interpWaveFrequencyControl = this.createSlider('interpWaveFrequency', 0.5, 10, 0.5, 'Frequency');
        curveContainer.appendChild(this.interpWaveFrequencyControl.container);
        this.interpWaveAlternateFlipControl = new ParamToggle({
            key: 'interpWaveAlternateFlip', label: 'Alternate Wave Mirror', value: false,
            onChange: (val) => dispatchDeep('interpWaveAlternateFlip', val, 'hybrid')
        });
        curveContainer.appendChild(this.interpWaveAlternateFlipControl.getElement());
        this.interpBezierBulgeControl = this.createSlider('interpBezierBulge', -2, 2, 0.05, 'Bulge');
        curveContainer.appendChild(this.interpBezierBulgeControl.container);

        this.pathsContent.appendChild(curveContainer);
        this.updateInterpCurveVisibility('linear');
    }

    buildTabStrip() {
        this.tabStrip = new TabStrip([
            { id: 'hybrid',  label: 'Hybrid',  eyeToggle: true, eyeDefault: true,  content: this.hybridContent },
            { id: 'fill',    label: 'Fill',     eyeToggle: true, eyeDefault: true,  content: this.fillContent },
            { id: 'vertex',  label: 'Vtx',      eyeToggle: true, eyeDefault: false, content: this.vertexContent },
            { id: 'srcA',    label: 'Src A',    eyeToggle: true, eyeDefault: false, content: this.srcAContent },
            { id: 'srcB',    label: 'Src B',    eyeToggle: true, eyeDefault: false, content: this.srcBContent },
            { id: 'blend',   label: 'Blend',    eyeToggle: true, eyeDefault: false, content: this.blendContent },
            { id: 'paths',   label: 'Paths',    eyeToggle: true, eyeDefault: false, content: this.pathsContent },
            { id: 'details', label: 'Dtl',                                          content: this.detailsContent },
            { id: 'general', label: 'Gen',                                          content: this.generalContent },
            { id: 'trails',  label: 'Trails',   eyeToggle: true, eyeDefault: false, content: this.trailsContent }
        ], {
            onTabChange: (tabId) => {
                this.orchestrator.uiState.tabs = this.orchestrator.uiState.tabs || {};
                this.orchestrator.uiState.tabs['hybrid-appearance'] = tabId;
                persistenceManager.save();
            },
            onEyeToggle: (tabId, isOn) => {
                const dispatchMap = {
                    hybrid: 'showHybridLines',
                    fill: 'showFill',
                    vertex: 'showVertices',
                    srcA: null, // Handled separately (multiple underlays)
                    srcB: null,
                    blend: null,
                    paths: 'showInterpPaths',
                    trails: 'trailsEnabled'
                };
                if (dispatchMap[tabId]) {
                    dispatchDeep(dispatchMap[tabId], isOn, 'hybrid');
                }
                // Source A — toggle both chordal + curve
                if (tabId === 'srcA') {
                    dispatchDeep('showRoseA', isOn, 'hybrid');
                    dispatchDeep('showBaseCurveA', isOn, 'hybrid');
                }
                if (tabId === 'srcB') {
                    dispatchDeep('showRoseB', isOn, 'hybrid');
                    dispatchDeep('showBaseCurveB', isOn, 'hybrid');
                }
                if (tabId === 'blend') {
                    dispatchDeep('showBaseCurveBlend', isOn, 'hybrid');
                    dispatchDeep('showBlendedRosette', isOn, 'hybrid');
                    dispatchDeep('showBlendedVertices', isOn, 'hybrid');
                }
            },
            persistKey: 'hybrid-appearance'
        });
    }

    createSlider(key, min, max, step, label) {
        const paramGui = new ParamNumber({
            key, label, min, max, step, value: 0,
            onChange: (val) => dispatchDeep(key, val, 'hybrid')
        });
        if (this.orchestrator.registerParam) this.orchestrator.registerParam(paramGui);
        return { container: paramGui.getElement(), instance: paramGui };
    }

    updateInterpCurveVisibility(mode) {
        const isLinear = mode === 'linear';
        const isSine = mode === 'sine';
        const isQuadraticBezier = mode === 'quadratic-bezier';

        if (this.interpCurveDetailControl) this.interpCurveDetailControl.container.style.display = isLinear ? 'none' : 'flex';
        if (this.interpWaveAmplitudeControl) this.interpWaveAmplitudeControl.container.style.display = isSine ? 'flex' : 'none';
        if (this.interpWaveFrequencyControl) this.interpWaveFrequencyControl.container.style.display = isSine ? 'flex' : 'none';
        if (this.interpWaveAlternateFlipControl) this.interpWaveAlternateFlipControl.getElement().style.display = isSine ? 'flex' : 'none';
        if (this.interpBezierBulgeControl) this.interpBezierBulgeControl.container.style.display = isQuadraticBezier ? 'flex' : 'none';
    }

    /**
     * Restore persisted active tab.
     */
    restoreTabState(tabId) {
        if (tabId && this.tabStrip) {
            this.tabStrip.setActiveTab(tabId);
        }
    }

    update(flatParams) {
        // Update all modules regardless of which tab is active
        if (this.hybridVizModule) this.hybridVizModule.update(flatParams);
        if (this.resampleThresholdControl) this.resampleThresholdControl.instance.setValue(flatParams.approxResampleThreshold ?? 20000);
        if (this.underlayModuleA) this.underlayModuleA.update(flatParams);
        if (this.underlayModuleB) this.underlayModuleB.update(flatParams);
        if (this.baseCurveModuleA) this.baseCurveModuleA.update(flatParams);
        if (this.baseCurveModuleB) this.baseCurveModuleB.update(flatParams);
        if (this.baseCurveModuleBlend) this.baseCurveModuleBlend.update(flatParams);
        if (this.blendedRosetteModule) this.blendedRosetteModule.update(flatParams);
        if (this.blendedVerticesModule) this.blendedVerticesModule.update(flatParams);
        if (this.vertexLabelsToggle) this.vertexLabelsToggle.setValue(flatParams.showVertexLabels || false);
        if (this.vertexLabelFontSizeControl) this.vertexLabelFontSizeControl.instance.setValue(flatParams.vertexLabelFontSize || 15);
        if (this.blendedVertexLabelsToggle) this.blendedVertexLabelsToggle.setValue(flatParams.showBlendedVertexLabels || false);
        if (this.blendedVertexLabelFontSizeControl) this.blendedVertexLabelFontSizeControl.instance.setValue(flatParams.blendedVertexLabelFontSize || 15);
        if (this.fillModule) this.fillModule.update(flatParams);
        if (this.vertexModule) this.vertexModule.update(flatParams);
        if (this.interpPathsModule) this.interpPathsModule.update(flatParams);

        // Interp curve mode controls
        const curveMode = flatParams.interpCurveMode || 'linear';
        if (this.interpCurveModeControl) this.interpCurveModeControl.setValue(curveMode);
        if (this.interpCurveDetailControl) this.interpCurveDetailControl.instance.setValue(flatParams.interpCurveDetail ?? 20);
        if (this.interpWaveAmplitudeControl) this.interpWaveAmplitudeControl.instance.setValue(flatParams.interpWaveAmplitude ?? 0.2);
        if (this.interpWaveFrequencyControl) this.interpWaveFrequencyControl.instance.setValue(flatParams.interpWaveFrequency ?? 1);
        if (this.interpWaveAlternateFlipControl) this.interpWaveAlternateFlipControl.setValue(flatParams.interpWaveAlternateFlip || false);
        if (this.interpBezierBulgeControl) this.interpBezierBulgeControl.instance.setValue(flatParams.interpBezierBulge ?? 0.3);
        if (this.interpPathsSelectedOnlyControl) this.interpPathsSelectedOnlyControl.setValue(flatParams.interpPathsSelectedOnly || false);
        this.updateInterpCurveVisibility(curveMode);

        if (this.generalModule) this.generalModule.update(flatParams);
        if (this.trailsSection) this.trailsSection.update(flatParams);

        // Sync eye toggles on tab headers
        if (this.tabStrip) {
            this.tabStrip.setEyeState('hybrid', flatParams.showHybridLines !== false);
            this.tabStrip.setEyeState('fill', flatParams.showFill !== false);
            this.tabStrip.setEyeState('vertex', flatParams.showVertices || false);
            // Source A is "on" if either chordal A or curve A is on
            this.tabStrip.setEyeState('srcA', (flatParams.showRoseA || false) || (flatParams.showBaseCurveA || false));
            this.tabStrip.setEyeState('srcB', (flatParams.showRoseB || false) || (flatParams.showBaseCurveB || false));
            // Blend is "on" if any of the three are on
            this.tabStrip.setEyeState('blend',
                (flatParams.showBaseCurveBlend || false) ||
                (flatParams.showBlendedRosette || false) ||
                (flatParams.showBlendedVertices || false)
            );
            this.tabStrip.setEyeState('paths', flatParams.showInterpPaths || false);
            this.tabStrip.setEyeState('trails', flatParams.trailsEnabled || false);
        }
    }

    updateLinkVisuals() {
        const modules = [
            this.hybridVizModule,
            this.underlayModuleA, this.underlayModuleB,
            this.baseCurveModuleA, this.baseCurveModuleB, this.baseCurveModuleBlend,
            this.blendedRosetteModule, this.blendedVerticesModule,
            this.fillModule, this.vertexModule,
            this.interpPathsModule, this.generalModule
        ];
        modules.forEach(m => {
            if (m && m.updateLinkVisuals) m.updateLinkVisuals();
        });
        if (this.trailsSection && this.trailsSection.updateLinkVisuals) {
            this.trailsSection.updateLinkVisuals();
        }
    }
}
