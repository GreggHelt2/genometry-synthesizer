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
        // The period depends on the ratio R/r.
        // Let R/r = p/q in simplest form.
        // The period is 2 * PI * q.

        const numerator = Math.round(this.R);
        const denominator = Math.round(this.r);

        if (denominator === 0) return 2 * Math.PI;

        const common = gcd(numerator, denominator);
        const q = denominator / common;

        return 2 * Math.PI * q;
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
