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
     */
    constructor(params = {}) {
        super();
        this.n = params.n;
        this.d = params.d;
        this.A = params.A;
        this.c = params.c;
        this.rot = (params.rot || 0) * Math.PI / 180;
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
        return `Rhodonea:${this.n}:${this.d}:${this.A}:${this.c}:${this.rot}`;
    }

    getRadiansToClosure() {
        if (this.d === 0) return 0;

        const commonDivisor = gcd(this.n, this.d);
        const n1 = this.n / commonDivisor;
        const d1 = this.d / commonDivisor;

        // Logic from prototype/papers:
        // If both n1 and d1 are odd, the period is PI (0.5 cycles).
        // Otherwise, the period is 2PI * d1
        const cycles = (n1 % 2 !== 0 && d1 % 2 !== 0) ? (d1 / 2) : d1;

        return cycles * 2 * Math.PI;
    }

    static getParamsSchema() {
        return [
            { key: 'n', type: 'number', label: 'n (Numerator)', min: 1, max: 100, step: 1 },
            { key: 'd', type: 'number', label: 'd (Denominator)', min: 1, max: 100, step: 1 },
            { key: 'A', type: 'number', label: 'Amplitude (A)', min: 10, max: 300, step: 1 },
            { key: 'c', type: 'number', label: 'Offset (c)', min: 0, max: 200, step: 1 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1 }
        ];
    }
}
