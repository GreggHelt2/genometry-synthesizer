import { PolylineLayer } from './layers/PolylineLayer.js';
import { CurveRegistry } from '../math/curves/CurveRegistry.js';
import { generateChordalPolyline } from '../math/chordal_rosette.js';

import { interpolateLinear, interpolateCurved, sampleInterpCurves, resamplePolyline, resamplePolylineApprox } from '../math/interpolation.js';
import { Colorizer } from '../math/Colorizer.js';
import { gcd, lcm } from '../math/MathOps.js';
import { SequencerRegistry } from '../math/sequencers/SequencerRegistry.js';
import { AdditiveGroupModuloNGenerator } from '../math/sequencers/AdditiveGroupModuloNGenerator.js';
import { flattenRoseParams, flattenHybridParams } from '../state/stateAdapters.js';
import { findCoincidentIndices } from '../math/CoincidentIndices.js';

// ─── Renderer-specific State Helpers ────────────────────

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

// ─── Renderer ────────────────────────────────────────────

export class CanvasRenderer {

    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.polylineLayer = new PolylineLayer(this.ctx);
        /** @type {number} Last active scale used in setupCamera */
        this.lastScale = 1;
        /** @type {Array} Last set of renderables from the most recent render */
        this.lastRenderables = [];
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

