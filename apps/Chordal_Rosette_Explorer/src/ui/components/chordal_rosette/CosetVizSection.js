import { Accordion } from '../Accordion.js';
import { createElement } from '../../utils/dom.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamSelect } from '../ParamSelect.js';
import { SequencerRegistry } from '../../../engine/math/sequencers/SequencerRegistry.js';
import { gcd } from '../../../engine/math/MathOps.js';
import { dispatchDeep, getLinkKey } from '../../../engine/state/stateAdapters.js';

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
            onLinkToggle: () => this.handleLinkToggle('showAllCosets')
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
            onLinkToggle: () => this.handleLinkToggle(key)
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

    handleLinkToggle(key) {
        const myKey = getLinkKey(key, this.roseId);
        const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
        const otherKey = getLinkKey(key, otherRoseId);

        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            linkManager.toggleLink(myKey, otherKey);
        });
    }

    initLinkState(key, control) {
        const myKey = getLinkKey(key, this.roseId);
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const level = linkManager.getLinkLevel(myKey);
            if (level > 0) {
                control.setLinkLevel(level);
            }
        });
    }

    updateLinkVisuals() {
        // Map control keys to their actual state keys for link lookup
        const linkableControls = {
            showAllCosets: { stateKey: 'showAllCosets', control: this.controls.showAllCosets },
            cosetCount: { stateKey: 'cosetCount', control: this.controls.cosetCount?.instance },
            cosetIndex: { stateKey: 'cosetIndex', control: this.controls.cosetIndex?.instance }
        };

        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            Object.values(linkableControls).forEach(({ stateKey, control }) => {
                if (control && typeof control.setLinkLevel === 'function') {
                    const fullKey = getLinkKey(stateKey, this.roseId);
                    control.setLinkLevel(linkManager.getLinkLevel(fullKey));
                } else if (control && typeof control.setLinkActive === 'function') {
                    const fullKey = getLinkKey(stateKey, this.roseId);
                    control.setLinkActive(linkManager.isLinked(fullKey));
                }
            });
        });
    }

    dispatch(key, val) {
        dispatchDeep(key, val, this.roseId);
    }

    update(params) {
        // Update Values
        if (this.controls.showAllCosets) this.controls.showAllCosets.setValue(params.showAllCosets);
        if (this.controls.distSelect) this.controls.distSelect.setValue(params.cosetDistribution || 'sequential');

        const seqType = params.sequencerType || 'Cyclic Additive Group Modulo N';
        const SequencerClass = SequencerRegistry[seqType];

        let k = 1;
        if (SequencerClass) {
            const seq = new SequencerClass();
            if (seq.getCosets) {
                const cosets = seq.getCosets(params.totalDivs, params);
                if (cosets) k = cosets.length;
            } else {
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
