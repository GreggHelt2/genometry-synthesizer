/**
 * Default configuration for the application — v4.0 Hierarchical Scoped Parameters.
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

export const DEFAULTS = {
    rosetteA: {
        curve: {
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
        },
        sequencer: {
            type: 'Cyclic Additive Group Modulo N',
            params: {
                'Cyclic Additive Group Modulo N': { step: 29, totalDivs: 360, useCustomDivs: false },
                'Multiplicative Group Modulo N': { generator: 2, totalDivs: 500 },
                'Alternating Increment Sequencer': { incrementA: 1, incrementB: 2, totalDivs: 360 },
                '3-Cycle Increment Sequencer': { incrementA: 1, incrementB: 2, incrementC: 3, totalDivs: 360 },
                '4-Cycle Increment Sequencer': { incrementA: 1, incrementB: 2, incrementC: 3, incrementD: 4, totalDivs: 360 }
            }
        },
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
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#00FFFF' },
                    'gradient-2point': { colorStart: '#00FFFF', colorEnd: '#FF00FF' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        fill: {
            visible: true,
            opacity: 0,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' },
                    'gradient-2point': { colorStart: '#ffffff', colorEnd: '#000000' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        baseCurve: {
            visible: false,
            opacity: 1,
            lineWidth: 2,
            blendMode: 'source-over',
            antiAlias: true,
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#666666' },
                    'gradient-2point': { colorStart: '#666666', colorEnd: '#ffffff' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        vertices: {
            visible: false,
            opacity: 1,
            radius: 2,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' },
                    'gradient-2point': { colorStart: '#ffffff', colorEnd: '#ff0000' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        background: {
            color: '#000000',
            opacity: 0
        },
        rendering: {
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
        }
    },

    rosetteB: {
        curve: {
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
        },
        sequencer: {
            type: 'Cyclic Additive Group Modulo N',
            params: {
                'Cyclic Additive Group Modulo N': { step: 47, totalDivs: 360, useCustomDivs: false },
                'Multiplicative Group Modulo N': { generator: 2, totalDivs: 500 },
                'Alternating Increment Sequencer': { incrementA: 1, incrementB: 2, totalDivs: 360 },
                '3-Cycle Increment Sequencer': { incrementA: 1, incrementB: 2, incrementC: 3, totalDivs: 360 },
                '4-Cycle Increment Sequencer': { incrementA: 1, incrementB: 2, incrementC: 3, incrementD: 4, totalDivs: 360 }
            }
        },
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
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#FF0000' },
                    'gradient-2point': { colorStart: '#FF0000', colorEnd: '#0000FF' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        fill: {
            visible: true,
            opacity: 0,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' },
                    'gradient-2point': { colorStart: '#ffffff', colorEnd: '#000000' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        baseCurve: {
            visible: false,
            opacity: 1,
            lineWidth: 2,
            blendMode: 'source-over',
            antiAlias: true,
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#666666' },
                    'gradient-2point': { colorStart: '#666666', colorEnd: '#ffffff' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        vertices: {
            visible: false,
            opacity: 1,
            radius: 2,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' },
                    'gradient-2point': { colorStart: '#ffffff', colorEnd: '#ff0000' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        background: {
            color: '#000000',
            opacity: 0
        },
        rendering: {
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
        }
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
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#a855f7' },
                    'gradient-2point': { colorStart: '#a855f7', colorEnd: '#ef4444' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        fill: {
            visible: false,
            opacity: 0,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' },
                    'gradient-2point': { colorStart: '#ffffff', colorEnd: '#000000' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        vertices: {
            visible: false,
            opacity: 1,
            radius: 2,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' },
                    'gradient-2point': { colorStart: '#ffffff', colorEnd: '#ff0000' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        sourceA: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#FF0000' },
                    'gradient-2point': { colorStart: '#FF0000', colorEnd: '#ffffff' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        sourceB: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#0000FF' },
                    'gradient-2point': { colorStart: '#0000FF', colorEnd: '#ffffff' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        baseCurveA: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#FF0000' },
                    'gradient-2point': { colorStart: '#FF0000', colorEnd: '#ffffff' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        baseCurveB: {
            visible: false,
            opacity: 0.3,
            lineWidth: 1,
            blendMode: 'source-over',
            coloring: {
                method: 'solid',
                type: '2-point',
                source: 'length',
                params: {
                    'solid': { color: '#0000FF' },
                    'gradient-2point': { colorStart: '#0000FF', colorEnd: '#ffffff' },
                    'gradient-custom': {
                        stops: [
                            { color: '#ffffff', position: 0, alpha: 1 },
                            { color: '#ff0000', position: 1, alpha: 1 }
                        ]
                    },
                    'gradient-preset': { preset: 'rainbow' }
                }
            }
        },
        coset: {
            matchCosetsByLCM: false,
            index: 0,
            count: 1,
            distribution: 'sequential'
        },
        background: {
            color: '#000000',
            opacity: 0
        },
        rendering: {
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
        }
    },

    settings: {
        theme: 'dark'
    },

    app: {
        isRecording: false
    }
};
