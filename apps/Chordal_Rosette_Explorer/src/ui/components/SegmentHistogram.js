import { createElement } from '../utils/dom.js';
import { Colorizer } from '../../engine/math/Colorizer.js';

/**
 * A reusable canvas-based histogram component for visualizing segment length distributions.
 * Computes Euclidean distances between consecutive points in a polyline and renders
 * a histogram with summary statistics.
 */
export class SegmentHistogram {
    /**
     * @param {Object} [options]
     * @param {number} [options.height=90] - Canvas height in CSS pixels
     * @param {number} [options.numBins=30] - Number of histogram bins
     * @param {string} [options.barColorStart='#3b82f6'] - Bar gradient start color
     * @param {string} [options.barColorEnd='#06b6d4'] - Bar gradient end color
     */
    constructor(options = {}) {
        this.height = options.height || 90;
        this.numBins = options.numBins || 30;
        this.barColorStart = options.barColorStart || '#3b82f6';
        this.barColorEnd = options.barColorEnd || '#06b6d4';

        // Container
        this.container = createElement('div', 'mt-2');

        // Label
        this.label = createElement('div', 'text-[10px] text-gray-500 mb-1', {
            textContent: 'Segment Length Distribution'
        });
        this.container.appendChild(this.label);

        // Canvas
        this.canvas = createElement('canvas', 'w-full rounded');
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.background = '#111827';
        this.canvas.style.border = '1px solid #374151';
        this.container.appendChild(this.canvas);

        // Stats line
        this.statsDiv = createElement('div', 'text-[10px] text-gray-400 mt-1 font-mono leading-tight');
        this.container.appendChild(this.statsDiv);

        this._resizeObserver = new ResizeObserver(() => this._redraw());
        this._resizeObserver.observe(this.canvas);

        this._lengths = [];
        this._bins = [];
    }

    get element() {
        return this.container;
    }

    /**
     * Update the histogram with a new set of polyline points.
     * @param {Array<{x: number, y: number}>} points
     * @param {Object} [colorOptions] - Color configuration from the panel
     * @param {string} [colorOptions.colorMethod] - 'solid', 'length', 'angle', 'sequence'
     * @param {string} [colorOptions.color] - Base/solid hex color
     * @param {string} [colorOptions.colorEnd] - End color for gradients
     * @param {string} [colorOptions.gradientType] - '2-point', 'cyclic', 'custom'
     * @param {Array} [colorOptions.gradientStops] - Custom gradient stops
     */
    update(points, colorOptions) {
        this._colorOptions = colorOptions || null;
        this._lengths = this._computeSegmentLengths(points);
        this._computeBins();
        this._redraw();
        this._updateStats();
    }

    /**
     * Compute Euclidean distances between consecutive points.
     * @param {Array<{x: number, y: number}>} points
     * @returns {number[]}
     */
    _computeSegmentLengths(points) {
        if (!points || points.length < 2) return [];
        const lengths = [];
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const dx = (p2.x !== undefined ? p2.x : p2[0]) - (p1.x !== undefined ? p1.x : p1[0]);
            const dy = (p2.y !== undefined ? p2.y : p2[1]) - (p1.y !== undefined ? p1.y : p1[1]);
            lengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        return lengths;
    }

    /**
     * Bin the segment lengths into a histogram.
     */
    _computeBins() {
        const lengths = this._lengths;
        if (lengths.length === 0) {
            this._bins = [];
            this._binMin = 0;
            this._binMax = 0;
            return;
        }

        let min = Infinity, max = -Infinity;
        for (const l of lengths) {
            if (l < min) min = l;
            if (l > max) max = l;
        }

        // Avoid zero-range edge case
        if (max - min < 1e-12) {
            max = min + 1e-12;
        }

        this._binMin = min;
        this._binMax = max;

        const numBins = Math.min(this.numBins, lengths.length);
        const binWidth = (max - min) / numBins;
        const bins = new Array(numBins).fill(0);

        for (const l of lengths) {
            let idx = Math.floor((l - min) / binWidth);
            if (idx >= numBins) idx = numBins - 1;
            bins[idx]++;
        }

        this._bins = bins;
    }

