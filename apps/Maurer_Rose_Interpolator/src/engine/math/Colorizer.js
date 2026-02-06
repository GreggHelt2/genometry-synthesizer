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
}
