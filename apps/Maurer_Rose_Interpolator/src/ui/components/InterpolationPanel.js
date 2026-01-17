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
