import { Curve } from './Curve.js';
import { gcd } from '../MathOps.js';

export class RhodoneaCurve extends Curve {
    /**
     * @param {object} params
     * @param {number} params.n - The numerator of the k value (frequency).
     * @param {number} params.d - The denominator of the k value.
     * @param {number} params.A - The amplitude (radius).
     * @param {number} params.c - The offset from the origin.
     * @param {number} params.rot - The rotation in degrees.
     * @param {boolean} params.allowDoubleTrace - If true, bypass the both-odd halving rule.
     */
    constructor(params = {}) {
        super();
        this.n = params.n;
        this.d = params.d;
        this.A = params.A;
        this.c = params.c;
        this.rot = (params.rot || 0) * Math.PI / 180;
        this.allowDoubleTrace = !!params.allowDoubleTrace;
        this.k = this.n / this.d;
    }

    getPoint(theta) {
        // r = c + A * sin(k * theta)
        const r = this.c + this.A * Math.sin(this.k * theta);

        // Convert polar to cartesian with global rotation
        // x = r * cos(theta + rot)
        // y = r * sin(theta + rot)
        const totalAngle = theta + this.rot;
        return {
            x: r * Math.cos(totalAngle),
            y: r * Math.sin(totalAngle)
        };
    }

    getSignature() {
        return `Rhodonea:${this.n}:${this.d}:${this.A}:${this.c}:${this.rot}:${this.allowDoubleTrace}`;
    }

    getRadiansToClosure() {
        if (this.d === 0) return 0;

        const commonDivisor = gcd(this.n, this.d);
        const n1 = this.n / commonDivisor;
        const d1 = this.d / commonDivisor;

        // Logic from prototype/papers:
        // If both n1 and d1 are odd AND there is no radial offset,
        // the curve double-traces, so the period is PI (0.5 cycles).
        // With a non-zero offset c, the full period is needed for closure.
        // allowDoubleTrace bypasses the halving rule entirely, useful when
        // animating offset through zero to avoid a jarring period transition.
        // Otherwise, the period is 2PI * d1
        const canHalve = !this.allowDoubleTrace && n1 % 2 !== 0 && d1 % 2 !== 0 && this.c === 0;
        const cycles = canHalve ? (d1 / 2) : d1;

        return cycles * 2 * Math.PI;
    }

    /**
     * Finds all special points on this Rhodonea curve analytically.
     * Adapted from Erb's spectral node methodology for the form r = c + A·sin(k·θ).
     * 
     * @returns {{
     *   zeroPoints: Array<{theta: number, x: number, y: number}>,
     *   doublePoints: Array<{x: number, y: number, theta1: number, theta2: number}>,
     *   boundaryPoints: Array<{theta: number, x: number, y: number, r: number}>
     * }}
     */
    getSpecialPoints() {
        const totalRad = this.getRadiansToClosure();
        if (totalRad <= 0 || this.d === 0) {
            return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };
        }

        const EPS = 1e-9;
        const SPATIAL_EPS = 1e-6;
        const k = this.k;  // n/d

        const zeroPoints = this._findZeroPoints(totalRad, k, EPS);
        const boundaryPoints = this._findBoundaryPoints(totalRad, k, EPS);
        const doublePoints = this._findDoublePoints(totalRad, k, EPS, SPATIAL_EPS, zeroPoints, boundaryPoints);

