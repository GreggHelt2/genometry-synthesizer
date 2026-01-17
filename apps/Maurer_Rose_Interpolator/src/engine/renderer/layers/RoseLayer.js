import { RhodoneaCurve } from '../../math/curves/RhodoneaCurve.js';
import { generateMaurerPolyline } from '../../math/maurer.js';
import { interpolateLinear } from '../../math/interpolation.js';

export class RoseLayer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    draw(state) {
        // Just drawing Rose A for testing Phase 3
        const params = state.roseA;

        // Instantiate Curve (should be cached/memoized in Engine, but for now here)
        // TODO: Move curve creation to Engine/Selector
        const curve = new RhodoneaCurve(
            params.n,
            params.d,
            params.A,
            params.c,
            (params.rot * Math.PI) / 180 // Convert to radians
        );

        // Generate points
        // TODO: Cache this
        const points = generateMaurerPolyline(curve, params.totalDivs, params.step);

        // Draw
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${state.settings.opacity})`;
        this.ctx.lineWidth = state.settings.lineThickness;

        if (points.length > 0) {
            this.ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.ctx.lineTo(points[i].x, points[i].y);
            }
        }

        this.ctx.stroke();

        // Optional: Draw points
        if (state.settings.showPoints) {
            this.ctx.fillStyle = 'red';
            points.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
    }
}
