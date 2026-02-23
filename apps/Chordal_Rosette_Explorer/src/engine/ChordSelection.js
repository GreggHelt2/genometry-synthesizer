/**
 * ChordSelection — centralized, source-agnostic chord selection model.
 *
 * A single instance tracks which chord segment indices are selected and
 * whether highlighting is linked across all renderers.  Any UI component
 * (histogram, canvas picker, etc.) can drive selection via set/add/remove/toggle/clear.
 *
 * Emits 'change' CustomEvents with detail: { indices: Set<number>, linked: boolean, source: string }
 *
 * Phase 1: flat Set<index> — all cosets, all contexts.
 * Phase 3 (future): optional scope { coset?, context? } for narrower selection.
 */
export class ChordSelection extends EventTarget {
    constructor() {
        super();
        /** @type {Set<number>} */
        this._indices = new Set();
        /** @type {boolean} */
        this._linked = false;
        /** @type {'rect'|'circle'|'annulus'} */
        this._selectionShape = 'rect';
        /** @type {number} Hit tolerance in CSS pixels */
        this._hitTolerance = 5;
        /** @type {'intersects'|'oneEndpoint'|'bothEndpoints'} */
        this._selectionFilter = 'intersects';
    }

    // ── Getters ──────────────────────────────────────────────

    /** @returns {Set<number>} Current selected segment indices (read-only copy). */
    get indices() { return this._indices; }

    /** @returns {number} Number of selected segments. */
    get size() { return this._indices.size; }

    /** @returns {boolean} Whether highlighting is linked across all renderers. */
    get linked() { return this._linked; }

    /** @returns {'rect'|'circle'|'annulus'} Current drag selection shape. */
    get selectionShape() { return this._selectionShape; }

    /** @returns {number} Hit tolerance in CSS pixels. */
    get hitTolerance() { return this._hitTolerance; }

    /** @returns {'intersects'|'oneEndpoint'|'bothEndpoints'} Region filter mode. */
    get selectionFilter() { return this._selectionFilter; }

    // ── Selection Operations ─────────────────────────────────

    /**
     * Replace entire selection.
     * @param {Iterable<number>} indices
     * @param {string} [source='unknown']
     */
    set(indices, source = 'unknown') {
        this._indices = new Set(indices);
        this._emit(source);
    }

    /**
     * Add indices to selection (union).
     * @param {Iterable<number>} indices
     * @param {string} [source='unknown']
     */
    add(indices, source = 'unknown') {
        for (const i of indices) this._indices.add(i);
        this._emit(source);
    }

    /**
     * Remove indices from selection (subtract).
     * @param {Iterable<number>} indices
     * @param {string} [source='unknown']
     */
    remove(indices, source = 'unknown') {
        for (const i of indices) this._indices.delete(i);
        this._emit(source);
    }

    /**
     * Toggle indices (symmetric difference).
     * @param {Iterable<number>} indices
     * @param {string} [source='unknown']
     */
    toggle(indices, source = 'unknown') {
        for (const i of indices) {
            if (this._indices.has(i)) {
                this._indices.delete(i);
            } else {
                this._indices.add(i);
            }
        }
        this._emit(source);
    }

    /**
     * Clear all selections.
     * @param {string} [source='unknown']
     */
    clear(source = 'unknown') {
        if (this._indices.size === 0) return; // no-op avoids spurious events
        this._indices.clear();
        this._emit(source);
    }

    /**
     * Add a contiguous range of indices, with optional filter.
     * @param {number} from - Start index (inclusive)
     * @param {number} to - End index (inclusive)
     * @param {function(number): boolean} [filterFn] - Optional predicate
     * @param {string} [source='unknown']
     */
    addRange(from, to, filterFn, source = 'unknown') {
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        for (let i = lo; i <= hi; i++) {
            if (!filterFn || filterFn(i)) {
                this._indices.add(i);
            }
        }
        this._emit(source);
    }

    // ── Link State ───────────────────────────────────────────

    /**
     * Set linked state and emit change.
     * @param {boolean} linked
     * @param {string} [source='unknown']
     */
    setLinked(linked, source = 'unknown') {
        if (this._linked === linked) return;
        this._linked = linked;
        this._emit(source);
    }

    /**
     * Set drag selection shape and emit shapechange.
     * @param {'rect'|'circle'} shape
     * @param {string} [source='unknown']
     */
    setSelectionShape(shape, source = 'unknown') {
        if (this._selectionShape === shape) return;
        this._selectionShape = shape;
        this.dispatchEvent(new CustomEvent('shapechange', {
            detail: { shape, source }
        }));
    }

    /**
     * Set hit tolerance and emit tolerancechange.
     * @param {number} tolerance - CSS pixel tolerance
     * @param {string} [source='unknown']
     */
    setHitTolerance(tolerance, source = 'unknown') {
        if (this._hitTolerance === tolerance) return;
        this._hitTolerance = tolerance;
        this.dispatchEvent(new CustomEvent('tolerancechange', {
            detail: { tolerance, source }
        }));
    }

    /**
     * Set region selection filter mode and emit filterchange.
     * @param {'intersects'|'oneEndpoint'|'bothEndpoints'} filter
     * @param {string} [source='unknown']
     */
    setSelectionFilter(filter, source = 'unknown') {
        if (this._selectionFilter === filter) return;
        this._selectionFilter = filter;
        this.dispatchEvent(new CustomEvent('filterchange', {
            detail: { filter, source }
        }));
    }

    // ── Internal ─────────────────────────────────────────────

    /** @private Emit a 'change' CustomEvent */
    _emit(source) {
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                indices: this._indices,
                linked: this._linked,
                source
            }
        }));
    }
}
