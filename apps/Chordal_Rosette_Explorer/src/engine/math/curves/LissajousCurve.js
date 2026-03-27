import { Curve } from './Curve.js';
import { gcd } from '../MathOps.js';

export class LissajousCurve extends Curve {
    /**
     * @param {Object} params
     * @param {number} params.a - Frequency X
     * @param {number} params.b - Frequency Y
     * @param {number} params.delta - Phase shift in degrees
     * @param {number} params.A - Amplitude/Scale (default 100)
     * @param {number} params.rot - Rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.a = params.a;
        this.b = params.b;
        this.delta = params.delta;
        this.A = params.A;
        this.rot = params.rot || 0;
    }

    getPoint(theta) {
        // Lissajous equations:
        // x = A * sin(a * theta + delta)
        // y = A * sin(b * theta)

        const { a, b, delta, A, rot } = this;

        // Convert phase to radians
        const deltaRad = (delta * Math.PI) / 180;

        // Basic shape
        // Note: Using A as radius/half-width
        // We assume A=100 is roughly screen units
        let x = A * Math.sin(a * theta + deltaRad);
        let y = A * Math.sin(b * theta);

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
        const freqX = Math.round(this.a);
        const freqY = Math.round(this.b);

        if (freqX === 0 && freqY === 0) return 0;
        if (freqX === 0 || freqY === 0) return 2 * Math.PI;

        const common = gcd(freqX, freqY);
        return (2 * Math.PI) / common;
    }

    /**
     * Finds all special points on this Lissajous curve using fully algebraic
     * methods adapted from Erb's spectral node framework.
     *
     * - Zero points: sin(aθ+δ) = 0 AND sin(bθ) = 0 — enumeration
     * - Boundary points: bounding-box extrema where |x|=A or |y|=A
     * - Double points: Σ/Δ decomposition of sin=sin collision equations
     *   into two fully algebraic families (no numerical root-finding)
     *
     * Results are memoized per parameter signature.
     */
    getSpecialPoints() {
        const sig = this.getSignature();
        if (this._spCache && this._spCacheSig === sig) return this._spCache;

        const totalRad = this.getRadiansToClosure();
        if (totalRad <= 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        const a = Math.round(this.a);
        const b = Math.round(this.b);
        if (a === 0 || b === 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        const EPS = 1e-9;
        const SPATIAL_EPS = 1e-6;
        const deltaRad = (this.delta * Math.PI) / 180;

        const zeroPoints = this._findZeroPoints(totalRad, a, b, deltaRad, EPS);
        const boundaryPoints = this._findBoundaryPoints(totalRad, a, b, deltaRad, EPS);
        const doublePoints = this._findDoublePoints(totalRad, a, b, deltaRad, EPS, SPATIAL_EPS);

        const result = { zeroPoints, doublePoints, boundaryPoints };
        this._spCache = result;
        this._spCacheSig = sig;
        return result;
    }

    /**
     * Zero points: x=0 AND y=0 simultaneously.
     * sin(bθ) = 0 → θ = mπ/b, then check sin(aθ+δ) ≈ 0.
     */
    _findZeroPoints(totalRad, a, b, deltaRad, EPS) {
        const results = [];
        const maxM = Math.ceil(b * totalRad / Math.PI);

        for (let m = 0; m <= maxM; m++) {
            const theta = m * Math.PI / b;
            if (theta >= totalRad - EPS) break;
            if (Math.abs(Math.sin(a * theta + deltaRad)) < 1e-6) {
                const pt = this.getPoint(theta);
                results.push({ theta, x: pt.x, y: pt.y });
            }
        }
        return results;
    }

    /**
     * Boundary points: bounding-box extrema where the curve touches |x|=A or |y|=A.
     *
     * x-boundary: sin(aθ+δ) = ±1 → θ = (π/2 + kπ − δ) / a
     * y-boundary: sin(bθ) = ±1   → θ = (π/2 + kπ) / b
     *
     * This is the natural boundary definition for Lissajous curves in Erb's
     * framework, and is fully algebraic (no numerical peak detection).
     */
    _findBoundaryPoints(totalRad, a, b, deltaRad, EPS) {
        const results = [];
        const A = this.A || 100;

        // x-boundary: sin(aθ+δ) = ±1 → aθ+δ = π/2 + kπ
        const maxKx = Math.ceil(a * totalRad / Math.PI) + 2;
        for (let k = -maxKx; k <= maxKx; k++) {
            const theta = (Math.PI / 2 + k * Math.PI - deltaRad) / a;
            if (theta < -EPS || theta >= totalRad - EPS) continue;
            const pt = this.getPoint(Math.max(0, theta));
            const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
            results.push({ theta: Math.max(0, theta), x: pt.x, y: pt.y, r });
        }

        // y-boundary: sin(bθ) = ±1 → bθ = π/2 + kπ
        const maxKy = Math.ceil(b * totalRad / Math.PI) + 2;
        for (let k = 0; k <= maxKy; k++) {
            const theta = (Math.PI / 2 + k * Math.PI) / b;
            if (theta < -EPS || theta >= totalRad - EPS) continue;
            const pt = this.getPoint(theta);
            const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
            results.push({ theta, x: pt.x, y: pt.y, r });
        }

        // Sort and deduplicate (corner points appear in both x and y enumerations)
        results.sort((a, b) => a.theta - b.theta);
        return this._deduplicateByTheta(results, EPS * 100);
    }

    /**
     * Self-intersections via fully algebraic Σ/Δ decomposition.
     *
     * Collision: sin(aθ₁+δ) = sin(aθ₂+δ) AND sin(bθ₁) = sin(bθ₂).
     * Each sin=sin equation has two solution families (sum-type and diff-type).
     * Combining them yields two non-trivial algebraic families:
     *
     * Family A — Σ from x-condition, Δ from y-condition:
     *   Σ = (π(2n+1) − 2δ) / a    (discrete)
     *   Δ = 2πm / b                 (discrete, m ≥ 1)
     *
     * Family B — Σ from y-condition, Δ from x-condition:
     *   Σ = π(2m+1) / b            (discrete)
     *   Δ = 2πn / a                 (discrete, n ≥ 1)
     *
     * Both families are fully algebraic — no scanning or bisection needed.
     */
    _findDoublePoints(totalRad, a, b, deltaRad, EPS, SPATIAL_EPS) {
        const A = this.A || 100;
        const dedupRadius = Math.max(SPATIAL_EPS * A, 0.5);
        const foundSet = new Set();
        const doublePoints = [];
        const twoT = 2 * totalRad;

        // Helper: validate a (Σ, Δ) candidate and record if it's a real intersection
        const tryCandidate = (sigma, delta) => {
            if (delta < EPS) return;
            const theta1 = (sigma + delta) / 2;
            const theta2 = (sigma - delta) / 2;
            if (theta1 < -EPS || theta1 >= totalRad - EPS) return;
            if (theta2 < -EPS || theta2 >= totalRad - EPS) return;

            const pt1 = this.getPoint(theta1);
            const pt2 = this.getPoint(theta2);
            const dist = Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
            if (dist < 0.01 * Math.max(A, 1)) {
                // Skip origin (already counted as zero points)
                if (Math.abs(pt1.x) < SPATIAL_EPS * A &&
                    Math.abs(pt1.y) < SPATIAL_EPS * A) return;

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

        // === Family A: Σ from x-condition, Δ from y-condition ===
        // Σ = (π(2n+1) − 2δ) / a,  Δ = 2πm / b  (m ≥ 1)
        {
            // Range: 0 < Σ < 2T  →  2δ/π < 2n+1 < 2aT/π + 2δ/π
            const nMin = Math.ceil((2 * deltaRad / Math.PI - 1) / 2);
            const nMax = Math.floor(a * totalRad / Math.PI + (2 * deltaRad / Math.PI - 1) / 2);

            for (let n = nMin; n <= nMax; n++) {
                const sigma = (Math.PI * (2 * n + 1) - 2 * deltaRad) / a;
                if (sigma <= EPS || sigma >= twoT - EPS) continue;

                const deltaMax = Math.min(sigma, twoT - sigma);
                for (let m = 1; ; m++) {
                    const delta = 2 * Math.PI * m / b;
                    if (delta > deltaMax + EPS) break;
                    tryCandidate(sigma, delta);
                }
            }
        }

        // === Family B: Σ from y-condition, Δ from x-condition ===
        // Σ = π(2m+1) / b,  Δ = 2πn / a  (n ≥ 1)
        {
            const mMax = Math.floor(b * totalRad / Math.PI);
            for (let m = 0; m <= mMax; m++) {
                const sigma = Math.PI * (2 * m + 1) / b;
                if (sigma <= EPS || sigma >= twoT - EPS) continue;

                const deltaMax = Math.min(sigma, twoT - sigma);
                for (let n = 1; ; n++) {
                    const delta = 2 * Math.PI * n / a;
                    if (delta > deltaMax + EPS) break;
                    tryCandidate(sigma, delta);
                }
            }
        }

        return doublePoints;
    }

    /** Deduplicate points by theta proximity. */
    _deduplicateByTheta(points, eps) {
        if (points.length <= 1) return points;
        const result = [points[0]];
        for (let i = 1; i < points.length; i++) {
            if (Math.abs(points[i].theta - result[result.length - 1].theta) > eps) {
                result.push(points[i]);
            }
        }
        return result;
    }

    getSignature() {
        return `Lissajous:${this.a}:${this.b}:${this.delta}:${this.A}:${this.rot}`;
    }

    static supportsSpecialPoints() { return true; }

    static getParamsSchema() {
        return [
            { key: 'a', type: 'number', label: 'Frequency X (a)', min: 0, max: 20, step: 1 },
            { key: 'b', type: 'number', label: 'Frequency Y (b)', min: 0, max: 20, step: 1 },
            { key: 'delta', type: 'number', label: 'Phase (deg)', min: 0, max: 360, step: 1 },
            { key: 'A', type: 'number', label: 'Amplitude (Scale)', min: 0, max: 300, step: 1 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1 }
        ];
    }
}
