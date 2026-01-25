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
        this.R = params.R || 100;
        this.r = params.r || 20;
        this.d = params.d || 50;
        this.A = params.A !== undefined ? params.A : 100;
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
        // The period depends on the ratio R/r.
        // Let R/r = p/q in simplest form.
        // The period is 2 * PI * q.
        // This is the same logic as Epitrochoid regarding the resonances.

        const numerator = Math.round(this.R);
        const denominator = Math.round(this.r);

        if (denominator === 0) return 2 * Math.PI;

        const common = gcd(numerator, denominator);
        const q = denominator / common;

        return 2 * Math.PI * q;
    }

    getSignature() {
        return `Hypotrochoid:${this.R}:${this.r}:${this.d}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            { key: 'R', type: 'number', label: 'Fixed Radius (R)', min: 10, max: 300, step: 1, default: 100 },
            { key: 'r', type: 'number', label: 'Rolling Radius (r)', min: 1, max: 150, step: 1, default: 20 },
            { key: 'd', type: 'number', label: 'Arm Length (d)', min: 0, max: 200, step: 1, default: 50 },
            { key: 'A', type: 'number', label: 'Amplitude (Scale)', min: 0, max: 300, step: 1, default: 100 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1, default: 0 }
        ];
    }
}
