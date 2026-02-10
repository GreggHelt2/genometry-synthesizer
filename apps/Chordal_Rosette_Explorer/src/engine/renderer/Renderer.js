import { PolylineLayer } from './layers/PolylineLayer.js';
import { CurveRegistry } from '../math/curves/CurveRegistry.js';
import { generateChordalPolyline } from '../math/chordal_rosette.js';

import { interpolateLinear, resamplePolyline, resamplePolylineApprox } from '../math/interpolation.js';
import { Colorizer } from '../math/Colorizer.js';
import { gcd, lcm } from '../math/MathOps.js';
import { SequencerRegistry } from '../math/sequencers/SequencerRegistry.js';
import { AdditiveGroupModuloNGenerator } from '../math/sequencers/AdditiveGroupModuloNGenerator.js';

// ─── State Adapters ─────────────────────────────────────
// These functions extract flat render-ready param objects from the
// v3.0 nested state structure. This lets the rendering code remain
// largely unchanged while the state shape evolves.

/**
 * Extract the active curve params (merging type-specific params with the type key).
 * Returns { curveType, n, d, A, c, rot, ... } — i.e. the flat object createCurve expects.
 */
function getCurveParams(roseState) {
    const curveType = roseState.curve?.type || 'Rhodonea';
    const typeParams = roseState.curve?.params?.[curveType] || {};
    return { curveType, ...typeParams };
}

/**
 * Extract the active sequencer params.
 * Returns { sequencerType, step, totalDivs, useCustomDivs, ... }
 */
function getSequencerParams(roseState) {
    const seqType = roseState.sequencer?.type || 'Cyclic Additive Group Modulo N';
    const typeParams = roseState.sequencer?.params?.[seqType] || {};
    return { sequencerType: seqType, ...typeParams };
}

/**
 * Build a flat render-params object from a v3.0 rosette state.
 * This is the main adapter used by renderPreview / drawRenderableRose.
 */
function flattenRoseParams(roseState) {
    const curve = getCurveParams(roseState);
    const seq = getSequencerParams(roseState);
    const stroke = roseState.stroke || {};
    const fill = roseState.fill || {};
    const baseCurve = roseState.baseCurve || {};
    const verts = roseState.vertices || {};
    const bg = roseState.background || {};
    const rendering = roseState.rendering || {};
    const coset = roseState.coset || {};

    // Stroke coloring helpers
    const sc = stroke.coloring || {};
    const scp = sc.params || {};

    // Fill coloring helpers
    const fc = fill.coloring || {};
    const fcp = fc.params || {};

    // BaseCurve coloring helpers
    const bcc = baseCurve.coloring || {};
    const bccp = bcc.params || {};

    // Vertex coloring helpers
    const vc = verts.coloring || {};
    const vcp = vc.params || {};

    return {
        // Curve
        ...curve,

        // Sequencer
        ...seq,

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
        fillGradientStops: fcp['gradient-custom']?.stops || [],

        // Base Curve
        showBaseCurve: baseCurve.visible === true,
        baseCurveLineWidth: baseCurve.lineWidth ?? 2,
        baseCurveColor: bccp.solid?.color || '#666666',
        baseCurveOpacity: baseCurve.opacity ?? 1,
        baseCurveBlendMode: baseCurve.blendMode || 'source-over',
        baseCurveAntiAlias: baseCurve.antiAlias !== false,

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
        splineAlpha: rendering.splineAlpha ?? 0.5
    };
}

/**
 * Build flat render-params for the hybrid section from v3.0 state.
 */
