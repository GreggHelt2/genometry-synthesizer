import { Curve } from './Curve.js';
import { gcd } from '../MathOps.js';

/**
 * Pausinger Binomial Curve
 *
 * The image of the unit circle under a weighted sum of two complex exponentials:
 *   γ^s_{a,b}(t) = (1 - s)·exp(2πi·a·t) + (1 + s)·exp(2πi·b·t)
 *
 * In Cartesian form (with θ = 2πt):
 *   x(θ) = (1-s)·cos(a·θ) + (1+s)·cos(b·θ)
 *   y(θ) = (1-s)·sin(a·θ) + (1+s)·sin(b·θ)
 *
 * Based on:
 *   - Pausinger & Vartziotis, "On the symmetry of finite sums of exponentials" (2018)
 *   - Pausinger & Vartziotis, "On the symmetry of finite sums of exponentials II" (2023)
 *   - Pausinger & Petrecca, "Symmetry groups and deformations of sums of exponentials" (2025)
 *
 * Properties:
 *   - Symmetry group: D_{b-a} (dihedral) for coprime a,b with s ∈ (-1,1)
 *   - Closure: 2π / gcd(a,b) radians
 *   - Boundary points: b-a maxima at t = j/(b-a)
 *   - Zero points: only when s=0, at t = h/(2(b-a)) for odd h
 *   - Self-intersections: analytical via Quine/Chebyshev method (Theorem 4.2, 2025 paper)
 */
