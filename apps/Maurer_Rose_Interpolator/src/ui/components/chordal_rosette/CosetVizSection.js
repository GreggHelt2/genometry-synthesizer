import { Accordion } from '../Accordion.js';
import { createElement } from '../../utils/dom.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamSelect } from '../ParamSelect.js';
import { store } from '../../../engine/state/Store.js';
import { SequencerRegistry } from '../../../engine/math/sequencers/SequencerRegistry.js';
import { gcd } from '../../../engine/math/MathOps.js';

export class CosetVizSection {
    /**
     * @param {Object} orchestrator 
     * @param {string} roseId 
     */
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;

        this.accordion = new Accordion('Coset Visualization', false, this.handleToggle.bind(this), `${this.roseId}-coset`);
        if (orchestrator.registerAccordion) {
            orchestrator.registerAccordion(`${this.roseId}-coset`, this.accordion);
        }

        this.controls = {};
        this.renderContent();
    }

    handleToggle(isOpen, id) {
        if (this.orchestrator.handleAccordionToggle) {
            this.orchestrator.handleAccordionToggle(isOpen, id);
        }
        if (isOpen) {
            requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.accordion.content);
            });
        }
    }

    get element() {
        return this.accordion.element;
    }

    renderContent() {
        // Info
        this.cosetInfo = createElement('div', 'text-xs text-gray-400 mb-2 p-1', { textContent: 'Cosets (k): 1' });
        this.accordion.append(this.cosetInfo);

        // 1. Show All Cosets
        this.controls.showAllCosets = new ParamToggle({
            key: 'showAllCosets',
            label: 'Show All Cosets',
            value: false,
            onChange: (val) => this.dispatch('showAllCosets', val),
            onLinkToggle: (isActive) => this.handleLinkToggle('showAllCosets', isActive, this.controls.showAllCosets)
        });
        this.initLinkState('showAllCosets', this.controls.showAllCosets);
        this.accordion.append(this.controls.showAllCosets.getElement());

        // 2. Coset Count
        this.controls.cosetCount = this.createSlider('cosetCount', 1, 1, 1, 'Cosets to Show');
        this.accordion.append(this.controls.cosetCount.container);

        // 3. Coset Index
        this.controls.cosetIndex = this.createSlider('cosetIndex', 0, 1, 1, 'Starting Coset Index');
        this.accordion.append(this.controls.cosetIndex.container);

        // 4. Distribution
        const distOptions = [
            { value: 'sequential', label: 'Sequential' },
            { value: 'distributed', label: 'Distributed' },
            { value: 'two-way', label: 'Two-Way' }
        ];

        this.controls.distSelect = new ParamSelect({
            key: 'cosetDistribution',
            label: 'Distribution',
            options: distOptions,
            value: 'sequential',
            onChange: (val) => this.dispatch('cosetDistribution', val)
        });
        this.accordion.append(this.controls.distSelect.getElement());
    }

    createSlider(key, min, max, step, label) {
        const paramGui = new ParamNumber({
            key: key,
            label: label,
            min: min,
            max: max,
            step: step,
            value: min,
            onChange: (val) => this.dispatch(key, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(key, isActive, paramGui)
        });

        this.initLinkState(key, paramGui);

        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(paramGui);
        }

        return {
            container: paramGui.getElement(),
            instance: paramGui
        };
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
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            Object.keys(this.controls).forEach(key => {
                const control = this.controls[key];
                // control can be instance or wrapper?
                // showAllCosets is instance. 
                // sliders are wrappers { instance, container }

                let instance = control;
                if (control.instance) instance = control.instance;

                if (instance && typeof instance.setLinkActive === 'function') {
                    // key in controls matches param key here (e.g. 'showAllCosets', 'cosetCount')
                    const fullKey = `${this.roseId}.${key}`;
                    instance.setLinkActive(linkManager.isLinked(fullKey));
                }
            });
        });
    }

    dispatch(key, val) {
        store.dispatch({
            type: this.orchestrator.actionType,
            payload: { [key]: val }
        });
    }

    update(params) {
        // Update Values
        if (this.controls.showAllCosets) this.controls.showAllCosets.setValue(params.showAllCosets);
        if (this.controls.distSelect) this.controls.distSelect.setValue(params.cosetDistribution || 'sequential');

        // Logic for Max Values depend on 'k' (Coset length)
        // Similar to updateStats logic, we need to know k.
        // We can replicate logic or perhaps statsSection calculated it?
        // Let's recalculate k efficiently or assume orchestrator passes it?
        // Orchestrator calculate 'k' in updateUI already for stats.
        // But here we rely on passing params only?
        // Let's recalc k locally, it's cheap enough.

        const seqType = params.sequencerType || 'Cyclic Additive Group Modulo N';
        const SequencerClass = SequencerRegistry[seqType];

        // Default k for additive is gcd(n, s) if standard? No, additive is usually monolithic unless custom logic.
        // Or wait, standard Maurer rose logic:
        // k = gcd(totalDivs, step) is for closed loops.
        // But "Cosets" usually implies Multiplicative Group.
        // Additive group is 1 single orbit if coprime, or d orbits if gcd=d.

        let k = 1;
        if (SequencerClass) {
            const seq = new SequencerClass();
            if (seq.getCosets) {
                const cosets = seq.getCosets(params.totalDivs, params);
                if (cosets) k = cosets.length;
            } else {
                // Fallback for additive
                k = gcd(params.step, params.totalDivs);
            }
        }

        // Update Info
        this.cosetInfo.textContent = `Cosets (k): ${k}`;

        // Enable/Disable Logic
        const showAll = params.showAllCosets;
        const isMulti = k > 1;

        // Count Control
        if (this.controls.cosetCount) {
            this.controls.cosetCount.instance.setMax(k);
            this.controls.cosetCount.instance.setValue(Math.min(params.cosetCount || 1, k));

            // Disable if Show All is ON or k=1
            const disabled = showAll || !isMulti;
            this.controls.cosetCount.instance.setDisabled(disabled);
            if (this.controls.cosetCount.container) {
                this.controls.cosetCount.container.style.opacity = disabled ? '0.5' : '1';
            }
        }

        // Index Control
        if (this.controls.cosetIndex) {
            this.controls.cosetIndex.instance.setMax(Math.max(0, k - 1));
            this.controls.cosetIndex.instance.setValue((params.cosetIndex || 0) % k);

            // Enabled if k > 1 (always valid to rotate start index even if ShowAll)
            const disabled = !isMulti;
            this.controls.cosetIndex.instance.setDisabled(disabled);
            if (this.controls.cosetIndex.container) {
                this.controls.cosetIndex.container.style.opacity = disabled ? '0.5' : '1';
            }
        }

        // Distribution Control
        if (this.controls.distSelect) {
            const disabled = showAll || !isMulti;
            this.controls.distSelect.setDisabled(disabled);
            this.controls.distSelect.getElement().style.opacity = disabled ? '0.5' : '1';
        }
    }
}
