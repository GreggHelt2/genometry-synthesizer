import { Accordion } from '../Accordion.js';
import { createElement } from '../../utils/dom.js';

/**
 * HybridAnimationSection — Animation accordion for the hybrid panel.
 * 
 * The Morph Weight slider and Play/Pause button have been moved to the
 * pinned bar in InterpolationPanel (always visible above the scroll area).
 * 
 * This accordion now serves as a container for future LFO/automation
 * configuration controls. It currently shows a brief description.
 */
export class HybridAnimationSection {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;

        this.accordion = new Accordion('Animation', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) {
                this.orchestrator.handleAccordionToggle(isOpen, id);
            }
        }, 'hybrid-anim');

        this.orchestrator.accordions.set('hybrid-anim', this.accordion);
        this.element = this.accordion.element;

        this.render();
    }

    render() {
        // Placeholder for future LFO/automation config controls
        const info = createElement('div', 'text-xs text-gray-500 italic p-2', {
            textContent: 'Morph Weight is pinned above. Animation LFO settings coming soon.'
        });
        this.accordion.append(info);
    }

    update(flatParams) {
        // No controls to sync — morph weight is now in InterpolationPanel's pinned bar
    }
}
