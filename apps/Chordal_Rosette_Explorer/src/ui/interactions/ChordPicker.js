/**
 * ChordPicker — canvas-based chord selection via click and drag.
 *
 * Attaches to a CanvasRenderer's canvas and converts mouse interactions
 * into ChordSelection operations. Uses the renderer's last renderables
 * and scale to perform hit testing.
 *
 * Click: select nearest chord segment within tolerance
 * Drag:  select all chord segments within selection rectangle
 * Modifiers: Ctrl/Cmd toggles, Shift adds
 */
export class ChordPicker {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {import('../../engine/ChordSelection').ChordSelection} chordSelection
     * @param {import('../../engine/renderer/Renderer').CanvasRenderer} renderer
     * @param {Object} [options]
     * @param {string} [options.sourceId='canvas']
     * @param {number} [options.hitTolerance=5] - Pixel tolerance for click picking
     * @param {number} [options.dragThreshold=4] - Pixel movement before drag starts
     */
    constructor(canvas, chordSelection, renderer, options = {}) {
        this._canvas = canvas;
        this._chordSelection = chordSelection;
        this._renderer = renderer;
        this._sourceId = options.sourceId || 'canvas';
        this._hitTolerance = options.hitTolerance || 5;
        this._dragThreshold = options.dragThreshold || 4;

        // Drag state
        this._isDragging = false;
        this._dragStart = null;  // {x, y} in canvas CSS coords
        this._dragCurrent = null;

        // Overlay canvas for selection rectangle
        this._overlay = document.createElement('canvas');
        this._overlay.style.position = 'absolute';
        this._overlay.style.top = '0';
        this._overlay.style.left = '0';
        this._overlay.style.width = '100%';
        this._overlay.style.height = '100%';
        this._overlay.style.pointerEvents = 'none';

        // Bind handlers
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);

