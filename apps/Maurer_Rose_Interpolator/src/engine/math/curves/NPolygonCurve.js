import { Curve } from './Curve.js';

export class NPolygonCurve extends Curve {
    /**
     * @param {Object} params
     * @param {number} params.n - Number of sides (N)
     * @param {number} params.A - Circumradius/Amplitude (default 100)
     * @param {number} params.rot - Rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.n = params.n || 5;
        this.A = params.A !== undefined ? params.A : 100;
        this.rot = params.rot || 0;
    }

    getPoint(theta) {
        // Regular Polygon Polar Equation:
        // r(theta) = R * cos(PI/n) / cos( (theta % (2PI/n)) - PI/n )
        // This assumes the polygon is centered at (0,0)

        const { n, A, rot } = this;

        // Ensure theta is positive for modulo
        // JS % operator can return negative if theta is negative.
        // But the engine usually provides positive theta (0 to period).
        // Safely wrap theta to [0, 2PI) just in case, though for P-curves theta grows indefinitely.
        // Actually, the repeating unit is 2PI/n.

        const sectorAngle = (2 * Math.PI) / n;

        // Effective angle within the current sector (centered around 0 for the formula's cos)
        // We want the pattern to repeat every sectorAngle.
        // (theta % sectorAngle) gives [0, sectorAngle).
        // Subtract (sectorAngle/2) to shift to [-PI/n, PI/n].

        // Note: theta might be very large. JS % works fine for large numbers.
        let localTheta = theta % sectorAngle;
        if (localTheta < 0) localTheta += sectorAngle;

        localTheta -= (sectorAngle / 2);

        // Avoid division by zero if cos is 0 (shouldn't happen for n>=3 in this range)
        const cosVal = Math.cos(localTheta);
        // r goes to infinity if cosVal -> 0. Limits n restricted to >= 3.

        const r = A * Math.cos(Math.PI / n) / cosVal;

        let x = r * Math.cos(theta);
        let y = r * Math.sin(theta);

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
        return 2 * Math.PI;
    }

    getSignature() {
        return `NPolygon:${this.n}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            { key: 'n', type: 'number', label: 'Sides (N)', min: 3, max: 20, step: 1, default: 5 },
            { key: 'A', type: 'number', label: 'Radius (A)', min: 0, max: 300, step: 1, default: 100 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1, default: 0 }
        ];
    }
}
