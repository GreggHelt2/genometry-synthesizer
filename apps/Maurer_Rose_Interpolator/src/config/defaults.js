/**
 * Default configuration for the application.
 */
export const DEFAULTS = {
    roseA: {
        curveType: 'Rhodonea',
        n: 2,
        d: 29,
        A: 100,
        c: 0,
        rot: 0,
        // Maurer specific
        totalDivs: 360,
        step: 29, // deg
        useCustomDivs: false,
        cosetIndex: 0,
        showAllCosets: false,
        color: '#ff6666', // Default Red-ish
    },
    roseB: {
        curveType: 'Rhodonea',
        n: 3,
        d: 47,
        A: 100,
        c: 0,
        rot: 0,
        totalDivs: 360,
        step: 47,
        useCustomDivs: false,
        cosetIndex: 0,
        showAllCosets: false,
        color: '#6666ff', // Default Blue-ish
    },
    interpolation: {
        weight: 0.0, // 0 to 1
        method: 'linear', // 'linear', 'lcm', etc.
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
        isPlaying: false,
        isRecording: false,
        animationSpeed: 1, // multiplier
    }
};
