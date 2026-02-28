import { Curve } from './Curve.js';
import { RhodoneaCurve } from './RhodoneaCurve.js';
import { lcm } from '../MathOps.js';

export class BlendedRhodoneaCurve extends Curve {
    /**
     * @param {object} params
     * @param {number} params.blend - Weighting slider [0.0, 1.0]. 0 is 100% curve 1, 1 is 100% curve 2.
     * @param {number} params.n1 - Numerator for curve 1
     * @param {number} params.d1 - Denominator for curve 1
     * @param {number} params.A1 - Amplitude for curve 1
     * @param {number} params.c1 - Offset for curve 1
     * @param {number} params.rot1 - Rotation for curve 1
     * @param {boolean} params.allowDoubleTrace1 - Allow double trace for curve 1
     * @param {number} params.n2 - Numerator for curve 2
     * @param {number} params.d2 - Denominator for curve 2
     * @param {number} params.A2 - Amplitude for curve 2
     * @param {number} params.c2 - Offset for curve 2
     * @param {number} params.rot2 - Rotation for curve 2
     * @param {boolean} params.allowDoubleTrace2 - Allow double trace for curve 2
     */
    constructor(params = {}) {
        super();
        this.blend = params.blend !== undefined ? params.blend : 0.5;

        this.rhodonea1 = new RhodoneaCurve({
            n: params.n1 !== undefined ? params.n1 : 3,
            d: params.d1 !== undefined ? params.d1 : 1,
            A: params.A1 !== undefined ? params.A1 : 100,
            c: params.c1 !== undefined ? params.c1 : 0,
            rot: params.rot1 !== undefined ? params.rot1 : 0,
            allowDoubleTrace: !!params.allowDoubleTrace1
        });

        this.rhodonea2 = new RhodoneaCurve({
            n: params.n2 !== undefined ? params.n2 : 5,
            d: params.d2 !== undefined ? params.d2 : 2,
            A: params.A2 !== undefined ? params.A2 : 100,
            c: params.c2 !== undefined ? params.c2 : 0,
            rot: params.rot2 !== undefined ? params.rot2 : 0,
            allowDoubleTrace: !!params.allowDoubleTrace2
        });
    }

    getPoint(theta) {
        const p1 = this.rhodonea1.getPoint(theta);
        const p2 = this.rhodonea2.getPoint(theta);

        return {
            x: p1.x * (1 - this.blend) + p2.x * this.blend,
            y: p1.y * (1 - this.blend) + p2.y * this.blend
        };
    }

    getSignature() {
        return `BlendedRhodonea:${this.rhodonea1.getSignature()}:${this.rhodonea2.getSignature()}:${this.blend}`;
    }

    getRadiansToClosure() {
        const rad1 = this.rhodonea1.getRadiansToClosure();
        const rad2 = this.rhodonea2.getRadiansToClosure();

        if (rad1 === 0 || rad2 === 0) return 0;

        // The closure period of the sum is the least common multiple of their closure periods.
        // Since rhodonea periods are integer multiples of PI, we convert rads to half-cycles.
        const halfCycles1 = Math.round(rad1 / Math.PI);
        const halfCycles2 = Math.round(rad2 / Math.PI);

        if (halfCycles1 === 0 || halfCycles2 === 0) return 0;

        const lcmHalfCycles = lcm(halfCycles1, halfCycles2);
        return lcmHalfCycles * Math.PI;
    }

    getSpecialPoints() {
        // Analytical special points for a blended sum of rhodoneas are highly complex and not implemented here.
        // It relies on numeric grid evaluation or no special points. Returning empty structured arrays to maintain the interface.
        return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };
    }

    static getParamsSchema() {
        return [
            { key: 'blend', type: 'number', label: 'Blend Weight', min: 0, max: 1, step: 0.01, default: 0.5 },
            { key: 'n1', type: 'number', label: 'C1: n (Num)', min: 1, max: 100, step: 1, default: 3 },
            { key: 'd1', type: 'number', label: 'C1: d (Den)', min: 1, max: 100, step: 1, default: 1 },
            { key: 'A1', type: 'number', label: 'C1: Amplitude', min: 10, max: 300, step: 1, default: 100 },
            { key: 'c1', type: 'number', label: 'C1: Offset (c)', min: 0, max: 200, step: 1, default: 0 },
            { key: 'rot1', type: 'number', label: 'C1: Rot (deg)', min: 0, max: 360, step: 1, default: 0 },
            { key: 'allowDoubleTrace1', type: 'boolean', label: 'C1: Allow Double Trace', default: false },
            { key: 'n2', type: 'number', label: 'C2: n (Num)', min: 1, max: 100, step: 1, default: 5 },
            { key: 'd2', type: 'number', label: 'C2: d (Den)', min: 1, max: 100, step: 1, default: 2 },
            { key: 'A2', type: 'number', label: 'C2: Amplitude', min: 10, max: 300, step: 1, default: 100 },
            { key: 'c2', type: 'number', label: 'C2: Offset (c)', min: 0, max: 200, step: 1, default: 0 },
            { key: 'rot2', type: 'number', label: 'C2: Rot (deg)', min: 0, max: 360, step: 1, default: 0 },
            { key: 'allowDoubleTrace2', type: 'boolean', label: 'C2: Allow Double Trace', default: false }
        ];
    }
}
