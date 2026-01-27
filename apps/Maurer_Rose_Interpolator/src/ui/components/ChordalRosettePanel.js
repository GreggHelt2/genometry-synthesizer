import { Panel } from './Panel.js';
import { Accordion } from './Accordion.js';
import { createElement, $id } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { gcd, getLinesToClose } from '../../engine/math/MathOps.js';
import { CurveRegistry } from '../../engine/math/curves/CurveRegistry.js';

export class ChordalRosettePanel extends Panel {
    constructor(id, title, roseId) {
        super(id, title);
        this.roseId = roseId; // 'roseA' or 'roseB'
        this.actionType = roseId === 'roseA' ? ACTIONS.UPDATE_ROSE_A : ACTIONS.UPDATE_ROSE_B;
        this.renderContent();

        // Subscribe to store updates
        store.subscribe(this.updateUI.bind(this));

        // Initial UI update
        this.updateUI(store.getState());
    }

    renderContent() {
        const title = createElement('h2', 'text-xl font-bold p-4 text-center', { textContent: this.title });
        this.element.appendChild(title);

        // Preview Canvas
        const canvasContainer = createElement('div', 'w-full aspect-square bg-black border-b border-gray-700 relative');
        this.canvas = createElement('canvas', 'w-full h-full block');
        this.canvas.width = 320;
        this.canvas.height = 320;

        canvasContainer.appendChild(this.canvas);
        this.element.appendChild(canvasContainer);

        // Scrollable Controls Container
        this.controlsContainer = createElement('div', 'flex-1 overflow-y-auto w-full');
        this.element.appendChild(this.controlsContainer);

        // Info Accordion (New)
        const statsAccordion = new Accordion('Info', false);
        this.statsContent = createElement('div', 'p-2 text-xs text-gray-300 font-mono flex flex-col gap-1');
        statsAccordion.append(this.statsContent);
        this.controlsContainer.appendChild(statsAccordion.element);

        // Core Parameters Accordion
        this.coreAccordion = new Accordion('Base Curve', true);
        this.controlsContainer.appendChild(this.coreAccordion.element);

        // Curve Type Selector
        this.createCurveTypeSelector(this.coreAccordion);

        // Placeholder for dynamic controls
        this.dynamicParamsContainer = createElement('div', 'flex flex-col');
        this.coreAccordion.append(this.dynamicParamsContainer);

        // Maurer Accordion
        const maurerAccordion = new Accordion('Sequencer: Cyclic Additive Group Z+', true);
        this.controlsContainer.appendChild(maurerAccordion.element);

        this.divsControl = this.createSlider('totalDivs', 1, 3600, 1, 'Modulo');
        this.stepControl = this.createSlider('step', 1, 360, 1, 'Generator');

        maurerAccordion.append(this.divsControl.container);
        maurerAccordion.append(this.stepControl.container);

        // Chordal Line Viz Accordion
        const chordalVizAccordion = new Accordion('Chordal Line Viz', true);
        this.controlsContainer.appendChild(chordalVizAccordion.element);

        // Opacity Control
        this.opacityControl = this.createSlider('opacity', 0, 1, 0.01, 'Opacity');

        // Color Control
        const colorContainer = createElement('div', 'flex flex-col mb-2 p-2');
        const colorLabel = createElement('label', 'text-sm text-gray-300 mb-1', { textContent: 'Rose Color & Method' });
        const colorRow = createElement('div', 'flex gap-2');

        this.colorInput = createElement('input', 'w-8 h-8 rounded cursor-pointer border-0', { type: 'color' });
        this.colorInput.addEventListener('input', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { color: e.target.value }
            });
        });

        this.methodSelect = createElement('select', 'flex-1 bg-gray-700 text-white text-xs rounded border border-gray-600 px-1');
        ['solid', 'length', 'angle', 'sequence'].forEach(m => {
            const opt = createElement('option', '', { value: m, textContent: m.charAt(0).toUpperCase() + m.slice(1) });
            this.methodSelect.appendChild(opt);
        });
        this.methodSelect.addEventListener('change', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { colorMethod: e.target.value }
            });
        });

        colorRow.appendChild(this.colorInput);
        colorRow.appendChild(this.methodSelect);
        colorContainer.appendChild(colorLabel);
        colorContainer.appendChild(colorRow);

        // Blend Mode
        const blendLabel = createElement('label', 'text-sm text-gray-300 mb-1 mt-2', { textContent: 'Blend Mode' });
        this.blendSelect = createElement('select', 'w-full bg-gray-700 text-white text-xs rounded border border-gray-600 px-1 py-1');
        const blendModes = [
            { value: 'source-over', label: 'Normal' },
            { value: 'lighter', label: 'Lighter (Add)' },
            { value: 'multiply', label: 'Multiply' },
            { value: 'screen', label: 'Screen' },
            { value: 'overlay', label: 'Overlay' },
            { value: 'darken', label: 'Darken' },
            { value: 'lighten', label: 'Lighten' },
            { value: 'color-dodge', label: 'Color Dodge' },
            { value: 'color-burn', label: 'Color Burn' },
            { value: 'hard-light', label: 'Hard Light' },
            { value: 'soft-light', label: 'Soft Light' },
            { value: 'difference', label: 'Difference' },
            { value: 'exclusion', label: 'Exclusion' },
            { value: 'hue', label: 'Hue' },
            { value: 'saturation', label: 'Saturation' },
            { value: 'color', label: 'Color' },
            { value: 'luminosity', label: 'Luminosity' }
        ];
        blendModes.forEach(m => {
            const opt = createElement('option', '', { value: m.value, textContent: m.label });
            this.blendSelect.appendChild(opt);
        });
        this.blendSelect.addEventListener('change', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { blendMode: e.target.value }
            });
        });
        colorContainer.appendChild(blendLabel);
        colorContainer.appendChild(this.blendSelect);

        chordalVizAccordion.append(colorContainer);
        chordalVizAccordion.append(this.opacityControl.container);

        // Coset Info (Keep the check, but maybe redundant if we have stats?)
        // User asked for specific stats dropdown.
        const cosetContainer = createElement('div', 'p-2 border-t border-gray-700 bg-gray-800');
        this.cosetInfo = createElement('div', 'text-xs text-gray-400 mb-2', { textContent: 'Cosets (k): 1' });
        this.showAllCheck = this.createCheckbox('showAllCosets', 'Show All Cosets');

        this.cosetIndexControl = this.createSlider('cosetIndex', 0, 1, 1, 'Coset Index');
        this.cosetIndexControl.container.style.display = 'none'; // Hide by default

        cosetContainer.appendChild(this.cosetInfo);
        cosetContainer.appendChild(this.showAllCheck.container);
        cosetContainer.appendChild(this.cosetIndexControl.container);

        this.controlsContainer.appendChild(cosetContainer);
    }

    createCurveTypeSelector(parent) {
        const container = createElement('div', 'flex flex-col mb-3 p-2 border-b border-gray-700');
        const label = createElement('label', 'text-xs text-gray-400 mb-1', { textContent: 'Curve Type' });
        const select = createElement('select', 'bg-gray-700 text-white text-sm rounded border border-gray-600 px-2 py-1', {});

        Object.keys(CurveRegistry).forEach(type => {
            const opt = createElement('option', '', { value: type, textContent: type });
            select.appendChild(opt);
        });

        select.addEventListener('change', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { curveType: e.target.value }
            });
        });

        this.curveTypeSelect = select;
        container.appendChild(label);
        container.appendChild(select);
        parent.append(container);
    }

    renderCoreParams(curveType, params) {
        this.dynamicParamsContainer.innerHTML = '';
        this.paramControls = {};

        const CurveClass = CurveRegistry[curveType] || CurveRegistry['Rhodonea'];
        const schema = CurveClass.getParamsSchema();

        schema.forEach(item => {
            const control = this.createSlider(item.key, item.min, item.max, item.step, item.label);
            this.paramControls[item.key] = control;
            this.dynamicParamsContainer.appendChild(control.container);

            const val = params[item.key] ?? item.default;
            this.updateControl(control, val);
        });
    }

    createCheckbox(key, label) {
        const container = createElement('div', 'flex items-center mb-2');
        const input = createElement('input', 'mr-2', { type: 'checkbox' });
        const labelEl = createElement('label', 'text-sm text-gray-300', { textContent: label });

        input.addEventListener('change', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { [key]: e.target.checked }
            });
        });

        container.appendChild(input);
        container.appendChild(labelEl);
        return { container, input };
    }

    createColorInput(key, label) {
        const container = createElement('div', 'flex items-center justify-between mb-2 p-2');
        const labelEl = createElement('label', 'text-sm text-gray-300', { textContent: label });
        const input = createElement('input', 'w-8 h-8 rounded cursor-pointer border-0', { type: 'color' });

        input.addEventListener('input', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { [key]: e.target.value }
            });
        });

        container.appendChild(labelEl);
        container.appendChild(input);
        return { container, input };
    }

    createSlider(key, min, max, step, label) {
        const container = createElement('div', 'flex flex-col mb-3');
        const header = createElement('div', 'flex justify-between mb-1');
        const labelEl = createElement('label', 'text-xs text-gray-400', { textContent: label });
        const valueDisplay = createElement('span', 'text-xs text-blue-400 font-mono', { textContent: '0' });

        header.appendChild(labelEl);
        header.appendChild(valueDisplay);

        const input = createElement('input', 'w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer', {
            type: 'range',
            min, max, step
        });

        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valueDisplay.textContent = val;
            store.dispatch({
                type: this.actionType,
                payload: { [key]: val }
            });
        });

        container.appendChild(header);
        container.appendChild(input);

        return { container, input, valueDisplay };
    }

    updateUI(state) {
        const params = state[this.roseId];

        // Update Curve Type Selector
        if (this.curveTypeSelect && this.curveTypeSelect.value !== params.curveType) {
            this.curveTypeSelect.value = params.curveType || 'Rhodonea';
        }

        // Update Accordion Title
        if (this.coreAccordion) {
            this.coreAccordion.setTitle(`Base Curve: ${params.curveType || 'Rhodonea'}`);
        }



        // Re-render params if needed
        if (this.currentRenderedCurveType !== params.curveType) {
            this.renderCoreParams(params.curveType || 'Rhodonea', params);
            this.currentRenderedCurveType = params.curveType || 'Rhodonea';
        }

        // Update Dynamic Controls
        if (this.paramControls) {
            Object.keys(this.paramControls).forEach(key => {
                const control = this.paramControls[key];
                const val = params[key];
                if (val !== undefined) {
                    this.updateControl(control, val);
                }
            });
        }

        this.updateControl(this.divsControl, params.totalDivs);
        this.updateControl(this.stepControl, params.step);
        this.updateControl(this.opacityControl, params.opacity ?? 1);

        if (this.colorInput.value !== params.color) {
            this.colorInput.value = params.color;
        }
        if (this.methodSelect.value !== params.colorMethod) {
            this.methodSelect.value = params.colorMethod || 'solid';
        }
        if (this.blendSelect.value !== params.blendMode) {
            this.blendSelect.value = params.blendMode || 'source-over';
        }

        // Coset Logic
        const k = gcd(params.step, params.totalDivs);
        this.cosetInfo.textContent = `Cosets (k): ${k}`;

        if (k > 1) {
            this.showAllCheck.container.style.display = 'flex';
            this.showAllCheck.input.checked = params.showAllCosets;

            if (!params.showAllCosets) {
                this.cosetIndexControl.container.style.display = 'flex';
                this.cosetIndexControl.input.max = k - 1;
                this.updateControl(this.cosetIndexControl, params.cosetIndex);
            } else {
                this.cosetIndexControl.container.style.display = 'none';
            }
        } else {
            this.showAllCheck.container.style.display = 'none';
            this.cosetIndexControl.container.style.display = 'none';
        }

        // Update Stats
        this.updateStats(params, k);
    }

    updateStats(params, k) {
        if (!this.statsContent) return;

        // Instantiate temporary curve to get radiansToClosure
        const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];

        // Renderer logic to create curve instance
        let curve;
        if (params.curveType === 'Rhodonea' || !params.curveType) {
            curve = new CurveClass(
                params.n, params.d, params.A, params.c, (params.rot * Math.PI) / 180
            );
        } else {
            curve = new CurveClass(params);
        }

        const radiansToClose = curve.getRadiansToClosure();
        const lines = getLinesToClose(params.totalDivs, params.step);

        // Cycles Logic
        const cycles = radiansToClose / (2 * Math.PI);
        const cycleString = parseFloat(cycles.toFixed(3));

        // Cosets Shown Logic
        const cosetsShown = params.showAllCosets ? k : 1;

        this.statsContent.innerHTML = `
            <div><span class="text-gray-400">Lines to Close:</span> <span class="text-blue-400">${lines}</span></div>
            <div><span class="text-gray-400">Cycles to Close:</span> <span class="text-blue-400">${cycleString}</span></div>
            <div><span class="text-gray-400">Total Cosets:</span> <span class="text-blue-400">${k}</span></div>
            <div><span class="text-gray-400">Displayed Cosets:</span> <span class="text-blue-400">${cosetsShown}</span></div>
        `;
    }

    updateControl(control, value) {
        control.valueDisplay.textContent = value;
        if (document.activeElement !== control.input) {
            control.input.value = value;
        }
    }
}
