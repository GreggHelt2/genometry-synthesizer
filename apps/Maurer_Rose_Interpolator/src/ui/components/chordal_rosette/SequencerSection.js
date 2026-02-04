import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { createElement } from '../../utils/dom.js';
import { SequencerRegistry } from '../../../engine/math/sequencers/SequencerRegistry.js';
import { store } from '../../../engine/state/Store.js';

export class SequencerSection {
    /**
     * @param {Object} orchestrator 
     * @param {string} roseId 
     */
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;

        // Accordion Registration
        this.accordion = new Accordion('Maurer Sequencer', true, this.handleToggle.bind(this), `${this.roseId}-maurer`);
        if (orchestrator.registerAccordion) {
            orchestrator.registerAccordion(`${this.roseId}-maurer`, this.accordion);
        }

        // Init internals
        this.controls = {};
        this.sequencerControls = {};
        this.currentSequencerType = null;

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
        // Sequencer Type Selector
        const seqOptions = Object.keys(SequencerRegistry)
            .sort()
            .map(k => ({ value: k, label: k }));

        this.sequencerSelect = new ParamSelect({
            key: 'sequencerType',
            label: 'Sequencer',
            options: seqOptions,
            value: 'Cyclic Additive Group Modulo N',
            onChange: (val) => {
                store.dispatch({
                    type: this.orchestrator.actionType,
                    payload: { sequencerType: val }
                });
            }
        });
        this.accordion.append(this.sequencerSelect.getElement());
        this.controls.sequencerType = this.sequencerSelect;

        // Container for Dynamic Controls (e.g. Generator, Step, Multiplier)
        this.sequencerParamsContainer = createElement('div', 'flex flex-col');
        this.accordion.append(this.sequencerParamsContainer);

        // Core Maurer Controls that are always present or standard?
        // Actually, 'totalDivs' (Points) is standard for all.
        // But 'step'/'generator' depends on schema.
        // Wait, original code had `updateSequencerControls` which wiped `sequencerParamsContainer`.
        // We will replicate that logic in `update()`.

        // Total Divs (Points) - usually always present
        this.divsSlider = this.createSlider('totalDivs', 1, 3600, 1, 'Points to Connect');
        this.accordion.append(this.divsSlider.container);
        this.controls.totalDivs = this.divsSlider.instance;
    }

    /**
     * Helper
     */
    createSlider(key, min, max, step, label) {
        const paramGui = new ParamNumber({
            key: key,
            label: label,
            min: min,
            max: max,
            step: step,
            value: min, // initial
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
            }
        });

        // Initialize Link State
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const myKey = `${this.roseId}.${key}`;
            if (linkManager.isLinked(myKey)) {
                paramGui.setLinkActive(true);
            }
        });

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
            // Static controls
            if (this.controls.totalDivs) {
                const key = 'totalDivs';
                const fullKey = `${this.roseId}.${key}`;
                this.controls.totalDivs.setLinkActive(linkManager.isLinked(fullKey));
            }

            // Dynamic controls
            if (this.sequencerControls) {
                Object.keys(this.sequencerControls).forEach(key => {
                    const control = this.sequencerControls[key];
                    if (control && control.instance) {
                        const fullKey = `${this.roseId}.${key}`;
                        control.instance.setLinkActive(linkManager.isLinked(fullKey));
                    }
                });
            }
        });
    }

    update(params) {
        // Update Static Controls
        this.sequencerSelect.setValue(params.sequencerType || 'Cyclic Additive Group Modulo N');

        if (this.controls.totalDivs) {
            this.controls.totalDivs.setValue(params.totalDivs);
        }

        // Check if Sequencer Type Changed -> Rebuild Dynamic Controls
        const newType = params.sequencerType || 'Cyclic Additive Group Modulo N';

        if (newType !== this.currentSequencerType) {
            this.rebuildSequencerControls(newType, params);
            this.currentSequencerType = newType;
        }

        // Update Dynamic Controls Values
        Object.entries(this.sequencerControls).forEach(([key, control]) => {
            if (params[key] !== undefined) {
                control.instance.setValue(params[key]);
            }
        });
    }

    rebuildSequencerControls(type, params) { // params needed? Maybe for init values?
        // Clear container
        // Clean up old controls first (unregister if needed?)
        // The orchestrator handles persistence on 'registerParam'. 
        // If we remove them from DOM, we should arguably 'dispose' them to remove from Orchestrator tracking.
        Object.values(this.sequencerControls).forEach(c => {
            if (c.instance.dispose) c.instance.dispose();
        });

        this.sequencerParamsContainer.innerHTML = '';
        this.sequencerControls = {};

        const SequencerClass = SequencerRegistry[type];
        if (!SequencerClass) return;

        // Instantiate to get schema
        const sequencerInstance = new SequencerClass();
        const schema = sequencerInstance.getParamsSchema();

        schema.forEach(param => {
            if (param.type === 'slider') {
                const control = this.createSlider(param.key, param.min, param.max, param.step, param.label);

                // Set initial value if available in params, else default
                // Actually update() loop calls setValue right after this, so it's safer to wait.
                // But for good measure we can set it if we have it.
                if (params[param.key] !== undefined) {
                    control.instance.setValue(params[param.key]);
                }

                this.sequencerControls[param.key] = control;
                this.sequencerParamsContainer.appendChild(control.container);
            }
        });

        // Request alignment if parent supports it
        requestAnimationFrame(() => {
            if (this.orchestrator.alignLabels) {
                this.orchestrator.alignLabels(this.sequencerParamsContainer);
            }
        });
    }
}
