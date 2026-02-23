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
        /** @type {import('../../engine/ChordSelection').ChordSelection|null} */
        this._chordSelection = options.chordSelection || null;
        this._sourceId = options.sourceId || 'histogram';

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

        // Right subpanel: stats + shape buttons
        this._sidePanel = createElement('div', 'flex flex-col justify-between');
        this._sidePanel.style.minWidth = '72px';
        this._sidePanel.style.fontSize = '12px';
        this._sidePanel.style.fontFamily = 'monospace';
        row.appendChild(this._sidePanel);

        // Stats section (top of side panel)
        this.statsDiv = createElement('div', 'text-gray-400 leading-relaxed');
        this._sidePanel.appendChild(this.statsDiv);

        // Selection shape toggle buttons (bottom of side panel)
        if (this._chordSelection) {
            const rectSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
            const circleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
            const annulusSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/></svg>`;

            const shapeBtns = createElement('div', 'flex gap-1 justify-end mt-1');

            this._rectBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 transition-colors border');
            this._rectBtn.innerHTML = rectSvg;
            this._rectBtn.title = 'Rectangle';
            this._rectBtn.style.lineHeight = '0';
            this._rectBtn.style.cursor = 'pointer';
            this._rectBtn.addEventListener('click', () => {
                this._chordSelection.setSelectionShape('rect', this._sourceId);
            });
            shapeBtns.appendChild(this._rectBtn);

            this._circleBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 transition-colors border');
            this._circleBtn.innerHTML = circleSvg;
            this._circleBtn.title = 'Circle';
            this._circleBtn.style.lineHeight = '0';
            this._circleBtn.style.cursor = 'pointer';
            this._circleBtn.addEventListener('click', () => {
                this._chordSelection.setSelectionShape('circle', this._sourceId);
            });
            shapeBtns.appendChild(this._circleBtn);

            this._annulusBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 transition-colors border');
            this._annulusBtn.innerHTML = annulusSvg;
            this._annulusBtn.title = 'Annulus';
            this._annulusBtn.style.lineHeight = '0';
            this._annulusBtn.style.cursor = 'pointer';
            this._annulusBtn.addEventListener('click', () => {
                this._chordSelection.setSelectionShape('annulus', this._sourceId);
            });
            shapeBtns.appendChild(this._annulusBtn);

            this._sidePanel.appendChild(shapeBtns);

            // Region filter mode buttons (below shape buttons)
            // Line only = intersects, line+1dot = one endpoint, line+2dots = both endpoints
            const lineSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="4"/></svg>`;
            const lineOneDotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="4"/><circle cx="20" cy="4" r="3" fill="currentColor"/></svg>`;
            const lineTwoDotsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="20" x2="20" y2="4"/><circle cx="4" cy="20" r="3" fill="currentColor"/><circle cx="20" cy="4" r="3" fill="currentColor"/></svg>`;

            const filterBtns = createElement('div', 'flex gap-1 justify-end mt-0');

            const makeFilterBtn = (svg, filter, title) => {
                const btn = createElement('button', 'p-1 rounded hover:bg-gray-600 transition-colors border');
                btn.innerHTML = svg;
                btn.title = title;
                btn.style.lineHeight = '0';
                btn.style.cursor = 'pointer';
                btn.addEventListener('click', () => {
                    this._chordSelection.setSelectionFilter(filter, this._sourceId);
                });
                filterBtns.appendChild(btn);
                return btn;
            };

            this._filterIntersectsBtn = makeFilterBtn(lineSvg, 'intersects', 'Intersect');
            this._filterOneEndpointBtn = makeFilterBtn(lineOneDotSvg, 'oneEndpoint', '1|2 Endpoint');
            this._filterBothEndpointsBtn = makeFilterBtn(lineTwoDotsSvg, 'bothEndpoints', '2 Endpoint');

            this._sidePanel.appendChild(filterBtns);

            // Set initial state and listen for changes
            this._updateShapeButtons(this._chordSelection.selectionShape);
            this._updateFilterButtons(this._chordSelection.selectionFilter);
            this._chordSelection.addEventListener('shapechange', (e) => {
                this._updateShapeButtons(e.detail.shape);
            });
            this._chordSelection.addEventListener('filterchange', (e) => {
                this._updateFilterButtons(e.detail.filter);
            });
        }

        this._selectedBins = new Set();
        this._activeBin = -1;

        // Listen for external selection changes (e.g. another histogram or canvas picker)
        if (this._chordSelection) {
            this._chordSelection.addEventListener('change', (e) => {
                const { source } = e.detail;
                // If another source changed the selection, clear our bar highlighting
                if (source !== this._sourceId) {
                    this._selectedBins.clear();
                    this._activeBin = -1;
                }
                // Always redraw to update selection overlays
                this._redraw();
            });
        }

        this._resizeObserver = new ResizeObserver(() => this._redraw());
        this._resizeObserver.observe(this.canvas);

        this._lengths = [];
        this._bins = [];
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

        // --- Selection overlay: proportional highlight based on ChordSelection ---
        if (this._chordSelection && this._chordSelection.size > 0 && this._lengths.length > 0) {
            // Count how many selected chord indices fall into each bin
            const selectedPerBin = new Array(bins.length).fill(0);
            for (const idx of this._chordSelection.indices) {
                if (idx < 0 || idx >= this._lengths.length) continue;
                const len = this._lengths[idx];
                // Find which bin this length falls into
                const binIdx = this._lengthToBin(len);
                if (binIdx >= 0 && binIdx < bins.length) {
                    selectedPerBin[binIdx]++;
                }
            }

            // Draw proportional overlay rectangles with count annotations
            for (let i = 0; i < bins.length; i++) {
                if (selectedPerBin[i] <= 0 || bins[i] <= 0) continue;
                const fraction = Math.min(selectedPerBin[i] / bins[i], 1);
                const fullBarH = (bins[i] / maxCount) * plotH;
                const overlayH = fraction * fullBarH;
                const x = padding.left + i * barW + gap;
                const y = padding.top + plotH - overlayH;  // anchor at bottom
                const w = barW - gap * 2;

                ctx.fillStyle = this.highlightColor;
                ctx.fillRect(x, y, Math.max(w, 1), overlayH);

                // Count annotation above the full bar
                const fullBarTop = padding.top + plotH - fullBarH;
                const barCenterX = x + Math.max(w, 1) / 2;
                ctx.fillStyle = this.highlightColor;
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${selectedPerBin[i]}`, barCenterX, fullBarTop - 2);
            }
        }

        // Selection range outlines — one rectangle per contiguous run of selected bins
        if (this._selectedBins.size > 0) {
            // Sort selected bins and find contiguous runs
            const sorted = [...this._selectedBins].sort((a, b) => a - b);
            ctx.strokeStyle = this.highlightColor;
            ctx.lineWidth = 2;
            let runStart = sorted[0];
            for (let i = 1; i <= sorted.length; i++) {
                if (i === sorted.length || sorted[i] !== sorted[i - 1] + 1) {
                    // End of a contiguous run: runStart..sorted[i-1]
                    const runEnd = sorted[i - 1];
                    const x = padding.left + runStart * barW;
                    const w = (runEnd - runStart + 1) * barW;
                    ctx.strokeRect(x, padding.top, w, plotH);
                    if (i < sorted.length) runStart = sorted[i];
                }
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
        return n.toFixed(2);
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
     * Map a chord length to its bin index.
     * @param {number} length
     * @returns {number} bin index, or -1 if out of range
     */
    _lengthToBin(length) {
        const numBins = this._bins.length;
        if (numBins === 0) return -1;
        const binWidth = (this._binMax - this._binMin) / numBins;
        if (binWidth <= 0) return 0;
        const idx = Math.floor((length - this._binMin) / binWidth);
        // Clamp: lengths exactly at _binMax fall into the last bin
        return Math.max(0, Math.min(idx, numBins - 1));
    }

    /**
     * Handle click on histogram canvas — select or deselect bars.
     * Plain click: select single bin (deselect others)
     * Ctrl/Cmd+click: toggle individual bin
     * Shift+click: range select from anchor to clicked bin
     */
    _onClick(e) {
        if (!this._lastPadding || !this._bins || this._bins.length === 0) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const padding = this._lastPadding;
        const barW = this._lastBarW;
        const isCtrlCmd = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;

        // Check if within plot area horizontally
        const plotX = x - padding.left;
        if (plotX < 0 || plotX >= this._lastPlotW) {
            if (!isCtrlCmd && !isShift) this._deselectAll();
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
            if (!isCtrlCmd && !isShift) this._deselectAll();
            return;
        }

        if (isCtrlCmd) {
            // Ctrl/Cmd+click: toggle individual bin (takes priority over shift)
            if (this._selectedBins.has(binIndex)) {
                this._selectedBins.delete(binIndex);
            } else {
                this._selectedBins.add(binIndex);
            }
            this._activeBin = binIndex;
        } else if (isShift && this._activeBin >= 0) {
            // Shift+click: range select from anchor to clicked bin
            const from = Math.min(this._activeBin, binIndex);
            const to = Math.max(this._activeBin, binIndex);
            this._selectedBins.clear();
            for (let i = from; i <= to; i++) {
                if (this._bins[i] > 0) this._selectedBins.add(i);
            }
            // Don't update _activeBin on shift-click (keep anchor)
        } else {
            // Plain click: select single bin
            if (this._selectedBins.size === 1 && this._selectedBins.has(binIndex)) {
                this._deselectAll();
                return;
            }
            this._selectedBins.clear();
            this._selectedBins.add(binIndex);
            this._activeBin = binIndex;
        }

        this._onSelectionChanged();
    }

    /**
     * Handle keyboard navigation — arrow keys move/extend selection.
     */
    _onKeyDown(e) {
        if (this._activeBin === -1 || !this._bins || this._bins.length === 0) return;

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const dir = e.key === 'ArrowLeft' ? -1 : 1;
            const next = this._findNextNonEmptyBin(dir);
            if (next === -1) return;

            if (e.shiftKey) {
                // Shift+arrow: extend selection
                this._selectedBins.add(next);
            } else {
                // Plain arrow: move to single bin
                this._selectedBins.clear();
                this._selectedBins.add(next);
            }
            this._activeBin = next;
            this._onSelectionChanged();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this._deselectAll();
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
            const idx = ((this._activeBin + direction * step) % n + n) % n;
            if (this._bins[idx] > 0) return idx;
        }
        return -1;
    }

    /** @private Called after selection changes — update visuals and push to ChordSelection */
    _onSelectionChanged(operation = 'set') {
        this._redraw();
        this._pushToChordSelection(operation);
    }

    /**
     * @private Compute segment indices for all selected bins and push to ChordSelection.
     * @param {'set'|'add'|'remove'|'toggle'} operation
     */
    _pushToChordSelection(operation = 'set') {
        if (!this._chordSelection) return;
        const indices = this._getSelectedSegmentIndices();
        if (operation === 'set') {
            if (indices.length === 0) {
                this._chordSelection.clear(this._sourceId);
            } else {
                this._chordSelection.set(indices, this._sourceId);
            }
        } else if (operation === 'add') {
            this._chordSelection.add(indices, this._sourceId);
        } else if (operation === 'remove') {
            this._chordSelection.remove(indices, this._sourceId);
        } else if (operation === 'toggle') {
            this._chordSelection.toggle(indices, this._sourceId);
        }
    }

    /** @private Get segment indices for all currently selected bins */
    _getSelectedSegmentIndices() {
        const indices = [];
        for (const binIdx of this._selectedBins) {
            const range = this._getBinRange(binIdx);
            if (!range) continue;
            for (let i = 0; i < this._lengths.length; i++) {
                const len = this._lengths[i];
                if (len >= range.minLength && len <= range.maxLength) {
                    indices.push(i);
                }
            }
        }
        return indices;
    }

    /** @private Get the combined min/max length range across all selected bins */
    _getSelectedRange() {
        if (this._selectedBins.size === 0) return null;
        let minL = Infinity, maxL = -Infinity;
        for (const binIdx of this._selectedBins) {
            const range = this._getBinRange(binIdx);
            if (!range) continue;
            if (range.minLength < minL) minL = range.minLength;
            if (range.maxLength > maxL) maxL = range.maxLength;
        }
        return minL < Infinity ? { minLength: minL, maxLength: maxL } : null;
    }

    /** @private Deselect all bins and clear ChordSelection */
    _deselectAll() {
        if (this._selectedBins.size > 0 || this._activeBin !== -1) {
            this._selectedBins.clear();
            this._activeBin = -1;
            this._redraw();
            if (this._chordSelection) {
                this._chordSelection.clear(this._sourceId);
            }
        }
    }


    /**
     * Update visual state of selection shape toggle buttons.
     * @param {'rect'|'circle'} shape
     */
    _updateShapeButtons(shape) {
        const activeClasses = ['text-green-400', 'bg-gray-700', 'border-green-400'];
        const inactiveClasses = ['text-gray-500', 'border-transparent'];

        const update = (btn, isActive) => {
            if (!btn) return;
            btn.classList.remove(...activeClasses, ...inactiveClasses);
            btn.classList.add(...(isActive ? activeClasses : inactiveClasses));
        };

        update(this._rectBtn, shape === 'rect');
        update(this._circleBtn, shape === 'circle');
        update(this._annulusBtn, shape === 'annulus');
    }

    /**
     * Update visual state of region filter mode buttons.
     * @param {'intersects'|'oneEndpoint'|'bothEndpoints'} filter
     */
    _updateFilterButtons(filter) {
        const activeClasses = ['text-green-400', 'bg-gray-700', 'border-green-400'];
        const inactiveClasses = ['text-gray-500', 'border-transparent'];

        const update = (btn, isActive) => {
            if (!btn) return;
            btn.classList.remove(...activeClasses, ...inactiveClasses);
            btn.classList.add(...(isActive ? activeClasses : inactiveClasses));
        };

        update(this._filterIntersectsBtn, filter === 'intersects');
        update(this._filterOneEndpointBtn, filter === 'oneEndpoint');
        update(this._filterBothEndpointsBtn, filter === 'bothEndpoints');
    }

    dispose() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
    }
}
