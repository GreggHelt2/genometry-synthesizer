import { createElement } from '../utils/dom.js';
import { AnimationController } from '../../logic/AnimationController.js';

export class WaveformSelector {
    constructor({ type, shape, onChange }) {
        this.type = type || 'InOut';
        this.shape = shape || 'Sine';
        this.onChange = onChange;
        this.controller = new AnimationController(() => { }); // Dummy controller for drawing logic

        this.render();
    }

    render() {
        this.container = createElement('div', 'flex flex-col gap-2');

        // Upper Row: Dropdowns
        const controlsRow = createElement('div', 'flex gap-2');

        // Type Dropdown (In, Out, InOut)
        const types = ['In', 'Out', 'InOut'];
        this.typeSelect = this.createDropdown(types, this.type, (val) => {
            this.type = val;
            this.handleChange();
        });

        // Shape Dropdown (Sine, Quad, ...)
        const shapes = ['Sawtooth', 'Sine', 'Quad', 'Cubic', 'Quart', 'Quint', 'Expo', 'Circ', 'Back', 'Elastic', 'Bounce'];
        this.shapeSelect = this.createDropdown(shapes, this.shape, (val) => {
            this.shape = val;
            this.handleChange();
        });

        controlsRow.appendChild(this.typeSelect);
        controlsRow.appendChild(this.shapeSelect);

        // Lower Row: Visualization
        this.canvasContainer = createElement('div', 'relative h-12 w-full bg-gray-900 border border-gray-700 rounded overflow-hidden');

        this.canvas = createElement('canvas', 'absolute inset-0 w-full h-full');
        // Set canvas resolution strictly for sharpness
        // We'll resize tightly in mounted context or assume fixed width for now
        this.canvas.width = 300;
        this.canvas.height = 48;

        this.ctx = this.canvas.getContext('2d');

        // Playhead Line
        this.playhead = createElement('div', 'absolute top-0 bottom-0 w-0.5 bg-green-400 pointer-events-none');
        this.playhead.style.left = '0%';

        this.canvasContainer.appendChild(this.canvas);
        this.canvasContainer.appendChild(this.playhead);

        this.container.appendChild(controlsRow);
        this.container.appendChild(this.canvasContainer);

        // Initial Draw
        setTimeout(() => this.drawWaveform(), 0);
    }

    createDropdown(options, selected, onSelect) {
        const select = createElement('select', 'bg-gray-800 text-gray-300 text-xs rounded border border-gray-600 px-2 py-1 outline-none focus:border-blue-500');

        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            if (opt === selected) el.selected = true;
            select.appendChild(el);
        });

        select.addEventListener('change', (e) => onSelect(e.target.value));
        return select;
    }

    handleChange() {
        this.drawWaveform();
        if (this.onChange) {
            this.onChange(this.type, this.shape);
        }
    }

    drawWaveform() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Configure Controller for plotting
        this.controller.setConfig({
            min: 0,
            max: height,
            period: 1, // Normalized time
            type: this.type,
            shape: this.shape
        });

        // Draw Curve
        ctx.beginPath();
        ctx.strokeStyle = '#60A5FA'; // Blue-400
        ctx.lineWidth = 2;

        for (let x = 0; x <= width; x++) {
            // Normalized time t (0..1) maps to x (0..width)
            // But we need to account for period loop logic in visual
            // This visualization shows ONE full symmetric cycle (0 -> 1 -> 0)
            const t = x / width;

            // Controller returns value 0..height
            // Canvas Y is inverted (0 is top)
            const y = this.controller.computeValue(t);
            const plotY = height - y; // Invert for visual

            if (x === 0) ctx.moveTo(x, plotY);
            else ctx.lineTo(x, plotY);
        }
        ctx.stroke();
    }

    setPhase(t) {
        // t is 0..1 phase
        const pct = t * 100;
        this.playhead.style.left = `${pct}%`;
    }

    getElement() {
        return this.container;
    }
}
