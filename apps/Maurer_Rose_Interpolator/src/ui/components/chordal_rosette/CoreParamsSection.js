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
            key: 'curveType', // This key is essential for LinkManager to find it if we expose it
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

        // n, d, A, c, rot, radius
        // using helper similar to original allowFloat/allowInt
        // We can just construct ParamNumber directly.

        this.nSlider = this.createSlider('n', 0, 20, 1, 'n (Petals/Lobes)', false);
        this.dSlider = this.createSlider('d', 1, 20, 1, 'd (Petal Width)', false);
        this.ASlider = this.createSlider('A', 10, 300, 1, 'A (Amplitude)', false);
        this.cSlider = this.createSlider('c', 0, 5, 0.01, 'c (Offset)', true);
        this.rotSlider = this.createSlider('rot', 0, 360, 1, 'Rotation (deg)', false);
        this.radiusSlider = this.createSlider('radius', 10, 300, 1, 'Radius (Circle)', false);

        // Append basic controls
        this.accordion.append(this.nSlider.container);
        this.accordion.append(this.dSlider.container);
        this.accordion.append(this.ASlider.container);
        this.accordion.append(this.cSlider.container);
        this.accordion.append(this.rotSlider.container);
        this.accordion.append(this.radiusSlider.container); // Display toggled in update()

        // Store references for updates
        Object.assign(this.controls, {
            n: this.nSlider.instance,
            d: this.dSlider.instance,
            A: this.ASlider.instance,
            c: this.cSlider.instance,
            rot: this.rotSlider.instance,
            radius: this.radiusSlider.instance
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
                // Check if control is a ParamNumber/ParamToggle (has setLinkActive)
                if (control && typeof control.setLinkActive === 'function') {
                    // Controls storage key matches param key for CoreParams
                    const paramKey = key;
                    const fullKey = `${this.roseId}.${paramKey}`;
                    const isLinked = linkManager.isLinked(fullKey);
                    control.setLinkActive(isLinked);
                }
            });
        });
    }

    update(params) {
        // Update Values
        // Note: ParamNumber.setValue checks for document.activeElement to avoid typing interruption
        // but explicit check here is safer if ParamNumber implementation changes.
        // Assuming ParamNumber handles it.

        this.curveTypeSelect.setValue(params.curveType || 'Rhodonea');

        if (this.controls.n) this.controls.n.setValue(params.n);
        if (this.controls.d) this.controls.d.setValue(params.d);
        if (this.controls.A) this.controls.A.setValue(params.A);
        if (this.controls.c) this.controls.c.setValue(params.c);
        if (this.controls.rot) this.controls.rot.setValue(params.rot);
        if (this.controls.radius) this.controls.radius.setValue(params.radius);

        // Specific Visibility Logic
        const isCircle = params.curveType === 'Circle';

        // Helper to toggle visibility
        const toggle = (wrapper, show) => {
            if (wrapper) wrapper.style.display = show ? 'flex' : 'none';
        }

        toggle(this.nSlider.container, !isCircle);
        toggle(this.dSlider.container, !isCircle);
        toggle(this.ASlider.container, !isCircle);
        toggle(this.cSlider.container, !isCircle);
        toggle(this.rotSlider.container, !isCircle);
        toggle(this.radiusSlider.container, isCircle);
    }
}
