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
     * Finds special points on this Lissajous curve.
     * Zero points: x=0 AND y=0 simultaneously.
     * Double points: grid-based enumeration from Erb's framework.
     * Boundary points: maxima of x²+y² via numerical peak detection.
     */
    getSpecialPoints() {
        const totalRad = this.getRadiansToClosure();
        if (totalRad <= 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        const a = Math.round(this.a);
        const b = Math.round(this.b);
        if (a === 0 || b === 0) return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };

        const EPS = 1e-9;
        const SPATIAL_EPS = 1e-4;

        // --- Zero Points: sin(a·θ + δ) = 0 AND sin(b·θ) = 0 ---
        const deltaRad = (this.delta * Math.PI) / 180;
        const zeroPoints = [];

        // sin(b·θ) = 0 → θ = mπ/b
        // Then check if sin(a·θ + δ) ≈ 0 at those θ
        for (let m = 0; ; m++) {
            const theta = m * Math.PI / b;
            if (theta >= totalRad - EPS) break;
            const valX = Math.sin(a * theta + deltaRad);
            if (Math.abs(valX) < 1e-6) {
                const pt = this.getPoint(theta);
                zeroPoints.push({ theta, x: pt.x, y: pt.y });
            }
        }

        // --- Double Points: grid t_l = l·π / (a·b) ---
        const gridStep = Math.PI / (a * b);
        const gridSize = Math.ceil(totalRad / gridStep);
        const gridPoints = [];

        for (let l = 0; l < gridSize; l++) {
            const theta = l * gridStep;
            if (theta >= totalRad - EPS) break;
            const pt = this.getPoint(theta);
            gridPoints.push({ theta, x: pt.x, y: pt.y });
        }

        // Group by spatial proximity
        const doublePoints = [];
        const used = new Set();
        const scale = this.A || 100;

        for (let i = 0; i < gridPoints.length; i++) {
            if (used.has(i)) continue;
            const pi = gridPoints[i];
            const group = [pi];

            for (let j = i + 1; j < gridPoints.length; j++) {
                if (used.has(j)) continue;
                const pj = gridPoints[j];
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                if (Math.sqrt(dx * dx + dy * dy) < SPATIAL_EPS * scale) {
                    group.push(pj);
                    used.add(j);
                }
            }

            if (group.length >= 2) {
                used.add(i);
                // Filter out zero points
                const isZero = Math.abs(pi.x) < SPATIAL_EPS * scale && Math.abs(pi.y) < SPATIAL_EPS * scale;
                if (!isZero) {
                    doublePoints.push({
                        x: pi.x, y: pi.y,
                        theta1: group[0].theta, theta2: group[1].theta
                    });
                }
            }
        }

        // --- Boundary Points: numerical peak detection of |r|² = x² + y² ---
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
                // Local maximum at i-1
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
        return `Lissajous:${this.a}:${this.b}:${this.delta}:${this.A}:${this.rot}`;
    }

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
