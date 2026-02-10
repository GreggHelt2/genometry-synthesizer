/**
 * stateAdapters.js
 * 
 * Bi-directional adapters between the v3.0 nested state and
 * the flat property format the UI components and renderer expect.
 * 
 * flattenRoseParams(roseState)   → flat object for rendering / UI reads
 * getFlatKeyDeepPath(flatKey, roseState) → path array for SET_DEEP dispatch
 */

import { ACTIONS } from './Actions.js';
import { store } from './Store.js';

// ─── Flatten (nested → flat) ────────────────────────────

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
        cosetIndex: coset.index ?? 0,
        showAllCosets: coset.showAll ?? false,
        cosetCount: coset.count ?? 1,
        cosetDistribution: coset.distribution ?? 'sequential',

        // Stroke
        color: scp.solid?.color || '#ffffff',
        colorEnd: scp['gradient-2point']?.colorEnd || '#FF00FF',
        colorMethod: sc.type || 'solid',
        gradientType: sc.type || 'solid',
        gradientPreset: scp['gradient-preset']?.preset || 'rainbow',
        gradientStops: scp['gradient-custom']?.stops || [],
        opacity: stroke.opacity ?? 1,
        blendMode: stroke.blendMode || 'source-over',
        lineWidth: stroke.lineWidth ?? 2,
        antiAlias: stroke.antiAlias !== false,

        // Fill
        showFill: fill.visible !== false,
        fillColor: fcp.solid?.color || '#ffffff',
        fillColorEnd: fcp['gradient-2point']?.colorEnd || '#000000',
        fillOpacity: fill.opacity ?? 0,
        fillBlendMode: fill.blendMode || 'source-over',
        fillColorMethod: fc.type || 'solid',
        fillGradientType: fc.type || 'solid',
        fillGradientPreset: fcp['gradient-preset']?.preset || 'rainbow',
        fillGradientStops: fcp['gradient-custom']?.stops || [],

        // Base Curve
        showBaseCurve: baseCurve.visible === true,
        baseCurveLineWidth: baseCurve.lineWidth ?? 2,
        baseCurveColor: bccp.solid?.color || '#666666',
        baseCurveColorEnd: bccp['gradient-2point']?.colorEnd || '#ffffff',
        baseCurveOpacity: baseCurve.opacity ?? 1,
        baseCurveBlendMode: baseCurve.blendMode || 'source-over',
        baseCurveAntiAlias: baseCurve.antiAlias !== false,
        baseCurveColorMethod: bcc.type || 'solid',
        baseCurveGradientType: bcc.type || 'solid',
        baseCurveGradientPreset: bccp['gradient-preset']?.preset || 'rainbow',
        baseCurveGradientStops: bccp['gradient-custom']?.stops || [],

        // Vertices
        showVertices: verts.visible === true,
        vertexRadius: verts.radius ?? 2,
        vertexColor: vcp.solid?.color || '#ffffff',
        vertexOpacity: verts.opacity ?? 1,
        vertexBlendMode: verts.blendMode || 'source-over',
        vertexColorMethod: vc.type || 'solid',
        vertexColorEnd: vcp['gradient-2point']?.colorEnd || '#ff0000',
        vertexGradientType: vc.type || 'solid',
        vertexGradientPreset: vcp['gradient-preset']?.preset || 'rainbow',
        vertexGradientStops: vcp['gradient-custom']?.stops || [],

        // Background
        backgroundColor: bg.color || '#000000',
        backgroundOpacity: bg.opacity ?? 0,

        // Rendering
        autoScale: rendering.autoScale ?? false,
        scaleLineWidth: rendering.scaleLineWidth !== false,
        connectMode: rendering.connectMode || 'straight',
        connectDetail: rendering.connectDetail ?? 20,
        waveAmplitude: rendering.waveAmplitude ?? 10,
        waveFrequency: rendering.waveFrequency ?? 5,
        waveAlternateFlip: rendering.waveAlternateFlip ?? false,
        splineTension: rendering.splineTension ?? 0,
        splineBias: rendering.splineBias ?? 0,
        splineContinuity: rendering.splineContinuity ?? 0,
        splineAlpha: rendering.splineAlpha ?? 0.5,
        bezierBulge: rendering.bezierBulge ?? 0
    };
}

// ─── Dispatch helpers ────────────────────────────────────

/**
 * Map of flat UI key → deep state path segments (relative to roseState).
 * Curve-type-specific and sequencer-type-specific keys are handled dynamically.
 */
const FLAT_KEY_TO_PATH = {
    // Stroke
    color: ['stroke', 'coloring', 'params', 'solid', 'color'],
    colorEnd: ['stroke', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    colorMethod: ['stroke', 'coloring', 'type'],
    gradientType: ['stroke', 'coloring', 'type'], // alias — same deep path
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
    fillColorMethod: ['fill', 'coloring', 'type'],
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
    baseCurveColorMethod: ['baseCurve', 'coloring', 'type'],
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
    vertexColorMethod: ['vertices', 'coloring', 'type'],
    vertexGradientType: ['vertices', 'coloring', 'type'],
    vertexGradientPreset: ['vertices', 'coloring', 'params', 'gradient-preset', 'preset'],
    vertexGradientStops: ['vertices', 'coloring', 'params', 'gradient-custom', 'stops'],
    vertexColorEnd: ['vertices', 'coloring', 'params', 'gradient-2point', 'colorEnd'],
    vertexAntiAlias: ['vertices', 'antiAlias'],

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
    bezierBulge: ['rendering', 'bezierBulge'],

    // Coset
    cosetIndex: ['coset', 'index'],
    showAllCosets: ['coset', 'showAll'],
    cosetCount: ['coset', 'count'],
    cosetDistribution: ['coset', 'distribution'],

    // Top-level type selectors
    curveType: ['curve', 'type'],
    sequencerType: ['sequencer', 'type']
};

/**
 * Convert a flat UI key to a full deep path array for SET_DEEP dispatch.
 * 
 * @param {string} flatKey - e.g. 'color', 'n', 'totalDivs', 'showBaseCurve'
 * @param {string} roseId  - e.g. 'rosetteA'
 * @param {object} roseState - the current nested state for this rosette (needed for dynamic curve/seq type)
 * @returns {string[]} path array for SET_DEEP, e.g. ['rosetteA', 'stroke', 'opacity']
 */
export function getFlatKeyDeepPath(flatKey, roseId, roseState) {
    // 1. Check static mapping
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
 * Dispatch a SET_DEEP action for a given flat key on a rosette.
 * This is the primary dispatch helper for all rosette UI components.
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
 * @param {string} roseId  - e.g. 'rosetteA'
 * @returns {string} dot-separated path, e.g. 'rosetteA.stroke.opacity'
 */
export function getLinkKey(flatKey, roseId) {
    const state = store.getState();
    const roseState = state[roseId];
    const pathArray = getFlatKeyDeepPath(flatKey, roseId, roseState);
    return pathArray.join('.');
}
