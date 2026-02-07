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
        colorEnd: '#FF00FF', // Magenta (Gradient End)
        gradientType: '2-point', // '2-point', 'cyclic', 'preset'
        gradientPreset: 'rainbow',
        gradientStops: [
            { color: '#ffffff', position: 0 },
            { color: '#ff0000', position: 1 }
        ],
        colorMethod: 'solid',
        opacity: 0.5,
        blendMode: 'lighter',
        lineWidth: 2,
        antiAlias: true,
        cosetCount: 1,
        cosetDistribution: 'sequential', // 'sequential', 'distributed', 'two-way'
        // Fill Rendering
        fillColor: '#ffffff',
        fillColorEnd: '#000000',
        fillOpacity: 0,
        fillBlendMode: 'source-over',
        fillColorMethod: 'solid',
        fillGradientType: '2-point',
        fillGradientStops: [],
        // Base Curve Rendering
        showBaseCurve: false,
        baseCurveLineWidth: 2,
        baseCurveColor: '#666666',
        baseCurveOpacity: 1,
        baseCurveBlendMode: 'source-over',
        baseCurveColorMethod: 'solid',
        baseCurveAntiAlias: true,
        // Vertex Rendering
        showVertices: false,
        vertexRadius: 2,
        vertexColor: '#ffffff',
        vertexOpacity: 1,
        vertexBlendMode: 'source-over',
        // General Rendering
        backgroundColor: '#000000',
        backgroundOpacity: 0,
        autoScale: false,
        scaleLineWidth: true,
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
        colorEnd: '#0000FF', // Blue (Gradient End)
        gradientType: '2-point',
        gradientPreset: 'rainbow',
        gradientStops: [
            { color: '#ffffff', position: 0 },
            { color: '#0000ff', position: 1 }
        ],
        colorMethod: 'solid',
        opacity: 0.5,
        blendMode: 'lighter',
        lineWidth: 2,
        antiAlias: true,
        // Fill Rendering
        fillColor: '#ffffff',
        fillColorEnd: '#000000',
        fillOpacity: 0,
        fillBlendMode: 'source-over',
        fillColorMethod: 'solid',
        fillGradientType: '2-point',
        fillGradientStops: [],
        // Base Curve Rendering
        showBaseCurve: false,
        baseCurveLineWidth: 2,
        baseCurveColor: '#666666',
        baseCurveOpacity: 1,
        baseCurveBlendMode: 'source-over',
        baseCurveColorMethod: 'solid',
        baseCurveAntiAlias: true,
        // Vertex Rendering
        showVertices: false,
        vertexRadius: 2,
        vertexColor: '#ffffff',
        vertexOpacity: 1,
        vertexBlendMode: 'source-over',
        // General Rendering
        backgroundColor: '#000000',
        backgroundOpacity: 0,
        autoScale: false,
        scaleLineWidth: true,
    },
    hybrid: {
        weight: 0.0, // 0 to 1
        method: 'linear', // 'linear', 'lcm', etc.
        showRoseA: false,
        showRoseB: false,
        underlayOpacity: 0.15,
        opacity: 0.5,
        color: '#a855f7',
        colorEnd: '#ef4444',
        gradientType: '2-point',
        gradientPreset: 'rainbow',
        gradientStops: [
            { color: '#ffffff', position: 0 },
            { color: '#00ff00', position: 1 }
        ],
        colorMethod: 'solid',
        blendMode: 'lighter',
        // Fill Rendering
        fillColor: '#ffffff',
        fillColorEnd: '#000000',
        fillOpacity: 0,
        fillBlendMode: 'source-over',
        fillColorMethod: 'solid',
        fillGradientType: '2-point',
        fillGradientStops: [],
        // Base Curve Rendering (A)
        showBaseCurveA: false,
        baseCurveLineWidthA: 2,
        baseCurveColorA: '#666666',
        baseCurveOpacityA: 1,
        baseCurveBlendModeA: 'source-over',
        // Base Curve Rendering (B)
        showBaseCurveB: false,
        baseCurveLineWidthB: 2,
        baseCurveColorB: '#666666',
        baseCurveOpacityB: 1,
        baseCurveBlendModeB: 'source-over',
        // Vertex Rendering (Hybrid - specific to A/B not usually needed unless overriding, 
        // but let's see. Plan said "Update renderInterpolation to call polylineLayer.drawVertices".
        // Usually Hybrid inherits from Rosette A/B or has its own overrides?
        // Let's add them to hybrid for consistency if we want to override in hybrid view.)
        showVertices: false,
        vertexRadius: 2,
        vertexColor: '#ffffff',
        vertexOpacity: 1,
        vertexBlendMode: 'source-over',
        // General Rendering
        backgroundColor: '#000000',
        backgroundOpacity: 0,
        autoScale: false,
        scaleLineWidth: true,
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
