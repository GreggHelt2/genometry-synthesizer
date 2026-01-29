import { Panel } from './Panel.js';
import { Accordion } from './Accordion.js';
import { createElement, $id } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd, getLinesToClose } from '../../engine/math/MathOps.js';
import { CurveRegistry } from '../../engine/math/curves/CurveRegistry.js';
import { RelativesFinder } from '../../engine/math/RelativesFinder.js';

export class ChordalRosettePanel extends Panel {
    constructor(id, title, roseId) {
        super(id, title);
        this.roseId = roseId; // 'rosetteA' or 'rosetteB'
        this.actionType = roseId === 'rosetteA' ? ACTIONS.UPDATE_ROSETTE_A : ACTIONS.UPDATE_ROSETTE_B;
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

        // Maurer Accordion (Sequencer)
        this.maurerAccordion = new Accordion('Chordal Sequencer: Additive Group', true);
        this.controlsContainer.appendChild(this.maurerAccordion.element);

        // Sequencer Type Selector
        this.createSequencerTypeSelector(this.maurerAccordion);

        // Modulo (Permanent)
        this.divsControl = this.createSlider('totalDivs', 1, 3600, 1, 'Modulo');
        this.maurerAccordion.append(this.divsControl.container);

        // Dynamic Sequencer Params Container
        this.sequencerParamsContainer = createElement('div', 'flex flex-col');
        this.maurerAccordion.append(this.sequencerParamsContainer);

        // --- Relatives Navigation ---
        const relativesAccordion = new Accordion('Relatives Navigation', true);
        this.relativesTypeSelect = createElement('select', 'w-full bg-gray-700 text-white p-1 rounded mb-2');

        ['Prime', 'Twin Prime', 'Cousin Prime', 'Lines To Close Matches'].forEach(type => {
            let val = type.toLowerCase();
            if (type === 'Lines To Close Matches') val = 'ltc';
            else if (type === 'Twin Prime') val = 'twin';
            else if (type === 'Cousin Prime') val = 'cousin';
            else if (type === 'Prime') val = 'prime';

            const opt = createElement('option', '', { value: val, textContent: type });
            this.relativesTypeSelect.appendChild(opt);
        });

        const relNavContainer = createElement('div', 'flex gap-2');

        ['Prev', 'Random', 'Next'].forEach(dir => {
            const btn = createElement('button', 'flex-1 bg-gray-600 hover:bg-gray-500 rounded px-2 py-1 text-sm', { textContent: dir });
            btn.addEventListener('click', () => this.handleRelativesNav(dir.toLowerCase()));
            relNavContainer.appendChild(btn);
        });

        relativesAccordion.append(this.relativesTypeSelect);
        relativesAccordion.append(relNavContainer);
        this.controlsContainer.appendChild(relativesAccordion.element);

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

        // Line Width
        this.lineWidthControl = this.createSlider('lineWidth', 0.1, 10, 0.1, 'Line Width');
        chordalVizAccordion.append(this.lineWidthControl.container);

        // Anti-aliasing
        this.antiAliasControl = this.createCheckbox('antiAlias', 'Anti-aliasing');
        chordalVizAccordion.append(this.antiAliasControl.container);

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

    createSequencerTypeSelector(containerAccordion) {
        const container = createElement('div', 'flex flex-col mb-2 p-2 relative');
        const label = createElement('label', 'text-sm text-gray-300 mb-1', { textContent: 'Sequence Generator' });

        const select = createElement('select', 'w-full bg-gray-700 text-white text-xs rounded border border-gray-600 px-1 py-1 cursor-pointer');

        Object.keys(SequencerRegistry).forEach(key => {
            const opt = createElement('option', '', { value: key, textContent: key });
            select.appendChild(opt);
        });

        select.addEventListener('change', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { sequencerType: e.target.value }
            });
            // Re-render params immediately might be handled by updateUI, but let's ensure cleanup
        });

        this.sequencerSelector = select;

        container.appendChild(label);
        container.appendChild(select);

        // Insert at top of accordion
        if (containerAccordion.content.firstChild) {
            containerAccordion.content.insertBefore(container, containerAccordion.content.firstChild);
        } else {
            containerAccordion.append(container);
        }
    }

    updateSequencerParams(state) {
        // Clear existing dynamic params
        this.sequencerParamsContainer.innerHTML = '';
        this.sequencerControls = {};

        const sequencerType = state[this.roseId].sequencerType || 'Cyclic Additive Group Modulo N';
        const SequencerClass = SequencerRegistry[sequencerType];

        if (!SequencerClass) return;

        // Instantiate temporarily to get schema (ideally schema is static, but pattern is instance method for now)
        const sequencerInstance = new SequencerClass();
        const schema = sequencerInstance.getParamsSchema();

        schema.forEach(param => {
            if (param.type === 'slider') {
                // Use existing createSlider helper
                // Map the param key to a top-level state key (assuming flat state for now as per plan)
                // Note: sliders expect 'stateKey' to dispatch payload { [key]: val }
                const control = this.createSlider(param.key, param.min, param.max, param.step, param.label);

                // Manually set value since createSlider inits to 0 and relies on updateUI loop
                // But updateUI loop might not have found this control yet if we just created it.
                // We will let the main updateUI loop handle value setting.

                this.sequencerControls[param.key] = control;
                this.sequencerParamsContainer.appendChild(control.container);
            }
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

        // Sequencer Type
        // Sequencer Type
        // Ensure selector matches state
        if (this.sequencerSelector.value !== (params.sequencerType || 'Cyclic Additive Group Modulo N')) {
            this.sequencerSelector.value = params.sequencerType || 'Cyclic Additive Group Modulo N';
        }

        // Check if we need to rebuild params
        const currentType = params.sequencerType || 'Cyclic Additive Group Modulo N';
        if (this.currentRenderedSequencerType !== currentType) {
            this.updateSequencerParams(state);
            this.currentRenderedSequencerType = currentType;
        } else if (!this.sequencerControls || Object.keys(this.sequencerControls).length === 0) {
            // Initial build or empty
            this.updateSequencerParams(state);
            this.currentRenderedSequencerType = currentType;
        }

        // Update Sequencer Accordion Title
        if (this.maurerAccordion) {
            this.maurerAccordion.setTitle(`Chordal Sequencer: ${params.sequencerType || 'Cyclic Additive Group Modulo N'}`);
        }

        // Modulo (Standard)
        if (document.activeElement !== this.divsControl.input) { // Changed from .slider to .input
            this.updateControl(this.divsControl, params.totalDivs);
        }

        // Update Dynamic Sequencer Controls
        if (this.sequencerControls) {
            Object.keys(this.sequencerControls).forEach(key => {
                const control = this.sequencerControls[key];
                if (document.activeElement !== control.input) { // Changed from .slider to .input
                    // Start checking in top-level params (flat structure)
                    // If undefined, maybe it's a default? The slider should handle it?
                    // The control creation set min/max/step.
                    const val = params[key];
                    if (val !== undefined) {
                        this.updateControl(control, val);
                    }
                }
            });
        }



        if (document.activeElement !== this.opacityControl.input) { // Changed from .slider to .input
            this.updateControl(this.opacityControl, params.opacity ?? 1);
        }
        if (this.lineWidthControl && document.activeElement !== this.lineWidthControl.input) {
            this.updateControl(this.lineWidthControl, params.lineWidth ?? 2);
        }
        if (this.antiAliasControl) {
            this.antiAliasControl.input.checked = params.antiAlias !== false; // Default true
        }
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
        // Determine k based on Sequencer
        let k;
        const currentSequencerType = params.sequencerType || 'Additive Group Modulo N';
        // Note: Default changed from Cyclic Additive... to Additive... in other files, 
        // ensure we use the same key or registry lookup handles it.
        // Registry keys: 'Additive Group Modulo N', 'Multiplicative Group Modulo N'

        const SequencerClass = SequencerRegistry[currentSequencerType];
        if (SequencerClass) {
            const seqInstance = new SequencerClass();
            if (seqInstance.getCosets) {
                const cosets = seqInstance.getCosets(params.totalDivs, params);
                if (cosets) {
                    k = cosets.length;
                }
            }
        }

        // Fallback for Additive or unknown
        if (!k) {
            k = gcd(params.step, params.totalDivs);
        }

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

        // Calculate Lines/Sequence Length based on Sequencer Type
        const currentSequencerType = params.sequencerType || 'Cyclic Additive Group Modulo N';
        let lines;
        let totalRosetteLines = 0;
        let distributionString = '';
        let isMultiplicative = false;

        // reused currentSequencerType from above
        if (currentSequencerType === 'Multiplicative Group Modulo N') {
            isMultiplicative = true;
            const SequencerClass = SequencerRegistry[currentSequencerType];
            if (SequencerClass) {
                const seqInstance = new SequencerClass();
                const cosets = seqInstance.getCosets(params.totalDivs, params);

                if (cosets && cosets.length > 0) {
                    // Calculate stats for ALL cosets to get distribution and total
                    const distribution = {};
                    cosets.forEach(seed => {
                        const seq = seqInstance.generate(params.totalDivs, seed, params);
                        // generate returns points. The number of chords (lines) is points.length - 1.
                        const len = seq.length > 0 ? seq.length - 1 : 0;
                        totalRosetteLines += len;
                        distribution[len] = (distribution[len] || 0) + 1;
                    });

                    // Format Distribution String
                    const sizes = Object.keys(distribution).map(Number).sort((a, b) => b - a);
                    if (sizes.length === 1) {
                        distributionString = `${sizes[0]}`;
                    } else {
                        distributionString = sizes.map(s => `${s} (${distribution[s]})`).join(', ');
                    }

                    // Use the user's selected coset index (clamped) for the simple "Lines" display
                    const index = Math.min(params.cosetIndex || 0, cosets.length - 1);
                    const sequence = seqInstance.generate(params.totalDivs, cosets[index], params);
                    lines = sequence.length > 0 ? sequence.length - 1 : 0;
                } else {
                    lines = 0;
                }
            } else {
                lines = 0;
            }
        } else {
            // Additive fallback
            lines = getLinesToClose(params.totalDivs, params.step);
            // For additive, all cosets are same size = lines.
            // Total = lines * k (number of cosets)
            totalRosetteLines = lines * k;
            distributionString = `${lines}`;
        }

        // Cycles Logic
        const cycles = radiansToClose / (2 * Math.PI);
        const cycleString = parseFloat(cycles.toFixed(3));

        // Cosets Shown Logic
        const cosetsShown = params.showAllCosets ? k : 1;

        // Determine Generator 'g' for Coprime Check
        let gForCoprime = null;
        // reused currentSequencerType from above
        if (currentSequencerType.includes('Multiplicative')) {
            gForCoprime = params.generator;
        } else if (currentSequencerType.includes('Additive')) {
            gForCoprime = params.step;
        }

        let coprimeString = '';
        if (gForCoprime !== undefined && gForCoprime !== null) {
            const isCoprime = gcd(params.totalDivs, gForCoprime) === 1;
            const colorClass = isCoprime ? 'text-green-400' : 'text-red-400';
            coprimeString = `<div><span class="text-gray-400">Coprime:</span> <span class="${colorClass}">${isCoprime ? 'True' : 'False'}</span></div>`;
        }

        let extraStats = '';
        if (isMultiplicative) {
            extraStats = `
                <div><span class="text-gray-400">Lines (Distribution):</span> <span class="text-blue-400">${distributionString}</span></div>
                <div><span class="text-gray-400">Total Lines:</span> <span class="text-blue-400">${totalRosetteLines}</span></div>
             `;
        }

        this.statsContent.innerHTML = `
            <div><span class="text-gray-400">Lines (Current):</span> <span class="text-blue-400">${lines}</span></div>
            ${extraStats}
            <div><span class="text-gray-400">Cycles to Close:</span> <span class="text-blue-400">${cycleString}</span></div>
            <div><span class="text-gray-400">Total Cosets:</span> <span class="text-blue-400">${k}</span></div>
            <div><span class="text-gray-400">Displayed Cosets:</span> <span class="text-blue-400">${cosetsShown}</span></div>
            ${coprimeString}
        `;
    }

    updateControl(control, value) {
        control.valueDisplay.textContent = value;
        if (document.activeElement !== control.input) {
            control.input.value = value;
        }
    }
    handleRelativesNav(direction) {
        const type = this.relativesTypeSelect.value;
        // Access state directly or via params being passed around?
        // updateUI sets 'this.state' usually? No, updateUI takes state arg.
        // We can access 'store.getState()[this.roseId]'
        const state = store.getState()[this.roseId];
        const currentGen = state.step; // 'Generator' slider maps to 'step' in params
        const totalDivs = state.totalDivs; // Modulo

        const newVal = RelativesFinder.findRelative(currentGen, type, direction, totalDivs);

        if (newVal !== null && newVal !== currentGen) {
            store.dispatch({
                type: this.actionType,
                payload: { step: newVal }
            });
            // Control update will happen via updateUI subscription
        }
    }
}
