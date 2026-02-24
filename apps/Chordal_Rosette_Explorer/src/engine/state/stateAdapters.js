/**
 * stateAdapters.js
 * 
 * Bi-directional adapters between the v3.0 nested state and
 * the flat property format the UI components and renderer expect.
 * 
 * flattenRoseParams(roseState)      → flat object for rosette rendering / UI reads
 * flattenHybridParams(hybridState)  → flat object for hybrid rendering / UI reads
 * getFlatKeyDeepPath(flatKey, roseId, roseState) → path array for SET_DEEP dispatch
 * dispatchDeep(flatKey, value, roseId) → dispatch SET_DEEP action
 * getLinkKey(flatKey, roseId)        → dot-separated link key for LinkManager
 */

import { ACTIONS } from './Actions.js';
import { store } from './Store.js';

// ─── Flatten rosette (nested → flat) ────────────────────

/**
 * Build a flat params object from a v3.0 rosette state slice.
 * Used by both the Renderer and all rosette UI sections.
 */
export function flattenRoseParams(roseState) {
    if (!roseState) return {};

    const curveType = roseState.curve?.type || 'Rhodonea';
    const curveParams = roseState.curve?.params?.[curveType] || {};
    const seqType = roseState.sequencer?.type || 'Cyclic Additive Group Modulo N';
    const seqParams = roseState.sequencer?.params?.[seqType] || {};

    const stroke = roseState.stroke || {};
    const fill = roseState.fill || {};
    const baseCurve = roseState.baseCurve || {};
    const verts = roseState.vertices || {};
    const bg = roseState.background || {};
    const rendering = roseState.rendering || {};
    const coset = roseState.coset || {};
    const sp = roseState.specialPoints || {};

    // Stroke coloring
    const sc = stroke.coloring || {};
    const scp = sc.params || {};

    // Fill coloring
    const fc = fill.coloring || {};
    const fcp = fc.params || {};

    // Base curve coloring
    const bcc = baseCurve.coloring || {};
    const bccp = bcc.params || {};

    // Vertex coloring
    const vc = verts.coloring || {};
    const vcp = vc.params || {};

    return {
        // Curve
        curveType,
        ...curveParams,

        // Sequencer
        sequencerType: seqType,
        ...seqParams,

        // Coset
        cosetIndex: coset.index,
        showAllCosets: coset.showAll,
        cosetCount: coset.count,
        cosetDistribution: coset.distribution,

        // Stroke
        showChordalLines: stroke.visible !== false,
        color: scp.solid?.color,
        colorEnd: scp['gradient-2point']?.colorEnd,
        colorMethod: sc.method,
        gradientType: sc.type,
        gradientPreset: scp['gradient-preset']?.preset,
        gradientStops: scp['gradient-custom']?.stops,
        opacity: stroke.opacity,
        blendMode: stroke.blendMode,
        lineWidth: stroke.lineWidth,
        antiAlias: stroke.antiAlias,

        // Fill
        showFill: fill.visible,
        fillColor: fcp.solid?.color,
        fillColorEnd: fcp['gradient-2point']?.colorEnd,
        fillOpacity: fill.opacity,
        fillBlendMode: fill.blendMode,
        fillColorMethod: fc.method,
        fillGradientType: fc.type,
        fillGradientPreset: fcp['gradient-preset']?.preset,
        fillGradientStops: fcp['gradient-custom']?.stops,

        // Base Curve
        showBaseCurve: baseCurve.visible,
        baseCurveLineWidth: baseCurve.lineWidth,
        baseCurveColor: bccp.solid?.color,
        baseCurveColorEnd: bccp['gradient-2point']?.colorEnd,
        baseCurveOpacity: baseCurve.opacity,
        baseCurveBlendMode: baseCurve.blendMode,
        baseCurveAntiAlias: baseCurve.antiAlias,
        baseCurveColorMethod: bcc.method,
        baseCurveGradientType: bcc.type,
        baseCurveGradientPreset: bccp['gradient-preset']?.preset,
        baseCurveGradientStops: bccp['gradient-custom']?.stops,

        // Vertices
        showVertices: verts.visible,
        vertexRadius: verts.radius,
        vertexColor: vcp.solid?.color,
        vertexOpacity: verts.opacity,
        vertexBlendMode: verts.blendMode,
        vertexColorMethod: vc.method,
        vertexColorEnd: vcp['gradient-2point']?.colorEnd,
        vertexGradientType: vc.type,
        vertexGradientPreset: vcp['gradient-preset']?.preset,
        vertexGradientStops: vcp['gradient-custom']?.stops,

        // Background
        backgroundColor: bg.color,
        backgroundOpacity: bg.opacity,

        // Rendering
        autoScale: rendering.autoScale,
        scaleLineWidth: rendering.scaleLineWidth,
        connectMode: rendering.connectMode,
        connectDetail: rendering.connectDetail,
        waveAmplitude: rendering.waveAmplitude,
        waveFrequency: rendering.waveFrequency,
        waveAlternateFlip: rendering.waveAlternateFlip,
        splineTension: rendering.splineTension,
        splineBias: rendering.splineBias,
        splineContinuity: rendering.splineContinuity,
        splineAlpha: rendering.splineAlpha,
        bezierBulge: rendering.bezierBulge,

        // Special Points
        showSpecialPoints: sp.show,
        showZeroPoints: sp.zeroPoints?.show,
        zeroPointsColor: sp.zeroPoints?.color,
        zeroPointsSize: sp.zeroPoints?.pointSize,
        zeroPointsOpacity: sp.zeroPoints?.opacity,
        showDoublePoints: sp.doublePoints?.show,
        doublePointsColor: sp.doublePoints?.color,
        doublePointsSize: sp.doublePoints?.pointSize,
        doublePointsOpacity: sp.doublePoints?.opacity,
        showBoundaryPoints: sp.boundaryPoints?.show,
        boundaryPointsColor: sp.boundaryPoints?.color,
        boundaryPointsSize: sp.boundaryPoints?.pointSize,
        boundaryPointsOpacity: sp.boundaryPoints?.opacity,
        specialPointsShape: sp.shape
    };
}