export class PausingerBinomialCurve extends Curve {
    /**
     * @param {Object} params
     * @param {number} params.a - Frequency of first exponential (positive integer)
     * @param {number} params.b - Frequency of second exponential (positive integer, b > a)
     * @param {number} params.s - Deformation weight, s ∈ [-1, 1]. s=0 gives unweighted sum.
     * @param {number} params.A - Amplitude/Scale
     * @param {number} params.rot - Rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.a = Math.round(Math.max(1, params.a || 1));
        this.b = Math.round(Math.max(1, params.b || 6));
        this.s = params.s ?? 0;
        this.A = params.A ?? 100;
        this.rot = params.rot ?? 0;
    }

    getPoint(theta) {
        const { a, b, s, A, rot } = this;
        const v = 1 - s;   // weight for exp(i·a·θ)
        const w = 1 + s;   // weight for exp(i·b·θ)

        let x = v * Math.cos(a * theta) + w * Math.cos(b * theta);
        let y = v * Math.sin(a * theta) + w * Math.sin(b * theta);

        // Scale by amplitude (raw curve has max radius ≈ 2)
        const scale = A / 2;
        x *= scale;
        y *= scale;

        // Apply rotation
        if (rot !== 0) {
            const rotRad = (rot * Math.PI) / 180;
            const cosRot = Math.cos(rotRad);
            const sinRot = Math.sin(rotRad);
            const tx = x * cosRot - y * sinRot;
            const ty = x * sinRot + y * cosRot;
            x = tx;
            y = ty;
        }

        return { x, y };
    }

    getRadiansToClosure() {
        // Both exp(2πi·a·t) and exp(2πi·b·t) have period 1 in t (= 2π in θ).
        // When g = gcd(a, b) > 1, the curve retraces g times in [0, 2π].
        // Minimal non-retracing closure = 2π / g.
        const g = gcd(this.a, this.b);
        return (2 * Math.PI) / g;
    }

    getSamplesPerRadian() {
        // The curve oscillates at frequency b (the higher frequency).
        // Need ~40 samples per oscillation cycle for smooth rendering.
        // One cycle of frequency b is 2π/b radians, so per radian = 40 * b / (2π) ≈ 6.4 * b.
        // Use a minimum of 100 (the default) and scale up with b.
        return Math.max(100, Math.ceil(8 * this.b));
    }

    getSignature() {
        return `Pausinger:${this.a}:${this.b}:${this.s}:${this.A}:${this.rot}`;
    }

    // ================================================================
    //  SPECIAL POINTS — Full Analytical Implementation
    // ================================================================

    static supportsSpecialPoints() { return true; }

    getSpecialPoints() {
        const totalRad = this.getRadiansToClosure();
        if (totalRad <= 0 || this.a === this.b) {
            return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };
        }

        const EPS = 1e-9;
        const SPATIAL_EPS = 1e-6;

        const zeroPoints = this._findZeroPoints(totalRad, EPS);
        const boundaryPoints = this._findBoundaryPoints(totalRad, EPS);
        const doublePoints = this._findDoublePoints(totalRad, EPS, SPATIAL_EPS);

        return { zeroPoints, doublePoints, boundaryPoints };
    }

    // ----------------------------------------------------------------
    //  Zero Points: γ(t) = 0
    //
    //  Only possible when s = 0 (since |1-s| must equal |1+s|).
    //  When s = 0: zeros at t = h / (2(b'-a')) for odd h,
    //  where (a', b') = (a/g, b/g) are coprime-reduced.
    // ----------------------------------------------------------------
    _findZeroPoints(totalRad, EPS) {
        if (Math.abs(this.s) > EPS) return [];

        const g = gcd(this.a, this.b);
        const k = (this.b - this.a) / g;  // = b' - a'
        const results = [];

        for (let h = 1; h < 2 * k; h += 2) {
            const t = h / (2 * k);
            const theta = (2 * Math.PI * t) / g;
            if (theta >= totalRad - EPS) break;
            results.push({ theta, x: 0, y: 0 });
        }

        return results;
    }

    // ----------------------------------------------------------------
    //  Boundary Points: max |γ(t)|
    //
    //  Both exponentials align when (b-a)·t ∈ ℤ, i.e. t = j/(b-a).
    //  Max radius = |1-s| + |1+s| = 2 (for |s| ≤ 1), scaled by A/2.
    // ----------------------------------------------------------------
    _findBoundaryPoints(totalRad, EPS) {
        const g = gcd(this.a, this.b);
        const k = (this.b - this.a) / g;  // = b' - a'
        const results = [];

        for (let j = 0; j < k; j++) {
            const t = j / k;
            const theta = (2 * Math.PI * t) / g;
            if (theta >= totalRad - EPS) break;
            const pt = this.getPoint(theta);
            const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
            results.push({ theta, x: pt.x, y: pt.y, r });
        }

        return results;
    }

    // ----------------------------------------------------------------
    //  Self-Intersections (Double Points)
    //  Full analytical via Quine/Chebyshev method (Theorem 4.2, 2025 paper)
    //
    //  For p(z) = v·z^a + w·z^b, the Dieudonné polynomial gives:
    //    g(y, x) = v·U_{a-1}(y)·x^{a-1} + w·U_{b-1}(y)·x^{b-1} = 0
    //
    //  Since v, w are real, x^{b-a} must be ±1, yielding two equations:
    //    R⁺ (x^{b-a}=+1): v·sin(2πa'θ) + w·sin(2πb'θ) = 0
    //    R⁻ (x^{b-a}=-1): v·sin(2πa'θ) - w·sin(2πb'θ) = 0
    //
    //  Roots θ ∈ (0, 1/2) combined with (b'-a') directions per sign
    //  give all self-intersection points.
    // ----------------------------------------------------------------
    _findDoublePoints(totalRad, EPS, SPATIAL_EPS) {
        const g = gcd(this.a, this.b);
        const aP = this.a / g;  // coprime-reduced a'
        const bP = this.b / g;  // coprime-reduced b'
        const k = bP - aP;      // symmetry order

        if (k < 2) return [];    // Need at least D₂ for self-intersections

        const v = 1 - this.s;   // weight for exp(i·a·θ)
        const w = 1 + this.s;   // weight for exp(i·b·θ)

        // --- Phase 1: Find roots of both trigonometric equations ---

        // f₊(θ') = v·sin(2πa'θ') + w·sin(2πb'θ') = 0  [Case R⁺]
        // f₋(θ') = v·sin(2πa'θ') - w·sin(2πb'θ') = 0  [Case R⁻]
        const TWO_PI = 2 * Math.PI;

        const fPlus = (th) => v * Math.sin(TWO_PI * aP * th) + w * Math.sin(TWO_PI * bP * th);
        const fMinus = (th) => v * Math.sin(TWO_PI * aP * th) - w * Math.sin(TWO_PI * bP * th);

        const rootsPlus = this._findRootsInRange(fPlus, EPS, 0.5, bP);
        const rootsMinus = this._findRootsInRange(fMinus, EPS, 0.5, bP);

        // --- Phase 2: Enumerate intersection candidates ---
        const candidates = [];

        // R⁺ roots: directions x_j = exp(2πi·j/k), j = 0, ..., k-1
        for (const th0 of rootsPlus) {
            // Filter: skip if sin(2πθ') ≈ 0 (degenerate Chebyshev ratio)
            if (Math.abs(Math.sin(TWO_PI * th0)) < EPS) continue;

            for (let j = 0; j < k; j++) {
                const xPhase = j / k;
                const t1 = this._mod1(xPhase + th0);
                const t2 = this._mod1(xPhase - th0);
                if (Math.abs(t1 - t2) < EPS || Math.abs(t1 - t2 - 1) < EPS) continue;
                candidates.push({ t1, t2 });
            }
        }

        // R⁻ roots: directions x_j = exp(πi·(2j+1)/k), j = 0, ..., k-1
        for (const th0 of rootsMinus) {
            if (Math.abs(Math.sin(TWO_PI * th0)) < EPS) continue;

            for (let j = 0; j < k; j++) {
                const xPhase = (2 * j + 1) / (2 * k);
                const t1 = this._mod1(xPhase + th0);
                const t2 = this._mod1(xPhase - th0);
                if (Math.abs(t1 - t2) < EPS || Math.abs(t1 - t2 - 1) < EPS) continue;
                candidates.push({ t1, t2 });
            }
        }

        // --- Phase 3: Verify and deduplicate ---
        const scaledEPS = SPATIAL_EPS * Math.max(1, this.A / 2);
        const dedupRadius = Math.max(scaledEPS, 0.5);
        const foundPositions = new Set();
        const doubles = [];

        for (const { t1, t2 } of candidates) {
            // Map t ∈ [0, 1] to θ in the closure range [0, 2π/g]
            // The coprime curve has closure 2π, but our actual curve has closure 2π/g.
            // t is in [0, 1] for the coprime curve, so θ = 2π·t/g would map to [0, 2π/g].
            // But we need t within [0, 1/g] for the actual curve's closure range.
            const tInRange1 = t1 / g;
            const tInRange2 = t2 / g;

            if (tInRange1 < 0 || tInRange1 >= 1.0 / g + EPS) continue;
            if (tInRange2 < 0 || tInRange2 >= 1.0 / g + EPS) continue;

            const theta1 = TWO_PI * tInRange1;
            const theta2 = TWO_PI * tInRange2;

            if (theta1 >= totalRad + EPS || theta2 >= totalRad + EPS) continue;

            // Verify intersection
            const p1 = this.getPoint(theta1);
            const p2 = this.getPoint(theta2);
            const dx = Math.abs(p1.x - p2.x);
            const dy = Math.abs(p1.y - p2.y);

            if (dx > scaledEPS || dy > scaledEPS) continue;

            // Check it's not a zero point (already reported)
            if (Math.abs(p1.x) < scaledEPS && Math.abs(p1.y) < scaledEPS) continue;

            // Spatial deduplication
            const posKey = `${Math.round(p1.x / dedupRadius)},${Math.round(p1.y / dedupRadius)}`;
            if (foundPositions.has(posKey)) continue;
            foundPositions.add(posKey);

            doubles.push({
                x: p1.x,
                y: p1.y,
                theta1: Math.min(theta1, theta2),
                theta2: Math.max(theta1, theta2)
            });
        }

        return doubles;
    }

    // ----------------------------------------------------------------
    //  Root-finding helpers
    // ----------------------------------------------------------------

    /**
     * Find all roots of f(θ) in (0, upper) using sign-change detection + bisection.
     * @param {Function} f - The function to find roots of.
     * @param {number} EPS - Tolerance for root refinement and exclusion.
     * @param {number} upper - Upper bound of search interval (exclusive).
     * @param {number} maxFreq - Max frequency component (for sampling density).
     * @returns {number[]} Array of root values.
     */
    _findRootsInRange(f, EPS, upper, maxFreq) {
        // Sample at ~40 points per oscillation cycle for reliable sign-change detection
        const N = Math.max(200, Math.ceil(40 * maxFreq));
        const step = upper / N;
        const roots = [];

        let prevVal = f(EPS);  // avoid exact zero at θ=0

        for (let i = 1; i <= N; i++) {
            const th = i * step;
            const val = f(Math.min(th, upper - EPS));

            // Sign change detected — bracket a root
            if (prevVal * val < 0) {
                const root = this._bisect(f, (i - 1) * step, th, EPS);
                // Exclude roots too close to boundaries (0 and upper)
                if (root > EPS * 10 && root < upper - EPS * 10) {
                    roots.push(root);
                }
            }
            // Near-zero sample — could be a root
            else if (Math.abs(val) < EPS && th > EPS * 10 && th < upper - EPS * 10) {
                // Check it's not a duplicate of the last root
                if (roots.length === 0 || Math.abs(th - roots[roots.length - 1]) > step) {
                    roots.push(th);
                }
            }

            prevVal = val;
        }

        return roots;
    }

