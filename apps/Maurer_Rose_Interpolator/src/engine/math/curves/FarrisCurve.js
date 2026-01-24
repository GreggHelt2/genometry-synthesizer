import { Curve } from './Curve.js';
import { gcd } from '../MathOps.js';

export class FarrisCurve extends Curve {
    /**
     * @param {Object} params
     * @param {number} params.r1 - Radius of arm 1
     * @param {number} params.k1 - Frequency of arm 1
     * @param {number} params.r2 - Radius of arm 2
     * @param {number} params.k2 - Frequency of arm 2
     * @param {number} params.r3 - Radius of arm 3
     * @param {number} params.k3 - Frequency of arm 3
     * @param {number} params.A - Amplitude/Scale (default 100)
     * @param {number} params.rot - Rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.r1 = params.r1 !== undefined ? params.r1 : 100;
        this.k1 = params.k1 !== undefined ? params.k1 : 1;
        this.r2 = params.r2 !== undefined ? params.r2 : 50;
        this.k2 = params.k2 !== undefined ? params.k2 : 7;
        this.r3 = params.r3 !== undefined ? params.r3 : 25;
        this.k3 = params.k3 !== undefined ? params.k3 : -17;
        this.A = params.A !== undefined ? params.A : 100;
        this.rot = params.rot || 0;
    }

    getPoint(theta) {
        // Farris Mystery Curve (3-chain linkage trace)
        // Sum of 3 rotating vectors
        const { r1, k1, r2, k2, r3, k3, A, rot } = this;

        // Raw linkage position
        let x = r1 * Math.cos(k1 * theta) + r2 * Math.cos(k2 * theta) + r3 * Math.cos(k3 * theta);
        let y = r1 * Math.sin(k1 * theta) + r2 * Math.sin(k2 * theta) + r3 * Math.sin(k3 * theta);

        // Apply Scaling (Amplitude)
        // Normalize: A=100 -> 1.0 scale factor relative to the raw sum
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

    getPeriodToClosure() {
        // Period is 2PI assuming fundamental period logic holds for integer k.
        // For general closure, it's 2PI / GCD(k1, k2, k3).

        // Ensure strictly integer frequencies for GCD calc
        const f1 = Math.round(Math.abs(this.k1));
        const f2 = Math.round(Math.abs(this.k2));
        const f3 = Math.round(Math.abs(this.k3));

        let common = 1;
        if (f1 !== 0 && f2 !== 0 && f3 !== 0) {
            common = gcd(f1, gcd(f2, f3));
        }

        return (2 * Math.PI) / (common || 1);
    }

    getSignature() {
        return `Farris:${this.r1}:${this.k1}:${this.r2}:${this.k2}:${this.r3}:${this.k3}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            { key: 'r1', type: 'number', label: 'Radius 1', min: 0, max: 200, step: 1, default: 100 },
            { key: 'k1', type: 'number', label: 'Freq 1', min: -20, max: 20, step: 1, default: 1 },
            { key: 'r2', type: 'number', label: 'Radius 2', min: 0, max: 200, step: 1, default: 50 },
            { key: 'k2', type: 'number', label: 'Freq 2', min: -20, max: 20, step: 1, default: 7 },
            { key: 'r3', type: 'number', label: 'Radius 3', min: 0, max: 200, step: 1, default: 25 },
            { key: 'k3', type: 'number', label: 'Freq 3', min: -20, max: 20, step: 1, default: -17 },
            { key: 'A', type: 'number', label: 'Amplitude (Scale)', min: 0, max: 300, step: 1, default: 100 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1, default: 0 }
        ];
    }
}
