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
    }
};
