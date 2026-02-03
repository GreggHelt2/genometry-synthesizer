import { PolylineLayer } from './layers/PolylineLayer.js';
import { CurveRegistry } from '../math/curves/CurveRegistry.js';
import { generateMaurerPolyline } from '../math/maurer.js';

import { interpolateLinear, resamplePolyline, resamplePolylineApprox } from '../math/interpolation.js';
import { Colorizer } from '../math/Colorizer.js';
import { gcd, lcm } from '../math/MathOps.js';
import { SequencerRegistry } from '../math/sequencers/SequencerRegistry.js';
import { AdditiveGroupModuloNGenerator } from '../math/sequencers/AdditiveGroupModuloNGenerator.js';

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

    // Helper to calculate max extent (distance from origin) of multiple point arrays
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
        // Reset transform to identity first (clears DPR scaling)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Always center the origin using device pixels
        this.ctx.translate(Math.floor(this.width / 2), Math.floor(this.height / 2));

        let scale;
        if (autoScale && maxExtent !== null && maxExtent > 0) {
            // Calculate scale to fit 10% padding (using device pixels)
            const canvasRadius = Math.min(this.width, this.height) / 2;
            const targetRadius = canvasRadius * 0.9; // 10% padding
            scale = targetRadius / maxExtent;

            this.ctx.scale(scale, scale);
        } else {
            // Standard fixed scale (legacy behavior)
            // Previously: min(logical) / 500, with DPR scale applied.
            // Now: min(physical) / 500 is equivalent.
            scale = Math.min(this.width, this.height) / 500;
        }

        this.ctx.scale(scale, scale);
        return scale;
    }

    renderPreview(roseParams, defaultColor = 'white') {
        this.clear(); // Clears logic with identity
        this.ctx.save();

        // Anti-aliasing
        const aa = roseParams.antiAlias !== false;
        this.ctx.imageSmoothingEnabled = aa;
        this.canvas.style.imageRendering = aa ? 'auto' : 'pixelated';

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
            const points = generateMaurerPolyline(curve, sequencer, roseParams.totalDivs, seed, roseParams);

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
                params: roseParams, // Pass full params for coloring logic
                seed: seed, // Keep track of seed for coloring if needed
                isDegenerate: isDegenerate
            });
        });


        // --- 2. Camera Phase ---
        const maxExtent = this.getMaxExtent(renderables);
        const activeScale = this.setupCamera(maxExtent, roseParams.autoScale);

        // Calculate Line Width Scale Factor
        const lineWidthScale = (roseParams.scaleLineWidth !== false) ? 1 : (1 / activeScale);


        // --- 3. Draw Phase ---
        renderables.forEach(item => {
            if (item.type === 'baseCurve') {
                this.drawRenderableBaseCurve(item.points, item.options, lineWidthScale);
            } else if (item.type === 'point') {
                // Draw degenerate point
                const p0 = item.points[0];
                const x0 = p0.x !== undefined ? p0.x : p0[0];
                const y0 = p0.y !== undefined ? p0.y : p0[1];
                this.ctx.fillStyle = item.params.color || defaultColor;
                // Alpha handling for stacked points?
                this.ctx.globalAlpha = (item.params.showAllCosets && k > 1) ? 0.8 : 1;
                this.ctx.beginPath();
                this.ctx.arc(x0, y0, 3 * lineWidthScale, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            } else {
                // Draw Rose Polyline
                this.drawRenderableRose(item.points, item.params, defaultColor, lineWidthScale);
            }
        });

        // Vertex Rendering Overlay
        if (roseParams.showVertices) {
            this.ctx.globalCompositeOperation = roseParams.vertexBlendMode || 'source-over';
            renderables.filter(r => r.type === 'rose').forEach(item => {
                this.polylineLayer.drawVertices(item.points, {
                    color: roseParams.vertexColor,
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

        // Apply scaling adjustment
        const effectiveWidth = width * lineWidthScale;

        // Use segmented drawing if we need self-blending (opacity < 1 or blend mode active)
        if (opacity < 1 || blendMode !== 'source-over') {
            const colors = [color];
            this.polylineLayer.drawColoredSegments(points, colors, {
                width: effectiveWidth,
                opacity: opacity
            });
        } else {
            // Optimized single path for solid opaque lines
            this.polylineLayer.draw(points, {
                color: color,
                width: effectiveWidth,
                opacity: opacity
            });
        }
    }

    drawRenderableRose(points, params, defaultColor, lineWidthScale = 1) {
        if (!points || points.length === 0) return;

        // Check for Advanced Coloring, Low Opacity, or Blend Modes (force segments for self-blending)
        const baseOpacity = params.opacity ?? 1;
        const blendMode = params.blendMode || 'source-over';
        // Note: 'colorMethod' check assumes it exists in params. If undefined, treat as solid.
        const useSegments = (params.colorMethod && params.colorMethod !== 'solid') || baseOpacity < 1 || blendMode !== 'source-over';

        // Apply Blend Mode
        this.ctx.globalCompositeOperation = blendMode;

        const effectiveWidth = (params.lineWidth || 2) * lineWidthScale;

        if (useSegments) {
            let colors;
            if (params.colorMethod && params.colorMethod !== 'solid') {
                colors = Colorizer.generateSegmentColors(points, params.colorMethod, params.color || defaultColor);
            } else {
                colors = [params.color || defaultColor];
            }

            if (colors.length === 1 && blendMode === 'source-over') {
                // Optimization: Use single path drawing if only one color (handles Opacity/Blend Mode correctly)
                // Actually if baseOpacity < 1, drawColoredSegments is better for self-overlap?
                // If opacity < 1, drawing a single path means NO self-overlap accumulation within the path.
                // If we want self-overlap (rosette petals darkening each other), we MUST use segments.
                // My previous logic: `if (opacity < 1 || blendMode !== 'source-over')` -> useSegments.
                // So we are rightfully in this block.
                this.polylineLayer.drawColoredSegments(points, colors, {
                    width: effectiveWidth,
                    opacity: baseOpacity
                });
            } else {
                this.polylineLayer.drawColoredSegments(points, colors, {
                    width: effectiveWidth,
                    opacity: baseOpacity
                });
            }
        } else {
            // High performance single polyline for opaque solid colors (no self-overlap)
            this.polylineLayer.draw(points, {
                color: params.color || defaultColor,
                width: effectiveWidth,
                opacity: baseOpacity
            });
        }
    }

    renderInterpolation(state) {
        this.clear();
        this.ctx.save();

        const aa = state.rosetteA.antiAlias !== false;
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
        const collectBaseCurve = (params, hybridConfig, suffix) => {
            const curve = this.createCurve(params);
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
                    color: hybridConfig[`baseCurveColor${suffix}`],
                    width: hybridConfig[`baseCurveLineWidth${suffix}`],
                    opacity: hybridConfig[`baseCurveOpacity${suffix}`],
                    blendMode: hybridConfig[`baseCurveBlendMode${suffix}`]
                }
            });
        };

        if (state.hybrid.showBaseCurveA) collectBaseCurve(state.rosetteA, state.hybrid, 'A');
        if (state.hybrid.showBaseCurveB) collectBaseCurve(state.rosetteB, state.hybrid, 'B');

        // Underlays
        const collectUnderlay = (params, color) => {
            const curve = this.createCurve(params);
            const sequencer = this.getSequencer(params.sequencerType);
            let k;
            if (sequencer.getCosets) {
                const cosets = sequencer.getCosets(params.totalDivs, params);
                k = cosets ? cosets.length : gcd(params.step, params.totalDivs);
            } else {
                k = gcd(params.step, params.totalDivs);
            }
            const indices = this.getDrawIndices(k, params);
            indices.forEach(idx => {
                const sub = (sequencer.getCosets && k > 1)
                    ? sequencer.getCosets(params.totalDivs, params)[idx % k]
                    : idx;
                const points = generateMaurerPolyline(curve, sequencer, params.totalDivs, sub, params);
                renderables.push({
                    type: 'underlay',
                    points: points,
                    options: {
                        color: hexToRgba(color, state.hybrid.underlayOpacity),
                        width: 1
                    }
                });
            });
        };

        if (state.hybrid.showRoseA) collectUnderlay(state.rosetteA, state.rosetteA.color);
        if (state.hybrid.showRoseB) collectUnderlay(state.rosetteB, state.rosetteB.color);


        // Interpolated Curve
        const curveA = this.createCurve(state.rosetteA);
        const curveB = this.createCurve(state.rosetteB);
        const sequencerA = this.getSequencer(state.rosetteA.sequencerType);
        const sequencerB = this.getSequencer(state.rosetteB.sequencerType);

        let kA, cosetsA = null;
        if (sequencerA.getCosets) {
            cosetsA = sequencerA.getCosets(state.rosetteA.totalDivs, state.rosetteA);
            kA = cosetsA ? cosetsA.length : gcd(state.rosetteA.step, state.rosetteA.totalDivs);
        } else {
            kA = gcd(state.rosetteA.step, state.rosetteA.totalDivs);
        }
        let kB, cosetsB = null;
        if (sequencerB.getCosets) {
            cosetsB = sequencerB.getCosets(state.rosetteB.totalDivs, state.rosetteB);
            kB = cosetsB ? cosetsB.length : gcd(state.rosetteB.step, state.rosetteB.totalDivs);
        } else {
            kB = gcd(state.rosetteB.step, state.rosetteB.totalDivs);
        }

        const useLCM = state.hybrid.matchCosetsByLCM;
        const ringsLCM = lcm(kA, kB);
        const isExactMatch = (kA === kB && kA > 1);
        const isLCMMatch = (useLCM && ringsLCM > 1 && (kA > 1 || kB > 1));

        const collectHybrid = (subA, subB) => {
            const pointsA = generateMaurerPolyline(curveA, sequencerA, state.rosetteA.totalDivs, subA, state.rosetteA);
            const pointsB = generateMaurerPolyline(curveB, sequencerB, state.rosetteB.totalDivs, subB, state.rosetteB);

            // Interpolation Logic
            const segsA = pointsA.length > 0 ? pointsA.length - 1 : 0;
            const segsB = pointsB.length > 0 ? pointsB.length - 1 : 0;
            let finalPtsA = pointsA, finalPtsB = pointsB;

            if (segsA > 0 && segsB > 0 && segsA !== segsB) {
                const targetSegs = lcm(segsA, segsB);
                const threshold = state.hybrid.approxResampleThreshold ?? 20000;
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

            const weight = state.hybrid.weight;
            const pointsInterp = interpolateLinear(finalPtsA, finalPtsB, weight);

            renderables.push({
                type: 'hybrid',
                points: pointsInterp
            });
        };

        if (isExactMatch || isLCMMatch) {
            const targetK = isExactMatch ? kA : ringsLCM;
            const indices = this.getDrawIndices(targetK, state.hybrid);
            indices.forEach(idx => {
                const subA = (cosetsA) ? cosetsA[idx % kA] : idx % kA;
                const subB = (cosetsB) ? cosetsB[idx % kB] : idx % kB;
                collectHybrid(subA, subB);
            });
        } else {
            const subA = (cosetsA && kA > 1) ? cosetsA[(state.rosetteA.cosetIndex || 0) % cosetsA.length] : ((kA > 1) ? state.rosetteA.cosetIndex : 0);
            const subB = (cosetsB && kB > 1) ? cosetsB[(state.rosetteB.cosetIndex || 0) % cosetsB.length] : ((kB > 1) ? state.rosetteB.cosetIndex : 0);
            collectHybrid(subA, subB);
        }

        // --- 2. Camera Phase ---
        const maxExtent = this.getMaxExtent(renderables);
        const activeScale = this.setupCamera(maxExtent, state.hybrid.autoScale);

        // Calculate Line Width Scale Factor
        const lineWidthScale = (state.hybrid.scaleLineWidth !== false) ? 1 : (1 / activeScale);

        // --- 3. Draw Phase ---
        renderables.forEach(item => {
            if (item.type === 'baseCurve') {
                this.drawRenderableBaseCurve(item.points, item.options, lineWidthScale);
            } else if (item.type === 'underlay') {
                // Simple single color draw, pass scale? 
                // Underlay is strictly 1px usually?
                // Plan said "width: 1". 
                // If we want underlays to stay 1px, we should scale them too.
                const opts = { ...item.options, width: (item.options.width || 1) * lineWidthScale };
                this.polylineLayer.draw(item.points, opts);
            } else if (item.type === 'hybrid') {
                // Hybrid styling
                this.drawRenderableRose(item.points, state.hybrid, state.hybrid.color || 'white', lineWidthScale);
            }
        });

        // Hybrid Vertices
        if (state.hybrid.showVertices) {
            this.ctx.globalCompositeOperation = state.hybrid.vertexBlendMode || 'source-over';
            renderables.filter(r => r.type === 'hybrid').forEach(item => {
                this.polylineLayer.drawVertices(item.points, {
                    color: state.hybrid.vertexColor,
                    radius: state.hybrid.vertexRadius,
                    opacity: state.hybrid.vertexOpacity
                });
            });
            this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.restore();
    }

    createCurve(params) {
        // Look up class in registry using curveType (default to Rhodonea if missing)
        const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];

        // Pass the entire params object. 
        // RhodoneaCurve currently expects specific args, but we can conform to "constructor(params)" pattern 
        // OR map them here. For now, let's keep the mapping for Rhodonea for safety if constructor didn't change,
        // but CircleCurve handles object. Ideally all curves should take a config object.

        // Check if it's Rhodonea to maintain legacy arg order (if we didn't refactor Rhodonea ctor)
        if (params.curveType === 'Rhodonea' || !params.curveType) {
            return new CurveClass(
                params.n,
                params.d,
                params.A,
                params.c,
                (params.rot * Math.PI) / 180
            );
        }

        // For Circle (and future others), pass the params object directly? 
        // CircleCurve checks for object.
        return new CurveClass(params);
    }
    getDrawIndices(k, params) {
        // If "Show All" toggle is active, override count to k
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
