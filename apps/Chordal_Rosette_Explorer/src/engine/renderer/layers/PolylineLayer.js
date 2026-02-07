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

        const mode = style.connectMode || 'straight';
        const detail = style.connectDetail || 20;

        if (mode === 'straight') {
            this.ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.ctx.lineTo(points[i].x, points[i].y);
            }
        } else {
            // Advanced modes require processing per segment
            this.ctx.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];

                // For splines, we need p0 and p3
                const p0 = (i === 0) ? p1 : points[i - 1];
                const p3 = (i >= points.length - 2) ? p2 : points[i + 2];

                this.drawSegment(p0, p1, p2, p3, mode, style, i);
            }
        }

        this.ctx.stroke();
        this.ctx.globalAlpha = 1; // Reset
    }

    drawColoredSegments(points, colors, style) {
        if (!points || points.length < 2 || !colors || colors.length === 0) return;

        this.ctx.lineWidth = style.width || 1;
        this.ctx.globalAlpha = style.opacity ?? 1;

        const mode = style.connectMode || 'straight';

        for (let i = 0; i < points.length - 1; i++) {
            // Safety check for color index
            const color = colors[i] || colors[0];

            this.ctx.beginPath();
            this.ctx.strokeStyle = color;

            const p1 = points[i];
            const p2 = points[i + 1];
            this.ctx.moveTo(p1.x, p1.y);

            if (mode === 'straight') {
                this.ctx.lineTo(p2.x, p2.y);
            } else {
                const p0 = (i === 0) ? p1 : points[i - 1];
                const p3 = (i >= points.length - 2) ? p2 : points[i + 2];
                this.drawSegment(p0, p1, p2, p3, mode, style, i);
            }

            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1; // Reset
    }

    drawSegment(p0, p1, p2, p3, mode, style, index) {
        if (mode === 'sine') {
            let amp = style.waveAmplitude || 10;
            if (style.waveAlternateFlip && (index % 2 !== 0)) {
                amp = -amp;
            }
            this.drawWave(p1, p2, amp, style.waveFrequency || 5, style.connectDetail || 20, mode);
        } else if (mode === 'kb-spline') {
            this.drawKochanekBartels(p0, p1, p2, p3, style.splineTension || 0, style.splineBias || 0, style.splineContinuity || 0, style.connectDetail || 20);
        } else if (mode === 'catmull-rom') {
            this.drawCatmullRom(p0, p1, p2, p3, style.connectDetail || 20, style.splineAlpha ?? 0.5);
        } else if (mode === 'circle-spline') {
            this.drawCircleSplineSegment(p0, p1, p2, p3, style.connectDetail || 20);
        } else if (mode === 'arc') {
            this.drawArc(p1, p2, false);
        } else if (mode === 'arc-flipped') {
            this.drawArc(p1, p2, true);
        } else if (mode === 'quadratic-bezier') {
            this.drawQuadraticBezier(p1, p2, style.bezierBulge || 0, style.connectDetail || 20);
        } else if (mode === 'circle') {
            this.drawCircle(p1, p2);
        } else {
            this.ctx.lineTo(p2.x, p2.y);
        }
    }

    drawQuadraticBezier(p1, p2, bulge, detail) {

        if (bulge === 0) {
            this.ctx.lineTo(p2.x, p2.y);
            return;
        }

        // Calculate control point
        // Midpoint
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;

        // Vector from p1 to p2
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) {
            this.ctx.lineTo(p2.x, p2.y);
            return;
        }

        // Perpendicular vector (-dy, dx) normalized
        const nx = -dy / dist;
        const ny = dx / dist;

        // Control point is shifted along normal by bulge * dist
        // (Using distance scales the bulge with the segment length, keeping proportions)
        const cx = mx + nx * bulge * dist;
        const cy = my + ny * bulge * dist;

        // Quadratic Bezier interpolation
        for (let i = 1; i <= detail; i++) {
            const t = i / detail;
            const mt = 1 - t;

            // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const x = (mt * mt * p1.x) + (2 * mt * t * cx) + (t * t * p2.x);
            const y = (mt * mt * p1.y) + (2 * mt * t * cy) + (t * t * p2.y);

            this.ctx.lineTo(x, y);
        }
    }

    drawCircleSplineSegment(p0, p1, p2, p3, detail) {
        // Sequin's Circle Spline approximation:
        // Blend between Circle(p0, p1, p2) and Circle(p1, p2, p3)
        // Discontinuity Fix: We must respect the winding order of the defining points,
        // rather than just taking the shortest arc.

        const c1 = this.getCircleThrough3Points(p0, p1, p2);
        const c2 = this.getCircleThrough3Points(p1, p2, p3);

        if (!c1 || !c2) {
            // Degenerate case (collinear), fallback to line
            this.ctx.lineTo(p2.x, p2.y);
            return;
        }

        // Helper to get arc angle 'da' from pStart to pEnd on 'circle',
        // obeying the winding direction defined by pPrev->pStart->pEnd.
        const getWindingArc = (circle, pPrev, pStart, pEnd) => {
            const startAngle = Math.atan2(pStart.y - circle.y, pStart.x - circle.x);
            const endAngle = Math.atan2(pEnd.y - circle.y, pEnd.x - circle.x);
            let da = endAngle - startAngle;

            // Determine expected winding (CCW or CW) from the cross product of edges
            // (pStart - pPrev) x (pEnd - pStart)
            const val = (pStart.x - pPrev.x) * (pEnd.y - pStart.y) - (pStart.y - pPrev.y) * (pEnd.x - pStart.x);
            const isCCW = val > 0;

            // Normalize da to (-PI, PI]
            while (da <= -Math.PI) da += 2 * Math.PI;
            while (da > Math.PI) da -= 2 * Math.PI;

            // Enforce winding
            if (isCCW && da < 0) da += 2 * Math.PI; // If CCW expected but went CW, go long way CCW
            if (!isCCW && da > 0) da -= 2 * Math.PI; // If CW expected but went CCW, go long way CW

            return { start: startAngle, da: da };
        };

        // Arc 1: Defined by p0->p1->p2. Segment is p1->p2.
        const arc1 = getWindingArc(c1, p0, p1, p2);

        // Arc 2: Defined by p1->p2->p3. Segment is p1->p2.
        // Wait, for c2, the points are p1, p2, p3.
        // The segment we are drawing is still p1->p2.
        // But the circle c2 is defined by p1->p2->p3.
        // Does p1->p2 segment on c2 follow the winding of p1->p2->p3?
        // YES. p1 is first, p2 is second.
        // So we can use the same logic: p1 (prev? no) -> p1 is start?
        // The helper uses (pPrev, pStart, pEnd) to compute cross product (pStart-pPrev)x(pEnd-pStart).
        // For c2, we have p1, p2, p3.
        // Check winding of p1->p2->p3.
        // Vector A = p2-p1. Vector B = p3-p2. Cross A x B.
        // If > 0, CCW.
        // Segment is p1->p2.
        // If p1->p2->p3 is CCW, then p1->p2 is ... well, p1 is before p2.
        // So p1->p2 is consistent with the flow towards p3.
        // So yes, we can use p1->p2->p3 sequence to define winding for p1->p2 arc?
        // Actually, the helper calculates winding at pStart.
        // For Arc 1, we used p0, p1, p2. Start=p1, End=p2. Prev=p0.
        // For Arc 2, we have p1, p2, p3. Start=p1, End=p2. Prev?
        // We don't have a point *before* p1 for c2.
        // But c2 is defined BY p1, p2, p3.
        // The curve segment p1->p2 is the first part of the circle definition p1->p2->p3.
        // So the winding of p1->p2->p3 defines the circle.
        // If p1->p2->p3 is CCW, then the arc from p1 to p2 must be "forward" towards p3?
        // Yes.
        // So we can check cross product of (p2-p1) and (p3-p2).
        // And ensure arc p1->p2 matches that sign.

        // Let's refine the helper call for c2 manually or adapt helper.
        // Helper expects pPrev, pStart, pEnd.
        // For c1: pPrev=p0, pStart=p1, pEnd=p2. Matches.
        // For c2: We want to use p1, p2, p3.
        // Check winding of p1->p2->p3.
        // The Cross Product Logic in helper is: (pStart-pPrev) x (pEnd-pStart).
        // If we want winding of p1->p2->p3, we can pass:
        // pPrev=p1, pStart=p2, pEnd=p3 ??
        // (p2-p1) x (p3-p2). Yes.
        // This gives us `isCCW`.
        // Then we want arc from p1 to p2.
        // Wait, helper computes arc from pStart to pEnd.
        // So if we pass pStart=p2, pEnd=p3, it computes arc p2->p3 (which is not what we want).

        // Manual implementation for c2 to be safe:
        const val2 = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
        const isCCW2 = val2 > 0;
        const a2Start = Math.atan2(p1.y - c2.y, p1.x - c2.x);
        const a2End = Math.atan2(p2.y - c2.y, p2.x - c2.x);
        let da2 = a2End - a2Start;
        while (da2 <= -Math.PI) da2 += 2 * Math.PI;
        while (da2 > Math.PI) da2 -= 2 * Math.PI;
        if (isCCW2 && da2 < 0) da2 += 2 * Math.PI;
        if (!isCCW2 && da2 > 0) da2 -= 2 * Math.PI;
        const arc2 = { start: a2Start, da: da2 };


        for (let i = 1; i <= detail; i++) {
            const t = i / detail;
            const w = t;

            // Point on Circle 1
            const ang1 = arc1.start + arc1.da * t;
            const px1 = c1.x + c1.r * Math.cos(ang1);
            const py1 = c1.y + c1.r * Math.sin(ang1);

            // Point on Circle 2
            const ang2 = arc2.start + arc2.da * t;
            const px2 = c2.x + c2.r * Math.cos(ang2);
            const py2 = c2.y + c2.r * Math.sin(ang2);

            // Linear interpolation
            const x = (1 - w) * px1 + w * px2;
            const y = (1 - w) * py1 + w * py2;

            this.ctx.lineTo(x, y);
        }
    }


    getCircleThrough3Points(p1, p2, p3) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;

        const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
        if (Math.abs(D) < 1e-6) return null; // Collinear

        const centerX = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
        const centerY = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;

        const r = Math.sqrt((centerX - x1) ** 2 + (centerY - y1) ** 2);

        return { x: centerX, y: centerY, r: r };
    }

    drawWave(p1, p2, amplitude, frequency, detail, type) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) { this.ctx.lineTo(p2.x, p2.y); return; }

        const ux = dx / dist;
        const uy = dy / dist;
        const perpX = -uy;
        const perpY = ux;

        for (let i = 1; i <= detail; i++) {
            const t = i / detail;
            const x = p1.x + t * dx;
            const y = p1.y + t * dy;

            let offsetVal;
            if (type === 'sine') {
                offsetVal = Math.sin(t * frequency * 2 * Math.PI);
            } else {
                offsetVal = 0;
            }

            const offset = amplitude * offsetVal;
            const px = x + offset * perpX;
            const py = y + offset * perpY;
            this.ctx.lineTo(px, py);
        }
    }

    drawKochanekBartels(p0, p1, p2, p3, tension, bias, continuity, detail) {
        const t = tension; const b = bias; const c = continuity;
        const m1x = ((1 - t) * (1 + b) * (1 - c) / 2 * (p1.x - p0.x)) + ((1 - t) * (1 - b) * (1 + c) / 2 * (p2.x - p1.x));
        const m1y = ((1 - t) * (1 + b) * (1 - c) / 2 * (p1.y - p0.y)) + ((1 - t) * (1 - b) * (1 + c) / 2 * (p2.y - p1.y));
        const m2x = ((1 - t) * (1 + b) * (1 + c) / 2 * (p2.x - p1.x)) + ((1 - t) * (1 - b) * (1 - c) / 2 * (p3.x - p2.x));
        const m2y = ((1 - t) * (1 + b) * (1 + c) / 2 * (p2.y - p1.y)) + ((1 - t) * (1 - b) * (1 - c) / 2 * (p3.y - p2.y));

        for (let i = 1; i <= detail; i++) {
            const u = i / detail;
            const u2 = u * u;
            const u3 = u2 * u;
            const h0 = 2 * u3 - 3 * u2 + 1;
            const h1 = -2 * u3 + 3 * u2;
            const h2 = u3 - 2 * u2 + u;
            const h3 = u3 - u2;

            const px = h0 * p1.x + h1 * p2.x + h2 * m1x + h3 * m2x;
            const py = h0 * p1.y + h1 * p2.y + h2 * m1y + h3 * m2y;
            this.ctx.lineTo(px, py);
        }
    }

    drawCatmullRom(p0, p1, p2, p3, detail, alpha) {
        // Simple uniform Catmull-Rom (alpha=0.5 centripetal approx if parameterized correctly, but implementation below matches prototype logic which uses simple alpha scaling of tangents)
        // Prototype logic: m1 = alpha * (p2 - p0), m2 = alpha * (p3 - p1)
        const m1x = alpha * (p2.x - p0.x);
        const m1y = alpha * (p2.y - p0.y);
        const m2x = alpha * (p3.x - p1.x);
        const m2y = alpha * (p3.y - p1.y);

        for (let i = 1; i <= detail; i++) {
            const u = i / detail;
            const u2 = u * u;
            const u3 = u2 * u;
            const h00 = 2 * u3 - 3 * u2 + 1;
            const h10 = u3 - 2 * u2 + u;
            const h01 = -2 * u3 + 3 * u2;
            const h11 = u3 - u2;

            const px = h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x;
            const py = h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y;
            this.ctx.lineTo(px, py);
        }
    }

    drawArc(p1, p2, flipped) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        // Semicircle center is midpoint. Radius is dist/2.
        // We need start angle and end angle.
        const angle = Math.atan2(dy, dx);
        const radius = dist / 2;

        // arc(x, y, radius, startAngle, endAngle, counterclockwise)
        // straight line goes from p1 to p2. 
        // p1 is at angle + PI (relative to center)? No, center is midpoint.
        // p1 relative to mid is (p1-mid). p2 relative to mid is (p2-mid).
        // (p2 - mid) angle is `angle`. (p1 - mid) angle is `angle + PI`.
        // We want to draw from p1 to p2.

        // If not flipped: draw on one side.
        // If flipped: draw on other side.
        // canvas arc draws from start to end.

        this.ctx.arc(midX, midY, radius, angle + Math.PI, angle, flipped);
    }

    drawCircle(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const radius = dist / 2;

        // Draw full circle. 
        // Note: we are in a lineTo path. 
        // moveTo(p1) is already called.
        // We should just draw the circle. 
        // However, this will leave a line from p1 to circle start? 
        // arc() adds a line to the start point if path exists.
        // We want circle to be standalone? Or connected?
        // "Connection Mode" implies replacing the line segment.
        // The implementation in "Knowledge Roadmap" implies replacing the segment with a circle.
        // If we want it to look like a set of circles, we should probably MoveTo for each?
        // But we are inside a continuous path loop in draw().
        // If we use arc(..., 0, 2PI), it draws a circle.
        // Let's assume connected path logic first.


        // Actually p1 IS on the circle (at some angle).
        // p1 is at angle+PI. 
        // So if we arc from angle+PI to angle+PI + 2PI, we get a full circle starting at p1.

        const angle = Math.atan2(dy, dx);
        this.ctx.arc(midX, midY, radius, angle + Math.PI, angle + 3 * Math.PI);
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
