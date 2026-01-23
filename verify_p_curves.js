import { CircleCurve } from './apps/Maurer_Rose_Interpolator/src/engine/math/curves/CircleCurve.js';
import { generateMaurerPolyline } from './apps/Maurer_Rose_Interpolator/src/engine/math/maurer.js';

console.log("Verifying P-Curve Generic Logic...");

const circle = new CircleCurve(100);
// A pentagram: 5 points, step 2. 
// gcd(2, 5) = 1. Lines to close = 5.
// Expected points are on the circle radius 100.

const points = generateMaurerPolyline(circle, 5, 2);

console.log(`Generated ${points.length} points.`);

let allOnCircle = true;
points.forEach((p, i) => {
    const r = Math.sqrt(p.x * p.x + p.y * p.y);
    // Floating point tolerance
    if (Math.abs(r - 100) > 0.0001) {
        console.error(`Point ${i} not on circle! r=${r}`);
        allOnCircle = false;
    }
});

if (allOnCircle) {
    console.log("PASS: All points lie on the circle.");
} else {
    console.error("FAIL: Points deviated from circle.");
}

// Check closure logic
if (points.length === 6) { // 0 to 5 inclusive is 6 points? maurer.js loop is <= count
    console.log("PASS: Correct number of points generated (closed loop).");
} else {
    console.warn(`WARN: Expected 6 points (start+5 steps), got ${points.length}`);
}