function flattenHybridParams(hybridState) {
    const mix = hybridState.mix || {};
    const underlay = hybridState.underlay || {};
    const stroke = hybridState.stroke || {};
    const fill = hybridState.fill || {};
    const verts = hybridState.vertices || {};
    const bg = hybridState.background || {};
    const rendering = hybridState.rendering || {};

    const sc = stroke.coloring || {};
    const scp = sc.params || {};
    const fc = fill.coloring || {};
    const fcp = fc.params || {};
    const vc = verts.coloring || {};
    const vcp = vc.params || {};

    return {
        // Mix
        weight: mix.weight ?? 0,
        method: mix.method || 'linear',
        samples: mix.samples ?? 360,
        resampleMethod: mix.resampleMethod || 'lcm',
        approxResampleThreshold: mix.approxResampleThreshold ?? 20000,
        mixType: mix.mixType || 'simple',

        // Underlay
        showRoseA: underlay.showRoseA ?? false,
        showRoseB: underlay.showRoseB ?? false,
        underlayOpacity: underlay.opacity ?? 0.15,

        // Stroke
        color: scp.solid?.color || '#a855f7',
        colorEnd: scp['gradient-2point']?.colorEnd || '#ef4444',
        colorMethod: sc.type || 'solid',
        gradientType: sc.type || 'solid',
        gradientPreset: scp['gradient-preset']?.preset || 'rainbow',
        gradientStops: scp['gradient-custom']?.stops || [],
        opacity: stroke.opacity ?? 0.5,
        blendMode: stroke.blendMode || 'lighter',
        lineWidth: stroke.lineWidth ?? 2,

        // Fill
        showFill: fill.visible !== false,
        fillColor: fcp.solid?.color || '#ffffff',
        fillColorEnd: fcp['gradient-2point']?.colorEnd || '#000000',
        fillOpacity: fill.opacity ?? 0,
        fillBlendMode: fill.blendMode || 'source-over',
        fillColorMethod: fc.type || 'solid',
        fillGradientStops: fcp['gradient-custom']?.stops || [],

        // Vertices
        showVertices: verts.visible === true,
        vertexRadius: verts.radius ?? 2,
        vertexColor: vcp.solid?.color || '#ffffff',
        vertexOpacity: verts.opacity ?? 1,
        vertexBlendMode: verts.blendMode || 'source-over',

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

        // Base Curves (A/B specific)
        showBaseCurveA: hybridState.baseCurveA?.visible ?? false,
        baseCurveLineWidthA: hybridState.baseCurveA?.lineWidth ?? 1,
        baseCurveColorA: hybridState.baseCurveA?.coloring?.params?.solid?.color || '#FF0000',
        baseCurveOpacityA: hybridState.baseCurveA?.opacity ?? 0.3,
        baseCurveBlendModeA: hybridState.baseCurveA?.blendMode || 'source-over',

        showBaseCurveB: hybridState.baseCurveB?.visible ?? false,
        baseCurveLineWidthB: hybridState.baseCurveB?.lineWidth ?? 1,
        baseCurveColorB: hybridState.baseCurveB?.coloring?.params?.solid?.color || '#0000FF',
        baseCurveOpacityB: hybridState.baseCurveB?.opacity ?? 0.3,
        baseCurveBlendModeB: hybridState.baseCurveB?.blendMode || 'source-over',

        // Source Underlays (A/B)
        underlayColorA: hybridState.sourceA?.coloring?.params?.solid?.color || '#FF0000',
        underlayColorMethodA: hybridState.sourceA?.coloring?.type || 'solid',
        underlayLineWidthA: hybridState.sourceA?.lineWidth ?? 1,
        underlayOpacityA: hybridState.sourceA?.opacity ?? 0.3,
        underlayBlendModeA: hybridState.sourceA?.blendMode || 'source-over',
        underlayAntiAliasA: true,

        underlayColorB: hybridState.sourceB?.coloring?.params?.solid?.color || '#0000FF',
        underlayColorMethodB: hybridState.sourceB?.coloring?.type || 'solid',
        underlayLineWidthB: hybridState.sourceB?.lineWidth ?? 1,
        underlayOpacityB: hybridState.sourceB?.opacity ?? 0.3,
        underlayBlendModeB: hybridState.sourceB?.blendMode || 'source-over',
        underlayAntiAliasB: true,

        // Coset matching
        matchCosetsByLCM: mix.matchCosetsByLCM ?? false,
        cosetIndex: 0,
        showAllCosets: false,
        cosetCount: 1,
        cosetDistribution: 'sequential'
    };
}

// ─── Renderer ────────────────────────────────────────────

