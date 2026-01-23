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
        this.a = params.a || 3;
        this.b = params.b || 2;
        this.delta = params.delta || 90; // Typical default for "open" Lissajous
        this.A = params.A !== undefined ? params.A : 100;
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

    getPeriodToClosure() {
        // The period of sin(a*t) is 2PI/a
        // The period of sin(b*t) is 2PI/b
        // The combined period is LCM(2PI/a, 2PI/b) = 2PI * LCM(1/a, 1/b)
        // = 2PI / GCD(a, b)

        // Since we allow floats in theory, but sliders are usually ints for a/b:
        const freqX = Math.round(this.a);
        const freqY = Math.round(this.b);

        if (freqX === 0 && freqY === 0) return 0;
        if (freqX === 0 || freqY === 0) return 2 * Math.PI; // Degenerate line

        const common = gcd(freqX, freqY);
        return (2 * Math.PI) / common;
    }

    getSignature() {
        return `Lissajous:${this.a}:${this.b}:${this.delta}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            { key: 'a', type: 'number', label: 'Frequency X (a)', min: 0, max: 20, step: 1, default: 3 },
            { key: 'b', type: 'number', label: 'Frequency Y (b)', min: 0, max: 20, step: 1, default: 2 },
            { key: 'delta', type: 'number', label: 'Phase (deg)', min: 0, max: 360, step: 1, default: 90 },
            { key: 'A', type: 'number', label: 'Amplitude (Scale)', min: 0, max: 300, step: 1, default: 100 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1, default: 0 }
        ];
    }
}
