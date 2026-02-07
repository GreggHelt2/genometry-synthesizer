/**
 * Base class for all parametric curves.
 * Defines the interface that the CurveLayer and Maurer engine expect.
 */
export class Curve {
    constructor() {
        if (this.constructor === Curve) {
            throw new Error("Abstract class 'Curve' cannot be instantiated directly.");
        }
    }

    /**
     * Calculates a point on the curve at a given angle.
     * @param {number} theta - The angle in radians.
     * @returns {{x: number, y: number}} The {x, y} coordinates.
     */
    getPoint(theta) {
        throw new Error("Method 'getPoint()' must be implemented.");
    }

    /**
     * Returns a unique signature or hash of the current parameters.
     * Used for memoization/caching.
     * @returns {string}
     */
    getSignature() {
        throw new Error("Method 'getSignature()' must be implemented.");
    }

    /**
     * Returns the full total angular displacement equired to close the curve, in radians
     * For a simple circle, this is 2*PI. For Rhodonea, it depends on n and d.
     * @returns {number} The domain range in radians.
     */
    getRadiansToClosure() {
        throw new Error("Method 'getRadiansToClosure()' must be implemented.");
    }

    /**
     * Returns the schema for the curve's parameters.
     * Used by the UI to dynamically generate controls.
     * @returns {Array<{key: string, type: string, label: string, min: number, max: number, step: number, default: number}>}
     */
    static getParamsSchema() {
        return [];
    }
}
