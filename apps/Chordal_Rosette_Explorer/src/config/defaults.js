/**
 * Default configuration for the application — v3.0 Hierarchical Scoped Parameters.
 *
 * This is the canonical data structure used for:
 *   - Application defaults (initial state)
 *   - localStorage auto-save
 *   - IndexedDB snapshot persistence
 *
 * All curve-specific and sequencer-specific params live under their
 * respective type keys (e.g., curve.params.Rhodonea.n) to avoid
 * namespace clashes.
 */

// ─── helpers ────────────────────────────────────────────────
const DEFAULT_GRADIENT_STOPS = [
    { color: '#ffffff', position: 0, alpha: 1 },
    { color: '#ff0000', position: 1, alpha: 1 }
];

function makeColoringDefaults(solidColor, startColor, endColor) {
    return {
        type: 'solid',
        source: 'length',
        params: {
            'solid': { color: solidColor },
            'gradient-2point': { colorStart: startColor || solidColor, colorEnd: endColor || '#FF00FF' },
            'gradient-custom': { stops: [...DEFAULT_GRADIENT_STOPS.map(s => ({ ...s }))] },
            'gradient-preset': { preset: 'rainbow' }
        }
    };
}

function makeRenderingDefaults() {
    return {
        autoScale: false,
        scaleLineWidth: true,
        connectMode: 'straight',
        connectDetail: 20,
        waveAmplitude: 10,
        waveFrequency: 5,
        waveAlternateFlip: false,
        splineTension: 0,
        splineBias: 0,
        splineContinuity: 0,
        splineAlpha: 0.5
    };
}

function makeCurveDefaults() {
    return {
        type: 'Rhodonea',
        params: {
            'Rhodonea': { n: 3, d: 4, A: 200, c: 0, rot: 0 },
            'Circle': { radius: 100, rot: 0 },
            'Epitrochoid': { R: 100, r: 20, d: 50, A: 100, rot: 0 },
            'Hypotrochoid': { R: 100, r: 20, d: 50, A: 100, rot: 0 },
            'Lissajous': { a: 3, b: 2, delta: 90, A: 100, rot: 0 },
            'Superformula': { m: 6, n1: 1, n2: 1, n3: 1, a: 1, b: 1, A: 100, rot: 0 },
            'Farris Mystery': { r1: 100, k1: 1, r2: 50, k2: 7, r3: 25, k3: -17, A: 100, rot: 0 },
            'Regular N-Sided Polygon': { n: 5, A: 100, rot: 0 }
        }
    };
}

function makeSequencerDefaults(stepDefault = 29) {
    return {
        type: 'Cyclic Additive Group Modulo N',
        params: {
            'Cyclic Additive Group Modulo N': { step: stepDefault, totalDivs: 360, useCustomDivs: false },
            'Multiplicative Group Modulo N': { generator: 2, totalDivs: 500 },
            'Alternating Increment Sequencer': { incrementA: 1, incrementB: 2, totalDivs: 360 },
            '3-Cycle Increment Sequencer': { incrementA: 1, incrementB: 2, incrementC: 3, totalDivs: 360 },
            '4-Cycle Increment Sequencer': { incrementA: 1, incrementB: 2, incrementC: 3, incrementD: 4, totalDivs: 360 }
        }
    };
}

// ─── main DEFAULTS ──────────────────────────────────────────
export const DEFAULTS = {
    rosetteA: {
        curve: makeCurveDefaults(),
        sequencer: makeSequencerDefaults(29),
        coset: {
            index: 0,
            showAll: false,
            count: 1,
            distribution: 'sequential'
        },
        stroke: {
            visible: true,
            opacity: 0.5,
            lineWidth: 2,
            blendMode: 'lighter',
            antiAlias: true,
            coloring: makeColoringDefaults('#00FFFF', '#00FFFF', '#FF00FF')
        },
        fill: {
            visible: true,
            opacity: 0,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#ffffff', '#ffffff', '#000000')
        },
        baseCurve: {
            visible: false,
            opacity: 1,
            lineWidth: 2,
            blendMode: 'source-over',
            antiAlias: true,
            coloring: makeColoringDefaults('#666666', '#666666', '#ffffff')
        },
        vertices: {
            visible: false,
            opacity: 1,
            radius: 2,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#ffffff', '#ffffff', '#ff0000')
        },
        background: {
            color: '#000000',
            opacity: 0
        },
        rendering: makeRenderingDefaults()
    },

    rosetteB: {
        curve: makeCurveDefaults(),
        sequencer: makeSequencerDefaults(47),
        coset: {
            index: 0,
            showAll: false,
            count: 1,
            distribution: 'sequential'
        },
        stroke: {
            visible: true,
            opacity: 0.5,
            lineWidth: 2,
            blendMode: 'lighter',
            antiAlias: true,
            coloring: makeColoringDefaults('#FF0000', '#FF0000', '#0000FF')
        },
        fill: {
            visible: true,
            opacity: 0,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#ffffff', '#ffffff', '#000000')
        },
        baseCurve: {
            visible: false,
            opacity: 1,
            lineWidth: 2,
            blendMode: 'source-over',
            antiAlias: true,
            coloring: makeColoringDefaults('#666666', '#666666', '#ffffff')
        },
        vertices: {
            visible: false,
            opacity: 1,
            radius: 2,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#ffffff', '#ffffff', '#ff0000')
        },
        background: {
            color: '#000000',
            opacity: 0
        },
        rendering: makeRenderingDefaults()
    },

    hybrid: {
        mix: {
            weight: 0.0,
            method: 'linear',
            samples: 360,
            resampleMethod: 'lcm',
            approxResampleThreshold: 20000,
            mixType: 'simple'
        },
        underlay: {
            showRoseA: false,
            showRoseB: false,
            opacity: 0.15
        },
        stroke: {
            visible: true,
            opacity: 0.5,
            lineWidth: 2,
            blendMode: 'lighter',
            antiAlias: true,
            coloring: makeColoringDefaults('#a855f7', '#a855f7', '#ef4444')
        },
        fill: {
            visible: false,
            opacity: 0,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#ffffff', '#ffffff', '#000000')
        },
        vertices: {
            visible: false,
            opacity: 1,
            radius: 2,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#ffffff', '#ffffff', '#ff0000')
        },
        sourceA: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#FF0000', '#FF0000', '#ffffff')
        },
        sourceB: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#0000FF', '#0000FF', '#ffffff')
        },
        baseCurveA: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#FF0000', '#FF0000', '#ffffff')
        },
        baseCurveB: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: makeColoringDefaults('#0000FF', '#0000FF', '#ffffff')
        },
        background: {
            color: '#000000',
            opacity: 0
        },
        rendering: {
            ...makeRenderingDefaults(),
            autoScale: false,
            scaleLineWidth: true
        }
    },

    settings: {
        theme: 'dark'
    },

    app: {
        isRecording: false
    }
};
