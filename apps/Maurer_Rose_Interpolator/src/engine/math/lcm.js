/**
 * Greatest Common Divisor
 */
export function gcd(a, b) {
    if (b === 0) return a;
    return gcd(b, a % b);
}

/**
 * Least Common Multiple
 */
export function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs((a * b) / gcd(a, b));
}

/**
 * Prime Factorization
 * Returns an array of prime factors.
 */
export function getPrimeFactors(n) {
    const factors = [];
    let d = 2;
    let temp = n;
    while (d * d <= temp) {
        while (temp % d === 0) {
            factors.push(d);
            temp /= d;
        }
        d++;
    }
    if (temp > 1) {
        factors.push(temp);
    }
    return factors;
}

/**
 * Returns a formatted string of prime factors.
 */
export function getPrimeFactorsString(n) {
    const factors = getPrimeFactors(n);
    if (factors.length === 0) return "1"; // Handle 1
    if (factors.length === 1) return "Prime";
    return factors.join(" x ");
}

/**
 * Returns the number of lines required to close a Maurer Rose.
 * formula: Z / gcd(D, Z) where Z is totalDivs and D is deg (step)
 */
export function getLinesToClose(totalDivs, step) {
    return totalDivs / gcd(step, totalDivs);
}

/**
 * Calculates the period multiplier for Rhodonea Curve closure.
 * Returns the number of (2 * PI) cycles needed to close the curve.
 */
export function calculateRhodoneaPeriodCycles(n, d) {
    if (d === 0) return 0;
    const commonDivisor = gcd(n, d);
    const n1 = n / commonDivisor;
    const d1 = d / commonDivisor;

    // Logic from prototype/papers:
    // If both n1 and d1 are odd, the period is PI (0.5 cycles).
    // Otherwise, the period is 2PI * d1 (d1 cycles? No, prototype returned d1/2 or d1).
    // Let's re-verify prototype logic:
    // return (n1 % 2 !== 0 && d1 % 2 !== 0) ? (d1 / 2) : d1;

    // If d1=1 (n=1, d=1 -> odd/odd) -> returns 0.5. Period = PI. Correct for circle?
    // r = sin(theta). Period is PI? Yes, circle is drawn in PI.
    // If n even, d odd (n=2, d=1) -> odd/odd? No. Returns d1 = 1. Period = 2PI. Correct (4 petals).

    return (n1 % 2 !== 0 && d1 % 2 !== 0) ? (d1 / 2) : d1;
}
