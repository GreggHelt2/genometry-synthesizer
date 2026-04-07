import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamToggle } from '../ParamToggle.js';
import { createElement } from '../../utils/dom.js';
import { dispatchDeep, getLinkKey } from '../../../engine/state/stateAdapters.js';

/**
 * TrailsSection — Accordion UI for enabling canvas trail persistence effect.
 * 
 * Reusable across rosette panels (rosetteA, rosetteB) and the hybrid panel.
 * Controls: Eye toggle (enable), Decay slider, Clear Canvas button.
 * Fade color is automatically derived from the panel's background color.
 */
export class TrailsSection {
    /**
     * @param {Object} orchestrator - Parent panel (ChordalRosettePanel or InterpolationPanel)
     * @param {string} roseId - 'rosetteA', 'rosetteB', or 'hybrid'
     * @param {Object} [options]
     * @param {Function} [options.onClearCanvas] - Callback to force-clear the canvas
     */
    constructor(orchestrator, roseId, options = {}) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;
        this.onClearCanvas = options.onClearCanvas || null;

        this.element = document.createElement('div');

        this.renderContent();
    }

    renderContent() {
        const accordionId = `${this.roseId}-trails`;

        this.accordion = new Accordion('Trails Effect', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) {
                this.orchestrator.handleAccordionToggle(isOpen, id);
            }
            if (isOpen) {
                requestAnimationFrame(() => {
                    if (this.orchestrator.alignLabels) {
                        this.orchestrator.alignLabels(this.accordion.content);
                    }
                });
            }
        }, accordionId);

        // Register accordion for UI state persistence
        if (this.orchestrator.registerAccordion) {
            this.orchestrator.registerAccordion(accordionId, this.accordion);
        } else if (this.orchestrator.accordions) {
            this.orchestrator.accordions.set(accordionId, this.accordion);
        }

        // Eye toggle for quick enable/disable
        this.eyeToggle = this.accordion.addEyeToggle(false, (val) => {
            dispatchDeep('trailsEnabled', val, this.roseId);
        });

        // Decay Slider
        this.decayControl = new ParamNumber({
            key: 'trailsDecay',
            label: 'Decay',
            min: 0.01,
            max: 0.5,
            step: 0.01,
            value: 0.1,
            onChange: (val) => {
                dispatchDeep('trailsDecay', val, this.roseId);
            },
            onLinkToggle: () => this.handleLinkToggle('trailsDecay')
        });
        this.initLinkState('trailsDecay', this.decayControl);

        // Register for animation persistence
        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(this.decayControl);
        }

        this.accordion.append(this.decayControl.getElement());

        // Clear Canvas Button
        const clearBtn = createElement('button',
            'w-full mt-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 hover:text-white transition-colors border border-gray-600',
            { textContent: '⟳ Clear Canvas', title: 'Clear all accumulated trails' }
        );
        clearBtn.addEventListener('click', () => {
            if (this.onClearCanvas) {
                this.onClearCanvas();
            }
        });
        this.accordion.append(clearBtn);

        this.element.appendChild(this.accordion.element);
    }

    handleLinkToggle(key) {
        const myKey = getLinkKey(key, this.roseId);
        // Link across all three panels for trails sync
        const otherIds = ['rosetteA', 'rosetteB', 'hybrid'].filter(id => id !== this.roseId);

        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            // Toggle link with the first "other" panel
            const otherKey = getLinkKey(key, otherIds[0]);
            linkManager.toggleLink(myKey, otherKey);
        });
    }

    initLinkState(key, control) {
        const myKey = getLinkKey(key, this.roseId);
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const level = linkManager.getLinkLevel(myKey);
            if (level > 0 && control.setLinkLevel) {
                control.setLinkLevel(level);
            }
        });
    }

    updateLinkVisuals() {
        if (this.decayControl && this.decayControl.updateLinkVisuals) {
            this.decayControl.updateLinkVisuals();
        }
    }

    /**
     * Sync UI controls from flattened state params.
     * @param {Object} params - flattened rose or hybrid params
     */
    update(params) {
        // Eye toggle
        if (this.eyeToggle) {
            this.eyeToggle.setActive(params.trailsEnabled || false);
        }

        // Decay slider
        if (this.decayControl) {
            this.decayControl.setValue(params.trailsDecay ?? 0.1);
        }
    }
}
