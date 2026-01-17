export class PolylineLayer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    draw(points, style) {
        if (!points || points.length === 0) return;

        this.ctx.beginPath();
        this.ctx.strokeStyle = style.color || 'white';
        this.ctx.lineWidth = style.width || 1;
        this.ctx.globalAlpha = style.opacity ?? 1;

        // Debugging gap
        if (points.length < 25 && points.length > 15) {
            console.log('PolylineLayer: drawing points:', points.length, points);
        }

        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        this.ctx.stroke();
        this.ctx.globalAlpha = 1; // Reset
    }
}
