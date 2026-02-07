import { Curve } from './Curve.js';

export class SuperformulaCurve extends Curve {
    /**
     * @param {Object} params
     * @param {number} params.m - Symmetry parameter (integers create stars/polygons)
     * @param {number} params.n1 - Shape control 1
     * @param {number} params.n2 - Shape control 2
     * @param {number} params.n3 - Shape control 3
     * @param {number} params.a - Axis A scale (inner math)
     * @param {number} params.b - Axis B scale (inner math)
     * @param {number} params.A - Amplitude/Scale (default 100)
     * @param {number} params.rot - Rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.m = params.m || 6;
        this.n1 = params.n1 || 1;
        this.n2 = params.n2 || 1;
        this.n3 = params.n3 || 1;
        this.a = params.a || 1;
        this.b = params.b || 1;
        this.A = params.A !== undefined ? params.A : 100;
        this.rot = params.rot || 0;
    }

    getPoint(theta) {
        // Superformula:
        // r = ( |cos(m*theta/4)/a|^n2 + |sin(m*theta/4)/b|^n3 ) ^ (-1/n1)

        const { m, n1, n2, n3, a, b, A, rot } = this;

        // Safety for zeroes
        const safeA = a === 0 ? 1 : a;
        const safeB = b === 0 ? 1 : b;
        const safeN1 = n1 === 0 ? 1 : n1;

        const part1 = Math.abs(Math.cos(m * theta / 4) / safeA);
        const part2 = Math.abs(Math.sin(m * theta / 4) / safeB);

        const r = Math.pow(Math.pow(part1, n2) + Math.pow(part2, n3), -1 / safeN1);

        // Convert polar r, theta to Cartesian
        // Scale by A/100 to normalize (assuming A=100 is standard)
        // But also check validity of r.

        const scale = this.A; // Usually Superformula produces r around 1.0 (if a,b=1). So scaling by A directly makes sense.
        // Wait, other curves use A=100 as 1.0 scale.
        // If 'r' here is normally ~1.0, then x = r * cos(theta) is ~1.0. 
        // We want screen size ~100-200. So multiplying by A directly (def 100) fits perfectly.

        let x = scale * r * Math.cos(theta);
        let y = scale * r * Math.sin(theta);

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
        // Usually 2PI for integer m.
        // If m is rational? The Maurer rose logic generally works in 2PI or multiple.
        // For general plotting, 2PI covers the basic shape for m integers.
        return 2 * Math.PI;
    }

    getSignature() {
        return `Superformula:${this.m}:${this.n1}:${this.n2}:${this.n3}:${this.a}:${this.b}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            { key: 'm', type: 'number', label: 'Symmetry (m)', min: 0, max: 20, step: 0.1, default: 6 },
            { key: 'n1', type: 'number', label: 'Shape n1', min: 0.1, max: 50, step: 0.1, default: 1 },
            { key: 'n2', type: 'number', label: 'Shape n2', min: 0.1, max: 50, step: 0.1, default: 1 },
            { key: 'n3', type: 'number', label: 'Shape n3', min: 0.1, max: 50, step: 0.1, default: 1 },
            { key: 'a', type: 'number', label: 'Axis a', min: 0.1, max: 10, step: 0.1, default: 1 },
            { key: 'b', type: 'number', label: 'Axis b', min: 0.1, max: 10, step: 0.1, default: 1 },
            { key: 'A', type: 'number', label: 'Amplitude', min: 0, max: 300, step: 1, default: 100 },
            { key: 'rot', type: 'number', label: 'Rotation', min: 0, max: 360, step: 1, default: 0 }
        ];
    }
}
