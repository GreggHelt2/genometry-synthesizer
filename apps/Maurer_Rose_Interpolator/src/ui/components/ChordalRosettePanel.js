import { Panel } from './Panel.js';
import { Accordion } from './Accordion.js';
import { createElement, $id } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';
import { SequencerRegistry } from '../../engine/math/sequencers/SequencerRegistry.js';
import { gcd, getLinesToClose } from '../../engine/math/MathOps.js';
import { CurveRegistry } from '../../engine/math/curves/CurveRegistry.js';
import { RelativesFinder } from '../../engine/math/RelativesFinder.js';
import { ParamGui } from './ParamGui.js';

export class ChordalRosettePanel extends Panel {
    constructor(id, title, roseId) {
        super(id, title);
        this.roseId = roseId; // 'rosetteA' or 'rosetteB'
        this.actionType = roseId === 'rosetteA' ? ACTIONS.UPDATE_ROSETTE_A : ACTIONS.UPDATE_ROSETTE_B;
        this.renderContent();

        // Subscribe to store updates
        store.subscribe(this.updateUI.bind(this));

        // Subscribe to LinkManager updates
        import('../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            this.linkManager = linkManager;
            linkManager.subscribe(this.updateLinkVisuals.bind(this));
        });

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
        this.maurerAccordion = new Accordion('Chordal Sequencer: Additive Group', true, (isOpen) => {
            if (isOpen) requestAnimationFrame(() => this.alignLabels(this.maurerAccordion.content));
        });
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

        relativesAccordion.append(relTypeContainer);
        relativesAccordion.append(relNavContainer);
        this.controlsContainer.appendChild(relativesAccordion.element);

        // Chordal Line Viz Accordion
        const chordalVizAccordion = new Accordion('Chordal Line Viz', true, (isOpen) => {
            if (isOpen) requestAnimationFrame(() => this.alignLabels(chordalVizAccordion.content));
        });
        this.controlsContainer.appendChild(chordalVizAccordion.element);

        // Opacity Control
        this.opacityControl = this.createSlider('opacity', 0, 1, 0.01, 'Opacity');

        // Color Control
        const colorContainer = createElement('div', 'flex flex-col mb-2 p-2');

        // Row 1: Method
        const methodRow = createElement('div', 'flex items-center justify-between mb-2');
        const methodLabel = createElement('label', 'text-sm text-gray-300 mr-2', { textContent: 'Rosette Coloring Method' });

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

        methodRow.appendChild(methodLabel);
        methodRow.appendChild(this.methodSelect);
        colorContainer.appendChild(methodRow);

        // Row 2: Colors
        const colorRow = createElement('div', 'flex items-center justify-between');
        const colorLabel = createElement('label', 'text-sm text-gray-300 mr-2', { textContent: 'Colors' });

