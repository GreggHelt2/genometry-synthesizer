import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamColor } from '../ParamColor.js';
import { ParamSelect } from '../ParamSelect.js';
import { createElement } from '../../utils/dom.js';
import { store } from '../../../engine/state/Store.js';
import { dispatchDeep, flattenRoseParams } from '../../../engine/state/stateAdapters.js';
import { findCoincidentIndices, getCoincidenceCount } from '../../../engine/math/CoincidentIndices.js';

const ADDITIVE_SEQ_TYPE = 'Cyclic Additive Group Modulo N';

export class HybridCoincidentSection {
    constructor(orchestrator) {
        this.orchestrator = orchestrator;

        this.accordion = new Accordion('Coincident Indices', false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) {
                this.orchestrator.handleAccordionToggle(isOpen, id);
            }
        }, 'hybrid-coincident');

        // Eye toggle for quick show/hide
        this.eyeToggleControl = this.accordion.addEyeToggle(false, (visible) => {
            dispatchDeep('showCoincidentIndices', visible, 'hybrid');
        });

        this.orchestrator.accordions.set('hybrid-coincident', this.accordion);
        this.element = this.accordion.element;

        this.render();
    }

    render() {
        // Info readout
        this.infoDiv = createElement('div', 'text-xs text-gray-400 mb-2 p-1', {
            textContent: 'Coincident Indices: —'
        });
        this.accordion.append(this.infoDiv);

        // Indices list
        this.indicesDiv = createElement('div', 'text-xs text-gray-500 mb-2 p-1', {
            textContent: ''
        });
        this.indicesDiv.style.fontFamily = 'monospace';
        this.indicesDiv.style.maxHeight = '60px';
        this.indicesDiv.style.overflowY = 'auto';
        this.accordion.append(this.indicesDiv);

        // Point Size slider
        this.pointSizeControl = new ParamNumber({
            key: 'coincidentPointSize',
            label: 'Point Size',
            min: 1,
            max: 20,
            step: 1,
            value: 6,
            onChange: (val) => dispatchDeep('coincidentPointSize', val, 'hybrid')
        });
        this.accordion.append(this.pointSizeControl.getElement());
        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(this.pointSizeControl);
        }

        // Color picker
        this.colorControl = new ParamColor({
            key: 'coincidentColor',
            label: 'Color',
            value: '#FFD700',
            onChange: (val) => dispatchDeep('coincidentColor', val, 'hybrid')
        });
        this.accordion.append(this.colorControl.getElement());

        // Opacity slider
        this.opacityControl = new ParamNumber({
            key: 'coincidentOpacity',
            label: 'Opacity',
            min: 0,
            max: 1,
            step: 0.05,
            value: 1.0,
            onChange: (val) => dispatchDeep('coincidentOpacity', val, 'hybrid')
        });
        this.accordion.append(this.opacityControl.getElement());
        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(this.opacityControl);
        }

        // Shape selector
        this.shapeSelect = new ParamSelect({
            key: 'coincidentShape',
            label: 'Shape',
            options: [
                { value: 'circle', label: 'Circle' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'square', label: 'Square' }
            ],
            value: 'circle',
            onChange: (val) => dispatchDeep('coincidentShape', val, 'hybrid')
        });
        this.accordion.append(this.shapeSelect.getElement());
    }

    update(flatHybrid) {
        const state = store.getState();
        const flatA = flattenRoseParams(state.rosetteA);
        const flatB = flattenRoseParams(state.rosetteB);

        const seqTypeA = flatA.sequencerType || '';
        const seqTypeB = flatB.sequencerType || '';
        const bothAdditive = (seqTypeA === ADDITIVE_SEQ_TYPE && seqTypeB === ADDITIVE_SEQ_TYPE);

        // Update eye toggle state
        if (this.eyeToggleControl) {
            this.eyeToggleControl.setActive(flatHybrid.showCoincidentIndices);
        }

        // Gray out if not both additive
        this.accordion.element.style.opacity = bothAdditive ? '1' : '0.5';

        if (!bothAdditive) {
            this.infoDiv.textContent = 'Requires both rosettes to use Additive Group sequencer';
            this.indicesDiv.textContent = '';
            return;
        }

        const nA = flatA.totalDivs || 360;
        const nB = flatB.totalDivs || 360;

        if (nA !== nB) {
            this.infoDiv.textContent = `Different moduli (n=${nA} vs n=${nB}) — not directly comparable`;
            this.indicesDiv.textContent = '';
            return;
        }

        const n = nA;
        const gA = flatA.step || 1;
        const gB = flatB.step || 1;
        const startA = flatA.cosetIndex || 0;
        const startB = flatB.cosetIndex || 0;

        const count = getCoincidenceCount(n, gA, gB, startA, startB);
        const indices = findCoincidentIndices(n, gA, gB, startA, startB);

        this.infoDiv.textContent = `Coincident Indices: ${count} (n=${n}, gA=${gA}, gB=${gB})`;

        if (indices.length > 0 && indices.length <= 50) {
            this.indicesDiv.textContent = `{${indices.join(', ')}}`;
        } else if (indices.length > 50) {
            this.indicesDiv.textContent = `{${indices.slice(0, 50).join(', ')}, … (${indices.length} total)}`;
        } else {
            this.indicesDiv.textContent = 'None';
        }

        // Update control values
        this.pointSizeControl.setValue(flatHybrid.coincidentPointSize ?? 6);
        this.colorControl.setValue(flatHybrid.coincidentColor ?? '#FFD700');
        this.opacityControl.setValue(flatHybrid.coincidentOpacity ?? 1.0);
        this.shapeSelect.setValue(flatHybrid.coincidentShape ?? 'circle');
    }
}
