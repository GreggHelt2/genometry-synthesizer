import { Curve } from './Curve.js';
import { gcd, solveCRT } from '../MathOps.js';

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
     * Double points (non-origin self-intersections) via extended Erb analysis.
     *
     * For r(θ) = c + A·sin(kθ), self-intersections satisfy r₁² = r₂²:
     *
     * TYPE I (r₁ = r₂, θ₁ ≡ θ₂ mod 2π):
     *   Solutions at Erb grid points θ_l = l·π/(2nd) where l ≡ 0 (mod d).
     *   These are the same θ-values regardless of c.
     *   Detected via spatial grouping of coincident Erb nodes.
     *
     * TYPE II (r₁ = -r₂, θ₁ ≡ θ₂ + π mod 2π):  [only when c ≠ 0]
     *   Setting θ₁ - θ₂ = (2j+1)π and applying sum-to-product:
     *     sin(k·S) = -c / (A·β_j)
     *   where S = (θ₁+θ₂)/2, β_j = cos(n(2j+1)π/(2d)).
     *   Exact solutions via arcsin; no grid search needed.
     */
    _findDoublePoints(totalRad, k, EPS, SPATIAL_EPS, zeroPoints, boundaryPoints) {
        const { n, d, A, c } = this;
        if (n === 0 || d === 0) return [];

        const doubles = [];
        const foundPositions = new Set();
        const scaledEPS = SPATIAL_EPS * Math.max(1, Math.abs(A));
        const dedupRadius = Math.max(scaledEPS, 0.5);

        // === TYPE I: Fully algebraic Bézout/CRT pairing on Erb grid ===
        //
        // In t-space: γ(t) = sin(nt)·(cos(dt), sin(dt)), grid t_L = Lπ/(2dn).
        // Modular classification (c=0): L%(2d)==0 → zero, L%(2d)==d → boundary.
        // Collision γ(t₁)=γ(t₂) gives sin²(nt₁)=sin²(nt₂), yielding three CRT cases:
        //   Case A:  L' ≡ 2d-L (mod 4d) AND L' ≡ L    (mod 4n)  [same r, same angle]
        //   Case B1: L' ≡ -L   (mod 4d) AND L' ≡ L+2n  (mod 4n)  [opp r, opp angle]
        //   Case B2: L' ≡ L+2d (mod 4d) AND L' ≡ L+2n  (mod 4n)  [opp r, opp angle]
        const gridStep = Math.PI / (2 * n * d);
        const gridSize = Math.ceil(totalRad / gridStep);
        const N_full = 4 * d * n;
        const mod = (a, m) => ((a % m) + m) % m;

        // Build map of double-candidate Erb nodes (skip zeros and boundaries)
        const erbMap = new Map();
        for (let l = 0; l < gridSize; l++) {
            if (l % d !== 0) continue;
            const theta = l * gridStep;
            if (theta >= totalRad - EPS) break;

            const L = l / d;  // t-space Erb grid index

            // When c=0: modular classification skips zeros/boundaries
            // When c≠0: check actual r value (zero/boundary positions shift)
            if (Math.abs(c) < EPS) {
                const Lmod = L % (2 * d);
                if (Lmod === 0 || Lmod === d) continue;
            } else {
                const r = c + A * Math.sin(k * theta);
                if (Math.abs(r) < SPATIAL_EPS) continue;
            }

            const pt = this.getPoint(theta);
            erbMap.set(L, { theta, x: pt.x, y: pt.y });
        }

        // Find partners via CRT — no distance testing needed
        const pairedL = new Set();

        for (const [L, pi] of erbMap) {
            if (pairedL.has(L)) continue;

            // Three CRT cases from the collision equation
            const candidates = [];

            // Case A: same sin(nt), same angle direction
            const cA = solveCRT(mod(L, 4*n), 4*n, mod(2*d-L, 4*d), 4*d);
            if (cA !== null && cA < N_full && cA !== L) candidates.push(cA);

            // Cases B1/B2: opposite sin(nt), opposite angle
            // When c≠0, these are handled by the Type II analytical formula
            if (Math.abs(c) < EPS) {
                const cB1 = solveCRT(mod(L+2*n, 4*n), 4*n, mod(-L, 4*d), 4*d);
                if (cB1 !== null && cB1 < N_full && cB1 !== L) candidates.push(cB1);

                const cB2 = solveCRT(mod(L+2*n, 4*n), 4*n, mod(L+2*d, 4*d), 4*d);
                if (cB2 !== null && cB2 < N_full && cB2 !== L) candidates.push(cB2);
            }

            for (const Lp of candidates) {
                if (pairedL.has(Lp)) continue;
                if (!erbMap.has(Lp)) continue;

                const pj = erbMap.get(Lp);
                pairedL.add(L);
                pairedL.add(Lp);

                const posKey = `${Math.round(pi.x / dedupRadius)},${Math.round(pi.y / dedupRadius)}`;
                foundPositions.add(posKey);
                doubles.push({
                    x: pi.x, y: pi.y,
                    theta1: Math.min(pi.theta, pj.theta),
                    theta2: Math.max(pi.theta, pj.theta)
                });
                break;
            }
        }

        // === TYPE II: Analytical offset intersections (only when c ≠ 0) ===
        if (Math.abs(c) >= EPS) {
            const maxJ = Math.floor((totalRad / Math.PI - 1) / 2);
            const pRange = Math.ceil(k * totalRad / (2 * Math.PI)) + 1;

            for (let j = 0; j <= maxJ; j++) {
                const halfDelta = (2 * j + 1) * Math.PI / 2;
                const beta = Math.cos(n * (2 * j + 1) * Math.PI / (2 * d));

                if (Math.abs(beta) < EPS) continue;
                const ratio = -c / (A * beta);
                if (Math.abs(ratio) > 1 + EPS) continue;

                const clampedRatio = Math.max(-1, Math.min(1, ratio));
                const base = Math.asin(clampedRatio);

                for (let branch = 0; branch < 2; branch++) {
                    const anchor = branch === 0 ? base : (Math.PI - base);

                    for (let p = -pRange; p <= pRange; p++) {
                        const kS = anchor + 2 * Math.PI * p;
                        const S = kS / k;
                        const theta1 = S + halfDelta;
                        const theta2 = S - halfDelta;

                        if (theta1 < -EPS || theta1 >= totalRad + EPS) continue;
                        if (theta2 < -EPS || theta2 >= totalRad + EPS) continue;

                        // Verify r₁ = -r₂
                        const r1 = c + A * Math.sin(k * theta1);
                        const r2 = c + A * Math.sin(k * theta2);
                        if (Math.abs(r1 + r2) > 0.01 * Math.max(1, Math.abs(A))) continue;
                        if (Math.abs(r1) < EPS) continue;

                        const x = r1 * Math.cos(theta1);
                        const y = r1 * Math.sin(theta1);

                        // Deduplicate against existing doubles
                        const posKey = `${Math.round(x / dedupRadius)},${Math.round(y / dedupRadius)}`;
                        if (!foundPositions.has(posKey)) {
                            foundPositions.add(posKey);
                            doubles.push({
                                x, y,
                                theta1: Math.min(theta1, theta2),
                                theta2: Math.max(theta1, theta2)
                            });
                        }
                    }
                }
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
