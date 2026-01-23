import { PolylineLayer } from './layers/PolylineLayer.js';
import { CurveRegistry } from '../math/curves/CurveRegistry.js';
import { generateMaurerPolyline } from '../math/maurer.js';
import { interpolateLinear } from '../math/interpolation.js';
import { Colorizer } from '../math/Colorizer.js';
import { gcd } from '../math/MathOps.js';

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
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.ctx.scale(dpr, dpr);
        this.logicalWidth = width;
        this.logicalHeight = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.logicalWidth || this.width, this.logicalHeight || this.height);
    }

    renderPreview(roseParams, color = 'white') {
        this.clear();
        this.ctx.save();
        this.ctx.translate(this.logicalWidth / 2, this.logicalHeight / 2);

        const scale = Math.min(this.logicalWidth, this.logicalHeight) / 500;
        this.ctx.scale(scale, scale);

        const curve = this.createCurve(roseParams);
        const k = gcd(roseParams.step, roseParams.totalDivs);

        const drawRose = (params, indexOffset) => {
            const points = generateMaurerPolyline(curve, params.totalDivs, params.step, 1, indexOffset);

            // Check for Advanced Coloring, Low Opacity, or Blend Modes (force segments for self-blending)
            const baseOpacity = params.opacity ?? 1;
            const blendMode = params.blendMode || 'source-over';
            const useSegments = (params.colorMethod && params.colorMethod !== 'solid') || baseOpacity < 1 || blendMode !== 'source-over';

            // Apply Blend Mode
            this.ctx.globalCompositeOperation = blendMode;

            if (useSegments) {
                let colors;
                // If method is not solid, generate colors. If it IS solid (but opacity < 1), use single color array.
                if (params.colorMethod && params.colorMethod !== 'solid') {
                    colors = Colorizer.generateSegmentColors(points, params.colorMethod, params.color || color);
                } else {
                    colors = [params.color || color]; // Fallback in drawColoredSegments uses [0] for all
                }

                this.polylineLayer.drawColoredSegments(points, colors, {
                    width: (params.showAllCosets && k > 1) ? 1 : 2,
                    opacity: (params.showAllCosets && k > 1) ? 0.5 * baseOpacity : 1 * baseOpacity
                });
            } else {
                // High performance single polyline for opaque solid colors
                this.polylineLayer.draw(points, {
                    color: params.color || color,
                    width: (params.showAllCosets && k > 1) ? 1 : 2,
                    opacity: (params.showAllCosets && k > 1) ? 0.5 * baseOpacity : 1 * baseOpacity
                });
            }
        };

        if (roseParams.showAllCosets && k > 1) {
            for (let i = 0; i < k; i++) {
                drawRose(roseParams, i);
            }
        } else {
            const offset = (k > 1) ? roseParams.cosetIndex : 0;
            drawRose(roseParams, offset);
        }

        // Reset Blend Mode
        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.restore();
    }

    renderInterpolation(state) {
        this.clear();
        this.ctx.save();
        this.ctx.translate(this.logicalWidth / 2, this.logicalHeight / 2);

        const scale = Math.min(this.logicalWidth, this.logicalHeight) / 500;
        this.ctx.scale(scale, scale);

        // Helper to convert hex to rgba
        const hexToRgba = (hex, alpha) => {
            if (!hex) return `rgba(255, 255, 255, ${alpha})`;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Draw Underlays if enabled
        if (state.interpolation.showRoseA) {
            const curveA = this.createCurve(state.roseA);
            const kA = gcd(state.roseA.step, state.roseA.totalDivs);
            const subA = (kA > 1) ? state.roseA.cosetIndex : 0;
            const pointsA = generateMaurerPolyline(curveA, state.roseA.totalDivs, state.roseA.step, 1, subA);

            this.polylineLayer.draw(pointsA, {
                color: hexToRgba(state.roseA.color, state.interpolation.underlayOpacity),
                width: 1
            });
        }

        if (state.interpolation.showRoseB) {
            const curveB = this.createCurve(state.roseB);
            const kB = gcd(state.roseB.step, state.roseB.totalDivs);
            const subB = (kB > 1) ? state.roseB.cosetIndex : 0;
            const pointsB = generateMaurerPolyline(curveB, state.roseB.totalDivs, state.roseB.step, 1, subB);

            this.polylineLayer.draw(pointsB, {
                color: hexToRgba(state.roseB.color, state.interpolation.underlayOpacity),
                width: 1
            });
        }

        // Draw Interpolated Curve
        const curveA = this.createCurve(state.roseA);
        const curveB = this.createCurve(state.roseB);
        const kA = gcd(state.roseA.step, state.roseA.totalDivs);
        const kB = gcd(state.roseB.step, state.roseB.totalDivs);
        const subA = (kA > 1) ? state.roseA.cosetIndex : 0;
        const subB = (kB > 1) ? state.roseB.cosetIndex : 0;
        const pointsA = generateMaurerPolyline(curveA, state.roseA.totalDivs, state.roseA.step, 1, subA);
        const pointsB = generateMaurerPolyline(curveB, state.roseB.totalDivs, state.roseB.step, 1, subB);

        const weight = state.interpolation.weight;
        const pointsInterp = interpolateLinear(pointsA, pointsB, weight);

        // Interpolation Coloring & Opacity Logic
        const interpColor = state.interpolation.color || 'white';
        const interpMethod = state.interpolation.colorMethod || 'solid';
        const interpOpacity = state.interpolation.opacity ?? 1;
        const interpBlend = state.interpolation.blendMode || 'source-over';
        const useSegments = (interpMethod !== 'solid') || interpOpacity < 1 || interpBlend !== 'source-over';

        // Apply Blend Mode
        this.ctx.globalCompositeOperation = interpBlend;



        if (useSegments) {
            let colors;
            if (interpMethod !== 'solid') {
                colors = Colorizer.generateSegmentColors(pointsInterp, interpMethod, interpColor);
            } else {
                colors = [interpColor];
            }
            this.polylineLayer.drawColoredSegments(pointsInterp, colors, {
                // Use same width logic as renderPreview for consistency
                width: 2, // Default thickness matching renderPreview
                opacity: interpOpacity
            });
        } else {
            this.polylineLayer.draw(pointsInterp, {
                color: interpColor,
                width: 2, // Default thickness matching renderPreview
                opacity: interpOpacity
            });
        }

        // Reset Blend Mode
        this.ctx.globalCompositeOperation = 'source-over';

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
}