    /**
     * Render the histogram on the canvas.
     */
    _redraw() {
        const canvas = this.canvas;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = Math.max(rect.width, 100);
        const height = this.height;

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Clear
        ctx.clearRect(0, 0, width, height);

        const bins = this._bins;
        if (!bins || bins.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('No data', width / 2, height / 2 + 4);
            return;
        }

        const maxCount = Math.max(...bins);
        if (maxCount === 0) return;

        const padding = { top: 6, bottom: 18, left: 32, right: 4 };
        const plotW = width - padding.left - padding.right;
        const plotH = height - padding.top - padding.bottom;
        const barW = plotW / bins.length;
        const gap = Math.min(1, barW * 0.1);

        // Determine bar colors
        const opts = this._colorOptions;
        const useLengthGradient = opts && opts.colorMethod === 'length';

        // Draw bars
        if (useLengthGradient) {
            const startColor = opts.color || '#ffffff';
            const endColor = opts.colorEnd || '#000000';
            const gradientType = opts.gradientType || '2-point';
            for (let i = 0; i < bins.length; i++) {
                const barH = (bins[i] / maxCount) * plotH;
                const x = padding.left + i * barW + gap;
                const y = padding.top + plotH - barH;
                const w = barW - gap * 2;
                const t = bins.length > 1 ? i / (bins.length - 1) : 0;
                ctx.fillStyle = Colorizer.getGradientColor(t, startColor, endColor, gradientType, opts);
                ctx.fillRect(x, y, Math.max(w, 1), barH);
            }
        } else {
            let fill;
            if (opts && opts.color) {
                fill = opts.color;
            } else {
                fill = ctx.createLinearGradient(padding.left, 0, padding.left + plotW, 0);
                fill.addColorStop(0, this.barColorStart);
                fill.addColorStop(1, this.barColorEnd);
            }
            for (let i = 0; i < bins.length; i++) {
                const barH = (bins[i] / maxCount) * plotH;
                const x = padding.left + i * barW + gap;
                const y = padding.top + plotH - barH;
                const w = barW - gap * 2;
                ctx.fillStyle = fill;
                ctx.fillRect(x, y, Math.max(w, 1), barH);
            }
        }

        // --- Axes ---
        const axisColor = '#4b5563';
        const labelColor = '#9ca3af';
        const tickLen = 3;
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 1;

        // Y-axis line (left edge of plot)
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + plotH);
        ctx.stroke();

        // X-axis line (bottom edge of plot)
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + plotH);
        ctx.lineTo(padding.left + plotW, padding.top + plotH);
        ctx.stroke();

        // Y-axis ticks and labels (0, mid, max)
        ctx.fillStyle = labelColor;
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const yTicks = [
            { value: maxCount, yPos: padding.top },
            { value: Math.round(maxCount / 2), yPos: padding.top + plotH / 2 },
            { value: 0, yPos: padding.top + plotH }
        ];
        for (const tick of yTicks) {
            // Tick mark
            ctx.beginPath();
            ctx.moveTo(padding.left - tickLen, tick.yPos);
            ctx.lineTo(padding.left, tick.yPos);
            ctx.stroke();
            // Label
            ctx.fillText(String(tick.value), padding.left - tickLen - 2, tick.yPos);
        }

        // X-axis ticks and labels (min, mid, max)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const midVal = (this._binMin + this._binMax) / 2;
        const xTicks = [
            { value: this._binMin, xPos: padding.left },
            { value: midVal, xPos: padding.left + plotW / 2 },
            { value: this._binMax, xPos: padding.left + plotW }
        ];
        for (const tick of xTicks) {
            // Tick mark
            ctx.beginPath();
            ctx.moveTo(tick.xPos, padding.top + plotH);
            ctx.lineTo(tick.xPos, padding.top + plotH + tickLen);
            ctx.stroke();
            // Label
            ctx.fillText(this._formatNum(tick.value), tick.xPos, padding.top + plotH + tickLen + 1);
        }
    }

    /**
     * Update summary statistics text below the histogram.
     */
    _updateStats() {
        const lengths = this._lengths;
        if (lengths.length === 0) {
            this.statsDiv.textContent = '';
            return;
        }

        const sum = lengths.reduce((a, b) => a + b, 0);
        const mean = sum / lengths.length;

        const sorted = [...lengths].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        const variance = lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length;
        const stdDev = Math.sqrt(variance);

        const min = sorted[0];
        const max = sorted[sorted.length - 1];

        this.statsDiv.innerHTML = `
            <span class="text-gray-500">Min:</span> ${this._formatNum(min)}
            <span class="text-gray-500 ml-1">Max:</span> ${this._formatNum(max)}
            <span class="text-gray-500 ml-1">μ:</span> ${this._formatNum(mean)}
            <span class="text-gray-500 ml-1">M̃:</span> ${this._formatNum(median)}
            <span class="text-gray-500 ml-1">σ:</span> ${this._formatNum(stdDev)}
        `;
    }

    /**
     * Format a number for compact display.
     * @param {number} n
     * @returns {string}
     */
    _formatNum(n) {
        if (n === 0) return '0';
        if (Math.abs(n) >= 100) return n.toFixed(1);
        if (Math.abs(n) >= 1) return n.toFixed(3);
        if (Math.abs(n) >= 0.01) return n.toFixed(4);
        return n.toExponential(2);
    }

    dispose() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
    }
}
