import { Accordion } from '../Accordion.js';
import { createElement } from '../../utils/dom.js';
import { RelativesFinder } from '../../../engine/math/RelativesFinder.js';
import { store } from '../../../engine/state/Store.js';

export class RelativesSection {
    /**
     * @param {Object} orchestrator - The parent panel (must provide .roseId, .actionType, .registerAccordion)
     */
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
        this.roseId = orchestrator.roseId; // 'rosetteA' or 'rosetteB'

        // Setup Accordion
        this.accordion = new Accordion('Relatives Navigation', true, this.handleToggle.bind(this), `${this.roseId}-relatives`);

        // Register for UI Persistence
        if (orchestrator.registerAccordion) {
            orchestrator.registerAccordion(`${this.roseId}-relatives`, this.accordion);
        }

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
        const relTypeContainer = createElement('div', 'flex items-center justify-between mb-2');
        const relLabel = createElement('label', 'text-xs text-gray-400 mr-2', { textContent: 'Relative Criterion' });

        this.relativesTypeSelect = createElement('select', 'flex-1 bg-gray-700 text-white p-1 rounded');

        ['Prime', 'Twin Prime', 'Cousin Prime', 'Lines To Close Matches'].forEach(type => {
            let val = type.toLowerCase();
            if (type === 'Lines To Close Matches') val = 'ltc';
            else if (type === 'Twin Prime') val = 'twin';
            else if (type === 'Cousin Prime') val = 'cousin';
            else if (type === 'Prime') val = 'prime';

            const opt = createElement('option', '', { value: val, textContent: type });
            this.relativesTypeSelect.appendChild(opt);
        });

        // Set Default
        this.relativesTypeSelect.value = 'ltc';

        relTypeContainer.appendChild(relLabel);
        relTypeContainer.appendChild(this.relativesTypeSelect);

        const relNavContainer = createElement('div', 'flex gap-2');

        ['Prev', 'Random', 'Next'].forEach(dir => {
            const btn = createElement('button', 'flex-1 bg-gray-600 hover:bg-gray-500 rounded px-2 py-1 text-sm', { textContent: dir });
            btn.addEventListener('click', () => this.handleRelativesNav(dir.toLowerCase()));
            relNavContainer.appendChild(btn);
        });

        this.accordion.append(relTypeContainer);
        this.accordion.append(relNavContainer);
    }

    /**
     * Handles navigation logic. Note: Needs access to current global state for 'step' and 'totalDivs'.
     * Since this is infrequent, fetching from store.getState() is acceptable and cleaner than prop drilling every frame.
     */
    handleRelativesNav(direction) {
        const type = this.relativesTypeSelect.value;
        const state = store.getState()[this.roseId];

        // 'Generator' slider/param usually maps to 'step' in the data model
        const currentGen = state.step;
        const totalDivs = state.totalDivs; // Modulo

        // Relatives Finder logic
        // Note: RelativesFinder import path needs to be correct relative to this file
        const newVal = RelativesFinder.findRelative(currentGen, type, direction, totalDivs);

        if (newVal !== null && newVal !== currentGen) {
            store.dispatch({
                type: this.orchestrator.actionType,
                payload: { step: newVal }
            });
        }
    }

    // No repetitive update() needed for this section as it doesn't display live state, 
    // it only dispatches actions based on clicks.
    // If we wanted to "sync" the dropdown selection to state (if persisted), we could add update(params).
    // The current code didn't seem to persist dropdown selection, but defaults to 'ltc'.
    // We'll leave it as is for V3 Phase 1.
    update(params) {
        // No-op for now
    }
}
