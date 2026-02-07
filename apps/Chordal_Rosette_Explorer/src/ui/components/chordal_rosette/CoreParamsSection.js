import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { CurveRegistry } from '../../../engine/math/curves/CurveRegistry.js';
import { store } from '../../../engine/state/Store.js';

export class CoreParamsSection {
    /**
     * @param {Object} orchestrator 
     * @param {string} roseId 
     */
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;

        // --- Persistence Registration ---
        this.accordion = new Accordion('Base Curve Generator', true, this.handleToggle.bind(this), `${this.roseId}-core`);
        if (orchestrator.registerAccordion) {
            orchestrator.registerAccordion(`${this.roseId}-core`, this.accordion);
        }

        // --- Init Controls Storage ---
        this.controls = {};
        this.currentCurveType = null;
        this.dynamicContainer = document.createElement('div');
        this.dynamicContainer.className = 'flex flex-col gap-1';

        this.renderContent();
    }

    handleToggle(isOpen, id) {
        if (this.orchestrator.handleAccordionToggle) {
            this.orchestrator.handleAccordionToggle(isOpen, id);
        }
    }

    get element() {
        return this.accordion.element;
    }

    renderContent() {
        // Curve Type Select
        const curveOptions = Object.keys(CurveRegistry).map(k => ({ value: k, label: k }));

        this.curveTypeSelect = new ParamSelect({
            key: 'curveType',
            label: 'Curve Type',
            options: curveOptions,
            value: 'Rhodonea',
            onChange: (val) => {
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { curveType: val }
                });
            }
        });
        this.accordion.append(this.curveTypeSelect.getElement());
        this.controls.curveType = this.curveTypeSelect;

        // Dynamic Container for curve-specific sliders
        this.accordion.append(this.dynamicContainer);
    }

    /**
     * Rebuilds the dynamic sliders based on the curve schema
     */
    rebuildDynamicControls(curveType, params) {
        if (this.currentCurveType === curveType) return;
        this.currentCurveType = curveType;

        // Clear existing dynamic controls
        this.dynamicContainer.innerHTML = '';

        // Remove old dynamic controls from this.controls to avoid stale updates
        // Keep curveType as it's static
        const staticKeys = ['curveType'];
        Object.keys(this.controls).forEach(key => {
            if (!staticKeys.includes(key)) {
                delete this.controls[key];
            }
        });

        const CurveClass = CurveRegistry[curveType] || CurveRegistry['Rhodonea'];
        const schema = CurveClass.getParamsSchema();

        schema.forEach(item => {
            const slider = this.createSlider(
                item.key,
                item.min,
                item.max,
                item.step,
                item.label,
                item.step < 1
            );

            this.dynamicContainer.appendChild(slider.container);
            this.controls[item.key] = slider.instance;

            // Set initial value from current state params or default
            const val = params[item.key] !== undefined ? params[item.key] : item.default;
            slider.instance.setValue(val);
        });
    }

    /**
     * Helper to create standard slider linked to store
     */
    createSlider(key, min, max, step, label, allowFloat = true) {
        const paramGui = new ParamNumber({
            key: key,
            label: label,
            min: min,
            max: max,
            step: step,
            value: min, // initial, will be updated
            onChange: (val) => {
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { [key]: val }
                });
            },
            onLinkToggle: (isActive) => {
                const myKey = `${this.roseId}.${key}`;
                const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
                const otherKey = `${otherRoseId}.${key}`;

                import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
                    const linked = linkManager.toggleLink(myKey, otherKey);
                    if (linked !== isActive) {
                        paramGui.setLinkActive(linked);
                    }
                });
            },
            allowFloat: allowFloat
        });

        // Initialize Link State
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const myKey = `${this.roseId}.${key}`;
            if (linkManager.isLinked(myKey)) {
                paramGui.setLinkActive(true);
            }
        });

        // Register for Animation
        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(paramGui);
        }

        return {
            container: paramGui.getElement(),
            instance: paramGui
        };
    }

    updateLinkVisuals() {
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            Object.keys(this.controls).forEach(key => {
                const control = this.controls[key];
                if (control && typeof control.setLinkActive === 'function') {
                    const fullKey = `${this.roseId}.${key}`;
                    const isLinked = linkManager.isLinked(fullKey);
                    control.setLinkActive(isLinked);
                }
            });
        });
    }

    update(params) {
        const curveType = params.curveType || 'Rhodonea';
        this.curveTypeSelect.setValue(curveType);

        // Rebuild if type changed
        this.rebuildDynamicControls(curveType, params);

        // Update Values for all current controls
        Object.keys(this.controls).forEach(key => {
            if (key === 'curveType') return;
            if (params[key] !== undefined) {
                this.controls[key].setValue(params[key]);
            }
        });
    }
}
