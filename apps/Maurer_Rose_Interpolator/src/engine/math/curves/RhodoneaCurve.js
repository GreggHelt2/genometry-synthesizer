import { Curve } from './Curve.js';


export class RhodoneaCurve extends Curve {
    /**
     * @param {number} n - The numerator of the k value (frequency).
     * @param {number} d - The denominator of the k value.
     * @param {number} A - The amplitude (radius).
     * @param {number} c - The offset from the origin.
     * @param {number} rot - The rotation in radians.
     */
    constructor(n = 1, d = 1, A = 100, c = 0, rot = 0) {
        super();
        this.n = n;
        this.d = d;
        this.A = A;
        this.c = c;
        this.rot = rot;
        this.k = n / d;
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

    getPeriodToClosure() {
        // Inlined from calculateRhodoneaPeriodCycles
        if (this.d === 0) return 0;

        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const commonDivisor = gcd(this.n, this.d);
        const n1 = this.n / commonDivisor;
        const d1 = this.d / commonDivisor;

        // Logic from prototype/papers:
        // If both n1 and d1 are odd, the period is PI (0.5 cycles).
        // Otherwise, the period is 2PI * d1
        const cycles = (n1 % 2 !== 0 && d1 % 2 !== 0) ? (d1 / 2) : d1;

        return cycles * 2 * Math.PI;
    }
}
