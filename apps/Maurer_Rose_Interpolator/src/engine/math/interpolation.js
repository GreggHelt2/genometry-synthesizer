import { lcm } from './lcm.js';
import { generateMaurerPolyline } from './maurer.js';

/**
 * Interpolates between two sets of points.
 * 
 * @param {Array<{x:number, y:number}>} pointsA 
 * @param {Array<{x:number, y:number}>} pointsB 
 * @param {number} t - Interpolation factor (0 to 1).
 * @returns {Array<{x:number, y:number}>}
 */
export function interpolateLinear(pointsA, pointsB, t) {
    const count = Math.min(pointsA.length, pointsB.length);
    const result = [];
    for (let i = 0; i < count; i++) {
        const x = pointsA[i].x * (1 - t) + pointsB[i].x * t;
        const y = pointsA[i].y * (1 - t) + pointsB[i].y * t;
        result.push({ x, y });
    }
    return result;
}

/**
 * Generates points for LCM-based interpolation.
 * Since the two curves might have different vertex counts, we often need to 
 * upsample them to a common number of vertices (LCM of their line counts)
 * to ensure 1-to-1 vertex morphing.
 * 
 * @param {import('./curves/Curve').Curve} curveA
 * @param {import('./curves/Curve').Curve} curveB
 * @param {number} totalDivs - usually 360
 * @param {number} stepA
 * @param {number} stepB
 * @returns {{pointsA: Array, pointsB: Array}}
 */
export function generateLcmPoints(curveA, curveB, totalDivs, stepA, stepB) {
    // This logic logic needs to be robust.
    // In v17, we might simplify or enhance.
    // For now, let's just use a naive high-res resample if LCM is too big,
    // or exact LCM if reasonable.

    // Placeholder for robust implementation.
    // Reusing standard generation for now.

    // This function acts as a factory for the two point sets that WILL be interpolated.
    const ptsA = generateMaurerPolyline(curveA, totalDivs, stepA);
    const ptsB = generateMaurerPolyline(curveB, totalDivs, stepB);

    // If lengths differ, we need more sophisticated matching (LCM).
    // Future expansion: Implement exact LCM upsampling.

    return { pointsA: ptsA, pointsB: ptsB };
}
