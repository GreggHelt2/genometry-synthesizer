/**
 * Base class for all parametric curves.
 * Defines the interface that the CurveLayer and Chordal Rosette engine expect.
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
     * Returns the recommended number of sample points per radian for rendering.
     * Curves with high internal oscillation frequencies should override this
     * to ensure smooth visual rendering.
     * @returns {number} Samples per radian (default: 100).
     */
    getSamplesPerRadian() {
        return 100;
    }

    /**
     * Returns special points on the curve: zero points (origin crossings),
     * double points (self-intersections), and boundary points (maximal radius).
     * Subclasses should override with analytical or numerical implementations.
     * 
     * @returns {{
     *   zeroPoints: Array<{theta: number, x: number, y: number}>,
     *   doublePoints: Array<{x: number, y: number, theta1: number, theta2: number}>,
     *   boundaryPoints: Array<{theta: number, x: number, y: number, r: number}>
     * }}
     */
    getSpecialPoints() {
        return { zeroPoints: [], doublePoints: [], boundaryPoints: [] };
    }

    /**
     * Whether this curve class has a real getSpecialPoints() implementation.
     * Used by the UI to gray out the special points section for unsupported curves.
     * @returns {boolean}
     */
    static supportsSpecialPoints() {
        return false;
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
