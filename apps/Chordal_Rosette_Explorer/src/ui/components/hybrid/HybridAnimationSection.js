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

        // Add Play/Pause button to the accordion header
        const playSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        this.headerPlayBtn = this.accordion.addHeaderAction(playSvg, () => {
            const paramNumber = this.morphControl.instance;
            paramNumber.togglePlayback();
            this.syncHeaderPlayButton();
        }, 'Play/Pause Morph Animation');

        // Monkey-patch the ParamNumber's togglePlayback to also sync our header button
        const paramNumber = this.morphControl.instance;
        const originalToggle = paramNumber.togglePlayback.bind(paramNumber);
        paramNumber.togglePlayback = () => {
            originalToggle();
            this.syncHeaderPlayButton();
        };

        // Align labels initially
        requestAnimationFrame(() => {
            if (this.orchestrator.alignLabels) {
                this.orchestrator.alignLabels(this.accordion.content);
            }
        });
    }

    /** Keep the header play button visual in sync with the morph animation state. */
    syncHeaderPlayButton() {
        if (!this.headerPlayBtn || !this.morphControl) return;
        const isPlaying = this.morphControl.instance.animationController.isPlaying;
        if (isPlaying) {
            this.headerPlayBtn.classList.remove('text-gray-500', 'border-transparent');
            this.headerPlayBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        } else {
            this.headerPlayBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
            this.headerPlayBtn.classList.add('text-gray-500', 'border-transparent');
        }
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
        this.syncHeaderPlayButton();
    }
}
