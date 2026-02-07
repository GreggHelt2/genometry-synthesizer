import { Accordion } from '../Accordion.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { createElement } from '../../utils/dom.js';
import { store } from '../../../engine/state/Store.js';
import { ACTIONS } from '../../../engine/state/Actions.js';
import { SequencerRegistry } from '../../../engine/math/sequencers/SequencerRegistry.js';
import { gcd, lcm } from '../../../engine/math/MathOps.js';
import { generateChordalPolyline } from '../../../engine/math/chordal_rosette.js';
import { CurveRegistry } from '../../../engine/math/curves/CurveRegistry.js';

export class HybridCosetSection {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;

        this.accordion = new Accordion('Coset Visualization', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) {
                this.orchestrator.handleAccordionToggle(isOpen, id);
            }
        }, 'hybrid-coset');

        this.orchestrator.accordions.set('hybrid-coset', this.accordion);
        this.element = this.accordion.element;

        this.render();
    }

    render() {
        // Info text
        this.cosetInfo = createElement('div', 'text-xs text-gray-400 mb-2 p-1', { textContent: 'Cosets Match (k): -' });
        this.accordion.append(this.cosetInfo);

        // LCM Match Toggle
        this.lcmMatchCheck = new ParamToggle({
            key: 'matchCosetsByLCM',
            label: 'Match Cosets by LCM',
            value: false,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { matchCosetsByLCM: val }
                });
            }
        });
        this.accordion.append(this.lcmMatchCheck.getElement());

        // Coset Count
        this.cosetCountControl = this.createSlider('cosetCount', 1, 1, 1, 'Cosets to Show');
        this.accordion.append(this.cosetCountControl.container);

        // Coset Index
        this.cosetIndexControl = this.createSlider('cosetIndex', 0, 1, 1, 'Starting Coset Index');
        this.accordion.append(this.cosetIndexControl.container);

        // Distribution
        const distOptions = [
            { value: 'sequential', label: 'Sequential' },
            { value: 'distributed', label: 'Distributed' },
            { value: 'two-way', label: 'Two-Way' }
        ];

        this.distSelect = new ParamSelect({
            key: 'cosetDistribution',
            label: 'Distribution',
            options: distOptions,
            value: 'sequential',
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { cosetDistribution: val }
                });
            }
        });
        this.accordion.append(this.distSelect.getElement());
    }

    createSlider(key, min, max, step, label) {
        const paramGui = new ParamNumber({
            key,
            label,
            min,
            max,
            step,
            value: 0,
            onChange: (val) => {
                store.dispatch({
                    type: ACTIONS.UPDATE_HYBRID,
                    payload: { [key]: val }
                });
            }
        });

        // Register with orchestrator for persistence/animation if needed
        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(paramGui);
        }

        return {
            container: paramGui.getElement(),
            instance: paramGui
        };
    }

    update(state) {
        const hybridParams = state.hybrid;

        // --- Hybrid Coset Logic ---
        const getK = (params) => {
            const seqType = params.sequencerType || 'Additive Group Modulo N';
            const SequencerClass = SequencerRegistry[seqType];
            if (SequencerClass) {
                const seq = new SequencerClass();
                if (seq.getCosets) {
                    const c = seq.getCosets(params.totalDivs, params);
                    if (c) return c.length;
                }
            }
            return gcd(params.step, params.totalDivs);
        };

        const kA = getK(state.rosetteA);
        const kB = getK(state.rosetteB);
        const useLCM = hybridParams.matchCosetsByLCM;
        const ringsLCM = lcm(kA, kB);
        const isMatching = (kA === kB && kA > 1);
        const isLCMMatching = (useLCM && ringsLCM > 1 && (kA > 1 || kB > 1));

        this.lcmMatchCheck.setValue(useLCM);

        let effectiveK = 1;

        if (isMatching) {
            effectiveK = kA;
            this.cosetInfo.textContent = `Cosets Match (k): ${kA}`;
        } else if (isLCMMatching) {
            effectiveK = ringsLCM;
            this.cosetInfo.textContent = `Counts: A=${kA}, B=${kB} [LCM=${effectiveK}]`;
        } else if (kA > 1 || kB > 1) {
            this.cosetInfo.textContent = `Mismatch: A=${kA}, B=${kB} (Single Ring Mode)`;
            effectiveK = 1;
        } else {
            this.cosetInfo.textContent = `Cosets (k): 1`;
            effectiveK = 1;
        }

        // --- Enable/Disable Controls ---
        const enableMultiControls = (isMatching || isLCMMatching);
        const enableIndexControl = (kA > 1 || kB > 1);

        this.cosetCountControl.container.style.opacity = enableMultiControls ? '1' : '0.5';
        this.cosetCountControl.instance.slider.disabled = !enableMultiControls; // Access slider directly

        this.distSelect.setDisabled(!enableMultiControls);
        this.distSelect.getElement().style.opacity = enableMultiControls ? '1' : '0.5';

        this.cosetIndexControl.container.style.opacity = enableIndexControl ? '1' : '0.5';
        this.cosetIndexControl.instance.slider.disabled = !enableIndexControl;

        // Update Max Ranges & Values
        if (this.cosetCountControl) {
            this.cosetCountControl.instance.setMax(effectiveK);
            this.cosetCountControl.instance.setValue(Math.min(hybridParams.cosetCount || 1, effectiveK));
        }

        const indexMax = (enableMultiControls) ? effectiveK : Math.max(kA, kB);
        if (this.cosetIndexControl) {
            this.cosetIndexControl.instance.setMax(Math.max(1, indexMax - 1));
            this.cosetIndexControl.instance.setValue((hybridParams.cosetIndex || 0) % (indexMax || 1));
        }

        if (this.distSelect) {
            this.distSelect.setValue(hybridParams.cosetDistribution || 'sequential');
        }


    }


}