// ─── Flatten hybrid (nested → flat) ─────────────────────

/**
 * Build a flat params object from a v3.0 hybrid state slice.
 * Used by both the Renderer and all hybrid UI sections.
 */
export function flattenHybridParams(hybridState) {
    if (!hybridState) return {};

    const mix = hybridState.mix || {};
    const underlay = hybridState.underlay || {};
    const stroke = hybridState.stroke || {};
    const fill = hybridState.fill || {};
    const verts = hybridState.vertices || {};
    const bg = hybridState.background || {};
    const rendering = hybridState.rendering || {};
    const coset = hybridState.coset || {};
    const ci = hybridState.coincidentIndices || {};

    const sc = stroke.coloring || {};
    const scp = sc.params || {};
    const fc = fill.coloring || {};
    const fcp = fc.params || {};
    const vc = verts.coloring || {};
    const vcp = vc.params || {};

    // Source A/B coloring
    const srcA = hybridState.sourceA || {};
    const srcAc = srcA.coloring || {};
    const srcAcp = srcAc.params || {};
    const srcB = hybridState.sourceB || {};
    const srcBc = srcB.coloring || {};
    const srcBcp = srcBc.params || {};

    // Interpolation Paths coloring
    const interpPaths = hybridState.interpPaths || {};
    const ipc = interpPaths.coloring || {};
    const ipcp = ipc.params || {};

    // Base curve A/B coloring
    const bcA = hybridState.baseCurveA || {};
    const bcAc = bcA.coloring || {};
    const bcAcp = bcAc.params || {};
    const bcB = hybridState.baseCurveB || {};
    const bcBc = bcB.coloring || {};
    const bcBcp = bcBc.params || {};

    return {
        // Mix
        weight: mix.weight,
        method: mix.method,
        samples: mix.samples,
        resampleMethod: mix.resampleMethod,
        approxResampleThreshold: mix.approxResampleThreshold,
        mixType: mix.mixType,
        interpCurveMode: mix.interpCurveMode,
        interpCurveDetail: mix.interpCurveDetail,
        interpWaveAmplitude: mix.interpWaveAmplitude,
        interpWaveFrequency: mix.interpWaveFrequency,
        interpWaveAlternateFlip: mix.interpWaveAlternateFlip,
        interpBezierBulge: mix.interpBezierBulge,

        // Underlay
        showRoseA: underlay.showRoseA,
        showRoseB: underlay.showRoseB,
        underlayOpacity: underlay.opacity,

        // Stroke
        showHybridLines: stroke.visible !== false,
        color: scp.solid?.color,
        colorEnd: scp['gradient-2point']?.colorEnd,
        colorMethod: sc.method,
        gradientType: sc.type,
        gradientPreset: scp['gradient-preset']?.preset,
        gradientStops: scp['gradient-custom']?.stops,
        opacity: stroke.opacity,
        blendMode: stroke.blendMode,
        lineWidth: stroke.lineWidth,
        antiAlias: stroke.antiAlias,

        // Fill
        showFill: fill.visible,
        fillColor: fcp.solid?.color,
        fillColorEnd: fcp['gradient-2point']?.colorEnd,
        fillOpacity: fill.opacity,
        fillBlendMode: fill.blendMode,
        fillColorMethod: fc.method,
        fillGradientType: fc.type,
        fillGradientPreset: fcp['gradient-preset']?.preset,
        fillGradientStops: fcp['gradient-custom']?.stops,

        // Vertices
        showVertices: verts.visible,
        vertexRadius: verts.radius,
        vertexColor: vcp.solid?.color,
        vertexOpacity: verts.opacity,
        vertexBlendMode: verts.blendMode,
        vertexColorMethod: vc.method,
        vertexColorEnd: vcp['gradient-2point']?.colorEnd,
        vertexGradientType: vc.type,
        vertexGradientPreset: vcp['gradient-preset']?.preset,
        vertexGradientStops: vcp['gradient-custom']?.stops,
        vertexAntiAlias: verts.antiAlias,

        // Interpolation Paths
        showInterpPaths: interpPaths.visible,
        interpPathsLineWidth: interpPaths.lineWidth,
        interpPathsColor: ipcp.solid?.color,
        interpPathsColorEnd: ipcp['gradient-2point']?.colorEnd,
        interpPathsOpacity: interpPaths.opacity,
        interpPathsBlendMode: interpPaths.blendMode,
        interpPathsColorMethod: ipc.method,
        interpPathsGradientType: ipc.type,
        interpPathsGradientPreset: ipcp['gradient-preset']?.preset,
        interpPathsGradientStops: ipcp['gradient-custom']?.stops,
        interpPathsSelectedOnly: interpPaths.selectedOnly ?? false,

        // Source Underlays (A/B)
        underlayColorA: srcAcp.solid?.color,
        underlayColorMethodA: srcAc.method,
        underlayLineWidthA: srcA.lineWidth,
        underlayOpacityA: srcA.opacity,
        underlayBlendModeA: srcA.blendMode,
        underlayAntiAliasA: srcA.antiAlias,

        underlayColorB: srcBcp.solid?.color,
        underlayColorMethodB: srcBc.method,
        underlayLineWidthB: srcB.lineWidth,
        underlayOpacityB: srcB.opacity,
        underlayBlendModeB: srcB.blendMode,
        underlayAntiAliasB: srcB.antiAlias,

        // Base Curves (A/B)
        showBaseCurveA: bcA.visible,
        baseCurveLineWidthA: bcA.lineWidth,
        baseCurveColorA: bcAcp.solid?.color,
        baseCurveOpacityA: bcA.opacity,
        baseCurveBlendModeA: bcA.blendMode,
        baseCurveAntiAliasA: bcA.antiAlias,
        baseCurveColorMethodA: bcAc.method,

        showBaseCurveB: bcB.visible,
        baseCurveLineWidthB: bcB.lineWidth,
        baseCurveColorB: bcBcp.solid?.color,
        baseCurveOpacityB: bcB.opacity,
        baseCurveBlendModeB: bcB.blendMode,
        baseCurveAntiAliasB: bcB.antiAlias,
        baseCurveColorMethodB: bcBc.method,

        // Coset
        matchCosetsByLCM: coset.matchCosetsByLCM,
        cosetIndex: coset.index,
        cosetCount: coset.count,
        cosetDistribution: coset.distribution,

        // Coincident Indices
        showCoincidentIndices: ci.visible,
        coincidentPointSize: ci.pointSize,
        coincidentColor: ci.color,
        coincidentOpacity: ci.opacity,
        coincidentShape: ci.shape,

        // Background
        backgroundColor: bg.color,
        backgroundOpacity: bg.opacity,

        // Rendering
        autoScale: rendering.autoScale,
        scaleLineWidth: rendering.scaleLineWidth,
        connectMode: rendering.connectMode,
        connectDetail: rendering.connectDetail,
        waveAmplitude: rendering.waveAmplitude,
        waveFrequency: rendering.waveFrequency,
        waveAlternateFlip: rendering.waveAlternateFlip,
        splineTension: rendering.splineTension,
        splineBias: rendering.splineBias,
        splineContinuity: rendering.splineContinuity,
        splineAlpha: rendering.splineAlpha,
        bezierBulge: rendering.bezierBulge
    };
}

