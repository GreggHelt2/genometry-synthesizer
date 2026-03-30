import { Curve } from './Curve.js';

// ─── Complex Arithmetic Helpers ──────────────────────────

const C = {
    add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
    sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
    mul: (a, b) => ({
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re
    }),
    mulReal: (a, r) => ({ re: a.re * r, im: a.im * r }),
    /**
     * Integer power via repeated multiplication.
     * @param {{re: number, im: number}} a
     * @param {number} p - non-negative integer exponent
     * @returns {{re: number, im: number}}
     */
    pow: (a, p) => {
        let res = { re: 1, im: 0 };
        for (let i = 0; i < p; i++) {
            const nextRe = res.re * a.re - res.im * a.im;
            const nextIm = res.re * a.im + res.im * a.re;
            res = { re: nextRe, im: nextIm };
        }
        return res;
    },
    /** Multiply by i (rotate 90°): i·z = -im + i·re */
    timesI: (z) => ({ re: -z.im, im: z.re }),
    /** Multiply by -i: -i·z = im - i·re */
    timesNegI: (z) => ({ re: z.im, im: -z.re })
};

// ─── Polygon Radius Helper ──────────────────────────────

/**
 * Returns the radius of a regular n-gon inscribed in the unit circle
 * at the given polar angle theta, using the cos/cos formula.
 */
function getPolygonRadius(theta, sides) {
    const section = (2 * Math.PI) / sides;
    const phi = ((theta % section) + section) % section; // ensure positive modulo
    const r = Math.cos(Math.PI / sides) / Math.cos(phi - Math.PI / sides);
    return isNaN(r) ? 1.0 : r;
}

/**
 * Returns the base domain radius for a given angle and shape type.
 */
function getBaseRadius(theta, baseShape) {
    switch (baseShape) {
        case 'square':
            return 1.0 / Math.max(0.1, Math.max(
                Math.abs(Math.cos(theta)),
                Math.abs(Math.sin(theta))
            ));
        case 'triangle':  return getPolygonRadius(theta, 3);
        case 'pentagon':   return getPolygonRadius(theta, 5);
        case 'hexagon':    return getPolygonRadius(theta, 6);
        case 'octagon':    return getPolygonRadius(theta, 8);
        case 'circle':
        default:
            return 1.0;
    }
}

// ─── Polynomial Presets (Poelke et al. 2014) ─────────────

/**
 * Each preset is { label, fn, maxDegree }.
 * fn(z) evaluates p(z) and returns the complex result.
 * maxDegree is used for sampling density calculation.
 */
