import { Accordion } from '../Accordion.js';
import { LayerRenderingModule, VertexVizModule, GlobalRenderingModule } from '../modules/AppearanceModules.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamColor } from '../ParamColor.js';
import { ParamNumber } from '../ParamNumber.js';
import { store } from '../../../engine/state/Store.js';
import { createElement } from '../../utils/dom.js';

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
        this.element.className = 'flex flex-col gap-1';

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
            this.orchestrator.actionType
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

        // Uses VertexVizModule
        this.vertexModule = new VertexVizModule(
            this.orchestrator,
            this.roseId,
            this.orchestrator.actionType
        );
        this.vertexAccordion.append(this.vertexModule.container);


        this.vertexAccordion.append(this.vertexModule.container);


        // 3. Base Curve Rendering Accordion (New for V3)
        this.baseCurveAccordion = new Accordion('Base Curve Rendering', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, `${this.roseId}-base-viz`);
        this.register(this.baseCurveAccordion, `${this.roseId}-base-viz`);
        this.element.appendChild(this.baseCurveAccordion.element);

        // 3a. Show Toggle
        this.baseCurveControls = {};
        this.baseCurveControls.showBaseCurve = new ParamToggle({
            key: 'showBaseCurve',
            label: 'Show Base Curve',
            value: false,
            onChange: (val) => {
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { showBaseCurve: val }
                });
            },
            onLinkToggle: (isActive) => this.handleLinkToggle('showBaseCurve', isActive, this.baseCurveControls.showBaseCurve)
        });
        this.initLinkState('showBaseCurve', this.baseCurveControls.showBaseCurve);
        this.baseCurveAccordion.append(this.baseCurveControls.showBaseCurve.getElement());

        // 3b. Rendering Controls Module (Strict Parity with Chordal Viz)
        this.baseCurveModule = new LayerRenderingModule(
            this.orchestrator,
            this.roseId,
            this.orchestrator.actionType,
            {
                colorMethod: 'baseCurveColorMethod',
                color: 'baseCurveColor',
                blendMode: 'baseCurveBlendMode',
                opacity: 'baseCurveOpacity',
                lineWidth: 'baseCurveLineWidth',
                antiAlias: 'baseCurveAntiAlias'
            }
        );
        this.baseCurveAccordion.append(this.baseCurveModule.container);


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
            this.orchestrator.actionType
        );
        this.generalAccordion.append(this.generalModule.container);
    }

    handleLinkToggle(key, isActive, control) {
        const myKey = `${this.roseId}.${key}`;
        const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
        const otherKey = `${otherRoseId}.${key}`;

        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const linked = linkManager.toggleLink(myKey, otherKey);
            if (linked !== isActive) {
                control.setLinkActive(linked);
            }
        });
    }

    initLinkState(key, control) {
        const myKey = `${this.roseId}.${key}`;
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

        // Base Curve Toggle
        if (this.baseCurveControls && this.baseCurveControls.showBaseCurve) {
            const myKey = `${this.roseId}.showBaseCurve`;
            import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
                this.baseCurveControls.showBaseCurve.setLinkActive(linkManager.isLinked(myKey));
            });
        }

        // Update own controls
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            if (this.generalModule && this.generalModule.updateLinkVisuals) {
                this.generalModule.updateLinkVisuals();
            }
        });
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

        if (this.baseCurveControls && this.baseCurveControls.showBaseCurve) {
            this.baseCurveControls.showBaseCurve.setValue(params.showBaseCurve || false);
        }

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
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { [key]: val }
                });
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
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { [key]: val }
                });
            }
        });

        // ParamColor doesn't support linking natively in this codebase version usually,
        // but let's check if we want to add it. For now, just basic support.

        return {
            container: control.getElement(),
            input: control.input, // ParamColor exposes input? standard is .input or we need to check
            instance: control
        };
    }
}

