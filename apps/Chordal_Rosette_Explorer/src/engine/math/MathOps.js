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