        this.lastScale = scale;
        return scale;
    }

    /**
     * Render a single rosette preview.
     * @param {object} roseState - v3.0 nested rosette state (e.g., state.rosetteA)
     * @param {string} defaultColor
     */
    renderPreview(roseState, defaultColor = 'white', highlightInfo = null) {
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
            } else if (roseParams.showChordalLines !== false) {
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
                    radius: (roseParams.vertexRadius || 2) * lineWidthScale,
                    opacity: roseParams.vertexOpacity
                });
            });
            this.ctx.globalCompositeOperation = 'source-over';
        }

        // --- Special Points Rendering ---
        if (roseParams.showSpecialPoints) {
            const spCurve = this.createCurve(roseParams);
            if (spCurve) {
                try {
                    const sp = spCurve.getSpecialPoints();
                    const shape = roseParams.specialPointsShape || 'circle';

                    if (roseParams.showZeroPoints && sp.zeroPoints.length > 0) {
                        this.drawSpecialPointMarkers(sp.zeroPoints, {
                            color: roseParams.zeroPointsColor || '#FF4444',
                            size: (roseParams.zeroPointsSize || 6) * lineWidthScale,
                            opacity: roseParams.zeroPointsOpacity ?? 0.9,
                            shape
                        });
                    }
                    if (roseParams.showDoublePoints && sp.doublePoints.length > 0) {
                        this.drawSpecialPointMarkers(sp.doublePoints, {
                            color: roseParams.doublePointsColor || '#FFD700',
                            size: (roseParams.doublePointsSize || 5) * lineWidthScale,
                            opacity: roseParams.doublePointsOpacity ?? 0.8,
                            shape
                        });
                    }
                    if (roseParams.showBoundaryPoints && sp.boundaryPoints.length > 0) {
                        this.drawSpecialPointMarkers(sp.boundaryPoints, {
                            color: roseParams.boundaryPointsColor || '#44FF44',
                            size: (roseParams.boundaryPointsSize || 6) * lineWidthScale,
                            opacity: roseParams.boundaryPointsOpacity ?? 0.9,
                            shape
                        });
                    }
                } catch (e) {
                    // Silently skip if getSpecialPoints fails for this curve
                }
            }
        }

        // --- Segment Highlight Layer ---
        if (highlightInfo) {
            const rosetteRenderables = renderables.filter(r => r.type === 'rose');
            this.drawSegmentHighlights(rosetteRenderables, highlightInfo, lineWidthScale);
        }

        this.lastRenderables = renderables;
        this.ctx.restore();
    }

    /**
     * Draw markers at special point locations (zero/double/boundary).
     * @param {Array<{x: number, y: number}>} points 
     * @param {{color: string, size: number, opacity: number, shape: string}} options 
     */
    drawSpecialPointMarkers(points, options) {
        if (!points || points.length === 0) return;
        const { color = '#ffffff', size = 5, opacity = 1, shape = 'circle' } = options;

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;

        for (const pt of points) {
            const x = pt.x;
            const y = pt.y;

            switch (shape) {
                case 'diamond':
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y - size);
                    this.ctx.lineTo(x + size, y);
                    this.ctx.lineTo(x, y + size);
                    this.ctx.lineTo(x - size, y);
                    this.ctx.closePath();
                    this.ctx.fill();
                    break;
                case 'square':
                    this.ctx.fillRect(x - size, y - size, size * 2, size * 2);
                    break;
                case 'circle':
                default:
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
            }
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

    /**
     * Draw highlighted segments on renderables by segment index.
     * @param {Array} renderables - Array of renderable items with .points arrays
     * @param {Object} highlightInfo - { segmentIndices, color }
     * @param {number} lineWidthScale
     */
    drawSegmentHighlights(renderables, highlightInfo, lineWidthScale = 1) {
        const { color = '#ffff00', segmentIndices } = highlightInfo;
        if (!segmentIndices || segmentIndices.length === 0) return;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3 * lineWidthScale;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.85;

        for (const item of renderables) {
            const pts = item.points;
            if (!pts || pts.length < 2) continue;

            for (const i of segmentIndices) {
                if (i < 0 || i >= pts.length - 1) continue;
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const x1 = p1.x !== undefined ? p1.x : p1[0];
                const y1 = p1.y !== undefined ? p1.y : p1[1];
                const x2 = p2.x !== undefined ? p2.x : p2[0];
                const y2 = p2.y !== undefined ? p2.y : p2[1];
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
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
                rule: 'evenodd',
                blendMode: params.fillBlendMode || blendMode,
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
            const interpMode = hybridParams.interpCurveMode || 'linear';
            const interpParams = {
                interpWaveAmplitude: hybridParams.interpWaveAmplitude,
                interpWaveFrequency: hybridParams.interpWaveFrequency,
                interpWaveAlternateFlip: hybridParams.interpWaveAlternateFlip,
                interpBezierBulge: hybridParams.interpBezierBulge
            };
            const pointsInterp = interpolateCurved(finalPtsA, finalPtsB, weight, interpMode, interpParams);

            renderables.push({
                type: 'hybrid',
                points: pointsInterp,
                pointsA: finalPtsA,
                pointsB: finalPtsB
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
            } else if (item.type === 'hybrid' && hybridParams.showHybridLines !== false) {
                this.drawRenderableRose(item.points, hybridParams, hybridParams.color || 'white', lineWidthScale);
            }
        });

        // Interpolation Path Lines (A[i] → B[i])
        if (hybridParams.showInterpPaths) {
            this.ctx.globalCompositeOperation = hybridParams.interpPathsBlendMode || 'source-over';
            const ipColorMethod = hybridParams.interpPathsColorMethod || 'solid';
            const ipBaseColor = hybridParams.interpPathsColor || '#888888';

            // When 'Selected Only' is on, restrict to selected chord endpoints.
            // A segment index i connects point[i] → point[i+1], so we need
            // interpolation paths for both point i and point i+1.
            const selectedOnly = hybridParams.interpPathsSelectedOnly;
            let selectedSet = null;
            if (selectedOnly && state.app?.segmentHighlight?.segmentIndices) {
                selectedSet = new Set();
                for (const segIdx of state.app.segmentHighlight.segmentIndices) {
                    selectedSet.add(segIdx);      // start point of chord
                    selectedSet.add(segIdx + 1);   // end point of chord
                }
            }

            renderables.filter(r => r.type === 'hybrid').forEach(item => {
                if (!item.pointsA || !item.pointsB) return;
                const n = Math.min(item.pointsA.length, item.pointsB.length);

                // Generate per-line colors if using a gradient method
                let lineColors = null;
                if (ipColorMethod && ipColorMethod !== 'solid') {
                    // Compute t-values directly for each A[i]→B[i] path line
                    const tValues = [];
                    if (ipColorMethod === 'length') {
                        // Length-based: t = normalized segment length
                        // Two-pass: first find maxLen, then find minLen excluding
                        // near-zero segments (< 1% of max) that are effectively invisible
                        const lengths = [];
                        let maxLen = -Infinity;
                        for (let i = 0; i < n; i++) {
                            const pA = item.pointsA[i], pB = item.pointsB[i];
                            const dx = (pB.x !== undefined ? pB.x : pB[0]) - (pA.x !== undefined ? pA.x : pA[0]);
                            const dy = (pB.y !== undefined ? pB.y : pB[1]) - (pA.y !== undefined ? pA.y : pA[1]);
                            const len = Math.sqrt(dx * dx + dy * dy);
                            lengths.push(len);
                            if (len > maxLen) maxLen = len;
                        }
                        const threshold = maxLen * 0.01; // 1% of max length
                        let minLen = maxLen; // start at max, walk down
                        for (let i = 0; i < lengths.length; i++) {
                            if (lengths[i] >= threshold && lengths[i] < minLen) minLen = lengths[i];
                        }
                        const range = maxLen - minLen || 1;
                        for (let i = 0; i < lengths.length; i++) {
                            tValues.push(Math.max(0, Math.min(1, (lengths[i] - minLen) / range)));
                        }
                    } else if (ipColorMethod === 'angle') {
                        // Angle-based: t = normalized angle of A[i]→B[i]
                        for (let i = 0; i < n; i++) {
                            const pA = item.pointsA[i], pB = item.pointsB[i];
                            const dx = (pB.x !== undefined ? pB.x : pB[0]) - (pA.x !== undefined ? pA.x : pA[0]);
                            const dy = (pB.y !== undefined ? pB.y : pB[1]) - (pA.y !== undefined ? pA.y : pA[1]);
                            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                            tValues.push((angle + 180) / 360);
                        }
                    } else if (ipColorMethod === 'sequence') {
                        // Sequence-based: t = i / (n-1)
                        for (let i = 0; i < n; i++) {
                            tValues.push(i / ((n - 1) || 1));
                        }
                    }

                    if (tValues.length > 0) {
                        const ipColorEnd = hybridParams.interpPathsColorEnd || '#ffffff';
                        const ipGradientType = hybridParams.interpPathsGradientType || '2-point';
                        const ipGradientOpts = {
                            gradientPreset: hybridParams.interpPathsGradientPreset,
                            gradientStops: hybridParams.interpPathsGradientStops
                        };
                        lineColors = tValues.map(t =>
                            Colorizer.getGradientColor(t, ipBaseColor, ipColorEnd, ipGradientType, ipGradientOpts)
                        );
                    }
                }

                // Draw path curves (or straight lines for linear mode)
                const pathMode = hybridParams.interpCurveMode || 'linear';
                const pathDetail = hybridParams.interpCurveDetail || 20;
                const pathParams = {
                    interpWaveAmplitude: hybridParams.interpWaveAmplitude,
                    interpWaveFrequency: hybridParams.interpWaveFrequency,
                    interpWaveAlternateFlip: hybridParams.interpWaveAlternateFlip,
                    interpBezierBulge: hybridParams.interpBezierBulge
                };

                if (pathMode === 'linear') {
                    // Draw straight lines
                    for (let i = 0; i < n; i++) {
                        if (selectedSet && !selectedSet.has(i)) continue;
                        const pA = item.pointsA[i], pB = item.pointsB[i];
                        const xA = pA.x !== undefined ? pA.x : pA[0];
                        const yA = pA.y !== undefined ? pA.y : pA[1];
                        const xB = pB.x !== undefined ? pB.x : pB[0];
                        const yB = pB.y !== undefined ? pB.y : pB[1];
                        const ipLW = (hybridParams.interpPathsLineWidth || 1) * lineWidthScale;
                        const color = (lineColors && lineColors[i]) ? lineColors[i] : ipBaseColor;
                        this.ctx.globalAlpha = hybridParams.interpPathsOpacity ?? 0.3;

                        const dx = xB - xA, dy = yB - yA;
                        if (dx * dx + dy * dy < 1e-8) {
                            // Stable point — draw a dot
                            this.ctx.beginPath();
                            this.ctx.arc(xA, yA, ipLW, 0, Math.PI * 2);
                            this.ctx.fillStyle = color;
                            this.ctx.fill();
                        } else {
                            this.ctx.beginPath();
                            this.ctx.moveTo(xA, yA);
                            this.ctx.lineTo(xB, yB);
                            this.ctx.strokeStyle = color;
                            this.ctx.lineWidth = ipLW;
                            this.ctx.stroke();
                        }
                    }
                } else {
                    // Draw curved paths by sampling the curve
                    const curves = sampleInterpCurves(item.pointsA, item.pointsB, pathMode, pathParams, pathDetail);
                    for (let i = 0; i < curves.length; i++) {
                        if (selectedSet && !selectedSet.has(i)) continue;
                        const curvePts = curves[i];
                        const color = (lineColors && lineColors[i]) ? lineColors[i] : ipBaseColor;
                        const ipLW = (hybridParams.interpPathsLineWidth || 1) * lineWidthScale;
                        this.ctx.globalAlpha = hybridParams.interpPathsOpacity ?? 0.3;

                        // Check if curve is degenerate (all points same)
                        let isStable = curvePts.length < 2;
                        if (!isStable && curvePts.length >= 2) {
                            const dx = curvePts[curvePts.length - 1].x - curvePts[0].x;
                            const dy = curvePts[curvePts.length - 1].y - curvePts[0].y;
                            isStable = dx * dx + dy * dy < 1e-8;
                        }

                        if (isStable && curvePts.length >= 1) {
                            this.ctx.beginPath();
                            this.ctx.arc(curvePts[0].x, curvePts[0].y, ipLW, 0, Math.PI * 2);
                            this.ctx.fillStyle = color;
                            this.ctx.fill();
                        } else if (curvePts.length >= 2) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(curvePts[0].x, curvePts[0].y);
                            for (let j = 1; j < curvePts.length; j++) {
                                this.ctx.lineTo(curvePts[j].x, curvePts[j].y);
                            }
                            this.ctx.strokeStyle = color;
                            this.ctx.lineWidth = ipLW;
                            this.ctx.stroke();
                        }
                    }
                }
            });
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = 1;
        }

        // Hybrid Vertices
        if (hybridParams.showVertices) {
            this.ctx.globalCompositeOperation = hybridParams.vertexBlendMode || 'source-over';
            renderables.filter(r => r.type === 'hybrid').forEach(item => {
                this.polylineLayer.drawVertices(item.points, {
                    color: hybridParams.vertexColor,
                    radius: (hybridParams.vertexRadius || 2) * lineWidthScale,
                    opacity: hybridParams.vertexOpacity
                });
            });
            this.ctx.globalCompositeOperation = 'source-over';
        }
        // Coincident Indices Points
        if (hybridParams.showCoincidentIndices) {
            const ADDITIVE_TYPE = 'Cyclic Additive Group Modulo N';
            const seqTypeA = roseParamsA.sequencerType || '';
            const seqTypeB = roseParamsB.sequencerType || '';

            if (seqTypeA === ADDITIVE_TYPE && seqTypeB === ADDITIVE_TYPE) {
                const nA = roseParamsA.totalDivs || 360;
                const nB = roseParamsB.totalDivs || 360;

                if (nA === nB) {
                    const n = nA;
                    const gA = roseParamsA.step || 1;
                    const gB = roseParamsB.step || 1;
                    const startA = roseParamsA.cosetIndex || 0;
                    const startB = roseParamsB.cosetIndex || 0;

                    const indices = findCoincidentIndices(n, gA, gB, startA, startB);

                    if (indices.length > 0) {
                        const ciColor = hybridParams.coincidentColor || '#FFD700';
                        const ciSize = (hybridParams.coincidentPointSize ?? 6) * lineWidthScale;
                        const ciOpacity = hybridParams.coincidentOpacity ?? 1.0;
                        const ciShape = hybridParams.coincidentShape || 'circle';

                        // Get the first hybrid renderable's points for position lookup
                        const hybridItem = renderables.find(r => r.type === 'hybrid');
                        if (hybridItem && hybridItem.points && hybridItem.points.length > 0) {
                            this.ctx.save();
                            this.ctx.globalAlpha = ciOpacity;
                            this.ctx.fillStyle = ciColor;

                            const totalPts = hybridItem.points.length;

                            indices.forEach(idx => {
                                // Map sequence index to interpolated point index
                                // The hybrid points are resampled, so scale proportionally
                                const ptIdx = Math.round((idx / n) * (totalPts - 1));
                                if (ptIdx < 0 || ptIdx >= totalPts) return;

                                const p = hybridItem.points[ptIdx];
                                const x = p.x !== undefined ? p.x : p[0];
                                const y = p.y !== undefined ? p.y : p[1];

                                this.ctx.beginPath();
                                if (ciShape === 'circle') {
                                    this.ctx.arc(x, y, ciSize, 0, Math.PI * 2);
                                } else if (ciShape === 'diamond') {
                                    this.ctx.moveTo(x, y - ciSize);
                                    this.ctx.lineTo(x + ciSize, y);
                                    this.ctx.lineTo(x, y + ciSize);
                                    this.ctx.lineTo(x - ciSize, y);
                                    this.ctx.closePath();
                                } else if (ciShape === 'square') {
                                    this.ctx.rect(x - ciSize, y - ciSize, ciSize * 2, ciSize * 2);
                                }
                                this.ctx.fill();
                            });

                            this.ctx.restore();
                        }
                    }
                }
            }
        }

        // --- Segment Highlight Layer (Hybrid) ---
        const segHL = state.app?.segmentHighlight;
        if (segHL) {
            const hybridRenderables = renderables.filter(r => r.type === 'hybrid');
            this.drawSegmentHighlights(hybridRenderables, segHL, lineWidthScale);
        }

        this.lastRenderables = renderables;
        this.ctx.restore();
    }

    createCurve(params) {
        const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];
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