        this.attach();
    }

    attach() {
        this._canvas.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);

        // Insert overlay as sibling
        if (this._canvas.parentElement && !this._overlay.parentElement) {
            this._canvas.parentElement.appendChild(this._overlay);
        }
    }

    detach() {
        this._canvas.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        if (this._overlay.parentElement) {
            this._overlay.parentElement.removeChild(this._overlay);
        }
    }

    // ── Coordinate Conversion ────────────────────────────────

    /**
     * Convert canvas CSS coordinates to world coordinates.
     * The renderer transform is: translate(w/2, h/2) + scale(s).
     * DPR is applied to the backing store but CSS coords are pre-DPR.
     */
    _canvasToWorld(cssX, cssY) {
        const dpr = window.devicePixelRatio || 1;
        // CSS coords → physical pixel coords
        const px = cssX * dpr;
        const py = cssY * dpr;
        const scale = this._renderer.lastScale;
        const w = this._renderer.width;
        const h = this._renderer.height;
        // Invert: translate(w/2, h/2) then scale(s)
        const worldX = (px - w / 2) / scale;
        const worldY = (py - h / 2) / scale;
        return { x: worldX, y: worldY };
    }

    /**
     * Get CSS coordinates of mouse event relative to canvas.
     */
    _getCanvasCoords(e) {
        const rect = this._canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    // ── Hit Testing ──────────────────────────────────────────

    /**
     * Find the nearest chord segment to a world point, across all 'rose' renderables.
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @param {number} toleranceWorld - Tolerance in world units
     * @returns {number} segment index, or -1
     */
    _nearestSegment(wx, wy, toleranceWorld) {
        const renderables = this._renderer.lastRenderables;
        let bestDist = toleranceWorld;
        let bestIdx = -1;

        for (const item of renderables) {
            if (item.type !== 'rose' && item.type !== 'hybrid') continue;
            const pts = item.points;
            if (!pts || pts.length < 2) continue;

            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const x1 = p1.x !== undefined ? p1.x : p1[0];
                const y1 = p1.y !== undefined ? p1.y : p1[1];
                const x2 = p2.x !== undefined ? p2.x : p2[0];
                const y2 = p2.y !== undefined ? p2.y : p2[1];
                const d = this._pointToSegmentDist(wx, wy, x1, y1, x2, y2);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
        }

        return bestIdx;
    }

    /**
     * Find all chord segments that intersect or are enclosed by a world-space rectangle.
     * @param {Object} rect - {x1, y1, x2, y2} in world coords (corners)
     * @returns {Set<number>}
     */
    _segmentsInRect(rect) {
        const renderables = this._renderer.lastRenderables;
        const indices = new Set();
        const minX = Math.min(rect.x1, rect.x2);
        const maxX = Math.max(rect.x1, rect.x2);
        const minY = Math.min(rect.y1, rect.y2);
        const maxY = Math.max(rect.y1, rect.y2);

        for (const item of renderables) {
            if (item.type !== 'rose' && item.type !== 'hybrid') continue;
            const pts = item.points;
            if (!pts || pts.length < 2) continue;

            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const x1 = p1.x !== undefined ? p1.x : p1[0];
                const y1 = p1.y !== undefined ? p1.y : p1[1];
                const x2 = p2.x !== undefined ? p2.x : p2[0];
                const y2 = p2.y !== undefined ? p2.y : p2[1];

                // Check if either endpoint is inside the rect,
                // or if the segment intersects the rect
                if (this._segmentIntersectsRect(x1, y1, x2, y2, minX, minY, maxX, maxY)) {
                    indices.add(i);
                }
            }
        }

        return indices;
    }

    /**
     * Point-to-line-segment distance.
     */
    _pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) {
            // Degenerate segment (point)
            return Math.hypot(px - x1, py - y1);
        }
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.hypot(px - projX, py - projY);
    }

    /**
     * Check if a line segment intersects or is contained within a rectangle.
     */
    _segmentIntersectsRect(x1, y1, x2, y2, rMinX, rMinY, rMaxX, rMaxY) {
        // If either endpoint is inside the rect
        if (x1 >= rMinX && x1 <= rMaxX && y1 >= rMinY && y1 <= rMaxY) return true;
        if (x2 >= rMinX && x2 <= rMaxX && y2 >= rMinY && y2 <= rMaxY) return true;

        // Check segment-rect edge intersections using Cohen-Sutherland-style clipping
        return this._lineIntersectsRect(x1, y1, x2, y2, rMinX, rMinY, rMaxX, rMaxY);
    }

    /**
     * Cohen-Sutherland line clipping to check if line intersects rectangle.
     */
    _lineIntersectsRect(x1, y1, x2, y2, rMinX, rMinY, rMaxX, rMaxY) {
        const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
        const code = (x, y) => {
            let c = INSIDE;
            if (x < rMinX) c |= LEFT;
            else if (x > rMaxX) c |= RIGHT;
            if (y < rMinY) c |= BOTTOM;
            else if (y > rMaxY) c |= TOP;
            return c;
        };

        let c1 = code(x1, y1);
        let c2 = code(x2, y2);

        for (let i = 0; i < 10; i++) {
            if ((c1 | c2) === 0) return true;   // Both inside
            if ((c1 & c2) !== 0) return false;   // Both in same outer region

            const cOut = c1 !== 0 ? c1 : c2;
            let x, y;
            if (cOut & TOP) {
                x = x1 + (x2 - x1) * (rMaxY - y1) / (y2 - y1);
                y = rMaxY;
            } else if (cOut & BOTTOM) {
                x = x1 + (x2 - x1) * (rMinY - y1) / (y2 - y1);
                y = rMinY;
            } else if (cOut & RIGHT) {
                y = y1 + (y2 - y1) * (rMaxX - x1) / (x2 - x1);
                x = rMaxX;
            } else {
                y = y1 + (y2 - y1) * (rMinX - x1) / (x2 - x1);
                x = rMinX;
            }

            if (cOut === c1) {
                x1 = x; y1 = y;
                c1 = code(x1, y1);
            } else {
                x2 = x; y2 = y;
                c2 = code(x2, y2);
            }
        }
        return false;
    }

    // ── Mouse Handlers ───────────────────────────────────────

    _onMouseDown(e) {
        if (e.button !== 0) return; // Left click only
        this._dragStart = this._getCanvasCoords(e);
        this._dragCurrent = null;
        this._isDragging = false;
    }

    _onMouseMove(e) {
        if (!this._dragStart) return;
        const pos = this._getCanvasCoords(e);
        const dx = pos.x - this._dragStart.x;
        const dy = pos.y - this._dragStart.y;

        if (!this._isDragging && Math.hypot(dx, dy) >= this._dragThreshold) {
            this._isDragging = true;
        }

        if (this._isDragging) {
            this._dragCurrent = pos;
            this._drawSelectionRect();
        }
    }

    _onMouseUp(e) {
        if (!this._dragStart) return;

        const isCtrlCmd = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;

        if (this._isDragging && this._dragCurrent) {
            // Drag-to-pick
            const w1 = this._canvasToWorld(this._dragStart.x, this._dragStart.y);
            const w2 = this._canvasToWorld(this._dragCurrent.x, this._dragCurrent.y);
            const indices = this._segmentsInRect({
                x1: w1.x, y1: w1.y,
                x2: w2.x, y2: w2.y
            });

            if (indices.size > 0) {
                if (isShift || isCtrlCmd) {
                    this._chordSelection.add(indices, this._sourceId);
                } else {
                    this._chordSelection.set(indices, this._sourceId);
                }
            } else if (!isShift && !isCtrlCmd) {
                this._chordSelection.clear(this._sourceId);
            }

            this._clearSelectionRect();
        } else {
            // Click-to-pick
            const pos = this._getCanvasCoords(e);
            const world = this._canvasToWorld(pos.x, pos.y);
            const scale = this._renderer.lastScale;
            const dpr = window.devicePixelRatio || 1;
            const toleranceWorld = (this._hitTolerance * dpr) / scale;

            const idx = this._nearestSegment(world.x, world.y, toleranceWorld);

            if (idx >= 0) {
                if (isCtrlCmd) {
                    this._chordSelection.toggle([idx], this._sourceId);
                } else if (isShift) {
                    this._chordSelection.add([idx], this._sourceId);
                } else {
                    this._chordSelection.set([idx], this._sourceId);
                }
            } else if (!isCtrlCmd && !isShift) {
                this._chordSelection.clear(this._sourceId);
            }
        }

        this._dragStart = null;
        this._dragCurrent = null;
        this._isDragging = false;
    }

    // ── Selection Rectangle Overlay ──────────────────────────

    _drawSelectionRect() {
        if (!this._dragStart || !this._dragCurrent) return;

        const rect = this._canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this._overlay.width = Math.floor(rect.width * dpr);
        this._overlay.height = Math.floor(rect.height * dpr);
        this._overlay.style.width = `${rect.width}px`;
        this._overlay.style.height = `${rect.height}px`;

        const ctx = this._overlay.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const x = Math.min(this._dragStart.x, this._dragCurrent.x);
        const y = Math.min(this._dragStart.y, this._dragCurrent.y);
        const w = Math.abs(this._dragCurrent.x - this._dragStart.x);
        const h = Math.abs(this._dragCurrent.y - this._dragStart.y);

        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, w, h);
    }

    _clearSelectionRect() {
        const ctx = this._overlay.getContext('2d');
        ctx.clearRect(0, 0, this._overlay.width, this._overlay.height);
    }
}
