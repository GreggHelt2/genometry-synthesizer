import { Curve } from './Curve.js';
import { gcd } from '../MathOps.js';

export class HypotrochoidCurve extends Curve {
    /**
     * @param {Object} params
     * @param {number} params.R - Radius of the fixed circle
     * @param {number} params.r - Radius of the rolling circle
     * @param {number} params.d - Distance from the center of the rolling circle
     * @param {number} params.A - Amplitude/Scale factor (default 100)
     * @param {number} params.rot - Rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.R = params.R;
        this.r = params.r;
        this.d = params.d;
        this.A = params.A;
        this.rot = params.rot || 0;
    }

    getPoint(theta) {
        // Hypotrochoid equations:
        // x = (R - r) * cos(theta) + d * cos(((R - r) / r) * theta)
        // y = (R - r) * sin(theta) - d * sin(((R - r) / r) * theta)

        const { R, r, d, A, rot } = this;
        const diffR = R - r;

        // Avoid division by zero
        const ratio = r === 0 ? 0 : diffR / r;

        let x = diffR * Math.cos(theta) + d * Math.cos(ratio * theta);
        let y = diffR * Math.sin(theta) - d * Math.sin(ratio * theta);

        // Apply Scaling (Amplitude)
        // Normalize: A=100 -> 1.0 scale
        const scale = A / 100;
        x *= scale;
        y *= scale;

        // Apply Rotation
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
        const numerator = Math.round(this.R);
        const denominator = Math.round(this.r);

        if (denominator === 0) return 2 * Math.PI;

        const common = gcd(numerator, denominator);
        const q = denominator / common;

        return 2 * Math.PI * q;
    }

    /**
     * Finds special points on this Hypotrochoid curve using Erb's Chebyshev
     * variety framework. Self-intersections lie on grid t_l = l·π/(P·Q) where
     * P/Q = (R-r)/r reduced. Boundary and zero points are computed analytically.
     * Results are memoized per instance.
     */
    getSpecialPoints() {
        const sig = this.getSignature();
        if (this._spCache && this._spCacheSig === sig) return this._spCache;

        const totalRad = this.getRadiansToClosure();
        if (totalRad <= 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        const Ri = Math.round(this.R);
        const ri = Math.round(this.r);
        if (ri === 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        // Erb Phase 1: correct kinematic ratio for hypotrochoid = |R-r|/r
        const common = gcd(Ri, ri);
        const p = Ri / common;        // R/gcd(R,r)
        const q = ri / common;        // r/gcd(R,r)
        const P = Math.abs(p - q);    // |R-r|/gcd(R,r) — Erb's frequency integer
        const Q = q;                  // r/gcd(R,r)

        const zeroPoints = this._findZeroPointsAnalytical(totalRad, p);
        const boundaryPoints = this._findBoundaryPointsAnalytical(totalRad, p);
        const doublePoints = P > 0
            ? this._findDoublePointsAlgebraic(totalRad, P, Q, p, q)
            : [];

        const result = { zeroPoints, doublePoints, boundaryPoints };
        this._spCache = result;
        this._spCacheSig = sig;
        return result;
    }

    /**
     * Analytical zero points. For hypotrochoid, |z|=0 requires d = R-r.
     * When d ≈ R-r: θ_zero = (2k+1)πr/R (where cos(Rθ/r) = -1)
     */
    _findZeroPointsAnalytical(totalRad, p) {
        const { R, r, d } = this;
        const diffR = R - r;
        const EPS = 1e-6;

        // |z|²=(R-r)²+d²+2d(R-r)cos(Rθ/r) = 0 only when d = R-r
        if (Math.abs(d - diffR) > EPS * Math.max(diffR, 1)) return [];

        const results = [];
        for (let k = 0; k < p; k++) {
            const theta = (2 * k + 1) * Math.PI * r / R;
            if (theta >= totalRad - 1e-9) break;
            const pt = this.getPoint(theta);
            results.push({ theta, x: pt.x, y: pt.y });
        }
        return results;
    }

    /**
     * Analytical boundary points (maxima of |z|²).
     * For hypotrochoid: |z|² = (R-r)² + d² + 2d(R-r)cos(Rθ/r)
     * Maxima at θ = 2kπr/R (where cos(Rθ/r) = +1), |z| = R-r+d
     */
    _findBoundaryPointsAnalytical(totalRad, p) {
        const { R, r, d, A } = this;
        const scale = (A || 100) / 100;
        const rMax = (R - r + d) * scale;
        const results = [];

        for (let k = 0; k < p; k++) {
            const theta = 2 * k * Math.PI * r / R;
            if (theta >= totalRad - 1e-9) break;
            // Skip θ=0 if it's a trivial point (optional)
            const pt = this.getPoint(theta);
            results.push({ theta, x: pt.x, y: pt.y, r: rMax });
        }
        return results;
    }

    /**
     * Self-intersection detection via semi-algebraic Σ/Δ decomposition.
     *
     * Collision z(s₁)=z(s₂) in normalized s-space (s=θ/Q) factorizes into:
     *   Phase condition:   Σ = s₁+s₂ = 2πn/p  (algebraic, 2p-1 discrete values)
     *   Magnitude condition: sin(qΔ/2) = ±γ·sin(PΔ/2)  where Δ=s₁-s₂
     *
     * For γ=1 (pure cycloid): magnitude is modular → exact.
     * For γ≠1: 1D root-finding via sign-change + bisection → machine precision.
     */
    _findDoublePointsAlgebraic(totalRad, P, Q, p, q) {
        const { R, r, d } = this;
        const gamma = Math.abs(R - r) < 1e-9 ? 0 : d / Math.abs(R - r);
        const scale = (this.A || 100) / 100;
        const maxRadius = (Math.abs(R - r) + d) * scale;
        const dedupRadius = Math.max(1.0, 0.01 * maxRadius);
        const foundSet = new Set();
        const doublePoints = [];
        const EPS = 1e-9;

        // Scan resolution: oversample both frequencies for Nyquist coverage
        const N_scan = 8 * Math.max(P, Q, 4);

        // Helper: validate and record an intersection from a (Σ, Δ) pair
        const tryCandidate = (sigma, rootDelta) => {
            if (rootDelta < EPS) return;
            const s1 = (sigma + rootDelta) / 2;
            const s2 = (sigma - rootDelta) / 2;
            const theta1 = Q * s1;
            const theta2 = Q * s2;
            if (theta1 < -EPS || theta1 >= totalRad + EPS) return;
            if (theta2 < -EPS || theta2 >= totalRad + EPS) return;

            const pt1 = this.getPoint(theta1);
            const pt2 = this.getPoint(theta2);
            const dist = Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
            if (dist < 0.01 * Math.max(maxRadius, 1)) {
                const posKey = `${Math.round(pt1.x / dedupRadius)},${Math.round(pt1.y / dedupRadius)}`;
                if (!foundSet.has(posKey)) {
                    foundSet.add(posKey);
                    doublePoints.push({
                        x: pt1.x, y: pt1.y,
                        theta1: Math.min(theta1, theta2),
                        theta2: Math.max(theta1, theta2)
                    });
                }
            }
        };

        // γ = 1 FAST PATH: Pure hypocycloid (d = R-r).
        // The most elegant solution — purely algebraic, no scanning or bisection.
        // sin(qΔ/2) = ±sin(PΔ/2) has closed-form modular solutions:
        //   Same-sign:  qΔ/2 = π - PΔ/2 + 2πk  →  Δ = 2π(2k+1)/(q+P)
        //   Opp-sign:   qΔ/2 = PΔ/2 + 2πk       →  Δ = 4πk/(q-P)  [when q ≠ P]
        if (Math.abs(gamma - 1) < EPS) {
            for (let n = 1; n < 2 * p; n++) {
                const sigma = 2 * Math.PI * n / p;
                const deltaMax = Math.min(sigma, 4 * Math.PI - sigma);

                // Same-sign solutions: Δ = 2π(2k+1)/(q+P) = 2π(2k+1)/p
                for (let k = 0; ; k++) {
                    const delta = 2 * Math.PI * (2 * k + 1) / p;
                    if (delta >= deltaMax) break;
                    tryCandidate(sigma, delta);
                }

                // Opposite-sign solutions: Δ = 4πk/(q-P) [only if q ≠ P]
                if (Math.abs(q - P) > EPS) {
                    for (let k = 1; ; k++) {
                        const delta = 4 * Math.PI * k / Math.abs(q - P);
                        if (delta >= deltaMax) break;
                        tryCandidate(sigma, delta);
                    }
                }
            }
            return doublePoints;
        }

        // GENERAL PATH (γ ≠ 1): Targeted 1D root-finding via sign-change + bisection
        for (let n = 1; n < 2 * p; n++) {
            const sigma = 2 * Math.PI * n / p;  // Σ in s-space
            const sign = (n % 2 === 0) ? 1 : -1;

            // f(Δ) = sin(qΔ/2) - sign·γ·sin(PΔ/2) = 0
            // Valid range: Δ ∈ (0, min(Σ, 4π-Σ)) ensures both s₁,s₂ ∈ [0,2π)
            const deltaMax = Math.min(sigma, 4 * Math.PI - sigma);
            if (deltaMax <= EPS) continue;

            const f = (delta) => Math.sin(q * delta / 2) - sign * gamma * Math.sin(P * delta / 2);

            // Sign-change scan to bracket roots
            const step = deltaMax / N_scan;
            let prevVal = f(EPS);

            for (let k = 1; k <= N_scan; k++) {
                const delta = k * step;
                const val = f(delta);

                if (prevVal * val < 0) {
                    // Bracket found — bisection refinement
                    let lo = (k - 1) * step || EPS;
                    let hi = delta;
                    for (let iter = 0; iter < 50; iter++) {
                        const mid = (lo + hi) / 2;
                        if (f(mid) * f(lo) < 0) hi = mid;
                        else lo = mid;
                    }
                    tryCandidate(sigma, (lo + hi) / 2);
                }
                prevVal = val;
            }
        }

        return doublePoints;
    }

    getSignature() {
        return `Hypotrochoid:${this.R}:${this.r}:${this.d}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            { key: 'R', type: 'number', label: 'Fixed Radius (R)', min: 10, max: 300, step: 1 },
            { key: 'r', type: 'number', label: 'Rolling Radius (r)', min: 1, max: 150, step: 1 },
            { key: 'd', type: 'number', label: 'Arm Length (d)', min: 0, max: 200, step: 1 },
            { key: 'A', type: 'number', label: 'Amplitude (Scale)', min: 0, max: 300, step: 1 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1 }
        ];
    }
}
