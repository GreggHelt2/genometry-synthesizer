import { createElement } from '../utils/dom.js';
import { AnimationController } from '../../logic/AnimationController.js';

export class WaveformSelector {
    constructor({ type, shape, period, onChange, extraControls }) {
        this.type = type || 'InOut';
        this.shape = shape || 'Sine';
        this.period = period || 10; // Default period
        this.onChange = onChange;
        this.extraControls = extraControls;

        // Visualization State
        this.phase = 0;

        this.controller = new AnimationController(() => { }); // Dummy controller for drawing logic

        this.render();
    }

    render() {
        // Main Container: Row (Left Panel | Right Panel)
        this.container = createElement('div', 'flex flex-row gap-2 items-stretch h-16'); // increased height slightly

        // --- Left Panel: Controls ---
        // Top: Extra Controls (Min/Max/Period)
        // Bottom: Dropdowns
        const leftPanel = createElement('div', 'flex flex-col gap-1 justify-center min-w-max');

        // 1. Inject Extra Controls if provided
        if (this.extraControls) {
            leftPanel.appendChild(this.extraControls);
        }

        // 2. Dropdowns Row
        const dropdownsRow = createElement('div', 'flex gap-1 items-center');

        // Label: "Easing"
        const label = createElement('span', 'text-[10px] text-gray-500 uppercase tracking-widest mr-1');
        label.textContent = 'Easing';
        dropdownsRow.appendChild(label);

        // Type Dropdown (In, Out, InOut)
        const types = ['In', 'Out', 'InOut'];
        this.typeSelect = this.createDropdown(types, this.type, (val) => {
            this.type = val;
            this.handleChange();
        });

        // Shape Dropdown (Sine, Quad, ...)
        const shapes = ['Linear', 'Sine', 'Quad', 'Cubic', 'Quart', 'Quint', 'Expo', 'Circ', 'Back', 'Elastic', 'Bounce'];
        this.shapeSelect = this.createDropdown(shapes, this.shape, (val) => {
            this.shape = val;
            this.handleChange();
        });

        dropdownsRow.appendChild(this.typeSelect);
        dropdownsRow.appendChild(this.shapeSelect);

        // Toggle Button Removed (User preference: Scrolling only)
        // [Previously modeBtn code was here]

        leftPanel.appendChild(dropdownsRow);

        // --- Right Panel: Visualization ---
        this.canvasContainer = createElement('div', 'relative h-full flex-1 bg-gray-900 border border-gray-700 rounded overflow-hidden');

        this.canvas = createElement('canvas', 'absolute inset-0 w-full h-full');
        // Set canvas resolution strictly for sharpness
        // We'll resize tightly in mounted context or assume fixed width for now
        this.canvas.width = 300;
        this.canvas.height = 64; // Matching h-16 (approx 64px)

        this.ctx = this.canvas.getContext('2d');

        // Playhead Line (Initially Center for Scrolling)
        this.playhead = createElement('div', 'absolute top-0 bottom-0 w-0.5 bg-green-400 pointer-events-none transition-all duration-75');
        this.playhead.style.left = '50%';

        this.canvasContainer.appendChild(this.canvas);
        this.canvasContainer.appendChild(this.playhead);

        this.container.appendChild(leftPanel);
        this.container.appendChild(this.canvasContainer);

        // Initial Draw
        this.phase = 0;
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
        // We use period=1 so input maps directly to phase if we were normalized.
        // BUT now we want Time-Based width.
        // Apply 10% margin to top and bottom (drawing area 10% to 90%)
        const margin = height * 0.10;
        this.controller.setConfig({
            min: margin,
            max: height - margin,
            period: this.period,
            type: this.type,
            shape: this.shape
        });

        // Draw Curve
        ctx.beginPath();
        ctx.strokeStyle = '#60A5FA'; // Blue-400
        ctx.lineWidth = 2;

        const TIME_WINDOW = 30.0; // Seconds visible in the window (15s past, 15s future)

        for (let x = 0; x <= width; x++) {
            let t_eff; // Effective parameter (absolute time) to compute value from

            // Scrolling Window Logic:
            // Canvas width represents TIME_WINDOW seconds.
            // Center (width/2) is 'current time'.

            const x_pct = x / width; // 0..1

            // Current time of the cycle = phase * period
            const now = this.phase * this.period;

            // Time relative to center (-window/2 ... +window/2)
            const dt = (x_pct - 0.5) * TIME_WINDOW;

            // Absolute time to sample
            t_eff = now + dt;

            // Controller returns value 0..height
            // Canvas Y is inverted (0 is top)
            const y = this.controller.computeValue(t_eff);
            const plotY = height - y; // Invert for visual

            if (x === 0) ctx.moveTo(x, plotY);
            else ctx.lineTo(x, plotY);
        }
        ctx.stroke();
    }

    setPeriod(p) {
        this.period = Math.max(0.1, p);
        this.drawWaveform();
    }

    setPhase(t) {
        this.phase = t;
        // Redraw every frame to scroll the graph
        this.drawWaveform();
    }

    getElement() {
        return this.container;
    }
}