    /**
     * Bisection root refinement.
     * @param {Function} f
     * @param {number} lo
     * @param {number} hi
     * @param {number} tol
     * @returns {number}
     */
    _bisect(f, lo, hi, tol) {
        let fLo = f(lo);
        for (let i = 0; i < 60; i++) {
            const mid = (lo + hi) / 2;
            const fMid = f(mid);
            if (Math.abs(fMid) < tol || (hi - lo) < tol) return mid;
            if (fLo * fMid < 0) {
                hi = mid;
            } else {
                lo = mid;
                fLo = fMid;
            }
        }
        return (lo + hi) / 2;
    }

    /** Map t into [0, 1) */
    _mod1(t) {
        return ((t % 1) + 1) % 1;
    }

    // ----------------------------------------------------------------
    //  Schema
    // ----------------------------------------------------------------

    static getParamsSchema() {
        return [
            { key: 'a', type: 'number', label: 'Frequency a', min: 1, max: 30, step: 1 },
            { key: 'b', type: 'number', label: 'Frequency b', min: 1, max: 30, step: 1 },
            { key: 's', type: 'number', label: 'Deformation (s)', min: -1, max: 1, step: 0.01 },
            { key: 'A', type: 'number', label: 'Amplitude', min: 0, max: 300, step: 1 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1 }
        ];
    }
}
