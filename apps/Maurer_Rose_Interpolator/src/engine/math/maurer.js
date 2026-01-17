import { calculateRhodoneaPeriodCycles } from './lcm.js';

/**
 * Generates the vertices for a Maurer Rose polyline.
 * 
 * @param {import('./curves/Curve').Curve} curve - The parametric curve instance.
 * @param {number} totalDivs - The number of divisions (Z) for the full period (usually 360).
 * @param {number} step - The step size (D) in degrees (or divisions).
 * @param {number} cyclesMultiplier - (Optional) Multiplier for the number of cycles.
 * @param {number} offset - (Optional) Starting offset in divisions (for cosets).
 * @returns {Array<{x: number, y: number}>} Array of point objects.
 */
export function generateMaurerPolyline(curve, totalDivs, step, cyclesMultiplier = 1, offset = 0) {
    const points = [];

    // Calculate lines required to close the figure using GCD of step and totalDivs
    // This determines how many integer steps we take before returning to 0 mod Z.
    const gcdVal = (function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); })(step, totalDivs);
    const linesToClose = totalDivs / gcdVal;

    const count = Math.ceil(linesToClose * cyclesMultiplier);

    // Calculate the angular scale factor based on the Curve's period
    // The curve params (n, d) determine how many 2PI cycles are needed to close the underlying Rose curve.
    // The Maurer Rose logic maps the "Total Divisions" (Z) to this Full Period.

    // Check if curve has n,d (Polymorphism: assume R{n,d} for now as per requirements)
    let periodCycles = 1;
    if (curve.n !== undefined && curve.d !== undefined) {
        periodCycles = calculateRhodoneaPeriodCycles(curve.n, curve.d);
    }

    const totalAngle = periodCycles * 2 * Math.PI;
    const radiansPerDiv = totalAngle / totalDivs;

    for (let i = 0; i <= count; i++) {
        // k is the angle passed to the Rose function
        const currentDiv = offset + (i * step);
        const k = currentDiv * radiansPerDiv;

        points.push(curve.getPoint(k));
    }

    return points;
}
