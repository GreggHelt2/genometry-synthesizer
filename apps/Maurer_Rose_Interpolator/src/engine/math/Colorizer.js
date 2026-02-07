import { ColorUtils } from './ColorUtils.js';

/**
 * Utility for generating colors based on geometric properties of polyline segments.
 */
export const ColorMethod = {
    SOLID: 'solid',
    LENGTH: 'length',
    ANGLE: 'angle',
    SEQUENCE: 'sequence'
};

export const GradientType = {
    TWO_POINT: '2-point',
    CYCLIC: 'cyclic',
    PRESET: 'preset'
};

export class Colorizer {
    /**
     * Generates an array of colors for each segment of a polyline.
     * @param {Array<{x, y}>} points - The vertices of the polyline.
     * @param {string} method - The coloring method (ColorMethod).
     * @param {string} baseColor - The base color (hex).
     * @param {Object} options - Gradient options { colorEnd, gradientType, gradientPreset }.
     * @returns {Array<string>} Array of color strings.
     */
    static generateSegmentColors(points, method, baseColor, options = {}) {
        if (!points || points.length < 2) return [];

        const startColor = baseColor || '#ffffff';
        const endColor = options.colorEnd || '#000000';
        const gradientType = options.gradientType || GradientType.TWO_POINT;

        // Methods calculate normalized 't' (0-1) for each segment
        let tValues = [];

        switch (method) {
            case ColorMethod.LENGTH:
                tValues = this.getTByLength(points);
                break;
            case ColorMethod.ANGLE:
                tValues = this.getTByAngle(points);
                break;
            case ColorMethod.SEQUENCE:
                tValues = this.getTBySequence(points);
                break;
            default:
                return []; // Solid fallback
        }

        return tValues.map(t => this.getGradientColor(t, startColor, endColor, gradientType, options));
    }

    static getGradientColor(t, startColor, endColor, type, options) {
        // Clamp t just in case
        t = Math.max(0, Math.min(1, t));

        switch (type) {
            case GradientType.CYCLIC:
                // Map 0->1 to 0->1->0 (Triangle wave) or Sine
                // Simple version: 2 * |0.5 - t| is wrong for peak at center.
                // Let's do Sine for smooth cycle: sin(t * PI) -> 0 at ends, 1 at mid
                // Or: t * 2, if t > 0.5 then 2 - (t*2)
                // Let's try simple linear cycle: Start -> End -> Start
                const tCyclic = t <= 0.5 ? t * 2 : 2 - (t * 2);
                return ColorUtils.lerpColor(startColor, endColor, tCyclic);

            case 'custom':
                if (options.gradientStops && options.gradientStops.length > 0) {
                    return ColorUtils.lerpStops(options.gradientStops, t);
                }
                // Fallback to normal interpolation if no stops defined (prevents white flash)
                return ColorUtils.lerpColor(startColor, endColor, t);
            case GradientType.PRESET:
                // TODO: Implement presets
                // Fallback to 2-point for now
                return ColorUtils.lerpColor(startColor, endColor, t);

            case GradientType.TWO_POINT:
            default:
                return ColorUtils.lerpColor(startColor, endColor, t);
        }
    }

    static getTByLength(points) {
        const lengths = [];
        let minLen = Infinity;
        let maxLen = -Infinity;

        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            lengths.push(len);
            if (len < minLen) minLen = len;
            if (len > maxLen) maxLen = len;
        }

        const range = maxLen - minLen || 1;
        return lengths.map(len => (len - minLen) / range);
    }

    static getTByAngle(points) {
        const tValues = [];
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180
            // Normalize to 0-1
            const t = (angle + 180) / 360;
            tValues.push(t);
        }
        return tValues;
    }

    static getTBySequence(points) {
        const tValues = [];
        const total = points.length - 1;
        for (let i = 0; i < total; i++) {
            tValues.push(i / (total || 1));
        }
        return tValues;
    }
    static generateVertexColors(points, method, baseColor, options = {}) {
        if (!points || points.length === 0) return [];

        const startColor = baseColor || '#ffffff';
        const endColor = options.colorEnd || '#000000';
        const gradientType = options.gradientType || GradientType.TWO_POINT;

        let tValues = [];

        switch (method) {
            case ColorMethod.LENGTH:
                tValues = this.getVertexTByLength(points);
                break;
            case ColorMethod.ANGLE:
                tValues = this.getVertexTByAngle(points);
                break;
            case ColorMethod.SEQUENCE:
                tValues = this.getVertexTBySequence(points);
                break;
            default:
                return []; // Solid fallback
        }

        return tValues.map(t => this.getGradientColor(t, startColor, endColor, gradientType, options));
    }

    static getVertexTByLength(points) {
        if (points.length < 2) return [0];

        // 1. Calculate segment lengths
        const segLengths = [];
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            segLengths.push(Math.sqrt(dx * dx + dy * dy));
        }

        // 2. Calculate average length for each vertex
        // Vertex 0: seg[0]
        // Vertex i: (seg[i-1] + seg[i]) / 2
        // Vertex last: seg[last]
        const vertexLengths = [];
        let minLen = Infinity;
        let maxLen = -Infinity;

        for (let i = 0; i < points.length; i++) {
            let len;
            if (i === 0) {
                len = segLengths[0];
            } else if (i === points.length - 1) {
                len = segLengths[segLengths.length - 1];
            } else {
                len = (segLengths[i - 1] + segLengths[i]) / 2;
            }
            vertexLengths.push(len);
            if (len < minLen) minLen = len;
            if (len > maxLen) maxLen = len;
        }

        const range = maxLen - minLen || 1;
        return vertexLengths.map(len => (len - minLen) / range);
    }

    static getVertexTByAngle(points) {
        return points.map(p => {
            const x = p.x !== undefined ? p.x : p[0];
            const y = p.y !== undefined ? p.y : p[1];
            const angle = Math.atan2(y, x) * (180 / Math.PI);
            return (angle + 180) / 360;
        });
    }

    static getVertexTBySequence(points) {
        const total = points.length - 1;
        return points.map((_, i) => i / (total || 1));
    }
}