export class CanvasRenderer {

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.polylineLayer = new PolylineLayer(this.ctx);
    }

    resize(width, height) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.ctx.scale(dpr, dpr);
        this.logicalWidth = width;
        this.logicalHeight = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.logicalWidth || this.width, this.logicalHeight || this.height);
    }

    getSequencer(type) {
        const SequencerClass = SequencerRegistry[type] || AdditiveGroupModuloNGenerator;
        return new SequencerClass();
    }

    getMaxExtent(renderables) {
        let maxExtent = 0;
        let hasPoints = false;

        renderables.forEach(item => {
            if (!item.points) return;
            item.points.forEach(p => {
                const x = Math.abs(p.x !== undefined ? p.x : p[0]);
                const y = Math.abs(p.y !== undefined ? p.y : p[1]);
                if (x > maxExtent) maxExtent = x;
                if (y > maxExtent) maxExtent = y;
                hasPoints = true;
            });
        });

        if (!hasPoints) return null;
        return maxExtent;
    }

    setupCamera(maxExtent, autoScale) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.translate(Math.floor(this.width / 2), Math.floor(this.height / 2));

        let scale;
        if (autoScale && maxExtent !== null && maxExtent > 0) {
            const canvasRadius = Math.min(this.width, this.height) / 2;
            const targetRadius = canvasRadius * 0.9;
            scale = targetRadius / maxExtent;
            this.ctx.scale(scale, scale);
        } else {
            scale = Math.min(this.width, this.height) / 500;
        }

        return scale;
    }

    /**
     * Render a single rosette preview.
     * @param {object} roseState - v3.0 nested rosette state (e.g., state.rosetteA)
     * @param {string} defaultColor
     */
    renderPreview(roseState, defaultColor = 'white') {
        // Flatten the v3.0 state for rendering
        const roseParams = flattenRoseParams(roseState);

        this.clear();
        this.ctx.save();

        // Anti-aliasing
        const aa = roseParams.antiAlias !== false;
        this.ctx.imageSmoothingEnabled = aa;
        this.canvas.style.imageRendering = aa ? 'auto' : 'pixelated';

        // --- Background Rendering ---
        if (roseParams.backgroundOpacity > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = roseParams.backgroundOpacity;
            this.ctx.fillStyle = roseParams.backgroundColor || '#000000';
            this.ctx.fillRect(0, 0, this.logicalWidth || this.width, this.logicalHeight || this.height);
            this.ctx.restore();
        }

        // --- 1. Collection Phase ---
        const renderables = [];

        // Base Curve
        if (roseParams.showBaseCurve) {
            const curve = this.createCurve(roseParams);
            if (curve) {
                const totalRad = curve.getRadiansToClosure();
                const samplesPerRad = 100;
                const sampleCount = Math.min(50000, Math.ceil(totalRad * samplesPerRad));
                const step = totalRad / sampleCount;
                const points = [];
                for (let i = 0; i <= sampleCount; i++) {
                    points.push(curve.getPoint(i * step));
                }
                renderables.push({
                    type: 'baseCurve',
                    points: points,
                    options: {
                        color: roseParams.baseCurveColor,
                        width: roseParams.baseCurveLineWidth,
                        opacity: roseParams.baseCurveOpacity,
                        blendMode: roseParams.baseCurveBlendMode
                    }
                });
            }
        }

        // Rosette
        const curve = this.createCurve(roseParams);
        const sequencer = this.getSequencer(roseParams.sequencerType);

        let disjointCosets = null;
        if (sequencer.getCosets) {
            disjointCosets = sequencer.getCosets(roseParams.totalDivs, roseParams);
        }
        const k = (disjointCosets) ? disjointCosets.length : gcd(roseParams.step, roseParams.totalDivs);
        const indicesToDraw = this.getDrawIndices(k, roseParams);

        indicesToDraw.forEach(idx => {
            let seed;
            if (disjointCosets) {
                seed = disjointCosets[idx % disjointCosets.length];
            } else {
                seed = idx;
            }
            const points = generateChordalPolyline(curve, sequencer, roseParams.totalDivs, seed, roseParams);

            // Degeneracy Check
            const isDegenerate = points.length > 0 && points.every(p => {
                const x = p.x !== undefined ? p.x : p[0];
                const y = p.y !== undefined ? p.y : p[1];
                const x0 = points[0].x !== undefined ? points[0].x : points[0][0];
                const y0 = points[0].y !== undefined ? points[0].y : points[0][1];
                return Math.abs(x - x0) < 0.001 && Math.abs(y - y0) < 0.001;
            });

            renderables.push({
                type: isDegenerate ? 'point' : 'rose',
                points: points,
                params: roseParams,
                seed: seed,
                isDegenerate: isDegenerate
            });
        });


        const maxExtent = this.getMaxExtent(renderables);
        const activeScale = this.setupCamera(maxExtent, roseParams.autoScale);
        const lineWidthScale = (roseParams.scaleLineWidth !== false) ? 1 : (1 / activeScale);


        // --- 3. Draw Phase ---
        renderables.forEach(item => {
            if (item.type === 'baseCurve') {
                this.drawRenderableBaseCurve(item.points, item.options, lineWidthScale);
            } else if (item.type === 'point') {
                const p0 = item.points[0];
                const x0 = p0.x !== undefined ? p0.x : p0[0];
                const y0 = p0.y !== undefined ? p0.y : p0[1];
                this.ctx.fillStyle = item.params.color || defaultColor;
                this.ctx.globalAlpha = (item.params.showAllCosets && k > 1) ? 0.8 : 1;
                this.ctx.beginPath();
                this.ctx.arc(x0, y0, 3 * lineWidthScale, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            } else {
                this.drawRenderableRose(item.points, item.params, defaultColor, lineWidthScale);
            }
        });

        // Vertex Rendering Overlay
        if (roseParams.showVertices) {
            this.ctx.globalCompositeOperation = roseParams.vertexBlendMode || 'source-over';
            renderables.filter(r => r.type === 'rose').forEach(item => {
                let vertexColors = null;
                if (roseParams.vertexColorMethod && roseParams.vertexColorMethod !== 'solid') {
                    vertexColors = Colorizer.generateVertexColors(
                        item.points,
                        roseParams.vertexColorMethod,
                        roseParams.vertexColor,
                        {
                            colorEnd: roseParams.vertexColorEnd,
                            gradientType: roseParams.vertexGradientType,
                            gradientPreset: roseParams.vertexGradientPreset,
                            gradientStops: roseParams.vertexGradientStops
                        }
                    );
                }

                this.polylineLayer.drawVertices(item.points, {
                    color: roseParams.vertexColor,
                    colors: vertexColors,
                    radius: roseParams.vertexRadius,
                    opacity: roseParams.vertexOpacity
                });
            });
            this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.restore();
    }

    drawRenderableBaseCurve(points, options, lineWidthScale = 1) {
        if (!points || points.length === 0) return;

        const { color = '#666666', width = 1, opacity = 1, blendMode = 'source-over' } = options;

        this.ctx.globalCompositeOperation = blendMode;

        const effectiveWidth = width * lineWidthScale;

        if (opacity < 1 || blendMode !== 'source-over') {
            const colors = [color];
            this.polylineLayer.drawColoredSegments(points, colors, {
                width: effectiveWidth,
                opacity: opacity
            });
        } else {
            this.polylineLayer.draw(points, {
                color: color,
                width: effectiveWidth,
                opacity: opacity
            });
        }
    }

    drawRenderableRose(points, params, defaultColor, lineWidthScale = 1) {
        if (!points || points.length === 0) return;

        const baseOpacity = params.opacity ?? 1;
        const blendMode = params.blendMode || 'source-over';
        const useSegments = (params.colorMethod && params.colorMethod !== 'solid') || baseOpacity < 1 || blendMode !== 'source-over';

        this.ctx.globalCompositeOperation = blendMode;

        const effectiveWidth = (params.lineWidth || 2) * lineWidthScale;

        // --- Fill Phase ---
        if (params.showFill !== false && params.fillOpacity > 0) {
            let fillStyle = params.fillColor || defaultColor;

            if (params.fillColorMethod && params.fillColorMethod !== 'solid') {
                let maxDistSq = 0;
                points.forEach(p => {
                    const x = p.x !== undefined ? p.x : p[0];
                    const y = p.y !== undefined ? p.y : p[1];
                    const dSq = x * x + y * y;
                    if (dSq > maxDistSq) maxDistSq = dSq;
                });
                const maxRadius = Math.sqrt(maxDistSq);

                if (maxRadius > 0) {
                    const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);

                    if (params.fillGradientType === 'custom' && params.fillGradientStops && params.fillGradientStops.length > 0) {
                        params.fillGradientStops.forEach(stop => {
                            grad.addColorStop(stop.position, stop.color);
                        });
                    } else {
                        grad.addColorStop(0, params.fillColor || defaultColor);
                        grad.addColorStop(1, params.fillColorEnd || '#000000');
                    }
                    fillStyle = grad;
                }
            }

            this.polylineLayer.fill(points, {
                color: fillStyle,
                opacity: params.fillOpacity,
                rule: 'evenodd'
            });
        }

        // Prepare Style Object with Connection Params
        const style = {
            width: effectiveWidth,
            opacity: baseOpacity,
            connectMode: params.connectMode,
            connectDetail: params.connectDetail,
            waveAmplitude: params.waveAmplitude,
            waveFrequency: params.waveFrequency,
            waveAlternateFlip: params.waveAlternateFlip,
            splineTension: params.splineTension,
            splineBias: params.splineBias,
            splineContinuity: params.splineContinuity,
            splineAlpha: params.splineAlpha,
            bezierBulge: params.bezierBulge
        };

        if (useSegments) {
            let colors;
            if (params.colorMethod && params.colorMethod !== 'solid') {
                colors = Colorizer.generateSegmentColors(points, params.colorMethod, params.color || defaultColor, params);
            } else {
                colors = [params.color || defaultColor];
            }

            this.polylineLayer.drawColoredSegments(points, colors, style);
        } else {
            style.color = params.color || defaultColor;
            this.polylineLayer.draw(points, style);
        }
    }

    /**
     * Render the hybrid interpolation view.
     * @param {object} state - full v3.0 application state
     */
    renderInterpolation(state) {
        // Flatten params for each section
        const roseParamsA = flattenRoseParams(state.rosetteA);
        const roseParamsB = flattenRoseParams(state.rosetteB);
        const hybridParams = flattenHybridParams(state.hybrid);

        this.clear();
        this.ctx.save();

        // --- Background Rendering ---
        if (hybridParams.backgroundOpacity > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = hybridParams.backgroundOpacity;
            this.ctx.fillStyle = hybridParams.backgroundColor || '#000000';
            this.ctx.fillRect(0, 0, this.logicalWidth || this.width, this.logicalHeight || this.height);
            this.ctx.restore();
        }

        const aa = roseParamsA.antiAlias !== false;
        this.ctx.imageSmoothingEnabled = aa;
        this.canvas.style.imageRendering = aa ? 'auto' : 'pixelated';

        const hexToRgba = (hex, alpha) => {
            if (!hex) return `rgba(255, 255, 255, ${alpha})`;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // --- 1. Collection Phase ---
        const renderables = [];

        // Helper to generate base curve points for collection
        const collectBaseCurve = (roseFlat, hybridFlat, suffix) => {
            const curve = this.createCurve(roseFlat);
            if (!curve) return;
            const totalRad = curve.getRadiansToClosure();
            const sampleCount = Math.min(50000, Math.ceil(totalRad * 100));
            const step = totalRad / sampleCount;
            const points = [];
            for (let i = 0; i <= sampleCount; i++) points.push(curve.getPoint(i * step));

            renderables.push({
                type: 'baseCurve',
                points: points,
                options: {
                    color: hybridFlat[`baseCurveColor${suffix}`],
                    width: hybridFlat[`baseCurveLineWidth${suffix}`],
                    opacity: hybridFlat[`baseCurveOpacity${suffix}`],
                    blendMode: hybridFlat[`baseCurveBlendMode${suffix}`]
                }
            });
        };

        if (hybridParams.showBaseCurveA) collectBaseCurve(roseParamsA, hybridParams, 'A');
        if (hybridParams.showBaseCurveB) collectBaseCurve(roseParamsB, hybridParams, 'B');

        // Underlays (Base Chordal Rendering)
        const collectUnderlay = (roseFlat, options) => {
            const curve = this.createCurve(roseFlat);
            const sequencer = this.getSequencer(roseFlat.sequencerType);
            let k;
            if (sequencer.getCosets) {
                const cosets = sequencer.getCosets(roseFlat.totalDivs, roseFlat);
                k = cosets ? cosets.length : gcd(roseFlat.step, roseFlat.totalDivs);
            } else {
                k = gcd(roseFlat.step, roseFlat.totalDivs);
            }
            const indices = this.getDrawIndices(k, roseFlat);
            indices.forEach(idx => {
                const sub = (sequencer.getCosets && k > 1)
                    ? sequencer.getCosets(roseFlat.totalDivs, roseFlat)[idx % k]
                    : idx;
                const points = generateChordalPolyline(curve, sequencer, roseFlat.totalDivs, sub, roseFlat);

                renderables.push({
                    type: 'underlay',
                    points: points,
                    options: options,
                    params: roseFlat,
                    seed: sub
                });
            });
        };

        if (hybridParams.showRoseA) {
            collectUnderlay(roseParamsA, {
                color: hybridParams.underlayColorA || roseParamsA.color,
                colorMethod: hybridParams.underlayColorMethodA || 'solid',
                width: hybridParams.underlayLineWidthA,
                opacity: hybridParams.underlayOpacityA,
                blendMode: hybridParams.underlayBlendModeA,
                antiAlias: hybridParams.underlayAntiAliasA
            });
        }
        if (hybridParams.showRoseB) {
            collectUnderlay(roseParamsB, {
                color: hybridParams.underlayColorB || roseParamsB.color,
                colorMethod: hybridParams.underlayColorMethodB || 'solid',
                width: hybridParams.underlayLineWidthB,
                opacity: hybridParams.underlayOpacityB,
                blendMode: hybridParams.underlayBlendModeB,
                antiAlias: hybridParams.underlayAntiAliasB
            });
        }


        // Interpolated Curve
        const curveA = this.createCurve(roseParamsA);
        const curveB = this.createCurve(roseParamsB);
        const sequencerA = this.getSequencer(roseParamsA.sequencerType);
        const sequencerB = this.getSequencer(roseParamsB.sequencerType);

        let kA, cosetsA = null;
        if (sequencerA.getCosets) {
            cosetsA = sequencerA.getCosets(roseParamsA.totalDivs, roseParamsA);
            kA = cosetsA ? cosetsA.length : gcd(roseParamsA.step, roseParamsA.totalDivs);
        } else {
            kA = gcd(roseParamsA.step, roseParamsA.totalDivs);
        }
        let kB, cosetsB = null;
        if (sequencerB.getCosets) {
            cosetsB = sequencerB.getCosets(roseParamsB.totalDivs, roseParamsB);
            kB = cosetsB ? cosetsB.length : gcd(roseParamsB.step, roseParamsB.totalDivs);
        } else {
            kB = gcd(roseParamsB.step, roseParamsB.totalDivs);
        }

        const useLCM = hybridParams.matchCosetsByLCM;
        const ringsLCM = lcm(kA, kB);
        const isExactMatch = (kA === kB && kA > 1);
        const isLCMMatch = (useLCM && ringsLCM > 1 && (kA > 1 || kB > 1));

        const collectHybrid = (subA, subB) => {
            const pointsA = generateChordalPolyline(curveA, sequencerA, roseParamsA.totalDivs, subA, roseParamsA);
            const pointsB = generateChordalPolyline(curveB, sequencerB, roseParamsB.totalDivs, subB, roseParamsB);

            const segsA = pointsA.length > 0 ? pointsA.length - 1 : 0;
            const segsB = pointsB.length > 0 ? pointsB.length - 1 : 0;
            let finalPtsA = pointsA, finalPtsB = pointsB;

            if (segsA > 0 && segsB > 0 && segsA !== segsB) {
                const targetSegs = lcm(segsA, segsB);
                const threshold = hybridParams.approxResampleThreshold ?? 20000;
                const useApprox = (threshold === 0) || (targetSegs > threshold);
                if (useApprox) {
                    const cnt = (threshold === 0) ? 20000 : threshold;
                    finalPtsA = resamplePolylineApprox(pointsA, cnt);
                    finalPtsB = resamplePolylineApprox(pointsB, cnt);
                } else if (targetSegs > 0) {
                    finalPtsA = resamplePolyline(pointsA, targetSegs);
                    finalPtsB = resamplePolyline(pointsB, targetSegs);
                }
            }

            const weight = hybridParams.weight;
            const pointsInterp = interpolateLinear(finalPtsA, finalPtsB, weight);

            renderables.push({
                type: 'hybrid',
                points: pointsInterp
            });
        };

        if (isExactMatch || isLCMMatch) {
            const targetK = isExactMatch ? kA : ringsLCM;
            const indices = this.getDrawIndices(targetK, hybridParams);
            indices.forEach(idx => {
                const subA = (cosetsA) ? cosetsA[idx % kA] : idx % kA;
                const subB = (cosetsB) ? cosetsB[idx % kB] : idx % kB;
                collectHybrid(subA, subB);
            });
        } else {
            const subA = (cosetsA && kA > 1) ? cosetsA[(roseParamsA.cosetIndex || 0) % cosetsA.length] : ((kA > 1) ? roseParamsA.cosetIndex : 0);
            const subB = (cosetsB && kB > 1) ? cosetsB[(roseParamsB.cosetIndex || 0) % cosetsB.length] : ((kB > 1) ? roseParamsB.cosetIndex : 0);
            collectHybrid(subA, subB);
        }

        // --- 2. Camera Phase ---
        const maxExtent = this.getMaxExtent(renderables);
        const activeScale = this.setupCamera(maxExtent, hybridParams.autoScale);
        const lineWidthScale = (hybridParams.scaleLineWidth !== false) ? 1 : (1 / activeScale);

        // --- 3. Draw Phase ---
        renderables.forEach(item => {
            if (item.type === 'baseCurve') {
                this.drawRenderableBaseCurve(item.points, item.options, lineWidthScale);
            } else if (item.type === 'underlay') {
                const drawParams = {
                    color: item.options.color,
                    colorMethod: item.options.colorMethod,
                    lineWidth: item.options.width,
                    opacity: item.options.opacity,
                    blendMode: item.options.blendMode,
                    antiAlias: item.options.antiAlias
                };
                this.drawRenderableRose(item.points, drawParams, 'white', lineWidthScale);
            } else if (item.type === 'hybrid') {
                this.drawRenderableRose(item.points, hybridParams, hybridParams.color || 'white', lineWidthScale);
            }
        });

        // Hybrid Vertices
        if (hybridParams.showVertices) {
            this.ctx.globalCompositeOperation = hybridParams.vertexBlendMode || 'source-over';
            renderables.filter(r => r.type === 'hybrid').forEach(item => {
                this.polylineLayer.drawVertices(item.points, {
                    color: hybridParams.vertexColor,
                    radius: hybridParams.vertexRadius,
                    opacity: hybridParams.vertexOpacity
                });
            });
            this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.restore();
    }

    createCurve(params) {
        const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];

        if (params.curveType === 'Rhodonea' || !params.curveType) {
            return new CurveClass(
                params.n,
                params.d,
                params.A,
                params.c,
                (params.rot * Math.PI) / 180
            );
        }

        return new CurveClass(params);
    }

    getDrawIndices(k, params) {
        const count = params.showAllCosets ? k : Math.min(params.cosetCount || 1, k);
        const dist = params.cosetDistribution || 'sequential';
        const startOffset = params.cosetIndex || 0;

        const indices = [];

        if (dist === 'sequential') {
            for (let i = 0; i < count; i++) {
                indices.push((startOffset + i) % k);
            }
        } else if (dist === 'distributed') {
            if (count === 1) {
                indices.push(startOffset % k);
            } else {
                for (let i = 0; i < count; i++) {
                    const idx = Math.round(i * k / count);
                    indices.push((startOffset + idx) % k);
                }
            }
        } else if (dist === 'two-way') {
            for (let i = 0; i < count; i++) {
                let idx;
                if (i % 2 === 0) {
                    idx = Math.floor(i / 2);
                } else {
                    idx = k - 1 - Math.floor(i / 2);
                }
                indices.push((startOffset + idx) % k);
            }
        }
        return indices;
    }
}
