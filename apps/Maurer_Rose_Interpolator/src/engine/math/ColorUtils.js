/**
 * Utility functions for color manipulation.
 */
export const ColorUtils = {
    /**
     * Interpolates between two hex colors.
     * @param {string} c1_hex - Start color (e.g., "#FF0000" or "#F00")
     * @param {string} c2_hex - End color
     * @param {number} t - Interpolation factor (0-1)
     * @returns {string} Interpolated hex color
     */
    lerpColor(c1_hex, c2_hex, t) {
        t = Math.max(0, Math.min(1, t));

        const c1 = this.hexToRgb(c1_hex);
        const c2 = this.hexToRgb(c2_hex);

        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);

        return this.rgbToHex(r, g, b);
    },

    /**
     * Converts hex string to RGB object.
     * @param {string} hex 
     * @returns {{r: number, g: number, b: number}}
     */
    hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    /**
     * Converts RGB values to hex string.
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @returns {string}
     */
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    /**
     * Interpolates color based on a list of stops.
     * @param {Array<{color: string, position: number}>} stops - Array of stop objects
     * @param {number} t - Interpolation factor (0-1)
     * @returns {string} Interpolated hex color
     */
    /**
     * Interpolates color properly handling alpha if present in stops.
     * @param {Array<{color: string, position: number, alpha?: number}>} stops 
     * @param {number} t 
     */
    lerpStops(stops, t) {
        if (!stops || stops.length === 0) return '#000000';
        if (stops.length === 1) return stops[0].color; // Ignore alpha if single stop? Or return rgba? 
        // If single stop has alpha, we should probably respect it.
        // But legacy behavior expects hex string often. 
        // Let's assume if alpha defined, we return rgba.

        t = Math.max(0, Math.min(1, t));

        // Find segments
        for (let i = 0; i < stops.length - 1; i++) {
            const s1 = stops[i];
            const s2 = stops[i + 1];

            if (t >= s1.position && t <= s2.position) {
                const segmentT = (t - s1.position) / (s2.position - s1.position);

                // Check if we need alpha processing
                // If either has alpha defined, we treat both as having alpha (default 1)
                if (s1.alpha !== undefined || s2.alpha !== undefined) {
                    const a1 = s1.alpha !== undefined ? s1.alpha : 1;
                    const a2 = s2.alpha !== undefined ? s2.alpha : 1;
                    const alphaInterp = a1 + (a2 - a1) * segmentT;

                    return this.lerpColorRGBA(s1.color, s2.color, segmentT, alphaInterp);
                }

                // Standard Hex
                return this.lerpColor(s1.color, s2.color, segmentT);
            }
        }

        // Fallback
        const last = stops[stops.length - 1];
        if (last.alpha !== undefined) {
            const rgb = this.hexToRgb(last.color);
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${last.alpha})`;
        }
        return last.color;
    },

    lerpColorRGBA(c1_hex, c2_hex, t, alpha) {
        t = Math.max(0, Math.min(1, t));
        const c1 = this.hexToRgb(c1_hex);
        const c2 = this.hexToRgb(c2_hex);

        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);

        // Return rgba string
        // Limit alpha to 0-1 precision?
        return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
    },

    // --- Color Space Conversions (Picker Support) ---
    hexToHsv(hex) {
        const rgb = this.hexToRgb(hex);
        return this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    },

    rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, v };
    },

    hsvToRgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
};
