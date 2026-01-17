import { Panel } from './Panel.js';
import { Accordion } from './Accordion.js';
import { createElement, $id } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { gcd } from '../../engine/math/lcm.js'; // Import GCD helper

export class RosePanel extends Panel {
    constructor(id, title, roseId) {
        super(id, title);
        this.roseId = roseId; // 'roseA' or 'roseB'
        this.actionType = roseId === 'roseA' ? ACTIONS.UPDATE_ROSE_A : ACTIONS.UPDATE_ROSE_B;
        this.renderContent();

        // Subscribe to store updates
        store.subscribe(this.updateUI.bind(this));
    }

    renderContent() {
        const title = createElement('h2', 'text-xl font-bold p-4 text-center', { textContent: this.title });
        this.element.appendChild(title);

        // Preview Canvas
        const canvasContainer = createElement('div', 'w-full aspect-square bg-black border-b border-gray-700 relative');
        this.canvas = createElement('canvas', 'w-full h-full block');
        // We must set width/height attributes for the canvas to render correctly, not just CSS
        // This will be handled by the Renderer's resize, but we need initial attributes.
        this.canvas.width = 320;
        this.canvas.height = 320;

        canvasContainer.appendChild(this.canvas);
        canvasContainer.appendChild(this.canvas);
        this.element.appendChild(canvasContainer);

        // Scrollable Controls Container
        this.controlsContainer = createElement('div', 'flex-1 overflow-y-auto w-full');
        this.element.appendChild(this.controlsContainer);

        // Core Parameters Accordion
        const coreAccordion = new Accordion('Core Parameters', true);
        this.controlsContainer.appendChild(coreAccordion.element);

        // Controls
        this.nControl = this.createSlider('n', 0, 100, 1, 'n (Numerator)');
        this.dControl = this.createSlider('d', 1, 100, 1, 'd (Denominator)');
        this.AControl = this.createSlider('A', 10, 300, 1, 'Amplitude (A)');
        this.cControl = this.createSlider('c', 0, 200, 1, 'Offset (c)');
        this.rotControl = this.createSlider('rot', 0, 360, 1, 'Rotation (deg)');

        coreAccordion.append(this.nControl.container);
        coreAccordion.append(this.dControl.container);
        coreAccordion.append(this.AControl.container);
        coreAccordion.append(this.cControl.container);
        coreAccordion.append(this.rotControl.container);

        // Maurer Accordion
        const maurerAccordion = new Accordion('Maurer Settings', true);
        this.controlsContainer.appendChild(maurerAccordion.element);

        this.divsControl = this.createSlider('totalDivs', 1, 3600, 1, 'Total Divisions');
        this.stepControl = this.createSlider('step', 1, 360, 1, 'Step (D)');

        maurerAccordion.append(this.divsControl.container);
        maurerAccordion.append(this.stepControl.container);

        // Color Control
        this.colorControl = this.createColorInput('color', 'Rose Color');
        maurerAccordion.append(this.colorControl.container);

        // Coset Controls
        const cosetContainer = createElement('div', 'p-2 border-t border-gray-700 bg-gray-800');
        this.cosetInfo = createElement('div', 'text-xs text-gray-400 mb-2', { textContent: 'Cosets (k): 1' });
        this.showAllCheck = this.createCheckbox('showAllCosets', 'Show All Cosets');

        this.cosetIndexControl = this.createSlider('cosetIndex', 0, 1, 1, 'Coset Index');
        this.cosetIndexControl.container.style.display = 'none'; // Hide by default

        cosetContainer.appendChild(this.cosetInfo);
        cosetContainer.appendChild(this.showAllCheck.container);
        cosetContainer.appendChild(this.cosetIndexControl.container);

        cosetContainer.appendChild(this.cosetIndexControl.container);

        this.controlsContainer.appendChild(cosetContainer);
        this.createCheckbox = this.createCheckbox.bind(this);
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
        // Only update if document.activeElement is NOT the input (prevention of jitter)
        // Or just update valueDisplay?
        // For simplicity, we update inputs if not focused.

        this.updateControl(this.nControl, params.n);
        this.updateControl(this.dControl, params.d);
        this.updateControl(this.AControl, params.A);
        this.updateControl(this.cControl, params.c);
        this.updateControl(this.rotControl, params.rot);
        this.updateControl(this.divsControl, params.totalDivs);
        this.updateControl(this.stepControl, params.step);

        if (this.colorControl.input.value !== params.color) {
            this.colorControl.input.value = params.color;
        }

        // Coset Logic
        const k = gcd(params.step, params.totalDivs);
        this.cosetInfo.textContent = `Cosets (k): ${k}`;

        // Only show coset controls if k > 1
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
    }

    updateControl(control, value) {
        control.valueDisplay.textContent = value;
        if (document.activeElement !== control.input) {
            control.input.value = value;
        }
    }
}
