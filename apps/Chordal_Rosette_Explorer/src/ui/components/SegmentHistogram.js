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
        this.height = options.height || 135;
        this.numBins = options.numBins || 30;
        this.barColorStart = options.barColorStart || '#3b82f6';
        this.barColorEnd = options.barColorEnd || '#06b6d4';
        this.highlightColor = options.highlightColor || '#ffff00';
        this.onHighlight = options.onHighlight || null;

        // Outer container
        this.container = createElement('div', 'mt-2');

        // Label
        this.label = createElement('div', 'text-[11px] text-gray-500 mb-1', {
            textContent: 'Chord Length Distribution'
        });
        this.container.appendChild(this.label);

        // Horizontal layout: [Canvas] [Right Subpanel]
        const row = createElement('div', 'flex gap-2');
        this.container.appendChild(row);

        // Canvas (left, flexible width) — tabindex makes it focusable for keyboard events
        this.canvas = createElement('canvas', 'rounded');
        this.canvas.style.flex = '1';
        this.canvas.style.minWidth = '0';
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.background = '#111827';
        this.canvas.style.border = '1px solid #374151';
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.outline = 'none';
        this.canvas.setAttribute('tabindex', '0');
        row.appendChild(this.canvas);

        // Right subpanel: stats + highlight controls
        this._sidePanel = createElement('div', 'flex flex-col justify-between');
        this._sidePanel.style.minWidth = '72px';
        this._sidePanel.style.fontSize = '12px';
        this._sidePanel.style.fontFamily = 'monospace';
        row.appendChild(this._sidePanel);

        // Stats section (top of side panel)
        this.statsDiv = createElement('div', 'text-gray-400 leading-relaxed');
        this._sidePanel.appendChild(this.statsDiv);

        // Highlight controls (bottom of side panel)
        this._modeRow = createElement('div', 'flex flex-col gap-1');
        this._sidePanel.appendChild(this._modeRow);

        const modeLabel = createElement('span', 'text-gray-500', { textContent: 'Highlight:' });
        this._modeRow.appendChild(modeLabel);

        const btnRow = createElement('div', 'flex gap-1');
        this._modeRow.appendChild(btnRow);

        this._snapshotBtn = createElement('button', '', { textContent: 'Snap' });
        this._liveBtn = createElement('button', '', { textContent: 'Live' });
        this._linkBtn = createElement('button', 'p-1 rounded');
        this._linkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
        this._linkBtn.title = 'Link highlights across all panels (Snapshot mode only)';
        btnRow.appendChild(this._snapshotBtn);
        btnRow.appendChild(this._liveBtn);
        btnRow.appendChild(this._linkBtn);

        this._highlightMode = 'snapshot'; // 'snapshot' | 'live'
        this._linked = false;
        this._updateModeButtons();

        this._snapshotBtn.addEventListener('click', () => {
            this._highlightMode = 'snapshot';
            this._updateModeButtons();
            this._reemitHighlight();
        });
        this._liveBtn.addEventListener('click', () => {
            this._highlightMode = 'live';
            this._linked = false; // Link only works in snapshot mode
            this._updateModeButtons();
            this._reemitHighlight();
        });
        this._linkBtn.addEventListener('click', () => {
            if (this._highlightMode !== 'snapshot') return; // Only active in snapshot mode
            this._linked = !this._linked;
            this._updateModeButtons();
            this._reemitHighlight();
        });

        this._resizeObserver = new ResizeObserver(() => this._redraw());
        this._resizeObserver.observe(this.canvas);

        this._lengths = [];
        this._bins = [];
        this._selectedBin = -1;
        this._snapshotIndices = null; // Captured segment indices for snapshot mode
        this._lastPadding = null;
        this._lastPlotW = 0;
        this._lastBarW = 0;

        // Click to select/deselect a bar
        this.canvas.addEventListener('click', (e) => this._onClick(e));
        // Arrow keys to traverse bars
        this.canvas.addEventListener('keydown', (e) => this._onKeyDown(e));
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
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('No data', width / 2, height / 2 + 4);
            return;
        }

        const maxCount = Math.max(...bins);
        if (maxCount === 0) return;

        const padding = { top: 16, bottom: 18, left: 32, right: 16 };
        const plotW = width - padding.left - padding.right;
        const plotH = height - padding.top - padding.bottom;
        const barW = plotW / bins.length;
        const gap = Math.min(1, barW * 0.1);

        // Store layout for mouse hit testing
        this._lastPadding = padding;
        this._lastPlotW = plotW;
        this._lastPlotH = plotH;
        this._lastBarW = barW;
        this._lastMaxCount = maxCount;

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

        // Selection highlight on selected bar
        if (this._selectedBin >= 0 && this._selectedBin < bins.length && bins[this._selectedBin] > 0) {
            const i = this._selectedBin;
            const barH = (bins[i] / maxCount) * plotH;
            const x = padding.left + i * barW + gap;
            const y = padding.top + plotH - barH;
            const w = barW - gap * 2;
            ctx.strokeStyle = this.highlightColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, Math.max(w, 1), barH);
            ctx.fillStyle = this.highlightColor;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(x, y, Math.max(w, 1), barH);
            ctx.globalAlpha = 1;

            // Annotation: total chord count above bar
            const barCenterX = x + Math.max(w, 1) / 2;
            ctx.fillStyle = this.highlightColor;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(String(bins[i]), barCenterX, y - 2);

            // Annotation: spectral node count (distinct lengths) below bar
            const range = this._getBinRange(i);
            if (range) {
                const uniqueLengths = new Set();
                for (const len of this._lengths) {
                    if (len >= range.minLength && len <= range.maxLength) {
                        // Round to 6 significant figures to group near-identical lengths
                        uniqueLengths.add(Number(len.toPrecision(6)));
                    }
                }
                ctx.textBaseline = 'top';
                ctx.font = '9px monospace';
                ctx.fillStyle = '#9ca3af';
                ctx.fillText(`${uniqueLengths.size}`, barCenterX, padding.top + plotH + 2);
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
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const yTicks = [
            { value: maxCount, yPos: padding.top },
            { value: Math.round(maxCount / 2), yPos: padding.top + plotH / 2 }
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
            ctx.fillText(this._formatAxisLabel(tick.value), tick.xPos, padding.top + plotH + tickLen + 1);
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

        const min = sorted[0];
        const max = sorted[sorted.length - 1];

        this.statsDiv.innerHTML = `
            <div><span class="text-gray-500">Min:</span> ${this._formatNum(min)}</div>
            <div><span class="text-gray-500">Max:</span> ${this._formatNum(max)}</div>
            <div><span class="text-gray-500">Mean:</span> ${this._formatNum(mean)}</div>
            <div><span class="text-gray-500">Median:</span> ${this._formatNum(median)}</div>
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

    /**
     * Format a number for axis labels — round to 2 decimal places.
     * @param {number} n
     * @returns {string}
     */
    _formatAxisLabel(n) {
        if (Number.isInteger(n)) return String(n);
        return n.toFixed(2);
    }

    /**
     * Get the length range for a given bin index.
     * @param {number} binIndex
     * @returns {{minLength: number, maxLength: number}|null}
     */
    _getBinRange(binIndex) {
        if (binIndex < 0 || binIndex >= this._bins.length) return null;
        const numBins = this._bins.length;
        const binWidth = (this._binMax - this._binMin) / numBins;
        return {
            minLength: this._binMin + binIndex * binWidth,
            maxLength: this._binMin + (binIndex + 1) * binWidth
        };
    }

    /**
     * Handle click on histogram canvas — select or deselect a bar.
     */
    _onClick(e) {
        if (!this._lastPadding || !this._bins || this._bins.length === 0) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const padding = this._lastPadding;
        const barW = this._lastBarW;

        // Check if within plot area horizontally
        const plotX = x - padding.left;
        if (plotX < 0 || plotX >= this._lastPlotW) {
            this._deselectBin();
            return;
        }

        const binIndex = Math.min(Math.floor(plotX / barW), this._bins.length - 1);
        const binCount = this._bins[binIndex];

        // Check if click Y is actually within the bar rectangle
        let hitBar = false;
        if (binCount > 0 && this._lastMaxCount > 0) {
            const plotH = this._lastPlotH;
            const barH = (binCount / this._lastMaxCount) * plotH;
            const barTop = padding.top + plotH - barH;
            const barBottom = padding.top + plotH;
            hitBar = (y >= barTop && y <= barBottom);
        }

        if (!hitBar) {
            this._deselectBin();
        } else if (binIndex === this._selectedBin) {
            this._deselectBin();
        } else {
            this._selectBin(binIndex);
        }
    }

    /**
     * Handle keyboard navigation — left/right arrows cycle through bars.
     */
    _onKeyDown(e) {
        if (this._selectedBin === -1 || !this._bins || this._bins.length === 0) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const next = this._findNextNonEmptyBin(-1);
            if (next !== -1) this._selectBin(next);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = this._findNextNonEmptyBin(1);
            if (next !== -1) this._selectBin(next);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this._deselectBin();
        }
    }

    /**
     * Find the next non-empty bin in the given direction, wrapping around.
     * @param {number} direction - -1 for left, +1 for right
     * @returns {number} bin index, or -1 if none found
     */
    _findNextNonEmptyBin(direction) {
        const n = this._bins.length;
        for (let step = 1; step < n; step++) {
            const idx = ((this._selectedBin + direction * step) % n + n) % n;
            if (this._bins[idx] > 0) return idx;
        }
        return -1;
    }

    /** @private Select a bin and emit highlight */
    _selectBin(binIndex) {
        this._selectedBin = binIndex;
        this._redraw();

        // Capture segment indices for this bin's range (used in snapshot mode)
        const range = this._getBinRange(binIndex);
        if (range) {
            const indices = [];
            for (let i = 0; i < this._lengths.length; i++) {
                const len = this._lengths[i];
                if (len >= range.minLength && len <= range.maxLength) {
                    indices.push(i);
                }
            }
            this._snapshotIndices = indices;
        }

        this._emitHighlight(range);
        this._updateModeButtons();
    }

    /** @private Deselect current bin and clear highlight */
    _deselectBin() {
        if (this._selectedBin !== -1) {
            this._selectedBin = -1;
            this._snapshotIndices = null;
            this._redraw();
            this._updateModeButtons();
            if (this.onHighlight) this.onHighlight(null);
        }
    }

    /** @private Re-emit highlight for current selection when mode changes */
    _reemitHighlight() {
        if (this._selectedBin === -1) return;
        const range = this._getBinRange(this._selectedBin);
        this._emitHighlight(range);
    }

    /** @private Emit highlight callback with mode-appropriate data */
    _emitHighlight(range) {
        if (!this.onHighlight || !range) return;

        if (this._highlightMode === 'snapshot') {
            this.onHighlight({
                ...range,
                mode: 'snapshot',
                segmentIndices: this._snapshotIndices || [],
                linked: this._linked
            });
        } else {
            this.onHighlight({
                ...range,
                mode: 'live'
            });
        }
    }

    /** @private Update visual state of mode toggle buttons */
    _updateModeButtons() {
        const hasSelection = this._selectedBin >= 0;
        const activeStyle = 'background: #3b82f6; color: white;';
        const inactiveStyle = 'background: #1f2937; color: #9ca3af; border: 1px solid #374151;';
        const disabledStyle = 'background: #111827; color: #4b5563; border: 1px solid #1f2937; cursor: not-allowed; opacity: 0.4;';
        const baseBtn = 'font-size:12px;padding:2px 5px;border-radius:3px;border:none;';

        if (!hasSelection) {
            // No bar selected — dim all buttons
            this._snapshotBtn.style.cssText = `${baseBtn}${disabledStyle}`;
            this._liveBtn.style.cssText = `${baseBtn}${disabledStyle}`;
            this._linkBtn.style.cssText = `${baseBtn}${disabledStyle}`;
        } else {
            const isSnapshot = this._highlightMode === 'snapshot';
            this._snapshotBtn.style.cssText = `${baseBtn}cursor:pointer;${isSnapshot ? activeStyle : inactiveStyle}`;
            this._liveBtn.style.cssText = `${baseBtn}cursor:pointer;${this._highlightMode === 'live' ? activeStyle : inactiveStyle}`;
            // Link button: active (green) when linked + snapshot, disabled when not snapshot
            const linkActive = isSnapshot && this._linked;
            const linkStyle = linkActive ? 'background: #10b981; color: white;' : (isSnapshot ? inactiveStyle : disabledStyle);
            this._linkBtn.style.cssText = `${baseBtn}cursor:${isSnapshot ? 'pointer' : 'not-allowed'};${linkStyle}`;
        }
    }

    dispose() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
    }
}