        return { zeroPoints, doublePoints, boundaryPoints };
    }

    /**
     * Zero points: r = 0 → sin(k·θ) = -c/A
     * When c=0: sin(k·θ) = 0 → θ = mπ/k
     * When c≠0: solve arcsin(-c/A) with periodic extension
     */
    _findZeroPoints(totalRad, k, EPS) {
        const { A, c, rot } = this;
        const results = [];

        if (A === 0) return results;

        const ratio = -c / A;

        if (Math.abs(ratio) > 1 + EPS) {
            // No solutions: |c/A| > 1
            return results;
        }

        // Clamp for numerical safety
        const clampedRatio = Math.max(-1, Math.min(1, ratio));

        if (Math.abs(clampedRatio) < EPS) {
            // c ≈ 0: sin(k·θ) = 0 → k·θ = mπ → θ = mπ/k
            for (let m = 0; ; m++) {
                const theta = m * Math.PI / k;
                if (theta >= totalRad - EPS) break;
                results.push({ theta, x: 0, y: 0 });
            }
        } else {
            // General case: sin(k·θ) = clampedRatio
            // k·θ = arcsin(ratio) + 2πj  OR  k·θ = π - arcsin(ratio) + 2πj
            const baseAngle = Math.asin(clampedRatio);

            for (let branch = 0; branch < 2; branch++) {
                const anchor = branch === 0 ? baseAngle : (Math.PI - baseAngle);
                for (let j = -Math.ceil(k * totalRad / (2 * Math.PI)); ; j++) {
                    const kTheta = anchor + 2 * Math.PI * j;
                    const theta = kTheta / k;
                    if (theta < -EPS) continue;
                    if (theta >= totalRad - EPS) break;
                    if (theta >= 0) {
                        const pt = this.getPoint(theta);
                        results.push({ theta, x: pt.x, y: pt.y });
                    }
                }
            }
        }

        // Sort and deduplicate
        results.sort((a, b) => a.theta - b.theta);
        return this._deduplicateByTheta(results, EPS * 100);
    }

    /**
     * Boundary points: |r| maximal → sin(k·θ) = ±1
     * r = c + A → sin(k·θ) = +1 → k·θ = π/2 + 2πm
     * r = c - A → sin(k·θ) = -1 → k·θ = -π/2 + 2πm (= 3π/2 + 2πm)
     */
    _findBoundaryPoints(totalRad, k, EPS) {
        const { A, c, rot } = this;
        const results = [];

        if (A === 0) return results;

        // sin(k·θ) = +1: k·θ = π/2 + 2πm
        for (let m = 0; ; m++) {
            const theta = (Math.PI / 2 + 2 * Math.PI * m) / k;
            if (theta >= totalRad - EPS) break;
            if (theta >= 0) {
                const r = c + A;  // sin = +1
                const pt = this.getPoint(theta);
                results.push({ theta, x: pt.x, y: pt.y, r });
            }
        }

        // sin(k·θ) = -1: k·θ = 3π/2 + 2πm
        for (let m = 0; ; m++) {
            const theta = (3 * Math.PI / 2 + 2 * Math.PI * m) / k;
            if (theta >= totalRad - EPS) break;
            if (theta >= 0) {
                const r = c - A;  // sin = -1
                const pt = this.getPoint(theta);
                results.push({ theta, x: pt.x, y: pt.y, r });
            }
        }

        // Also check negative m for the first branch
        for (let m = -1; ; m--) {
            const theta = (Math.PI / 2 + 2 * Math.PI * m) / k;
            if (theta < -EPS) break;
            if (theta >= 0 && theta < totalRad - EPS) {
                const r = c + A;
                const pt = this.getPoint(theta);
                results.push({ theta, x: pt.x, y: pt.y, r });
            }
        }
        for (let m = -1; ; m--) {
            const theta = (3 * Math.PI / 2 + 2 * Math.PI * m) / k;
            if (theta < -EPS) break;
            if (theta >= 0 && theta < totalRad - EPS) {
                const r = c - A;
                const pt = this.getPoint(theta);
                results.push({ theta, x: pt.x, y: pt.y, r });
            }
        }

        results.sort((a, b) => a.theta - b.theta);
        return this._deduplicateByTheta(results, EPS * 100);
    }

    /**
     * Double points (non-origin self-intersections) via Erb's grid enumeration.
     * 
     * For r = c + A·sin(k·θ), in Erb's framework with m₁ = d, m₂ = n:
     * All self-intersections lie on the grid t_l = l·π / (2·m₁·m₂)
     * i.e., θ_l = l·π / (2·n·d)
     * 
     * We evaluate the curve at all grid points, filter out zero points
     * and boundary points, then identify unique spatial positions where
     * distinct θ values map to the same (x, y).
     */
    _findDoublePoints(totalRad, k, EPS, SPATIAL_EPS, zeroPoints, boundaryPoints) {
        const { n, d, A, c } = this;
        if (n === 0 || d === 0) return [];

        const m1 = d;
        const m2 = n;
        const gridStep = Math.PI / (2 * m1 * m2);
        // Must cover the FULL parameter range [0, totalRad), not just [0, 2π)
        const gridSize = Math.ceil(totalRad / gridStep);

        // Build set of known zero-point θ values for filtering
        const zeroThetas = new Set(zeroPoints.map(p => Math.round(p.theta * 1e8)));

        // Evaluate all grid points
        const gridPoints = [];
        for (let l = 0; l < gridSize; l++) {
            const theta = l * gridStep;
            if (theta >= totalRad - EPS) break;

            // Skip if this is a zero point (origin crossing)
            const thetaKey = Math.round(theta * 1e8);
            if (zeroThetas.has(thetaKey)) continue;

            // Check if the radius is ~0 (another way to filter zero points)
            const r = c + A * Math.sin(k * theta);
            if (Math.abs(r) < SPATIAL_EPS) continue;

            const pt = this.getPoint(theta);
            gridPoints.push({ theta, x: pt.x, y: pt.y, r });
        }

        // Group by spatial proximity to find doubles
        const doubles = [];
        const used = new Set();

        for (let i = 0; i < gridPoints.length; i++) {
            if (used.has(i)) continue;
            const pi = gridPoints[i];
            const group = [pi];

            for (let j = i + 1; j < gridPoints.length; j++) {
                if (used.has(j)) continue;
                const pj = gridPoints[j];
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                if (Math.sqrt(dx * dx + dy * dy) < SPATIAL_EPS * Math.max(1, Math.abs(A))) {
                    group.push(pj);
                    used.add(j);
                }
            }

            if (group.length >= 2) {
                used.add(i);
                // This is a self-intersection — record the first pair of thetas
                doubles.push({
                    x: pi.x,
                    y: pi.y,
                    theta1: group[0].theta,
                    theta2: group[1].theta
                });
            }
        }

        return doubles;
    }

    /** Helper: deduplicate points by theta proximity */
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

    static getParamsSchema() {
        return [
            { key: 'n', type: 'number', label: 'n (Numerator)', min: 1, max: 100, step: 1 },
            { key: 'd', type: 'number', label: 'd (Denominator)', min: 1, max: 100, step: 1 },
            { key: 'A', type: 'number', label: 'Amplitude (A)', min: 10, max: 300, step: 1 },
            { key: 'c', type: 'number', label: 'Offset (c)', min: 0, max: 200, step: 1 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1 },
            { key: 'allowDoubleTrace', type: 'boolean', label: 'Allow Double Trace', default: false }
        ];
    }
}
