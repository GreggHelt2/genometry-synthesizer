import { Panel } from './Panel.js';
import { createElement } from '../utils/dom.js';
import { store } from '../../engine/state/Store.js';
import { ACTIONS } from '../../engine/state/Actions.js';

export class InterpolationPanel extends Panel {
    constructor(id, title) {
        super(id, title);
        this.renderContent();
        store.subscribe(this.updateUI.bind(this));
    }

    renderContent() {
        // Title is now handled by the parent layout
        // const title = createElement('h2', 'text-xl font-bold p-4 text-center', { textContent: 'Interpolation' });
        // this.element.appendChild(title);

        // Slider
        const container = createElement('div', 'p-4');
        const label = createElement('label', 'block text-sm mb-2', { textContent: 'Morph Weight' });
        this.slider = createElement('input', 'w-full h-2 bg-purple-900 rounded-lg appearance-none cursor-pointer', {
            type: 'range', min: 0, max: 1, step: 0.001, value: 0
        });

        this.slider.addEventListener('input', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_INTERPOLATION,
                payload: { weight: parseFloat(e.target.value) }
            });
        });

        container.appendChild(label);
        container.appendChild(this.slider);

        container.appendChild(this.slider);

        // Interpolation Opacity
        const opLabel = createElement('label', 'block text-sm mb-2 mt-4', { textContent: 'Interpolation Opacity' });
        this.interpOpacitySlider = createElement('input', 'w-full h-2 bg-purple-900 rounded-lg appearance-none cursor-pointer', {
            type: 'range', min: 0, max: 1, step: 0.01, value: 1
        });
        this.interpOpacitySlider.addEventListener('input', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_INTERPOLATION,
                payload: { opacity: parseFloat(e.target.value) }
            });
        });
        container.appendChild(opLabel);
        container.appendChild(this.interpOpacitySlider);

        // Interpolation Color & Method
        const colorContainer = createElement('div', 'flex flex-col mb-4 mt-4 p-2 border border-gray-700 rounded bg-gray-900/50');
        const colorLabel = createElement('label', 'text-sm text-gray-300 mb-1', { textContent: 'Interpolation Color' });
        const colorRow = createElement('div', 'flex gap-2');

        this.colorInput = createElement('input', 'w-8 h-8 rounded cursor-pointer border-0', { type: 'color' });
        this.colorInput.addEventListener('input', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_INTERPOLATION,
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
                type: ACTIONS.UPDATE_INTERPOLATION,
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
                type: ACTIONS.UPDATE_INTERPOLATION,
                payload: { blendMode: e.target.value }
            });
        });
        colorContainer.appendChild(blendLabel);
        colorContainer.appendChild(this.blendSelect);

        container.appendChild(colorContainer);

        // Play/Pause Button
        this.playBtn = createElement('button', 'mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 w-full transition-colors', {
            textContent: 'Play Animation'
        });
        this.playBtn.addEventListener('click', () => {
            // Toggle logic here
            const isPlaying = !store.getState().app.isPlaying;
            store.dispatch({
                type: ACTIONS.SET_PLAYING,
                payload: isPlaying
            });
        });
        container.appendChild(this.playBtn);

        // Underlays Section
        const underlayContainer = createElement('div', 'mt-4 pt-4 border-t border-gray-700');
        underlayContainer.appendChild(createElement('h3', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Underlays' }));

        // Toggles
        const toggleRow = createElement('div', 'flex gap-4 mb-2');
        this.showACheck = this.createCheckbox('showRoseA', 'Show A');
        this.showBCheck = this.createCheckbox('showRoseB', 'Show B');
        toggleRow.appendChild(this.showACheck.container);
        toggleRow.appendChild(this.showBCheck.container);
        underlayContainer.appendChild(toggleRow);

        // Opacity
        const opacityLabel = createElement('label', 'block text-xs text-gray-400 mb-1', { textContent: 'Underlay Opacity' });
        this.opacitySlider = createElement('input', 'w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer', {
            type: 'range', min: 0, max: 1, step: 0.01
        });
        this.opacitySlider.addEventListener('input', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_INTERPOLATION,
                payload: { underlayOpacity: parseFloat(e.target.value) }
            });
        });
        underlayContainer.appendChild(opacityLabel);
        underlayContainer.appendChild(this.opacitySlider);

        container.appendChild(underlayContainer);

        // Recording Controls Section
        const recContainer = createElement('div', 'mt-6 pt-4 border-t border-gray-700');
        recContainer.appendChild(createElement('h3', 'text-sm font-bold text-gray-400 mb-2', { textContent: 'Recording' }));

        // Format Selector
        const formatWrapper = createElement('div', 'mb-3');
        const formatLabel = createElement('label', 'block text-xs text-gray-500 mb-1', { textContent: 'Format' });
        this.formatSelect = createElement('select', 'w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm');
        ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/mp4'].forEach(opt => {
            if (MediaRecorder.isTypeSupported(opt)) {
                this.formatSelect.appendChild(createElement('option', '', { value: opt, textContent: opt }));
            }
        });
        formatWrapper.appendChild(formatLabel);
        formatWrapper.appendChild(this.formatSelect);
        recContainer.appendChild(formatWrapper);

        // Record Button
        this.recordBtn = createElement('button', 'w-full px-4 py-2 bg-green-700 rounded hover:bg-green-600 transition-colors flex items-center justify-center gap-2', {
            textContent: 'Start Recording'
        });

        this.recordBtn.addEventListener('click', () => {
            const isRecording = !store.getState().app.isRecording;
            store.dispatch({
                type: ACTIONS.SET_RECORDING,
                payload: isRecording
            });
        });

        recContainer.appendChild(this.recordBtn);
        container.appendChild(recContainer);

        this.element.appendChild(container);
    }

    updateUI(state) {
        if (document.activeElement !== this.slider) {
            this.slider.value = state.interpolation.weight;
        }

        if (document.activeElement !== this.interpOpacitySlider) {
            this.interpOpacitySlider.value = state.interpolation.opacity ?? 1;
        }

        if (this.colorInput.value !== state.interpolation.color) {
            this.colorInput.value = state.interpolation.color || '#ffffff';
        }
        if (this.methodSelect.value !== state.interpolation.colorMethod) {
            this.methodSelect.value = state.interpolation.colorMethod || 'solid';
        }
        if (this.blendSelect.value !== state.interpolation.blendMode) {
            this.blendSelect.value = state.interpolation.blendMode || 'source-over';
        }

        // Update Underlays
        this.showACheck.input.checked = state.interpolation.showRoseA;
        this.showBCheck.input.checked = state.interpolation.showRoseB;
        if (document.activeElement !== this.opacitySlider) {
            this.opacitySlider.value = state.interpolation.underlayOpacity;
        }

        const isPlaying = state.app.isPlaying;
        this.playBtn.textContent = isPlaying ? 'Pause Animation' : 'Play Animation';

        if (isPlaying) {
            this.playBtn.classList.remove('bg-blue-600', 'hover:bg-blue-500');
            this.playBtn.classList.add('bg-red-600', 'hover:bg-red-500');
        } else {
            this.playBtn.classList.remove('bg-red-600', 'hover:bg-red-500');
            this.playBtn.classList.add('bg-blue-600', 'hover:bg-blue-500');
        }

        const isRecording = state.app.isRecording;
        this.recordBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        if (isRecording) {
            this.recordBtn.classList.remove('bg-green-700', 'hover:bg-green-600');
            this.recordBtn.classList.add('bg-red-700', 'hover:bg-red-600', 'animate-pulse');
        } else {
            this.recordBtn.classList.remove('bg-red-700', 'hover:bg-red-600', 'animate-pulse');
            this.recordBtn.classList.add('bg-green-700', 'hover:bg-green-600');
        }
    }

    createCheckbox(key, label) {
        const container = createElement('div', 'flex items-center');
        const input = createElement('input', 'mr-2', { type: 'checkbox' });
        const labelEl = createElement('label', 'text-xs text-gray-300', { textContent: label });

        input.addEventListener('change', (e) => {
            store.dispatch({
                type: ACTIONS.UPDATE_INTERPOLATION,
                payload: { [key]: e.target.checked }
            });
        });

        container.appendChild(input);
        container.appendChild(labelEl);
        return { container, input };
    }
}
