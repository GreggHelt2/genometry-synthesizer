import { TabStrip } from '../TabStrip.js';
import { LayerRenderingModule } from '../modules/LayerRenderingModule.js';
import { GlobalRenderingModule } from '../modules/GlobalRenderingModule.js';
import { TrailsSection } from './TrailsSection.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamColor } from '../ParamColor.js';
import { ParamNumber } from '../ParamNumber.js';
import { createElement } from '../../utils/dom.js';
import { dispatchDeep, getLinkKey } from '../../../engine/state/stateAdapters.js';
import { linkManager } from '../../../engine/logic/LinkManager.js';
import { persistenceManager } from '../../../engine/state/PersistenceManager.js';

export class AppearanceSection {
    /**
     * @param {Object} orchestrator 
     * @param {string} roseId 
     */
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;

        // Container for the tab strip
        this.element = document.createElement('div');
        this.element.className = '';

        this.modules = {};

        this.renderContent();
    }

    renderContent() {
        // ── Build content panels for each tab ──

        // 1. Chordal Line Viz
        this.chordalContent = createElement('div', 'p-0');
        this.chordalModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            null,
            {},
            { showConnectMode: true }
        );
        this.chordalContent.appendChild(this.chordalModule.container);

        // 2. Vertex Rendering
        this.vertexContent = createElement('div', 'p-0');
        this.vertexModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            null,
            {
                showVertices: 'showVertices',
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
        this.vertexContent.appendChild(this.vertexModule.container);

        // Vertex label toggle
        this.vertexLabelsToggle = new ParamToggle({
            key: 'showVertexLabels',
            label: 'Show Labels',
            value: false,
            onChange: (val) => {
                dispatchDeep('showVertexLabels', val, this.roseId);
            }
        });
        this.vertexContent.appendChild(this.vertexLabelsToggle.getElement());

        // Vertex label font size slider
        const fontSizeSlider = this.createSlider('vertexLabelFontSize', 5, 30, 1, 'Label Size');
        this.vertexLabelFontSizeControl = fontSizeSlider.instance;
        this.vertexContent.appendChild(fontSizeSlider.container);

        // 3. Base Curve Rendering
        this.baseCurveContent = createElement('div', 'p-0');
        this.baseCurveModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            null,
            {
                colorMethod: 'baseCurveColorMethod',
                gradientType: 'baseCurveGradientType',
                gradientPreset: 'baseCurveGradientPreset',
                gradientStops: 'baseCurveGradientStops',
                colorEnd: 'baseCurveColorEnd',
                color: 'baseCurveColor',
                blendMode: 'baseCurveBlendMode',
                opacity: 'baseCurveOpacity',
                size: 'baseCurveLineWidth',
                antiAlias: 'baseCurveAntiAlias'
            },
            {
                showToggle: { key: 'showBaseCurve', label: 'Show Base Curve' }
            }
        );
        this.baseCurveContent.appendChild(this.baseCurveModule.container);

        // 4. Fill Rendering
        this.fillContent = createElement('div', 'p-0');
        this.fillModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
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
                showToggle: { key: 'showFill', label: 'Show Fill', value: true }
            }
        );
        this.fillContent.appendChild(this.fillModule.container);

        // 5. General Rendering Settings
        this.generalContent = createElement('div', 'p-0');
        this.generalModule = new GlobalRenderingModule(
            this.orchestrator,
            this.roseId,
            null
        );
        this.generalContent.appendChild(this.generalModule.container);

        // 6. Trails Effect
        this.trailsContent = createElement('div', 'p-0');
        this.trailsSection = new TrailsSection(this.orchestrator, this.roseId, {
            onClearCanvas: () => {
                if (this.orchestrator.canvas) {
                    const renderer = this.orchestrator._trailsRenderer;
                    if (renderer) renderer.forceClear();
                }
            }
        });
        this.trailsContent.appendChild(this.trailsSection.element);

        // ── Create Tab Strip ──
        this.tabStrip = new TabStrip([
            { id: 'chordal', label: 'Chordal',  eyeToggle: true, eyeDefault: true,  content: this.chordalContent },
            { id: 'vertex',  label: 'Vertex',   eyeToggle: true, eyeDefault: false, content: this.vertexContent },
            { id: 'curve',   label: 'Curve',    eyeToggle: true, eyeDefault: true,  content: this.baseCurveContent },
            { id: 'fill',    label: 'Fill',     eyeToggle: true, eyeDefault: true,  content: this.fillContent },
            { id: 'general', label: 'General',                                      content: this.generalContent },
            { id: 'trails',  label: 'Trails',   eyeToggle: true, eyeDefault: false, content: this.trailsContent }
        ], {
            onTabChange: (tabId) => {
                this.orchestrator.uiState.tabs = this.orchestrator.uiState.tabs || {};
                this.orchestrator.uiState.tabs[`${this.roseId}-appearance`] = tabId;
                persistenceManager.save();
            },
            onEyeToggle: (tabId, isOn) => {
                const dispatchMap = {
                    chordal: 'showChordalLines',
                    vertex: 'showVertices',
                    curve: 'showBaseCurve',
                    fill: 'showFill',
                    trails: 'trailsEnabled'
                };
                if (dispatchMap[tabId]) {
                    dispatchDeep(dispatchMap[tabId], isOn, this.roseId);
                }
            },
            persistKey: `${this.roseId}-appearance`
        });

        this.element.appendChild(this.tabStrip.element);
    }

    handleLinkToggle(key) {
        const keyA = getLinkKey(key, 'rosetteA');
        const keyB = getLinkKey(key, 'rosetteB');
        const keyH = getLinkKey(key, 'hybrid');
        linkManager.toggleFullLink(keyA, keyB, keyH);
    }

    initLinkState(key, control) {
        const myKey = getLinkKey(key, this.roseId);
        if (linkManager.isLinked(myKey)) {
            control.setLinkActive(true);
        }
    }

    updateLinkVisuals() {
        if (this.chordalModule && this.chordalModule.updateLinkVisuals) this.chordalModule.updateLinkVisuals();
        if (this.vertexModule && this.vertexModule.updateLinkVisuals) this.vertexModule.updateLinkVisuals();
        if (this.baseCurveModule && this.baseCurveModule.updateLinkVisuals) this.baseCurveModule.updateLinkVisuals();
        if (this.fillModule && this.fillModule.updateLinkVisuals) this.fillModule.updateLinkVisuals();
        if (this.generalModule && this.generalModule.updateLinkVisuals) this.generalModule.updateLinkVisuals();
        if (this.trailsSection && this.trailsSection.updateLinkVisuals) this.trailsSection.updateLinkVisuals();
    }

    update(params) {
        if (this.chordalModule) this.chordalModule.update(params);
        if (this.vertexModule) this.vertexModule.update(params);
        if (this.vertexLabelsToggle) this.vertexLabelsToggle.setValue(params.showVertexLabels || false);
        if (this.vertexLabelFontSizeControl) this.vertexLabelFontSizeControl.setValue(params.vertexLabelFontSize || 15);
        if (this.baseCurveModule) this.baseCurveModule.update(params);
        if (this.fillModule) this.fillModule.update(params);
        if (this.generalModule) this.generalModule.update(params);
        if (this.trailsSection) this.trailsSection.update(params);

        // Sync eye toggles on tab headers
        if (this.tabStrip) {
            this.tabStrip.setEyeState('chordal', params.showChordalLines !== false);
            this.tabStrip.setEyeState('vertex', params.showVertices || false);
            this.tabStrip.setEyeState('curve', params.showBaseCurve !== false);
            this.tabStrip.setEyeState('fill', params.showFill !== false);
            this.tabStrip.setEyeState('trails', params.trailsEnabled || false);
        }
    }

    /**
     * Restore persisted active tab.
     * Called from ChordalRosettePanel.restoreUIState().
     */
    restoreTabState(tabId) {
        if (tabId && this.tabStrip) {
            this.tabStrip.setActiveTab(tabId);
        }
    }

    createSlider(key, min, max, step, label) {
        const control = new ParamNumber({
            key: key,
            label: label,
            min: min,
            max: max,
            step: step,
            value: 0,
            onChange: (val) => {
                dispatchDeep(key, val, this.roseId);
            },
            onLinkToggle: () => this.handleLinkToggle(key)
        });

        this.initLinkState(key, control);

        return {
            container: control.getElement(),
            instance: control
        };
    }

    createColorInput(key, label) {
        const control = new ParamColor({
            key: key,
            label: label,
            value: '#000000',
            onChange: (val) => {
                dispatchDeep(key, val, this.roseId);
            }
        });

        return {
            container: control.getElement(),
            input: control.input,
            instance: control
        };
    }
}
