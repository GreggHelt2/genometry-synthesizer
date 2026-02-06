import { createElement } from '../utils/dom.js';
import { ColorUtils } from '../../engine/math/ColorUtils.js';

export class SimpleColorPicker {
    constructor({ onChange, onClose, inline = false }) {
        this.onChange = onChange;
        this.onClose = onClose;
        this.inline = inline;
        this.value = { h: 0, s: 1, v: 1, a: 1 };

        this.isDraggingSV = false;
        this.isDraggingHue = false;
        this.isDraggingAlpha = false;

        this.mounted = false;
        this.render();
    }

    render() {
        // Main Container
        if (this.inline) {
            this.container = createElement('div', 'flex flex-col select-none w-40');
            this.container.style.width = '160px'; // Compact width for inline
        } else {
            this.container = createElement('div', 'fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-2xl flex flex-col p-2 select-none w-48');
            this.container.style.width = '200px';
        }

        // 1. Saturation/Value Area (Canvas)
        const svHeight = this.inline ? 'h-24' : 'h-32';
        this.svContainer = createElement('div', `w-full ${svHeight} relative mb-2 cursor-crosshair border border-gray-700 bg-white`);
        this.svCanvas = createElement('canvas', 'w-full h-full block');
        this.svCanvas.width = 200; // logical resolution
        this.svCanvas.height = 128;
        this.svContainer.appendChild(this.svCanvas);

        // SV Cursor (Circle)
        this.svCursor = createElement('div', 'absolute w-3 h-3 rounded-full border border-white box-border pointer-events-none transform -translate-x-1/2 -translate-y-1/2');
        this.svCursor.style.boxShadow = '0 0 2px black';
        this.svContainer.appendChild(this.svCursor);

        this.container.appendChild(this.svContainer);

        // 2. Hue Slider
        this.hueContainer = createElement('div', 'w-full h-3 relative mb-2 cursor-pointer rounded border border-gray-700');
        this.hueContainer.style.background = 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';

        this.hueCursor = createElement('div', 'absolute top-0 bottom-0 w-1 bg-white border border-gray-500 pointer-events-none transform -translate-x-1/2');
        this.hueContainer.appendChild(this.hueCursor);
        this.container.appendChild(this.hueContainer);

        // 3. Alpha Slider
        this.alphaContainer = createElement('div', 'w-full h-3 relative mb-2 cursor-pointer rounded border border-gray-700');
        // Checkerboard bg
        this.alphaContainer.style.backgroundImage = `
            conic-gradient(#ccc 90deg, #fff 90deg 180deg, #ccc 180deg 270deg, #fff 270deg)
        `;
        this.alphaContainer.style.backgroundSize = '8px 8px';

        // Gradient overlay (transparent to color)
        this.alphaGradient = createElement('div', 'absolute inset-0 w-full h-full rounded');
        this.alphaContainer.appendChild(this.alphaGradient);

        this.alphaCursor = createElement('div', 'absolute top-0 bottom-0 w-1 bg-white border border-gray-500 pointer-events-none transform -translate-x-1/2');
        this.alphaContainer.appendChild(this.alphaCursor);
        this.container.appendChild(this.alphaContainer);

        // 4. Inputs
        const inputRow = createElement('div', 'flex space-x-2');
        this.hexInput = createElement('input', 'w-full bg-gray-900 text-white text-xs px-1 py-1 rounded border border-gray-700 font-mono text-center uppercase', {
            type: 'text', maxLength: 7
        });

        // Alpha Input (Number)
        this.alphaInput = createElement('input', 'w-12 bg-gray-900 text-white text-xs px-1 py-1 rounded border border-gray-700 font-mono text-center', {
            type: 'number', min: 0, max: 1, step: 0.01
        });

        // Color Preview (Small box)
        this.previewBox = createElement('div', 'w-8 h-full rounded border border-gray-600 bg-gray-900');
        this.previewSwatch = createElement('div', 'w-full h-full rounded');
        // Checkerboard behind swatch
        this.previewBox.style.backgroundImage = `conic-gradient(#ccc 90deg, #fff 90deg 180deg, #ccc 180deg 270deg, #fff 270deg)`;
        this.previewBox.style.backgroundSize = '6px 6px';
        this.previewBox.appendChild(this.previewSwatch);

        inputRow.appendChild(this.previewBox);
        inputRow.appendChild(this.hexInput);
        inputRow.appendChild(this.alphaInput);
        this.container.appendChild(inputRow);

        // --- Events ---
        this.svContainer.addEventListener('mousedown', (e) => this.startDrag(e, 'sv'));
        this.hueContainer.addEventListener('mousedown', (e) => this.startDrag(e, 'hue'));
        this.alphaContainer.addEventListener('mousedown', (e) => this.startDrag(e, 'alpha'));

        this.hexInput.addEventListener('change', (e) => this.setFromHex(e.target.value));
        this.alphaInput.addEventListener('change', (e) => this.setAlpha(parseFloat(e.target.value)));

        // Global Mask (Click outside) - Only for Popup mode
        if (!this.inline) {
            this.mask = createElement('div', 'fixed inset-0 z-40 bg-transparent');
            this.mask.addEventListener('mousedown', (e) => {
                this.close();
            });
        }
    }

