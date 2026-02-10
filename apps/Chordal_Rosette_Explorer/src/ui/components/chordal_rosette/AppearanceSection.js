import { Accordion } from '../Accordion.js';
import { LayerRenderingModule } from '../modules/LayerRenderingModule.js';
import { GlobalRenderingModule } from '../modules/GlobalRenderingModule.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamColor } from '../ParamColor.js';
import { ParamNumber } from '../ParamNumber.js';
import { createElement } from '../../utils/dom.js';
import { dispatchDeep, getLinkKey } from '../../../engine/state/stateAdapters.js';

export class AppearanceSection {
    /**
     * @param {Object} orchestrator 
     * @param {string} roseId 
     */
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;

        // Container for multiple accordions
        this.element = document.createElement('div');
        this.element.className = '';

        this.modules = {};

        this.renderContent();
    }

    renderContent() {
        // 1. Chordal Line Viz Accordion
        this.chordalAccordion = new Accordion('Chordal Line Viz', true, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.chordalAccordion.content);
            });
        }, `${this.roseId}-chordal-viz`);
        this.register(this.chordalAccordion, `${this.roseId}-chordal-viz`);
        this.element.appendChild(this.chordalAccordion.element);

        // Uses LayerRenderingModule
        this.chordalModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            null, // actionType no longer used
            {}, // Default keys
            {
                showConnectMode: true
            }
        );
        this.chordalAccordion.append(this.chordalModule.container);


        // 2. Vertex Rendering Accordion
        this.vertexAccordion = new Accordion('Vertex Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.vertexAccordion.content);
            });
        }, `${this.roseId}-vertex-viz`);
        this.register(this.vertexAccordion, `${this.roseId}-vertex-viz`);
        this.element.appendChild(this.vertexAccordion.element);

        // Uses LayerRenderingModule (General replacement for VertexVizModule)
        this.vertexModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            null, // actionType no longer used
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
        this.vertexAccordion.append(this.vertexModule.container);


        // 3. Base Curve Rendering Accordion
        this.baseCurveAccordion = new Accordion('Base Curve Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, `${this.roseId}-base-viz`);
        this.register(this.baseCurveAccordion, `${this.roseId}-base-viz`);
        this.element.appendChild(this.baseCurveAccordion.element);

        this.baseCurveModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            null, // actionType no longer used
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
        this.baseCurveAccordion.append(this.baseCurveModule.container);


        // 4. Fill Rendering Accordion
        this.fillAccordion = new Accordion('Fill Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, `${this.roseId}-fill-viz`);
        this.register(this.fillAccordion, `${this.roseId}-fill-viz`);
        this.element.appendChild(this.fillAccordion.element);

        this.fillModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            null, // actionType no longer used
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
        this.fillAccordion.append(this.fillModule.container);


        // General Rendering Settings Accordion - Use Module
        this.generalAccordion = new Accordion('General Rendering Settings', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
            if (isOpen) requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.generalAccordion.content);
            });
        }, `${this.roseId}-appearance-general`);
        this.register(this.generalAccordion, `${this.roseId}-appearance-general`);
        this.element.appendChild(this.generalAccordion.element);

        this.generalModule = new GlobalRenderingModule(
            this.orchestrator,
            this.roseId,
            null // actionType no longer used
        );
        this.generalAccordion.append(this.generalModule.container);
    }

    handleLinkToggle(key, isActive, control) {
        const myKey = getLinkKey(key, this.roseId);
        const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
        const otherKey = getLinkKey(key, otherRoseId);

        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const linked = linkManager.toggleLink(myKey, otherKey);
            if (linked !== isActive) {
                control.setLinkActive(linked);
            }
        });
    }

    initLinkState(key, control) {
        const myKey = getLinkKey(key, this.roseId);
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            if (linkManager.isLinked(myKey)) {
                control.setLinkActive(true);
            }
        });
    }

    updateLinkVisuals() {
        // Delegate to modules
        if (this.chordalModule && this.chordalModule.updateLinkVisuals) {
            this.chordalModule.updateLinkVisuals();
        }
        if (this.vertexModule && this.vertexModule.updateLinkVisuals) {
            this.vertexModule.updateLinkVisuals();
        }
        if (this.baseCurveModule && this.baseCurveModule.updateLinkVisuals) {
            this.baseCurveModule.updateLinkVisuals();
        }
        if (this.fillModule && this.fillModule.updateLinkVisuals) {
            this.fillModule.updateLinkVisuals();
        }

        if (this.generalModule && this.generalModule.updateLinkVisuals) {
            this.generalModule.updateLinkVisuals();
        }
    }

    register(accordion, id) {
        if (this.orchestrator.registerAccordion) {
            this.orchestrator.registerAccordion(id, accordion);
        }
    }

    update(params) {
        if (this.chordalModule) this.chordalModule.update(params);
        if (this.vertexModule) this.vertexModule.update(params);
        if (this.baseCurveModule) this.baseCurveModule.update(params);
        if (this.fillModule) this.fillModule.update(params);

        if (this.generalModule) this.generalModule.update(params);
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
            onLinkToggle: (isActive) => this.handleLinkToggle(key, isActive, control)
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
