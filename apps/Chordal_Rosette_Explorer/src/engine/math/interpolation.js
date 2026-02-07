import { lcm } from './MathOps.js';
import { generateChordalPolyline } from './chordal_rosette.js';

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
 * Resamples a polyline to have a specific number of segments by upsampling each existing segment.
 * This ensures strict geometric fidelity (no corner cutting) when targetSegments is a multiple of current segments.
 * Use this for EXACT LCM matching.
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

    // Expecting exact multiple for this function
    const factor = Math.round(targetSegmentCount / currentSegments);

    const newPoints = [];

    for (let i = 0; i < currentSegments; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

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
 * Resamples a polyline to an arbitrary number of segments using linear interpolation.
 * This does NOT preserve corners exactly if steps don't align, but allows arbitrary matching.
 * Use this for APPROXIMATE fallback.
 * 
 * @param {Array<{x:number, y:number}>} points 
 * @param {number} targetSegmentCount 
 * @returns {Array<{x:number, y:number}>}
 */
export function resamplePolylineApprox(points, targetSegmentCount) {
    if (!points || points.length < 2) return points;
    const currentSegments = points.length - 1;
    if (currentSegments === 0) return points;

    const newPoints = [];

    // We want targetSegmentCount segments, so targetSegmentCount + 1 points.
    for (let i = 0; i <= targetSegmentCount; i++) {
        // Normalized position along the entire polyline (0 to 1)
        const tTotal = i / targetSegmentCount;

        // Map to source segment index and local t
        // Floating point index in source array
        const sourceFloatIndex = tTotal * currentSegments;

        let idx = Math.floor(sourceFloatIndex);
        let tLocal = sourceFloatIndex - idx;

        // Clamp (handle end case where tTotal=1 -> idx=count -> oob)
        if (idx >= currentSegments) {
            idx = currentSegments - 1;
            tLocal = 1;
        }

        const p1 = points[idx];
        const p2 = points[idx + 1]; // Safe because we clamped idx to count-1

        newPoints.push({
            x: p1.x + (p2.x - p1.x) * tLocal,
            y: p1.y + (p2.y - p1.y) * tLocal
        });
    }

    return newPoints;
}

export function generateLcmPoints(curveA, curveB, totalDivs, stepA, stepB) {
    const ptsA = generateChordalPolyline(curveA, totalDivs, stepA);
    const ptsB = generateChordalPolyline(curveB, totalDivs, stepB);
    return { pointsA: ptsA, pointsB: ptsB };
}