        this.colorInput = createElement('input', 'w-8 h-8 rounded cursor-pointer border-0', { type: 'color' });
        this.colorInput.addEventListener('input', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { color: e.target.value }
            });
        });

        colorRow.appendChild(colorLabel);
        colorRow.appendChild(this.colorInput);
        colorContainer.appendChild(colorRow);

        // Blend Mode
        const blendContainer = createElement('div', 'flex items-center justify-between mt-2');
        const blendLabel = createElement('label', 'text-sm text-gray-300 mr-2', { textContent: 'Blend Mode' });
        this.blendSelect = createElement('select', 'bg-gray-700 text-white text-xs rounded border border-gray-600 px-1 py-1 flex-1');
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
        blendContainer.appendChild(blendLabel);
        blendContainer.appendChild(this.blendSelect);
        colorContainer.appendChild(blendContainer);

        chordalVizAccordion.append(colorContainer);

        // Line Width
        this.lineWidthControl = this.createSlider('lineWidth', 0.1, 10, 0.1, 'Line Width');
        chordalVizAccordion.append(this.lineWidthControl.container);

        // Anti-aliasing
        this.antiAliasControl = this.createCheckbox('antiAlias', 'Anti-aliasing');
        chordalVizAccordion.append(this.antiAliasControl.container);

        chordalVizAccordion.append(this.opacityControl.container);

        // Coset Visualization Accordion
        const cosetAccordion = new Accordion('Coset Visualization', false, (isOpen) => {
            if (isOpen) requestAnimationFrame(() => this.alignLabels(cosetAccordion.content));
        }); // Default closed? Or true?
        this.controlsContainer.appendChild(cosetAccordion.element);

        this.cosetInfo = createElement('div', 'text-xs text-gray-400 mb-2 p-1', { textContent: 'Cosets (k): 1' });
        cosetAccordion.append(this.cosetInfo);

        // Show All Cosets Toggle
        this.showAllCosetsControl = this.createCheckbox('showAllCosets', 'Show All Cosets');
        cosetAccordion.append(this.showAllCosetsControl.container);

        // Coset Count Slider
        this.cosetCountControl = this.createSlider('cosetCount', 1, 1, 1, 'Cosets to Show');

        // Disable slider if showAllCosets is on
        // We'll handle visual disabling in updateUI, but initial set here/updateUI call
        cosetAccordion.append(this.cosetCountControl.container);

        // Coset Index (Start Offset)
        this.cosetIndexControl = this.createSlider('cosetIndex', 0, 1, 1, 'Starting Coset Index');
        cosetAccordion.append(this.cosetIndexControl.container);

        // Distribution Dropdown
        const distContainer = createElement('div', 'flex items-center justify-between mb-2');
        const distLabel = createElement('label', 'text-xs text-gray-400 mr-2', { textContent: 'Distribution' });
        this.distSelect = createElement('select', 'bg-gray-700 text-white text-xs rounded border border-gray-600 px-1 py-1 flex-1');

        ['Sequential', 'Distributed', 'Two-Way'].forEach(m => {
            const val = m.toLowerCase();
            const opt = createElement('option', '', { value: val, textContent: m });
            this.distSelect.appendChild(opt);
        });

        this.distSelect.addEventListener('change', (e) => {
            store.dispatch({
                type: this.actionType,
                payload: { cosetDistribution: e.target.value }
            });
        });

        distContainer.appendChild(distLabel);
        distContainer.appendChild(this.distSelect);
        cosetAccordion.append(distContainer);

        // Align labels for static accordions if they have sliders
        // Use requestAnimationFrame to ensure DOM is rendered and layout is calculated
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.alignLabels(this.maurerAccordion.content);
                this.alignLabels(chordalVizAccordion.content);
                this.alignLabels(cosetAccordion.content);
            });
        });
    }

    createCurveTypeSelector(parent) {
        const container = createElement('div', 'flex items-center justify-between mb-3 p-2 border-b border-gray-700');
        const label = createElement('label', 'text-xs text-gray-400 mr-2', { textContent: 'Curve Type' });
        const select = createElement('select', 'bg-gray-700 text-white text-sm rounded border border-gray-600 px-2 py-1 flex-1', {});

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
        // Cleanup old controls
        if (this.paramControls) {
            Object.values(this.paramControls).forEach(wrapper => {
                if (wrapper.instance && wrapper.instance.dispose) {
                    wrapper.instance.dispose();
                }
            });
        }

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

        // Align labels in this container
        // Use double RAF to ensure layout is fully stable
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.alignLabels(this.dynamicParamsContainer);
            });
        });
    }

    createSequencerTypeSelector(containerAccordion) {
        const container = createElement('div', 'flex items-center justify-between mb-2 p-2 relative');
        const label = createElement('label', 'text-sm text-gray-300 mr-2', { textContent: 'Sequence Generator' });

        const select = createElement('select', 'bg-gray-700 text-white text-xs rounded border border-gray-600 px-1 py-1 cursor-pointer flex-1');

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
        if (this.sequencerControls) {
            Object.values(this.sequencerControls).forEach(wrapper => {
                if (wrapper.instance && wrapper.instance.dispose) {
                    wrapper.instance.dispose();
                }
            });
        }
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

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.alignLabels(this.sequencerParamsContainer);
            });
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
        // Use ParamGui
        const paramGui = new ParamGui({
            key,
            label,
            min,
            max,
            step,
            value: 0, // Default, will be updated by updateUI
            onChange: (val) => {
                store.dispatch({
                    type: this.actionType,
                    payload: { [key]: val }
                });
            },
            onLinkToggle: (isActive) => {
                // Determine counterpart key (assumes A <-> B mirroring for now)
                // My key: this.roseId + '.' + key
                // Other key: (this.roseId=A?B:A) + '.' + key
                const myKey = `${this.roseId}.${key}`;
                const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
                const otherKey = `${otherRoseId}.${key}`;

                // Toggle link in manager
                // We barely trust the 'isActive' from UI state since LinkManager is source of truth for links
                // But for now, click = toggle
                import('../../engine/logic/LinkManager.js').then(({ linkManager }) => {
                    const linked = linkManager.toggleLink(myKey, otherKey);
                    // Update visual state to match reality (handled by ParamGui internal state? no, should be driven by props)
                    // But ParamGui tracks its own isLinked.
                    // Ideally we sync ParamGui.isLinked with LinkManager status.
                    if (linked !== isActive) {
                        // Visual mismatch corrected
                        paramGui.setLinkActive(linked);
                    }
                });
            }
        });

        // Adapter to match old structure expecting { container, input, valueDisplay }
        // We attach the full instance so updateUI can use .setValue
        return {
            container: paramGui.getElement(),
            instance: paramGui,
            // creating fake input/valueDisplay props to avoid breaking immediate legacy access if any remains?
            // Actually, I should update the usages of these return values.
            // The usages are:
            // 1. this.divsControl = this.createSlider(...)
            input: paramGui.slider
        };
    }

    updateUI(state) {
        const params = state[this.roseId];

        // Sync visuals if subscribed
        this.updateLinkVisuals();

        // Update Curve Type Selector
        if (this.curveTypeSelect && this.curveTypeSelect.value !== params.curveType) {
            this.curveTypeSelect.value = params.curveType || 'Rhodonea';
        }

        // Update Accordion Title
        if (this.coreAccordion) {
            this.coreAccordion.setTitle(`Base Curve: ${params.curveType || 'Rhodonea'}`);
        }



        // Re-render params if needed
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

        // Update Coset Count Slider Range and disable if showAllCosets is true
        if (this.cosetCountControl) {
            const showAllCosets = params.showAllCosets;
            this.cosetCountControl.instance.setDisabled(showAllCosets);

            // Stats Update
            const count = showAllCosets ? k : Math.min(params.cosetCount || 1, k);
            this.cosetInfo.textContent = `Cosets (k): ${k} | Shown: ${count}`;

            // this.cosetCountControl.input.max = k; // OLD
            this.cosetCountControl.instance.setMax(k); // NEW
            this.updateControl(this.cosetCountControl, Math.min(params.cosetCount || 1, k));
            // Dispatch update if clamped? No, simple render update is fine.
        }

        // Update Distribution
        if (this.distSelect && this.distSelect.value !== params.cosetDistribution) {
            this.distSelect.value = params.cosetDistribution || 'sequential';
        }

        // Update Coset Index (Offset) Range
        if (this.cosetIndexControl) {
            // this.cosetIndexControl.input.max = k - 1; // OLD
            this.cosetIndexControl.instance.setMax(k - 1); // NEW
            this.updateControl(this.cosetIndexControl, params.cosetIndex || 0);
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
        const cosetsShown = Math.min(params.cosetCount || 1, k);

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

        // Calculate Lines Displayed
        let segmentsDisplayed = 0;
        if (isMultiplicative) {
            // If we have distribution or specific counting, we might want to be precise, 
            // but 'lines * cosetsShown' is decent approximation if uniform. 
            // However, strictly we should sum the lengths of the *shown* cosets.
            // Given Renderer.getDrawIndices logic is in Renderer, we duplicate it or simplify.
            // Simplification: use average or just assume one sample 'lines' * cosetsShown for now 
            // unless we want to pull getDrawIndices logic here. 

            // Attempt approximation:
            segmentsDisplayed = lines * cosetsShown;
            // Ideally we'd calculate exactly match what's drawn, but that requires re-running getDrawIndices logic.
        } else {
            segmentsDisplayed = lines * cosetsShown;
        }

        const segmentsPerPathLabel = isMultiplicative ? distributionString : lines;

        this.statsContent.innerHTML = `
            <div><span class="text-gray-400">Line Segments Displayed:</span> <span class="text-blue-400">${segmentsDisplayed}</span></div>
            <div><span class="text-gray-400">Closed Paths Displayed (Cosets):</span> <span class="text-blue-400">${cosetsShown}</span></div>
            <div><span class="text-gray-400">Line Segments Per Path:</span> <span class="text-blue-400">${segmentsPerPathLabel}</span></div>
            <div><span class="text-gray-400">Total Segments:</span> <span class="text-blue-400">${totalRosetteLines}</span></div>
            <div><span class="text-gray-400">Total Paths:</span> <span class="text-blue-400">${k}</span></div>
            ${coprimeString}
        `;
    }

    updateLinkVisuals() {
        if (!this.linkManager) return;

        // Helper to check and update a control
        const checkControl = (control, paramKey) => {
            if (!control || !control.instance) return;

            const myKey = `${this.roseId}.${paramKey}`;
            const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
            const otherKey = `${otherRoseId}.${paramKey}`;

            const isLinked = this.linkManager.areLinked(myKey, otherKey);
            control.instance.setLinkActive(isLinked);
        };

        // 1. Param Controls
        if (this.paramControls) {
            Object.entries(this.paramControls).forEach(([key, control]) => {
                checkControl(control, key);
            });
        }

        // 2. Sequencer Controls
        if (this.sequencerControls) {
            Object.entries(this.sequencerControls).forEach(([key, control]) => {
                checkControl(control, key);
            });
        }
    }

    updateControl(control, value) {
        if (control.instance) {
            // New ParamGui Path
            control.instance.setValue(value);
        } else {
            // Legacy Path (if any remaining)
            control.valueDisplay.textContent = value;
            if (document.activeElement !== control.input) {
                control.input.value = value;
            }
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
