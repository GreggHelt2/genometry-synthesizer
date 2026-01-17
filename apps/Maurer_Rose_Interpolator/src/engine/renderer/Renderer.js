import { PolylineLayer } from './layers/PolylineLayer.js';
import { RhodoneaCurve } from '../math/curves/RhodoneaCurve.js';
import { generateMaurerPolyline } from '../math/maurer.js';
import { interpolateLinear } from '../math/interpolation.js';
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

        if (roseParams.showAllCosets && k > 1) {
            for (let i = 0; i < k; i++) {
                // Dimmer for all cosets
                const points = generateMaurerPolyline(curve, roseParams.totalDivs, roseParams.step, 1, i);
                this.polylineLayer.draw(points, { color, width: 1, opacity: 0.5 });
            }
        } else {
            const offset = (k > 1) ? roseParams.cosetIndex : 0;
            const points = generateMaurerPolyline(curve, roseParams.totalDivs, roseParams.step, 1, offset);
            this.polylineLayer.draw(points, { color: roseParams.color || color, width: 2, opacity: 1 });
        }

        this.ctx.restore();
    }

    renderInterpolation(state) {
        this.clear();
        this.ctx.save();
        this.ctx.translate(this.logicalWidth / 2, this.logicalHeight / 2);

        const scale = Math.min(this.logicalWidth, this.logicalHeight) / 500;
        this.ctx.scale(scale, scale);

        const curveA = this.createCurve(state.roseA);
        const curveB = this.createCurve(state.roseB);
        // Interpolation complicates cosets (matching topology). 
        // For V17 Grounded: Just render PRIMARY coset (or current selected)
        // Advanced: We'd need to interpolate EACH coset pair if k matches, or LCM logic.

        // Let's adhere to "Grounded" scope: Interpolate the SELECTED cosets.

        const kA = gcd(state.roseA.step, state.roseA.totalDivs);
        const kB = gcd(state.roseB.step, state.roseB.totalDivs);

        const subA = (kA > 1) ? state.roseA.cosetIndex : 0;
        const subB = (kB > 1) ? state.roseB.cosetIndex : 0;

        const pointsA = generateMaurerPolyline(curveA, state.roseA.totalDivs, state.roseA.step, 1, subA);
        const pointsB = generateMaurerPolyline(curveB, state.roseB.totalDivs, state.roseB.step, 1, subB);

        const weight = state.interpolation.weight;
        const pointsInterp = interpolateLinear(pointsA, pointsB, weight);

        // Convert hex to rgb for opacity handling (simplified)
        // Ideally we'd have a utils function or use CSS string processing
        // For 'preview', we used dynamic color. For interpolation, we want transparency.
        // Let's us the new color properties but hardcode opacity for now, or just use hex?
        // PolylineLayer might support hex.

        // Helper to convert hex to rgba
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        this.polylineLayer.draw(pointsA, { color: hexToRgba(state.roseA.color, 0.15), width: 1 });
        this.polylineLayer.draw(pointsB, { color: hexToRgba(state.roseB.color, 0.15), width: 1 });
        this.polylineLayer.draw(pointsInterp, {
            color: 'white',
            width: state.settings.lineThickness,
            opacity: state.settings.opacity
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
