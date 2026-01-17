import { PolylineLayer } from './layers/PolylineLayer.js';
import { RhodoneaCurve } from '../math/curves/RhodoneaCurve.js';
import { generateMaurerPolyline } from '../math/maurer.js';
import { interpolateLinear } from '../math/interpolation.js';
import { Colorizer } from '../math/Colorizer.js';
import { gcd } from '../math/lcm.js';

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

            // Check for Advanced Coloring
            const baseOpacity = params.opacity ?? 1;

            if (params.colorMethod && params.colorMethod !== 'solid') {
                const colors = Colorizer.generateSegmentColors(points, params.colorMethod, params.color || color);
                this.polylineLayer.drawColoredSegments(points, colors, {
                    width: (params.showAllCosets && k > 1) ? 1 : 2,
                    opacity: (params.showAllCosets && k > 1) ? 0.5 * baseOpacity : 1 * baseOpacity
                });
            } else {
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

        // TODO: Support Color Method for Interpolated Curve?
        // For now, keep it solid white (or settings color) to stand out against underlays
        this.polylineLayer.draw(pointsInterp, {
            color: 'white',
            width: state.settings.lineThickness,
            opacity: state.interpolation.opacity ?? 1
        });

        this.ctx.restore();
    }

    createCurve(params) {
        return new RhodoneaCurve(
            params.n,
            params.d,
            params.A,
            params.c,
            (params.rot * Math.PI) / 180
        );
    }
}
