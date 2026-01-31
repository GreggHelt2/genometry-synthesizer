import { lcm } from './MathOps.js';
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
    return result;
}

/**
 * Resamples a polyline to have a specific number of segments by upsampling each existing segment.
 * This ensures strict geometric fidelity (no corner cutting) when targetSegments is a multiple of current segments.
 * 
 * @param {Array<{x:number, y:number}>} points 
 * @param {number} targetSegmentCount 
 * @returns {Array<{x:number, y:number}>}
 */
export function resamplePolyline(points, targetSegmentCount) {
    if (!points || points.length < 2) return points;

    const currentSegments = points.length - 1;
    if (currentSegments === 0) return points;

    // Check if upsampling is needed
    if (targetSegmentCount === currentSegments) return points;

    // Calculate upsampling factor (must be integer for strict segment preservation)
    // If not integer, this logic implies we are distributing vertices evenly? 
    // The prompt implies "upsampled... to lcm", which implies integer multiple.
    // We will assume integer factor for the prompt's specific requirement,
    // but generic resampling might differ. Let's stick to the prompt's algorithm.
    const factor = Math.round(targetSegmentCount / currentSegments);

    const newPoints = [];

    for (let i = 0; i < currentSegments; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        // Generate 'factor' segments for this span
        // Vertices at t = 0/factor, 1/factor, ... (factor-1)/factor
        for (let j = 0; j < factor; j++) {
            const t = j / factor;
            newPoints.push({
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t
            });
        }
    }
    // Add the final closing point
    newPoints.push(points[points.length - 1]);

    return newPoints;
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