const MANDALA_PRESETS = {
    'p1': {
        label: 'P1: 0.5 + z + z² (Fig 3a)',
        maxDegree: 2,
        fn: (z) => C.add(C.add({ re: 0.5, im: 0 }, z), C.pow(z, 2))
    },
    'p2': {
        label: 'P2: -0.5 - iz + z² (Fig 3b)',
        maxDegree: 2,
        fn: (z) => {
            const iz = C.timesI(z);
            return C.add(C.sub({ re: -0.5, im: 0 }, iz), C.pow(z, 2));
        }
    },
    'p3': {
        label: 'P3: -0.5 - 0.5z + z³ (Fig 3c)',
        maxDegree: 3,
        fn: (z) => C.add(
            C.sub({ re: -0.5, im: 0 }, C.mulReal(z, 0.5)),
            C.pow(z, 3)
        )
    },
    'p4': {
        label: 'P4: Degree 5 Mandala (Fig 3d)',
        maxDegree: 5,
        fn: (z) => {
            const t1 = C.pow(z, 5);
            const z4 = C.pow(z, 4);
            const t2 = C.timesI(z4);              // i·z⁴
            const t3 = C.mulReal(C.pow(z, 3), 0.25);
            const z2 = C.pow(z, 2);
            const t4 = C.mulReal(C.timesI(z2), 0.25); // 0.25·i·z²
            const t5 = C.mulReal(z, 0.125);
            return C.sub(C.sub(C.sub(C.sub(t1, t2), t3), t4), t5);
        }
    },
    'p5': {
        label: 'P5: z⁴ - z (Fig 3e)',
        maxDegree: 4,
        fn: (z) => C.sub(C.pow(z, 4), z)
    },
    'p6': {
        label: 'P6: z⁵ - z (Fig 3f)',
        maxDegree: 5,
        fn: (z) => C.sub(C.pow(z, 5), z)
    },
    'p7': {
        label: 'P7: z¹⁰ - z (Fig 3g)',
        maxDegree: 10,
        fn: (z) => C.sub(C.pow(z, 10), z)
    },
    'p8': {
        label: 'P8: z¹¹ - z (Fig 3h)',
        maxDegree: 11,
        fn: (z) => C.sub(C.pow(z, 11), z)
    },
    'p9': {
        label: 'P9: z⁴ - z (Fig 5e)',
        maxDegree: 4,
        fn: (z) => C.sub(C.pow(z, 4), z)
    },
    'p10': {
        label: 'P10: z⁷ - z (Fig 5f)',
        maxDegree: 7,
        fn: (z) => C.sub(C.pow(z, 7), z)
    },
    'p11': {
        label: 'P11: Spiked Circle (Fig 5g)',
        maxDegree: 13,
        fn: (z) => {
            const t1 = C.mulReal(C.pow(z, 13), 1 / 13);
            const t2 = C.mulReal(C.pow(z, 9), 1 / 144);
            const t3 = C.mulReal(C.pow(z, 5), 1 / 5);
            const t4 = C.mulReal(z, 1 / 16);
            return C.add(C.sub(C.sub(t1, t2), t3), t4);
        }
    },
    'p12': {
        label: 'P12: Petaled Square (Fig 5h)',
        maxDegree: 9,
        fn: (z) => {
            const t1 = C.mulReal(C.pow(z, 9), 1 / 9);
            const t2 = C.mulReal(C.pow(z, 5), 3 / 20);
            const t3 = C.mulReal(z, 1 / 4);
            return C.sub(C.sub(t1, t2), t3);
        }
    },
    'p13': {
        label: 'P13: -iz - z⁴ + iz⁷ + z¹⁰ (Fig 6a)',
        maxDegree: 10,
        fn: (z) => {
            const negIz = C.timesNegI(z);
            const z4 = C.pow(z, 4);
            const z7 = C.pow(z, 7);
            const iz7 = C.timesI(z7);
            const z10 = C.pow(z, 10);
            return C.add(C.add(C.sub(negIz, z4), iz7), z10);
        }
    },
    'p14': {
        label: 'P14: Degree 16 (Fig 6b)',
        maxDegree: 16,
        fn: (z) => {
            const t1 = z;
            const t2 = C.mulReal(C.pow(z, 4), 1 / 4);
            const t3 = C.mulReal(C.pow(z, 7), 2 / 7);
            const t4 = C.mulReal(C.pow(z, 10), 1 / 5);
            const t5 = C.mulReal(C.pow(z, 13), 1 / 13);
            const t6 = C.mulReal(C.pow(z, 16), 1 / 16);
            return C.add(C.add(C.sub(C.sub(C.add(t1, t2), t3), t4), t5), t6);
        }
    },
    'p15': {
        label: 'P15: Multi-Order (Fig 6c)',
        maxDegree: 10,
        fn: (z) => {
            const t1 = C.mulReal(z, 8);
            const t2 = C.mulReal(C.pow(z, 4), 3);
            const t3 = C.mulReal(C.pow(z, 7), 4);
            const t4 = C.mulReal(C.pow(z, 10), 5);
            return C.add(C.add(C.add(t1, t2), t3), t4);
        }
    },
    'p16': {
        label: 'P16: z²⁵ + z (Fig 6d)',
        maxDegree: 25,
        fn: (z) => C.add(C.pow(z, 25), z)
    }
};

/** Export for use in UI option generation */
export const MANDALA_PRESET_OPTIONS = Object.entries(MANDALA_PRESETS).map(
    ([key, preset]) => ({ value: key, label: preset.label })
);

/** Base shape options for the schema */
export const BASE_SHAPE_OPTIONS = [
    { value: 'circle',   label: 'Circle' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'square',   label: 'Square' },
    { value: 'pentagon', label: 'Pentagon' },
    { value: 'hexagon',  label: 'Hexagon' },
    { value: 'octagon',  label: 'Octagon' }
];

// ─── Curve Class ────────────────────────────────────────

/**
 * Complex Polynomial Mandala Curve
 *
 * Maps a base domain boundary (circle or regular polygon) through
 * a complex polynomial p(z), producing a mandala-like curve.
 *
 * Based on:
 *   - Poelke, Tokoutsi & Polthier, "Complex Polynomial Mandalas
 *     and their Symmetries," Bridges 2014.
 *
 * The curve evaluates:
 *   z₀(θ) = r_base(θ) · e^{iθ}     [base domain point]
 *   z_in   = z₀ · e^{i·mappingRot}  [pre-rotation]
 *   output = p(z_in) · A             [polynomial + amplitude scale]
 *   final  = rotate(output, rot)     [output rotation]
 */
