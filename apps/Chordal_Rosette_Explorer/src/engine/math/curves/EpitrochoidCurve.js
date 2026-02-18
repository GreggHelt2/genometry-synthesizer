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
     * Finds special points on this Epitrochoid curve using Erb's framework.
     * With R/r = p/q (reduced), self-intersections lie on grid t_l = l·π/(p·q).
     */
    getSpecialPoints() {
        const totalRad = this.getRadiansToClosure();
        if (totalRad <= 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        const numerator = Math.round(this.R);
        const denominator = Math.round(this.r);
        if (denominator === 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        const common = gcd(numerator, denominator);
        const p = numerator / common;
        const q = denominator / common;

        const EPS = 1e-9;
        const scale = (this.A || 100) / 100;
        const SPATIAL_EPS = 1e-4 * scale * Math.max(this.R, this.r, this.d, 1);

        // --- Zero Points: both x=0 and y=0 ---
        const zeroPoints = [];
        const gridStep = Math.PI / (p * q);
        const gridSize = Math.ceil(totalRad / gridStep);
        const gridPoints = [];

        for (let l = 0; l < gridSize; l++) {
            const theta = l * gridStep;
            if (theta >= totalRad - EPS) break;
            const pt = this.getPoint(theta);
            const dist = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
            gridPoints.push({ theta, x: pt.x, y: pt.y, dist });

            if (dist < SPATIAL_EPS) {
                zeroPoints.push({ theta, x: pt.x, y: pt.y });
            }
        }

        // --- Double Points: group by spatial proximity ---
        const doublePoints = [];
        const used = new Set();

        for (let i = 0; i < gridPoints.length; i++) {
            if (used.has(i)) continue;
            const pi = gridPoints[i];
            if (pi.dist < SPATIAL_EPS) { used.add(i); continue; }
            const group = [pi];

            for (let j = i + 1; j < gridPoints.length; j++) {
                if (used.has(j)) continue;
                const pj = gridPoints[j];
                if (pj.dist < SPATIAL_EPS) continue;
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                if (Math.sqrt(dx * dx + dy * dy) < SPATIAL_EPS) {
                    group.push(pj);
                    used.add(j);
                }
            }

            if (group.length >= 2) {
                used.add(i);
                doublePoints.push({
                    x: pi.x, y: pi.y,
                    theta1: group[0].theta, theta2: group[1].theta
                });
            }
        }

        // --- Boundary Points: numerical peak detection ---
        const boundaryPoints = this._findBoundaryPointsNumerical(totalRad);

        return { zeroPoints, doublePoints, boundaryPoints };
    }

    /**
     * Numerical boundary point detection — finds local maxima of x²+y².
     */
    _findBoundaryPointsNumerical(totalRad) {
        const sampleCount = Math.min(50000, Math.max(1000, Math.round(totalRad * 200)));
        const step = totalRad / sampleCount;
        const results = [];

        let prevR2 = 0, prevPrevR2 = 0;
        for (let i = 0; i <= sampleCount; i++) {
            const theta = i * step;
            const pt = this.getPoint(theta);
            const r2 = pt.x * pt.x + pt.y * pt.y;

            if (i >= 2 && prevR2 > prevPrevR2 && prevR2 > r2) {
                const peakTheta = (i - 1) * step;
                const peakPt = this.getPoint(peakTheta);
                const r = Math.sqrt(prevR2);
                results.push({ theta: peakTheta, x: peakPt.x, y: peakPt.y, r });
            }

            prevPrevR2 = prevR2;
            prevR2 = r2;
        }

        return results;
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
