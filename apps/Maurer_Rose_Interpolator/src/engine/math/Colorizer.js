/**
 * Utility for generating colors based on geometric properties of polyline segments.
 */
export const ColorMethod = {
    SOLID: 'solid',
    LENGTH: 'length',
    ANGLE: 'angle',
    SEQUENCE: 'sequence'
};

export class Colorizer {
    /**
     * Generates an array of colors for each segment of a polyline.
     * @param {Array<{x, y}>} points - The vertices of the polyline.
     * @param {string} method - The coloring method (ColorMethod).
     * @param {string} baseColor - The base color (hex) for tinting or fallback.
     * @returns {Array<string>} Array of color strings (hsl or rgba).
     */
    static generateSegmentColors(points, method, baseColor) {
        if (!points || points.length < 2) return [];

        switch (method) {
            case ColorMethod.LENGTH:
                return this.byLength(points);
            case ColorMethod.ANGLE:
                return this.byAngle(points);
            case ColorMethod.SEQUENCE:
                return this.bySequence(points);
            default:
                // Return empty to signal fallback to solid stroke
                return [];
        }
    }

    static byLength(points) {
        const lengths = [];
        let minLen = Infinity;
        let maxLen = -Infinity;

        // 1. Calculate lengths
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            lengths.push(len);
            if (len < minLen) minLen = len;
            if (len > maxLen) maxLen = len;
        }

        // 2. Map to heatmap (Blue -> Red or HSL)
        // Short = Cool/Dark, Long = Hot/Bright
        return lengths.map(len => {
            const t = (len - minLen) / (maxLen - minLen || 1);
            // Hue: 240 (Blue) -> 0 (Red)
            const hue = 240 * (1 - t);
            // Lightness: 30% -> 60%
            const light = 30 + (30 * t);
            return `hsl(${hue}, 100%, ${light}%)`;
        });
    }

    static byAngle(points) {
        const colors = [];
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angle < 0) angle += 360;

            // Map angle directly to Hue
            // Saturation 100%, Lightness 50%
            colors.push(`hsl(${angle}, 100%, 50%)`);
        }
        return colors;
    }

    static bySequence(points) {
        const colors = [];
        const total = points.length - 1;
        for (let i = 0; i < total; i++) {
            // Rainbow walk through the entire path
            const hue = (i / total) * 360;
            colors.push(`hsl(${hue}, 100%, 50%)`);
        }
        return colors;
    }
}
