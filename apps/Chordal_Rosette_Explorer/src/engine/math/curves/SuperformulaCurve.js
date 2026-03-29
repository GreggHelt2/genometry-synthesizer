import { Curve } from './Curve.js';

export class SuperformulaCurve extends Curve {
    /**
     * @param {Object} params
     * @param {number} params.m - Symmetry parameter (integers create stars/polygons)
     * @param {number} params.n1 - Shape control 1
     * @param {number} params.n2 - Shape control 2
     * @param {number} params.n3 - Shape control 3
     * @param {number} params.a - Axis A scale (inner math)
     * @param {number} params.b - Axis B scale (inner math)
     * @param {number} params.A - Amplitude/Scale (default 100)
     * @param {number} params.rot - Rotation in degrees
     */
    constructor(params = {}) {
        super();
        this.m = params.m;
        this.n1 = params.n1;
        this.n2 = params.n2;
        this.n3 = params.n3;
        this.a = params.a;
        this.b = params.b;
        this.A = params.A;
        this.rot = params.rot;
    }

    getPoint(theta) {
        // Superformula:
        // r = ( |cos(m*theta/4)/a|^n2 + |sin(m*theta/4)/b|^n3 ) ^ (-1/n1)

        const { m, n1, n2, n3, a, b, A, rot } = this;

        // Safety for zeroes
        const safeA = a === 0 ? 1 : a;
        const safeB = b === 0 ? 1 : b;
        const safeN1 = n1 === 0 ? 1 : n1;

        const part1 = Math.abs(Math.cos(m * theta / 4) / safeA);
        const part2 = Math.abs(Math.sin(m * theta / 4) / safeB);

        const r = Math.pow(Math.pow(part1, n2) + Math.pow(part2, n3), -1 / safeN1);

        // Convert polar r, theta to Cartesian
        // Scale by A/100 to normalize (assuming A=100 is standard)
        // But also check validity of r.

        const scale = this.A; // Usually Superformula produces r around 1.0 (if a,b=1). So scaling by A directly makes sense.
        // Wait, other curves use A=100 as 1.0 scale.
        // If 'r' here is normally ~1.0, then x = r * cos(theta) is ~1.0. 
        // We want screen size ~100-200. So multiplying by A directly (def 100) fits perfectly.

        let x = scale * r * Math.cos(theta);
        let y = scale * r * Math.sin(theta);

        // Apply Rotation
        if (rot !== 0) {
            const rotRad = (rot * Math.PI) / 180;
            const cosRot = Math.cos(rotRad);
            const sinRot = Math.sin(rotRad);

            const tx = x * cosRot - y * sinRot;
            const ty = x * sinRot + y * cosRot;
            x = tx;
            y = ty;
        }

        return { x, y };
    }

    getRadiansToClosure() {
        // The superformula uses the internal angle φ = m·θ/4.
        // For the curve to close, BOTH the physical angle (cos θ, sin θ) AND the
        // internal angle (cos φ, sin φ) must return to their starting values.
        //
        // The internal expression is f(φ) = |cos(φ)/a|^n2 + |sin(φ)/b|^n3.
        // Due to absolute values, f always has period π.
        // f has the shorter period π/2 ONLY when a=b AND n2=n3, because then
        // f(φ+π/2) = |sin/a|^n2 + |cos/a|^n2 = f(φ).
        // When n2≠n3 (even with a=b), swapping cos↔sin changes the exponents,
        // so the internal function is NOT π/2-symmetric.
        //
        // Physical closure: θ = 2π·k (k full rotations)
        // Internal closure: φ = m·2πk/4 = mπk/2 must be a multiple of the
        //   internal period:
        //   - Period π/2 (a=b, n2=n3): need mk/2 ∈ ½Z → mk ∈ Z → k=1 always works
        //   - Period π   (general):    need mk/2 ∈ Z
        //     • m even → k=1 works (2π)
        //     • m odd  → k=2 needed (4π)
        //   - m=0: curve is a circle (2π)

        const { m, a, b, n2, n3 } = this;
        const EPS = 1e-9;

        if (Math.abs(m) < EPS) {
            // m=0: r is constant, circle
            return 2 * Math.PI;
        }

        // Full π/2 symmetry: a≈b AND n2≈n3
        // In this case |cos/a|^n2 + |sin/a|^n2 is invariant under φ→φ+π/2,
        // so 2π always suffices for any m.
        if (Math.abs(a - b) < EPS && Math.abs(n2 - n3) < EPS) {
            return 2 * Math.PI;
        }

        // For a ≠ b: we need m·k/2 to be an integer.
        // Handle rational m by expressing as p/q in lowest terms.
        // Then m·k/2 = p·k/(2·q), which is an integer when k = 2·q/gcd(p, 2·q).
        // For integer m (q=1): even m → k=1, odd m → k=2.

        // Approximate rational decomposition for m
        // Use a simple continued-fraction approach to find p/q
        const { p, q } = this._toRational(Math.abs(m));

        // We need p·k/(2·q) to be an integer → k = 2·q / gcd(p, 2·q)
        const g = this._gcd(p, 2 * q);
        const k = (2 * q) / g;

        return k * 2 * Math.PI;
    }

    /** Helper: greatest common divisor */
    _gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) { [a, b] = [b, a % b]; }
        return a;
    }

    /** Helper: approximate a positive number as p/q (lowest terms) */
    _toRational(x, tolerance = 1e-8, maxIter = 20) {
        // Check if x is very close to an integer first
        const rounded = Math.round(x);
        if (Math.abs(x - rounded) < tolerance) {
            return { p: rounded, q: 1 };
        }

        // Stern-Brocot / mediants approach
        let a = Math.floor(x), b = 1;
        let c = a + 1, d = 1;

        for (let i = 0; i < maxIter; i++) {
            const medP = a + c;
            const medQ = b + d;
            const medVal = medP / medQ;

            if (Math.abs(medVal - x) < tolerance) {
                const g = this._gcd(medP, medQ);
                return { p: medP / g, q: medQ / g };
            }

            if (medVal < x) {
                a = medP;
                b = medQ;
            } else {
                c = medP;
                d = medQ;
            }
        }

        // Fallback: use whichever bound is closer
        const lVal = a / b;
        const rVal = c / d;
        if (Math.abs(lVal - x) < Math.abs(rVal - x)) {
            const g = this._gcd(a, b);
            return { p: a / g, q: b / g };
        } else {
            const g = this._gcd(c, d);
            return { p: c / g, q: d / g };
        }
    }

    getSignature() {
        return `Superformula:${this.m}:${this.n1}:${this.n2}:${this.n3}:${this.a}:${this.b}:${this.A}:${this.rot}`;
    }

    static getParamsSchema() {
        return [
            { key: 'm', type: 'number', label: 'Symmetry (m)', min: 0, max: 20, step: 0.1 },
            { key: 'n1', type: 'number', label: 'Shape n1', min: 0.1, max: 50, step: 0.1 },
            { key: 'n2', type: 'number', label: 'Shape n2', min: 0.1, max: 50, step: 0.1 },
            { key: 'n3', type: 'number', label: 'Shape n3', min: 0.1, max: 50, step: 0.1 },
            { key: 'a', type: 'number', label: 'Axis a', min: 0.1, max: 10, step: 0.1 },
            { key: 'b', type: 'number', label: 'Axis b', min: 0.1, max: 10, step: 0.1 },
            { key: 'A', type: 'number', label: 'Amplitude', min: 0, max: 300, step: 1 },
            { key: 'rot', type: 'number', label: 'Rotation', min: 0, max: 360, step: 1 }
        ];
    }
}
