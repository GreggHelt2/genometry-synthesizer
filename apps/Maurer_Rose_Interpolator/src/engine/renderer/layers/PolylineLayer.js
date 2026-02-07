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

    drawColoredSegments(points, colors, style) {
        if (!points || points.length < 2 || !colors || colors.length === 0) return;

        this.ctx.lineWidth = style.width || 1;
        this.ctx.globalAlpha = style.opacity ?? 1;

        for (let i = 0; i < points.length - 1; i++) {
            // Safety check for color index
            const color = colors[i] || colors[0];

            this.ctx.beginPath();
            this.ctx.strokeStyle = color;
            this.ctx.moveTo(points[i].x, points[i].y);
            this.ctx.lineTo(points[i + 1].x, points[i + 1].y);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1; // Reset
    }

    drawVertices(points, style) {
        if (!points || points.length === 0) return;

        this.ctx.fillStyle = style.color || 'white';
        this.ctx.globalAlpha = style.opacity ?? 1;

        const radius = style.radius || 2;
        const colors = style.colors; // Array of color strings

        this.ctx.beginPath();
        if (colors && colors.length === points.length) {
            // Per-vertex coloring
            for (let i = 0; i < points.length; i++) {
                this.ctx.beginPath(); // New path for each color change
                this.ctx.fillStyle = colors[i];
                this.ctx.moveTo(points[i].x + radius, points[i].y);
                this.ctx.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            // Solid coloring (batch)
            for (let i = 0; i < points.length; i++) {
                this.ctx.moveTo(points[i].x + radius, points[i].y);
                this.ctx.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2);
            }
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1; // Reset
    }

    fill(points, style) {
        if (!points || points.length === 0) return;

        // Support string color or CanvasGradient/Pattern
        this.ctx.fillStyle = style.color || 'white';
        this.ctx.globalAlpha = style.opacity ?? 1;

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        // Use even-odd rule by default for complex polygons like roses
        this.ctx.fill(style.rule || 'evenodd');
        this.ctx.globalAlpha = 1; // Reset
    }
}
