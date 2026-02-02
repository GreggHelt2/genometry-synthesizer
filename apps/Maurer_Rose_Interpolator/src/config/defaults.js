/**
 * Default configuration for the application.
 */
export const DEFAULTS = {
    rosetteA: {
        curveType: 'Rhodonea',
        sequencerType: 'Cyclic Additive Group Modulo N',
        n: 3,
        d: 4,
        A: 200,
        c: 0,
        rot: 0,
        radius: 100, // For CircleCurve
        // Maurer specific
        totalDivs: 360,
        step: 29, // deg
        useCustomDivs: false,
        cosetIndex: 0,
        showAllCosets: false,
        color: '#00FFFF', // Cyan
        colorMethod: 'solid',
        opacity: 0.5,
        blendMode: 'lighter',
        lineWidth: 2,
        antiAlias: true,
        cosetCount: 1,
        cosetDistribution: 'sequential', // 'sequential', 'distributed', 'two-way'
    },
    rosetteB: {
        curveType: 'Rhodonea',
        sequencerType: 'Cyclic Additive Group Modulo N',
        n: 3,
        d: 4,
        A: 200,
        c: 0,
        rot: 0,
        radius: 100, // For CircleCurve
        totalDivs: 360,
        step: 47,
        useCustomDivs: false,
        cosetIndex: 0,
        showAllCosets: false,
        color: '#FF0000', // Red
        colorMethod: 'solid',
        opacity: 0.5,
        blendMode: 'lighter',
        lineWidth: 2,
        antiAlias: true,
    },
    hybrid: {
        weight: 0.0, // 0 to 1
        method: 'linear', // 'linear', 'lcm', etc.
        showRoseA: false,
        showRoseB: false,
        underlayOpacity: 0.15,
        opacity: 0.5,
        color: '#a855f7',
        colorMethod: 'solid',
        blendMode: 'lighter',
    },
    settings: {
        theme: 'dark',
        showPoints: false,
        showRhodonea: false,
        lineThickness: 1,
        opacity: 0.6,
        renderStyle: 'straight', // straight, arc, etc.
    },
    app: {
        isRecording: false,
    }
};
