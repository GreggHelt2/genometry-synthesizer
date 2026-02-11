import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { dispatchDeep } from '../../../engine/state/stateAdapters.js';

export class HybridAnimationSection {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;

        this.accordion = new Accordion('Animation', true, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) {
                this.orchestrator.handleAccordionToggle(isOpen, id);
            }
            if (isOpen) requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.accordion.content);
            });
        }, 'hybrid-anim');

        this.orchestrator.accordions.set('hybrid-anim', this.accordion);
        this.element = this.accordion.element;

        this.render();
    }

    render() {
        // Morph Weight Slider
        this.morphControl = this.createSlider('weight', 0, 1, 0.001, 'Morph Weight');
        this.accordion.append(this.morphControl.container);

        // Align labels initially
        requestAnimationFrame(() => {
            if (this.orchestrator.alignLabels) {
                this.orchestrator.alignLabels(this.accordion.content);
            }
        });
    }

    createSlider(key, min, max, step, label) {
        const paramGui = new ParamNumber({
            key,
            label,
            min,
            max,
            step,
            value: 0,
            hardLimits: (key === 'weight'), // Enforce strict limits for Morph Weight
            onChange: (val) => {
                dispatchDeep(key, val, 'hybrid');
            }
        });

        // Track for Animation Persistence via Orchestrator
        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(paramGui);
        }

        return {
            container: paramGui.getElement(),
            instance: paramGui
        };
    }

    update(flatParams) {
        if (this.morphControl) {
            this.morphControl.instance.setValue(flatParams.weight);
        }
    }
}