export class ComplexPolynomialMandalaCurve extends Curve {
    /**
     * @param {Object} params
     * @param {string} params.preset - Key into MANDALA_PRESETS (e.g. 'p13')
     * @param {string} params.baseShape - Input domain: 'circle', 'triangle', etc.
     * @param {number} params.mappingRotation - Pre-rotation in degrees
     * @param {number} params.A - Amplitude/scale
     * @param {number} params.rot - Output rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.preset = params.preset || 'p13';
        this.baseShape = params.baseShape || 'circle';
        this.domainScale = params.domainScale ?? 1.0;
        this.mappingRotation = params.mappingRotation || 0;
        this.A = params.A ?? 100;
        this.rot = params.rot ?? 0;

        // Resolve polynomial function and degree
        const presetData = MANDALA_PRESETS[this.preset] || MANDALA_PRESETS['p13'];
        this._polyFn = presetData.fn;
        this._maxDegree = presetData.maxDegree;
    }

    getPoint(theta) {
        const { baseShape, domainScale, mappingRotation, A, rot } = this;

        // 1. Base domain point: r(θ)·e^{iθ}, scaled by domainScale
        const rBase = getBaseRadius(theta, baseShape) * domainScale;
        const z0 = { re: rBase * Math.cos(theta), im: rBase * Math.sin(theta) };

        // 2. Apply mapping rotation (pre-rotation of input)
        let zIn;
        if (mappingRotation !== 0) {
            const mRotRad = (mappingRotation * Math.PI) / 180;
            const mRotC = { re: Math.cos(mRotRad), im: Math.sin(mRotRad) };
            zIn = C.mul(z0, mRotC);
        } else {
            zIn = z0;
        }

        // 3. Evaluate polynomial p(z_in)
        const pz = this._polyFn(zIn);

        // 4. Scale by amplitude
        let x = pz.re * A;
        let y = pz.im * A;

        // 5. Apply output rotation
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
        // The base domain boundary is parameterized over [0, 2π]
        // regardless of shape (circle or polygon).
        return 2 * Math.PI;
    }

    getSamplesPerRadian() {
        // Higher-degree polynomials produce more intricate curves.
        // Scale sampling density with degree to ensure smooth rendering.
        return Math.max(100, Math.ceil(12 * this._maxDegree));
    }

    /**
     * Adaptive rendering: uniform base pass + recursive subdivision
     * of segments where the midpoint deviates from linear interpolation.
     * This concentrates samples at sharp cusps (from polygon domain vertices)
     * without wasting them on smooth sections.
     */
    generateRenderPoints(maxSamples = 50000) {
        const totalRad = this.getRadiansToClosure();
        const samplesPerRad = this.getSamplesPerRadian();
        const baseSampleCount = Math.min(maxSamples, Math.ceil(totalRad * samplesPerRad));
        const step = totalRad / baseSampleCount;

        // Phase 1: Uniform sampling
        const baseSamples = [];
        for (let i = 0; i <= baseSampleCount; i++) {
            const theta = i * step;
            const pt = this.getPoint(theta);
            baseSamples.push({ theta, x: pt.x, y: pt.y });
        }

        // Phase 2: Compute adaptive tolerance from curve extent
        let maxExtent = 0;
        for (const s of baseSamples) {
            const ext = Math.abs(s.x) > Math.abs(s.y) ? Math.abs(s.x) : Math.abs(s.y);
            if (ext > maxExtent) maxExtent = ext;
        }
        // Tolerance: 0.1% of max extent — small enough to capture cusps
        const tolSq = (maxExtent * 0.001) * (maxExtent * 0.001);

        // Phase 3: Adaptive subdivision
        const MAX_DEPTH = 8;
        const refined = [baseSamples[0]];
        for (let i = 0; i < baseSamples.length - 1; i++) {
            this._subdivide(baseSamples[i], baseSamples[i + 1], MAX_DEPTH, tolSq, refined, maxSamples);
            refined.push(baseSamples[i + 1]);
        }

        // Return as {x, y} only (strip theta)
        return refined.map(s => ({ x: s.x, y: s.y }));
    }

    /**
     * Recursively subdivide a segment if the curve's midpoint deviates
     * from the linear interpolation of the endpoints.
     */
    _subdivide(p1, p2, depth, tolSq, result, maxSamples) {
        if (depth <= 0 || result.length >= maxSamples) return;

        const thetaMid = (p1.theta + p2.theta) / 2;
        const pMid = this.getPoint(thetaMid);

        // Deviation of actual midpoint from linear interpolation
        const linearX = (p1.x + p2.x) / 2;
        const linearY = (p1.y + p2.y) / 2;
        const dx = pMid.x - linearX;
        const dy = pMid.y - linearY;
        const deviationSq = dx * dx + dy * dy;

        if (deviationSq > tolSq) {
            const mid = { theta: thetaMid, x: pMid.x, y: pMid.y };
            // Recurse left half
            this._subdivide(p1, mid, depth - 1, tolSq, result, maxSamples);
            result.push(mid);
            // Recurse right half
            this._subdivide(mid, p2, depth - 1, tolSq, result, maxSamples);
        }
    }

    getSignature() {
        return `CPMandala:${this.preset}:${this.baseShape}:${this.domainScale}:${this.mappingRotation}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            {
                key: 'preset',
                type: 'select',
                label: 'Polynomial',
                options: MANDALA_PRESET_OPTIONS
            },
            {
                key: 'baseShape',
                type: 'select',
                label: 'Input Domain',
                options: BASE_SHAPE_OPTIONS
            },
            { key: 'domainScale', type: 'number', label: 'Domain Scale', min: 0.1, max: 2, step: 0.01 },
            { key: 'mappingRotation', type: 'number', label: 'Mapping Rotation (deg)', min: 0, max: 360, step: 1 },
            { key: 'A', type: 'number', label: 'Amplitude', min: 1, max: 300, step: 1 },
            { key: 'rot', type: 'number', label: 'Rotation (deg)', min: 0, max: 360, step: 1 }
        ];
    }
}
