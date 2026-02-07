
import { getLinesToClose } from './MathOps.js';

/**
 * Generates the vertices for a Chordal Rosette polyline using a pluggable sequencer.
 * 
 * @param {import('./curves/Curve').Curve} curve - The parametric curve instance.
 * @param {import('./sequencers/Sequencer').Sequencer} sequencer - The sequencer instance.
 * @param {number} totalDivs - The modulo (n).
 * @param {number} offset - (Optional) Starting offset in divisions (for cosets).
 * @param {Object} params - Additional params for the sequencer (e.g. step, cycles).
 * @returns {Array<{x: number, y: number}>} Array of point objects.
 */
export function generateChordalPolyline(curve, sequencer, totalDivs, offset = 0, params = {}) {
    const points = [];

    // Get the sequence of integer inputs (0..n-1 domain, potentially cycled)
    const sequence = sequencer.generate(totalDivs, offset, params);

    // Calculate the angular scale factor based on the generalized Curve domain (P-Curve)
    const totalAngle = curve.getRadiansToClosure();
    const radiansPerDiv = totalAngle / totalDivs;

    for (let i = 0; i < sequence.length; i++) {
        // Map integer value to angle k
        const k = sequence[i] * radiansPerDiv;
        points.push(curve.getPoint(k));
    }

    return points;
}
