import { Curve } from './Curve.js';
import { gcd } from '../MathOps.js';

export class EpitrochoidCurve extends Curve {
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
        // Epitrochoid equations:
        // x = (R + r) * cos(theta) - d * cos(((R + r) / r) * theta)
        // y = (R + r) * sin(theta) - d * sin(((R + r) / r) * theta)

        const { R, r, d, A, rot } = this;
        const totalR = R + r;
        const ratio = totalR / r;

        let x = totalR * Math.cos(theta) - d * Math.cos(ratio * theta);
        let y = totalR * Math.sin(theta) - d * Math.sin(ratio * theta);

        // Apply Scaling (Amplitude)
        // Treating A=100 as "standard size" (1.0 scale) to keep sliders consistent
        // or we can treat A as just a raw multiplier. 
        // In Rhodonea, A is often ~100-300.
        // Let's normalize by 100 so A=100 is "neutral".
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
     * Finds special points on this Epitrochoid curve using Erb's Chebyshev
     * variety framework. Self-intersections lie on grid t_l = l·π/(P·Q) where
     * P/Q = (R+r)/r reduced. Boundary and zero points are computed analytically.
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

        // Erb Phase 1: correct kinematic ratio for epitrochoid = (R+r)/r
        const common = gcd(Ri, ri);
        const p = Ri / common;        // R/gcd(R,r)
        const q = ri / common;        // r/gcd(R,r)
        const P = p + q;              // (R+r)/gcd(R,r) — Erb's frequency integer
        const Q = q;                  // r/gcd(R,r) — same as q

        const zeroPoints = this._findZeroPointsAnalytical(totalRad, p);
        const boundaryPoints = this._findBoundaryPointsAnalytical(totalRad, p);
        const doublePoints = this._findDoublePointsSpatialHash(totalRad, P, Q, p, q);

