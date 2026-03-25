/**
 * Greatest Common Divisor
 */
export function gcd(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    if (b === 0) return a;
    return gcd(b, a % b);
}

/**
 * Extended GCD: returns { g, x, y } such that a·x + b·y = g = gcd(a,b).
 */
export function extendedGcd(a, b) {
    if (b === 0) return { g: a, x: 1, y: 0 };
    const { g, x: x1, y: y1 } = extendedGcd(b, a % b);
    return { g, x: y1, y: x1 - Math.floor(a / b) * y1 };
}

/**
 * Solve CRT: x ≡ r1 (mod m1), x ≡ r2 (mod m2).
 * Returns x in [0, lcm(m1,m2)) or null if no solution.
 */
export function solveCRT(r1, m1, r2, m2) {
    const { g, x: u } = extendedGcd(m1, m2);
    if ((r2 - r1) % g !== 0) return null;
    const lcm = m1 * m2 / g;
    return (((r1 + m1 * u * ((r2 - r1) / g)) % lcm) + lcm) % lcm;
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
 * Returns the number of lines required to close a Chordal Rosette.
 * formula: Z / gcd(D, Z) where Z is totalDivs and D is deg (step)
 */
export function getLinesToClose(totalDivs, step) {
    return totalDivs / gcd(step, totalDivs);
}

/**
 * Checks if a number is prime.
 */
export function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    let i = 5;
    while (i * i <= num) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
        i += 6;
    }
    return true;
}


