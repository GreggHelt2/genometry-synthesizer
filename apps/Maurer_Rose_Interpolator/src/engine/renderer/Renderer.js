import { PolylineLayer } from './layers/PolylineLayer.js';
import { CurveRegistry } from '../math/curves/CurveRegistry.js';
import { generateMaurerPolyline } from '../math/maurer.js';
import { interpolateLinear } from '../math/interpolation.js';
import { Colorizer } from '../math/Colorizer.js';
import { gcd } from '../math/MathOps.js';
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

    renderPreview(roseParams, color = 'white') {
        this.clear();
        this.clear();
        this.ctx.save();

        // Anti-aliasing
        const aa = roseParams.antiAlias !== false;
        this.ctx.imageSmoothingEnabled = aa;
        this.canvas.style.imageRendering = aa ? 'auto' : 'pixelated';

        this.ctx.translate(Math.floor(this.logicalWidth / 2), Math.floor(this.logicalHeight / 2));

        const scale = Math.min(this.logicalWidth, this.logicalHeight) / 500;
        this.ctx.scale(scale, scale);

        const curve = this.createCurve(roseParams);
        const sequencer = this.getSequencer(roseParams.sequencerType);

        // k calculation remains for width/legacy behavior check, 
        // but real sequence logic is inside sequencer.generate() via generateMaurerPolyline
        // Determine cosets/cycles
        // Additive uses GCD. Multiplicative uses NumberTheory cycles.
        // We check if sequencer can provide cosets.
        let disjointCosets = null;
        if (sequencer.getCosets) {
            disjointCosets = sequencer.getCosets(roseParams.totalDivs, roseParams);
        }

        // If no specific cosets returned, fallback to Additive GCD logic
        // But for Multiplicative, getCosets returns the list.
        const k = (disjointCosets) ? disjointCosets.length : gcd(roseParams.step, roseParams.totalDivs);

        const drawRose = (params, startValue) => {
            // Note: We pass startValue as the 'offset' argument to generateMaurerPolyline -> sequencer.generate
            const points = generateMaurerPolyline(curve, sequencer, params.totalDivs, startValue, params);

            // Check for Advanced Coloring, Low Opacity, or Blend Modes (force segments for self-blending)
            const baseOpacity = params.opacity ?? 1;
            const blendMode = params.blendMode || 'source-over';
            const useSegments = (params.colorMethod && params.colorMethod !== 'solid') || baseOpacity < 1 || blendMode !== 'source-over';

            // Check for degeneracy (all points identical) using .x/.y or [0]/[1]
            // We do this BEFORE segment logic to ensure single points (singularities) are always visible as dots
            // regardless of opacity or blend mode settings.
            const isDegenerate = points.length > 0 && points.every(p => {
                const x = p.x !== undefined ? p.x : p[0];
                const y = p.y !== undefined ? p.y : p[1];
                const x0 = points[0].x !== undefined ? points[0].x : points[0][0];
                const y0 = points[0].y !== undefined ? points[0].y : points[0][1];
                return Math.abs(x - x0) < 0.001 && Math.abs(y - y0) < 0.001;
            });

            if (isDegenerate) {
                // Draw a marker for fixed points / singularities
                const p0 = points[0];
                const x0 = p0.x !== undefined ? p0.x : p0[0];
                const y0 = p0.y !== undefined ? p0.y : p0[1];

                this.ctx.fillStyle = params.color || color;
                this.ctx.globalAlpha = (params.showAllCosets && k > 1) ? 0.8 : 1;
                this.ctx.beginPath();
                this.ctx.arc(x0, y0, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
                return;
            }

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

                if (colors.length === 1 && blendMode === 'source-over') {
                    // Optimization: Use single path drawing if only one color (handles Opacity/Blend Mode correctly)
                    this.polylineLayer.draw(points, {
                        color: colors[0],
                        width: params.lineWidth || 2,
                        opacity: baseOpacity
                    });
                } else {
                    this.polylineLayer.drawColoredSegments(points, colors, {
                        width: params.lineWidth || 2,
                        opacity: baseOpacity
                    });
                }
            } else {
                // High performance single polyline for opaque solid colors
                this.polylineLayer.draw(points, {
                    color: params.color || color,
                    width: params.lineWidth || 2,
                    opacity: baseOpacity
                });
            }
        };


        if (roseParams.showAllCosets && k > 1) {
            if (disjointCosets) {
                // Iterate over explicit seeds
                for (let i = 0; i < disjointCosets.length; i++) {
                    drawRose(roseParams, disjointCosets[i]);
                }
            } else {
                // Legacy additive offset loop
                for (let i = 0; i < k; i++) {
                    drawRose(roseParams, i);
                }
            }
        } else {
            // Single cycle
            if (disjointCosets && disjointCosets.length > 0) {
                // Use cosetIndex to select which disjoint cycle to show.
                // We wrap it securely.
                const idx = (roseParams.cosetIndex || 0) % disjointCosets.length;
                const seed = disjointCosets[idx];
                drawRose(roseParams, seed);
            } else {
                const offset = (k > 1) ? roseParams.cosetIndex : 0;
                drawRose(roseParams, offset);
            }
        }

        // Reset Blend Mode
        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.restore();
    }

    renderInterpolation(state) {
        this.clear();
        this.clear();
        this.ctx.save();

        // Anti-aliasing (check either rosette or hybrid config - defaulting to A's preference for now or adding to hybrid)
        // Let's use Rosette A's setting as the driver for simplicity, or hardcode/detect. 
        // Or better, check if ANY have it disabled? Let's check state.rosetteA.antiAlias
        const aa = state.rosetteA.antiAlias !== false;
        this.ctx.imageSmoothingEnabled = aa;
        this.canvas.style.imageRendering = aa ? 'auto' : 'pixelated';

        this.ctx.translate(Math.floor(this.logicalWidth / 2), Math.floor(this.logicalHeight / 2));

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
        if (state.hybrid.showRoseA) {
            const curveA = this.createCurve(state.rosetteA);
            const sequencerA = this.getSequencer(state.rosetteA.sequencerType);

            // Unified k calculation
            let kA;
            if (sequencerA.getCosets) {
                const cosetsA = sequencerA.getCosets(state.rosetteA.totalDivs, state.rosetteA);
                kA = cosetsA ? cosetsA.length : gcd(state.rosetteA.step, state.rosetteA.totalDivs);
            } else {
                kA = gcd(state.rosetteA.step, state.rosetteA.totalDivs);
            }

            const subA = (kA > 1) ? state.rosetteA.cosetIndex : 0;
            // Pass state.rosetteA as params
            const pointsA = generateMaurerPolyline(curveA, sequencerA, state.rosetteA.totalDivs, subA, state.rosetteA);

            this.polylineLayer.draw(pointsA, {
                color: hexToRgba(state.rosetteA.color, state.hybrid.underlayOpacity),
                width: 1
            });
        }

        if (state.hybrid.showRoseB) {
            const curveB = this.createCurve(state.rosetteB);
            const sequencerB = this.getSequencer(state.rosetteB.sequencerType);

            // Unified k calculation
            let kB;
            if (sequencerB.getCosets) {
                const cosetsB = sequencerB.getCosets(state.rosetteB.totalDivs, state.rosetteB);
                kB = cosetsB ? cosetsB.length : gcd(state.rosetteB.step, state.rosetteB.totalDivs);
            } else {
                kB = gcd(state.rosetteB.step, state.rosetteB.totalDivs);
            }

            const subB = (kB > 1) ? state.rosetteB.cosetIndex : 0;
            const pointsB = generateMaurerPolyline(curveB, sequencerB, state.rosetteB.totalDivs, subB, state.rosetteB);

            this.polylineLayer.draw(pointsB, {
                color: hexToRgba(state.rosetteB.color, state.hybrid.underlayOpacity),
                width: 1
            });
        }

        // Draw Interpolated Curve
        const curveA = this.createCurve(state.rosetteA);
        const curveB = this.createCurve(state.rosetteB);
        const sequencerA = this.getSequencer(state.rosetteA.sequencerType);
        const sequencerB = this.getSequencer(state.rosetteB.sequencerType);

        // Unified k calculation for Interpolation
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

        const subA = (cosetsA && kA > 1) ? cosetsA[(state.rosetteA.cosetIndex || 0) % cosetsA.length] : ((kA > 1) ? state.rosetteA.cosetIndex : 0);
        const subB = (cosetsB && kB > 1) ? cosetsB[(state.rosetteB.cosetIndex || 0) % cosetsB.length] : ((kB > 1) ? state.rosetteB.cosetIndex : 0);

        const pointsA = generateMaurerPolyline(curveA, sequencerA, state.rosetteA.totalDivs, subA, state.rosetteA);
        const pointsB = generateMaurerPolyline(curveB, sequencerB, state.rosetteB.totalDivs, subB, state.rosetteB);

        const weight = state.hybrid.weight;
        const pointsInterp = interpolateLinear(pointsA, pointsB, weight);

        // Interpolation Coloring & Opacity Logic
        const interpColor = state.hybrid.color || 'white';
        const interpMethod = state.hybrid.colorMethod || 'solid';
        const interpOpacity = state.hybrid.opacity ?? 1;
        const interpBlend = state.hybrid.blendMode || 'source-over';
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
