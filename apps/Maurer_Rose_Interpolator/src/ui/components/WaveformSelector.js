import { createElement } from '../utils/dom.js';
import { AnimationController } from '../../logic/AnimationController.js';

export class WaveformSelector {
    constructor({ type, shape, onChange, extraControls }) {
        this.type = type || 'InOut';
        this.shape = shape || 'Sine';
        this.onChange = onChange;
        this.extraControls = extraControls;

        // Visualization State
        this.isScrollingMode = true; // Default to scrolling
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

        // Toggle Button for Graph Mode
        this.modeBtn = createElement('button', 'p-1 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-400', {
            title: 'Toggle Graph Mode (Scrolling / Moving)'
        });
        // initial icon: "Activity/Pulse" for scrolling
        this.modeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;

        this.modeBtn.onclick = () => {
            this.isScrollingMode = !this.isScrollingMode;
            this.updateModeVisuals();
            this.drawWaveform();
        };
        dropdownsRow.appendChild(this.modeBtn);

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
        // We use period=1 so input maps directly to phase
        // Apply 10% margin to top and bottom (drawing area 10% to 90%)
        const margin = height * 0.10;
        this.controller.setConfig({
            min: margin,
            max: height - margin,
            period: 1,
            type: this.type,
            shape: this.shape
        });

        // Draw Curve
        ctx.beginPath();
        ctx.strokeStyle = '#60A5FA'; // Blue-400
        ctx.lineWidth = 2;

        for (let x = 0; x <= width; x++) {
            let t_eff; // Effective parameter to compute value from

            if (this.isScrollingMode) {
                // Scrolling Window Logic:
                // Center (x = width/2) corresponds to current phase.
                const local_t = x / width;
                let p = this.phase + (local_t - 0.5);
                p = p - Math.floor(p);
                t_eff = p;
            } else {
                // Static Window Logic:
                // x=0 -> t=0, x=width -> t=1
                // Just map 0..1 linear loop
                t_eff = x / width;
            }

            // Controller returns value 0..height
            // Canvas Y is inverted (0 is top)
            const y = this.controller.computeValue(t_eff);
            const plotY = height - y; // Invert for visual

            if (x === 0) ctx.moveTo(x, plotY);
            else ctx.lineTo(x, plotY);
        }
        ctx.stroke();
    }

    updateModeVisuals() {
        if (this.isScrollingMode) {
            // Scrolling: Locked Center
            this.playhead.style.left = '50%';
            // Icon: Pulse
            this.modeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
        } else {
            // Moving: Dynamic, will be set by update loop
            // Icon: Static Line
            this.modeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M5 12l4-4m-4 4l4 4"/></svg>`;
            this.setPhase(this.phase); // Move head to current pos immediately
        }
    }

    setPhase(t) {
        this.phase = t;
        if (this.isScrollingMode) {
            // Redraw every frame to scroll the graph
            this.drawWaveform();
        } else {
            // Static mode: Just move the head
            const pct = t * 100;
            this.playhead.style.left = `${pct}%`;
        }
    }

    getElement() {
        return this.container;
    }
}