// ─── Dispatch helpers ────────────────────────────────────

/**
 * Map of flat UI key → deep state path segments (relative to roseState).
 * Curve-type-specific and sequencer-type-specific keys are handled dynamically.
 */
const FLAT_KEY_TO_PATH = {
    // Stroke
    showChordalLines: ['stroke', 'visible'],
    color: ['stroke', 'coloring', 'params', 'solid', 'color'],
    colorEnd: ['stroke', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    colorMethod: ['stroke', 'coloring', 'method'],
    gradientType: ['stroke', 'coloring', 'type'],
    gradientPreset: ['stroke', 'coloring', 'params', 'gradient-preset', 'preset'],
    gradientStops: ['stroke', 'coloring', 'params', 'gradient-custom', 'stops'],
    opacity: ['stroke', 'opacity'],
    blendMode: ['stroke', 'blendMode'],
    lineWidth: ['stroke', 'lineWidth'],
    antiAlias: ['stroke', 'antiAlias'],

    // Fill
    showFill: ['fill', 'visible'],
    fillColor: ['fill', 'coloring', 'params', 'solid', 'color'],
    fillColorEnd: ['fill', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    fillColorMethod: ['fill', 'coloring', 'method'],
    fillGradientType: ['fill', 'coloring', 'type'],
    fillGradientPreset: ['fill', 'coloring', 'params', 'gradient-preset', 'preset'],
    fillGradientStops: ['fill', 'coloring', 'params', 'gradient-custom', 'stops'],
    fillOpacity: ['fill', 'opacity'],
    fillBlendMode: ['fill', 'blendMode'],

    // Base Curve
    showBaseCurve: ['baseCurve', 'visible'],
    baseCurveLineWidth: ['baseCurve', 'lineWidth'],
    baseCurveColor: ['baseCurve', 'coloring', 'params', 'solid', 'color'],
    baseCurveOpacity: ['baseCurve', 'opacity'],
    baseCurveBlendMode: ['baseCurve', 'blendMode'],
    baseCurveAntiAlias: ['baseCurve', 'antiAlias'],
    baseCurveColorMethod: ['baseCurve', 'coloring', 'method'],
    baseCurveGradientType: ['baseCurve', 'coloring', 'type'],
    baseCurveGradientPreset: ['baseCurve', 'coloring', 'params', 'gradient-preset', 'preset'],
    baseCurveGradientStops: ['baseCurve', 'coloring', 'params', 'gradient-custom', 'stops'],
    baseCurveColorEnd: ['baseCurve', 'coloring', 'params', 'gradient-2point', 'colorEnd'],

    // Vertices
    showVertices: ['vertices', 'visible'],
    vertexRadius: ['vertices', 'radius'],
    vertexColor: ['vertices', 'coloring', 'params', 'solid', 'color'],
    vertexOpacity: ['vertices', 'opacity'],
    vertexBlendMode: ['vertices', 'blendMode'],
    vertexColorMethod: ['vertices', 'coloring', 'method'],
    vertexGradientType: ['vertices', 'coloring', 'type'],
    vertexGradientPreset: ['vertices', 'coloring', 'params', 'gradient-preset', 'preset'],
    vertexGradientStops: ['vertices', 'coloring', 'params', 'gradient-custom', 'stops'],
    vertexColorEnd: ['vertices', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    vertexAntiAlias: ['vertices', 'antiAlias'],

    // Background
    backgroundColor: ['background', 'color'],
    backgroundOpacity: ['background', 'opacity'],

    // Special Points
    showSpecialPoints: ['specialPoints', 'show'],
    showZeroPoints: ['specialPoints', 'zeroPoints', 'show'],
    zeroPointsColor: ['specialPoints', 'zeroPoints', 'color'],
    zeroPointsSize: ['specialPoints', 'zeroPoints', 'pointSize'],
    zeroPointsOpacity: ['specialPoints', 'zeroPoints', 'opacity'],
    showDoublePoints: ['specialPoints', 'doublePoints', 'show'],
    doublePointsColor: ['specialPoints', 'doublePoints', 'color'],
    doublePointsSize: ['specialPoints', 'doublePoints', 'pointSize'],
    doublePointsOpacity: ['specialPoints', 'doublePoints', 'opacity'],
    showBoundaryPoints: ['specialPoints', 'boundaryPoints', 'show'],
    boundaryPointsColor: ['specialPoints', 'boundaryPoints', 'color'],
    boundaryPointsSize: ['specialPoints', 'boundaryPoints', 'pointSize'],
    boundaryPointsOpacity: ['specialPoints', 'boundaryPoints', 'opacity'],
    specialPointsShape: ['specialPoints', 'shape'],

    // Rendering
    autoScale: ['rendering', 'autoScale'],
    scaleLineWidth: ['rendering', 'scaleLineWidth'],
    connectMode: ['rendering', 'connectMode'],
    connectDetail: ['rendering', 'connectDetail'],
    waveAmplitude: ['rendering', 'waveAmplitude'],
    waveFrequency: ['rendering', 'waveFrequency'],
    waveAlternateFlip: ['rendering', 'waveAlternateFlip'],
    splineTension: ['rendering', 'splineTension'],
    splineBias: ['rendering', 'splineBias'],
    splineContinuity: ['rendering', 'splineContinuity'],
    splineAlpha: ['rendering', 'splineAlpha'],
    bezierBulge: ['rendering', 'bezierBulge'],

    // Coset (rosette)
    cosetIndex: ['coset', 'index'],
    showAllCosets: ['coset', 'showAll'],
    cosetCount: ['coset', 'count'],
    cosetDistribution: ['coset', 'distribution'],

    // Top-level type selectors
    curveType: ['curve', 'type'],
    sequencerType: ['sequencer', 'type'],

    // Rhodonea curve-specific (static mapping to avoid fallback warning
    // when link visuals iterate controls while a non-Rhodonea curve is active)
    allowDoubleTrace: ['curve', 'params', 'Rhodonea', 'allowDoubleTrace']
};

/**
 * Map of flat UI key → deep state path segments for hybrid state.
 * Hybrid has a different nested structure than rosettes (no curve/sequencer,
 * but has sourceA/B, baseCurveA/B, coset, mix sub-objects).
 */
const HYBRID_FLAT_KEY_TO_PATH = {
    // Mix
    weight: ['mix', 'weight'],
    method: ['mix', 'method'],
    samples: ['mix', 'samples'],
    resampleMethod: ['mix', 'resampleMethod'],
    approxResampleThreshold: ['mix', 'approxResampleThreshold'],
    mixType: ['mix', 'mixType'],
    interpCurveMode: ['mix', 'interpCurveMode'],
    interpCurveDetail: ['mix', 'interpCurveDetail'],
    interpWaveAmplitude: ['mix', 'interpWaveAmplitude'],
    interpWaveFrequency: ['mix', 'interpWaveFrequency'],
    interpWaveAlternateFlip: ['mix', 'interpWaveAlternateFlip'],
    interpBezierBulge: ['mix', 'interpBezierBulge'],

    // Underlay toggles
    showRoseA: ['underlay', 'showRoseA'],
    showRoseB: ['underlay', 'showRoseB'],
    underlayOpacity: ['underlay', 'opacity'],

    // Stroke (hybrid main curve)
    showHybridLines: ['stroke', 'visible'],
    color: ['stroke', 'coloring', 'params', 'solid', 'color'],
    colorEnd: ['stroke', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    colorMethod: ['stroke', 'coloring', 'method'],
    gradientType: ['stroke', 'coloring', 'type'],
    gradientPreset: ['stroke', 'coloring', 'params', 'gradient-preset', 'preset'],
    gradientStops: ['stroke', 'coloring', 'params', 'gradient-custom', 'stops'],
    opacity: ['stroke', 'opacity'],
    blendMode: ['stroke', 'blendMode'],
    lineWidth: ['stroke', 'lineWidth'],
    antiAlias: ['stroke', 'antiAlias'],

    // Fill
    showFill: ['fill', 'visible'],
    fillColor: ['fill', 'coloring', 'params', 'solid', 'color'],
    fillColorEnd: ['fill', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    fillColorMethod: ['fill', 'coloring', 'method'],
    fillGradientType: ['fill', 'coloring', 'type'],
    fillGradientPreset: ['fill', 'coloring', 'params', 'gradient-preset', 'preset'],
    fillGradientStops: ['fill', 'coloring', 'params', 'gradient-custom', 'stops'],
    fillOpacity: ['fill', 'opacity'],
    fillBlendMode: ['fill', 'blendMode'],

    // Vertices
    showVertices: ['vertices', 'visible'],
    vertexRadius: ['vertices', 'radius'],
    vertexColor: ['vertices', 'coloring', 'params', 'solid', 'color'],
    vertexOpacity: ['vertices', 'opacity'],
    vertexBlendMode: ['vertices', 'blendMode'],
    vertexColorMethod: ['vertices', 'coloring', 'method'],
    vertexGradientType: ['vertices', 'coloring', 'type'],
    vertexGradientPreset: ['vertices', 'coloring', 'params', 'gradient-preset', 'preset'],
    vertexGradientStops: ['vertices', 'coloring', 'params', 'gradient-custom', 'stops'],
    vertexColorEnd: ['vertices', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    vertexAntiAlias: ['vertices', 'antiAlias'],

    // Interpolation Paths
    showInterpPaths: ['interpPaths', 'visible'],
    interpPathsLineWidth: ['interpPaths', 'lineWidth'],
    interpPathsColor: ['interpPaths', 'coloring', 'params', 'solid', 'color'],
    interpPathsColorEnd: ['interpPaths', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    interpPathsOpacity: ['interpPaths', 'opacity'],
    interpPathsBlendMode: ['interpPaths', 'blendMode'],
    interpPathsColorMethod: ['interpPaths', 'coloring', 'method'],
    interpPathsGradientType: ['interpPaths', 'coloring', 'type'],
    interpPathsGradientPreset: ['interpPaths', 'coloring', 'params', 'gradient-preset', 'preset'],
    interpPathsGradientStops: ['interpPaths', 'coloring', 'params', 'gradient-custom', 'stops'],
    interpPathsSelectedOnly: ['interpPaths', 'selectedOnly'],

    // Source A underlay appearance
    underlayColorA: ['sourceA', 'coloring', 'params', 'solid', 'color'],
    underlayColorMethodA: ['sourceA', 'coloring', 'method'],
    underlayLineWidthA: ['sourceA', 'lineWidth'],
    underlayOpacityA: ['sourceA', 'opacity'],
    underlayBlendModeA: ['sourceA', 'blendMode'],
    underlayAntiAliasA: ['sourceA', 'antiAlias'],

    // Source B underlay appearance
    underlayColorB: ['sourceB', 'coloring', 'params', 'solid', 'color'],
    underlayColorMethodB: ['sourceB', 'coloring', 'method'],
    underlayLineWidthB: ['sourceB', 'lineWidth'],
    underlayOpacityB: ['sourceB', 'opacity'],
    underlayBlendModeB: ['sourceB', 'blendMode'],
    underlayAntiAliasB: ['sourceB', 'antiAlias'],

    // Base Curve A
    showBaseCurveA: ['baseCurveA', 'visible'],
    baseCurveLineWidthA: ['baseCurveA', 'lineWidth'],
    baseCurveColorA: ['baseCurveA', 'coloring', 'params', 'solid', 'color'],
    baseCurveColorMethodA: ['baseCurveA', 'coloring', 'method'],
    baseCurveOpacityA: ['baseCurveA', 'opacity'],
    baseCurveBlendModeA: ['baseCurveA', 'blendMode'],
    baseCurveAntiAliasA: ['baseCurveA', 'antiAlias'],

    // Base Curve B
    showBaseCurveB: ['baseCurveB', 'visible'],
    baseCurveLineWidthB: ['baseCurveB', 'lineWidth'],
    baseCurveColorB: ['baseCurveB', 'coloring', 'params', 'solid', 'color'],
    baseCurveColorMethodB: ['baseCurveB', 'coloring', 'method'],
    baseCurveOpacityB: ['baseCurveB', 'opacity'],
    baseCurveBlendModeB: ['baseCurveB', 'blendMode'],
    baseCurveAntiAliasB: ['baseCurveB', 'antiAlias'],

    // Coset
    matchCosetsByLCM: ['coset', 'matchCosetsByLCM'],
    cosetIndex: ['coset', 'index'],
    cosetCount: ['coset', 'count'],
    cosetDistribution: ['coset', 'distribution'],

    // Coincident Indices
    showCoincidentIndices: ['coincidentIndices', 'visible'],
    coincidentPointSize: ['coincidentIndices', 'pointSize'],
    coincidentColor: ['coincidentIndices', 'color'],
    coincidentOpacity: ['coincidentIndices', 'opacity'],
    coincidentShape: ['coincidentIndices', 'shape'],

    // Background
    backgroundColor: ['background', 'color'],
    backgroundOpacity: ['background', 'opacity'],

    // Rendering
    autoScale: ['rendering', 'autoScale'],
    scaleLineWidth: ['rendering', 'scaleLineWidth'],
    connectMode: ['rendering', 'connectMode'],
    connectDetail: ['rendering', 'connectDetail'],
    waveAmplitude: ['rendering', 'waveAmplitude'],
    waveFrequency: ['rendering', 'waveFrequency'],
    waveAlternateFlip: ['rendering', 'waveAlternateFlip'],
    splineTension: ['rendering', 'splineTension'],
    splineBias: ['rendering', 'splineBias'],
    splineContinuity: ['rendering', 'splineContinuity'],
    splineAlpha: ['rendering', 'splineAlpha'],
    bezierBulge: ['rendering', 'bezierBulge']
};

/**
 * Convert a flat UI key to a full deep path array for SET_DEEP dispatch.
 * 
 * @param {string} flatKey - e.g. 'color', 'n', 'totalDivs', 'showBaseCurve'
 * @param {string} roseId  - e.g. 'rosetteA', 'rosetteB', or 'hybrid'
 * @param {object} roseState - the current nested state for this rosette/hybrid
 * @returns {string[]} path array for SET_DEEP, e.g. ['rosetteA', 'stroke', 'opacity']
 */
export function getFlatKeyDeepPath(flatKey, roseId, roseState) {
    // Use hybrid-specific mapping for hybrid roseId
    if (roseId === 'hybrid') {
        const hybridPath = HYBRID_FLAT_KEY_TO_PATH[flatKey];
        if (hybridPath) {
            return ['hybrid', ...hybridPath];
        }
        console.warn(`[stateAdapters] No hybrid path mapping for flat key '${flatKey}'. Falling back to top-level.`);
        return ['hybrid', flatKey];
    }

    // 1. Check static mapping (rosette)
    const staticPath = FLAT_KEY_TO_PATH[flatKey];
    if (staticPath) {
        return [roseId, ...staticPath];
    }

    // 2. Check if it's a curve-type-specific parameter
    const curveType = roseState?.curve?.type || 'Rhodonea';
    const curveParams = roseState?.curve?.params?.[curveType];
    if (curveParams && flatKey in curveParams) {
        return [roseId, 'curve', 'params', curveType, flatKey];
    }

    // 3. Check if it's a sequencer-type-specific parameter
    const seqType = roseState?.sequencer?.type || 'Cyclic Additive Group Modulo N';
    const seqParams = roseState?.sequencer?.params?.[seqType];
    if (seqParams && flatKey in seqParams) {
        return [roseId, 'sequencer', 'params', seqType, flatKey];
    }

    // 4. Fallback: assume it's a top-level key on the rosette (backward compat during migration)
    console.warn(`[stateAdapters] No deep path mapping for flat key '${flatKey}' on ${roseId}. Falling back to top-level.`);
    return [roseId, flatKey];
}

/**
 * Dispatch a SET_DEEP action for a given flat key on a rosette or hybrid.
 * This is the primary dispatch helper for all UI components.
 */
export function dispatchDeep(flatKey, value, roseId) {
    const state = store.getState();
    const roseState = state[roseId];
    const path = getFlatKeyDeepPath(flatKey, roseId, roseState);

    store.dispatch({
        type: ACTIONS.SET_DEEP,
        path,
        value
    });
}

/**
 * Build a full dot-path link key from a flat UI key.
 * Used by LinkManager for linking parameters between rosettes.
 * 
 * @param {string} flatKey - e.g. 'n', 'color', 'opacity'
 * @param {string} roseId  - e.g. 'rosetteA', 'rosetteB', or 'hybrid'
 * @returns {string} dot-separated path, e.g. 'rosetteA.stroke.opacity'
 */
export function getLinkKey(flatKey, roseId) {
    const state = store.getState();
    const roseState = state[roseId];
    const pathArray = getFlatKeyDeepPath(flatKey, roseId, roseState);
    return pathArray.join('.');
}