        const result = { zeroPoints, doublePoints, boundaryPoints };
        this._spCache = result;
        this._spCacheSig = sig;
        return result;
    }

    /**
     * Analytical zero points. For epitrochoid, |z|=0 requires d = R+r.
     * When d ≈ R+r: θ_zero = 2kπr/R, k = 0..p-1
     */
    _findZeroPointsAnalytical(totalRad, p) {
        const { R, r, d } = this;
        const totalR = R + r;
        const EPS = 1e-6;

        // |z|²=(R+r)²+d²−2d(R+r)cos(Rθ/r)=0 only when d=R+r
        if (Math.abs(d - totalR) > EPS * Math.max(totalR, 1)) return [];

        const results = [];
        for (let k = 0; k < p; k++) {
            const theta = 2 * k * Math.PI * r / R;
            if (theta >= totalRad - 1e-9) break;
            const pt = this.getPoint(theta);
            results.push({ theta, x: pt.x, y: pt.y });
        }
        return results;
    }

    /**
     * Analytical boundary points (maxima of |z|²).
     * For epitrochoid: |z|² = (R+r)² + d² − 2d(R+r)cos(Rθ/r)
     * Maxima at θ = (2k+1)πr/R (where cos(Rθ/r) = −1), |z| = R+r+d
     */
    _findBoundaryPointsAnalytical(totalRad, p) {
        const { R, r, d, A } = this;
        const scale = (A || 100) / 100;
        const rMax = (R + r + d) * scale;
        const results = [];

        for (let k = 0; k < p; k++) {
            const theta = (2 * k + 1) * Math.PI * r / R;
            if (theta >= totalRad - 1e-9) break;
            const pt = this.getPoint(theta);
            results.push({ theta, x: pt.x, y: pt.y, r: rMax });
        }
        return results;
    }

    /**
     * Self-intersection detection via Erb's grid + spatial hash + refinement.
     * Phase 1: Evaluate curve on fine grid θ_l = l·π/(2·P·Q).
     * Phase 2: Spatial hash finds candidate pairs within generous tolerance.
     * Phase 3: Iterative sub-grid refinement confirms true intersections.
     */
    _findDoublePointsSpatialHash(totalRad, P, Q, p, q) {
        const scale = (this.A || 100) / 100;

        // Fine grid: π/(2·P·Q), matching Rhodonea convention
        const gridStep = Math.PI / (2 * P * Q);

        // Evaluate grid points
        const pts = [];
        const zeroThresh = 0.001 * (this.R + this.r + this.d) * scale;
        for (let l = 0; ; l++) {
            const theta = l * gridStep;
            if (theta >= totalRad - 1e-9) break;
            const pt = this.getPoint(theta);
            const dist = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
            if (dist < zeroThresh) continue; // skip origin
            pts.push({ theta, x: pt.x, y: pt.y });
        }

        if (pts.length < 2) return [];

        // Compute mean arc-length between adjacent grid points
        let totalArc = 0;
        for (let i = 1; i < pts.length; i++) {
            const dx = pts[i].x - pts[i - 1].x;
            const dy = pts[i].y - pts[i - 1].y;
            totalArc += Math.sqrt(dx * dx + dy * dy);
        }
        const meanArc = totalArc / (pts.length - 1);

        // Phase 2: candidate search with generous tolerance
        const candidateEPS = 0.1 * meanArc;
        const bucketSize = candidateEPS;
        const minThetaSep = 2 * Math.PI;

        const buckets = new Map();
        for (const pt of pts) {
            const bx = Math.floor(pt.x / bucketSize);
            const by = Math.floor(pt.y / bucketSize);
            const key = `${bx},${by}`;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(pt);
        }

        // Phase 3: refine each candidate pair
        const refineTol = 0.001 * Math.max(meanArc, 1e-6);
        const doublePoints = [];
        const foundSet = new Set();
        const processed = new Set();
        const self = this;

        for (const [cellKey, cellEntries] of buckets) {
            const [cbx, cby] = cellKey.split(',').map(Number);

            for (const pt of cellEntries) {
                if (processed.has(pt)) continue;

                for (let dxb = -1; dxb <= 1; dxb++) {
                    for (let dyb = -1; dyb <= 1; dyb++) {
                        const nk = `${cbx + dxb},${cby + dyb}`;
                        const neighbors = buckets.get(nk);
                        if (!neighbors) continue;

                        for (const other of neighbors) {
                            if (other === pt || processed.has(other)) continue;
                            if (Math.abs(other.theta - pt.theta) < minThetaSep) continue;

                            const ddx = pt.x - other.x;
                            const ddy = pt.y - other.y;
                            if (Math.sqrt(ddx * ddx + ddy * ddy) < candidateEPS) {
                                // Sub-grid refinement: iteratively narrow search window
                                let t1 = pt.theta, t2 = other.theta;
                                let step = gridStep;
                                let bestDist = Math.sqrt(ddx * ddx + ddy * ddy);

                                for (let level = 0; level < 10 && bestDist > refineTol; level++) {
                                    step /= 3;
                                    let best_t1 = t1, best_t2 = t2;
                                    for (let di = -2; di <= 2; di++) {
                                        for (let dj = -2; dj <= 2; dj++) {
                                            const tt1 = t1 + di * step;
                                            const tt2 = t2 + dj * step;
                                            if (tt1 < 0 || tt1 >= totalRad) continue;
                                            if (tt2 < 0 || tt2 >= totalRad) continue;
                                            const p1 = self.getPoint(tt1);
                                            const p2 = self.getPoint(tt2);
                                            const d = Math.sqrt(
                                                (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2
                                            );
                                            if (d < bestDist) {
                                                bestDist = d;
                                                best_t1 = tt1;
                                                best_t2 = tt2;
                                            }
                                        }
                                    }
                                    t1 = best_t1;
                                    t2 = best_t2;
                                }

                                if (bestDist < refineTol) {
                                    const pf = self.getPoint(t1);
                                    const dedupEPS = refineTol * 10;
                                    const posKey = `${Math.round(pf.x / dedupEPS)},${Math.round(pf.y / dedupEPS)}`;
                                    if (!foundSet.has(posKey)) {
                                        foundSet.add(posKey);
                                        doublePoints.push({
                                            x: pf.x, y: pf.y,
                                            theta1: Math.min(t1, t2),
                                            theta2: Math.max(t1, t2)
                                        });
                                    }
                                }
                                processed.add(other);
                            }
                        }
                    }
                }
                processed.add(pt);
            }
        }

        return doublePoints;
    }

    getSignature() {
        return `Epitrochoid:${this.R}:${this.r}:${this.d}:${this.A}:${this.rot}`;
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