    getElement() {
        return this.container;
    }

    startDrag(e, mode) {
        e.preventDefault();
        e.stopPropagation(); // Don't close

        this.isDraggingSV = (mode === 'sv');
        this.isDraggingHue = (mode === 'hue');
        this.isDraggingAlpha = (mode === 'alpha');

        this.handleDrag(e); // Process click immediately

        const moveHandler = (ev) => this.handleDrag(ev);
        const upHandler = (ev) => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', upHandler);
            this.isDraggingSV = false;
            this.isDraggingHue = false;
            this.isDraggingAlpha = false;
        };
        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
    }

    handleDrag(e) {
        if (this.isDraggingSV) {
            const rect = this.svContainer.getBoundingClientRect();
            let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            let y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            this.value.s = x;
            this.value.v = 1 - y;
            this.updateColor();
        } else if (this.isDraggingHue) {
            const rect = this.hueContainer.getBoundingClientRect();
            let h = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            this.value.h = h;
            this.drawSV(); // Hue Change updates SV background
            this.updateColor();
        } else if (this.isDraggingAlpha) {
            const rect = this.alphaContainer.getBoundingClientRect();
            let a = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            this.value.a = a;
            this.updateColor();
        }
    }

    drawSV() {
        const ctx = this.svCanvas.getContext('2d');
        const width = this.svCanvas.width;
        const height = this.svCanvas.height;

        // Base Hue
        const rgb = ColorUtils.hsvToRgb(this.value.h, 1, 1);
        const color = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

        ctx.clearRect(0, 0, width, height);

        // Horizontal: White -> Color
        const gradH = ctx.createLinearGradient(0, 0, width, 0);
        gradH.addColorStop(0, '#fff');
        gradH.addColorStop(1, color);
        ctx.fillStyle = gradH;
        ctx.fillRect(0, 0, width, height);

        // Vertical: Transparent -> Black
        const gradV = ctx.createLinearGradient(0, 0, 0, height);
        gradV.addColorStop(0, 'rgba(0,0,0,0)');
        gradV.addColorStop(1, '#000');
        ctx.fillStyle = gradV;
        ctx.fillRect(0, 0, width, height);
    }

    updateColor() {
        const rgb = ColorUtils.hsvToRgb(this.value.h, this.value.s, this.value.v);
        const hex = ColorUtils.rgbToHex(rgb.r, rgb.g, rgb.b);

        // Update Internal UI
        // SV Cursor
        this.svCursor.style.left = `${this.value.s * 100}%`;
        this.svCursor.style.top = `${(1 - this.value.v) * 100}%`;
        this.svCursor.style.backgroundColor = hex;

        // Hue Cursor
        this.hueCursor.style.left = `${this.value.h * 100}%`;

        // Alpha Cursor
        this.alphaCursor.style.left = `${this.value.a * 100}%`;

        // Alpha Gradient (Current Color Fade)
        this.alphaGradient.style.background = `linear-gradient(to right, transparent, ${hex})`;

        // Inputs
        this.hexInput.value = hex;
        this.alphaInput.value = this.value.a.toFixed(2);

        // Preview
        this.previewSwatch.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.value.a})`;

        // Emit Callback
        if (this.onChange) {
            this.onChange(hex, this.value.a);
        }
    }

    setFromHex(hex) {
        if (!/^#[0-9A-F]{6}$/i.test(hex)) return; // Valid hex only
        const hsv = ColorUtils.hexToHsv(hex);
        this.value.h = hsv.h;
        this.value.s = hsv.s;
        this.value.v = hsv.v;
        this.drawSV();
        this.updateColor();
    }

    setAlpha(alpha) {
        this.value.a = Math.max(0, Math.min(1, alpha));
        this.updateColor();
    }

    show(x, y, color, alpha) {
        if (!this.mounted) {
            if (!this.inline) {
                document.body.appendChild(this.mask);
                document.body.appendChild(this.container);
            }
            this.mounted = true;
        }

        this.setValues(color, alpha);

        if (!this.inline) {
            // Position
            // Ensure it doesn't go off screen bottom/right
            const rect = this.container.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            let finalX = x;
            let finalY = y;

            if (finalX + rect.width > winW) finalX = winW - rect.width - 10;
            if (finalY + rect.height > winH) finalY = winH - rect.height - 10;

            this.container.style.left = `${finalX}px`;
            this.container.style.top = `${finalY}px`;
        }
    }

    setValues(color, alpha) {
        const hsv = ColorUtils.hexToHsv(color);
        this.value = { h: hsv.h, s: hsv.s, v: hsv.v, a: alpha };
        this.drawSV();
        this.updateColor();
    }

    close() {
        if (this.mounted && !this.inline) {
            document.body.removeChild(this.container);
            document.body.removeChild(this.mask);
            this.mounted = false;
            if (this.onClose) this.onClose();
        }
    }
}
