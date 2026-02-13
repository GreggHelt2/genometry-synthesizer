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
 * Computes a single curved interpolation point between p1 and p2 at parameter t.
 * @param {{x:number,y:number}} p1 - Start point
 * @param {{x:number,y:number}} p2 - End point
 * @param {number} t - Interpolation parameter (0 to 1)
 * @param {string} mode - Curve mode
 * @param {Object} params - Mode-specific parameters
 * @returns {{x:number,y:number}}
 */
function curvePoint(p1, p2, t, mode, params, index = 0) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0 || mode === 'linear') {
        return {
            x: p1.x + dx * t,
            y: p1.y + dy * t
        };
    }

    switch (mode) {
        case 'sine': {
            // Base linear position
            const baseX = p1.x + dx * t;
            const baseY = p1.y + dy * t;
            // Perpendicular direction
            const perpX = -dy / dist;
            const perpY = dx / dist;
            // Amplitude as fraction of segment length
            let amplitude = (params.interpWaveAmplitude ?? 0.2) * dist;
            if (params.interpWaveAlternateFlip && (index % 2 !== 0)) {
                amplitude = -amplitude;
            }
            const frequency = params.interpWaveFrequency ?? 1;
            const offset = amplitude * Math.sin(t * frequency * 2 * Math.PI);
            return {
                x: baseX + offset * perpX,
                y: baseY + offset * perpY
            };
        }

        case 'quadratic-bezier': {
            const bulge = params.interpBezierBulge ?? 0.3;
            if (bulge === 0) {
                return { x: p1.x + dx * t, y: p1.y + dy * t };
            }
            // Control point: midpoint offset along perpendicular
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const nx = -dy / dist;
            const ny = dx / dist;
            const cx = mx + nx * bulge * dist;
            const cy = my + ny * bulge * dist;
            // Quadratic Bezier: B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1
            const mt = 1 - t;
            return {
                x: mt * mt * p1.x + 2 * mt * t * cx + t * t * p2.x,
                y: mt * mt * p1.y + 2 * mt * t * cy + t * t * p2.y
            };
        }

        case 'arc':
        case 'arc-flipped': {
            // Semicircular arc from p1 to p2
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const radius = dist / 2;
            const baseAngle = Math.atan2(dy, dx);
            const flipped = mode === 'arc-flipped';
            // Sweep from p1 to p2 along the arc
            // p1 is at angle (baseAngle + PI) from center, p2 is at baseAngle
            let angle;
            if (flipped) {
                // Clockwise: go from (baseAngle+PI) backwards by t*PI
                angle = (baseAngle + Math.PI) + t * Math.PI;
            } else {
                // Counter-clockwise: go from (baseAngle+PI) forward by -t*PI
                angle = (baseAngle + Math.PI) - t * Math.PI;
            }
            return {
                x: midX + radius * Math.cos(angle),
                y: midY + radius * Math.sin(angle)
            };
        }

        default:
            return { x: p1.x + dx * t, y: p1.y + dy * t };
    }
}

/**
 * Interpolates between two sets of points along curves.
 * 
 * @param {Array<{x:number, y:number}>} pointsA 
 * @param {Array<{x:number, y:number}>} pointsB 
 * @param {number} t - Interpolation factor (0 to 1)
 * @param {string} mode - Curve mode: 'linear' | 'sine' | 'quadratic-bezier' | 'arc' | 'arc-flipped'
 * @param {Object} params - Mode-specific parameters
 * @returns {Array<{x:number, y:number}>}
 */
export function interpolateCurved(pointsA, pointsB, t, mode, params = {}) {
    if (!mode || mode === 'linear') {
        return interpolateLinear(pointsA, pointsB, t);
    }
    const count = Math.min(pointsA.length, pointsB.length);
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(curvePoint(pointsA[i], pointsB[i], t, mode, params, i));
    }
    return result;
}

/**
 * Samples the full interpolation curve between A[i] and B[i] for visualization.
 * Returns an array of polylines — one per vertex pair — each with `detail+1` points.
 * 
 * @param {Array<{x:number, y:number}>} pointsA 
 * @param {Array<{x:number, y:number}>} pointsB 
 * @param {string} mode - Curve mode
 * @param {Object} params - Mode-specific parameters
 * @param {number} detail - Number of segments per curve (default 20)
 * @returns {Array<Array<{x:number, y:number}>>} - Array of polylines
 */
export function sampleInterpCurves(pointsA, pointsB, mode, params = {}, detail = 20) {
    const count = Math.min(pointsA.length, pointsB.length);
    const curves = [];
    for (let i = 0; i < count; i++) {
        const pts = [];
        for (let j = 0; j <= detail; j++) {
            const t = j / detail;
            pts.push(curvePoint(pointsA[i], pointsB[i], t, mode, params, i));
        }
        curves.push(pts);
    }
    return curves;
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
