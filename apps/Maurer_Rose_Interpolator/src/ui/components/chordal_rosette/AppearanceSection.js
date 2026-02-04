import { Accordion } from '../Accordion.js';
import { RenderingControlsModule, VertexVizModule } from '../modules/AppearanceModules.js';
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

        // Uses RenderingControlsModule
        this.chordalModule = new RenderingControlsModule(
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
        this.baseCurveModule = new RenderingControlsModule(
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


        // 4. General Rendering Settings Accordion
        this.generalAccordion = new Accordion('General Rendering Settings', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) this.orchestrator.handleAccordionToggle(isOpen, id);
        }, `${this.roseId}-general`);
        this.register(this.generalAccordion, `${this.roseId}-general`);
        this.element.appendChild(this.generalAccordion.element);

        // Specific General Controls (Auto Scale, Scale Line Width)
        // These are specific to Rosette Panel currently, maybe not shared with Interpolator?
        // Interpolator has them too. 
        // We could make a module, but they are simple toggles.
        // Let's implement directly for now to save complexity, or add GeneralModule later.

        this.generalControls = {};

        // Auto Scale
        this.generalControls.autoScale = new ParamToggle({
            key: 'autoScale',
            label: 'Auto Scale',
            value: false,
            onChange: (val) => {
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { autoScale: val }
                });
            },
            onLinkToggle: (isActive) => this.handleLinkToggle('autoScale', isActive, this.generalControls.autoScale)
        });
        this.initLinkState('autoScale', this.generalControls.autoScale);
        this.generalAccordion.append(this.generalControls.autoScale.getElement());

        // Scale Line Width
        this.generalControls.scaleLineWidth = new ParamToggle({
            key: 'scaleLineWidth',
            label: 'Scale Line Width',
            value: true,
            onChange: (val) => {
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { scaleLineWidth: val }
                });
            },
            onLinkToggle: (isActive) => this.handleLinkToggle('scaleLineWidth', isActive, this.generalControls.scaleLineWidth)
        });
        this.initLinkState('scaleLineWidth', this.generalControls.scaleLineWidth);
        this.generalAccordion.append(this.generalControls.scaleLineWidth.getElement());

        // Background Opacity
        const bgOpacityControl = this.createSlider('backgroundOpacity', 0, 1, 0.01, 'Background Opacity');
        this.generalControls.backgroundOpacity = bgOpacityControl.instance;
        this.generalAccordion.append(bgOpacityControl.container);

        // Background Color
        const bgColorControl = this.createColorInput('backgroundColor', 'Background Color');
        this.generalControls.backgroundColor = bgColorControl.instance;
        this.generalAccordion.append(bgColorControl.container);
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
            Object.keys(this.generalControls).forEach(key => {
                const control = this.generalControls[key];
                // Check if control has setLinkActive (it should if it's an instance)
                if (control && typeof control.setLinkActive === 'function') {
                    const fullKey = `${this.roseId}.${key}`;
                    control.setLinkActive(linkManager.isLinked(fullKey));
                }
            });
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

        if (this.generalControls.autoScale) this.generalControls.autoScale.setValue(params.autoScale || false);
        if (this.generalControls.scaleLineWidth) this.generalControls.scaleLineWidth.setValue(params.scaleLineWidth !== false);
        if (this.generalControls.backgroundOpacity) this.generalControls.backgroundOpacity.setValue(params.backgroundOpacity ?? 0);
        if (this.generalControls.backgroundColor) this.generalControls.backgroundColor.setValue(params.backgroundColor || '#000000');
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

