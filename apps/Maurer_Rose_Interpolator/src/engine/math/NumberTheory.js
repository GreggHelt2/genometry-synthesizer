/**
 * Number Theory Utilities
 * Includes precomputed caches for expensive operations like Euler's Totient function.
 */

// Global cache for totient values
let totientCache = null;
let maxCached = 0;

/**
 * Initializes the Euler's Totient cache using a sieve.
 * @param {number} max - The maximum number to precompute for.
 */
export function initTotientCache(max) {
    if (totientCache && max <= maxCached) return;

    // If expanding, we could preserve old values, but for now just re-init if larger needed
    // or just checking if existing cache is sufficient.

    // Initialize array with identity (phi(i) = i)
    // Uint32Array is efficient
    totientCache = new Uint32Array(max + 1);
    for (let i = 0; i <= max; i++) {
        totientCache[i] = i;
    }

    // Sieve logic
    for (let p = 2; p <= max; p++) {
        if (totientCache[p] === p) { // p is prime
            for (let i = p; i <= max; i += p) {
                // phi(i) = phi(i) * (1 - 1/p) = phi(i) - phi(i)/p
                totientCache[i] -= totientCache[i] / p;
            }
        }
    }

    maxCached = max;
    console.log(`[NumberTheory] Initialized Totient Cache for max=${max}`);
}

/**
 * Returns Euler's Totient function phi(n).
 * @param {number} n 
 * @returns {number}
 */
export function getTotient(n) {
    if (!totientCache || n > maxCached) {
        // Fallback: Initialize with a default substantial size or exact needed
        initTotientCache(Math.max(n, 10000));
    }
    return totientCache[n];
}

/**
 * Modular Exponentiation
 * Returns (base^exp) % mod
 */
export function modularPow(base, exp, mod) {
    let result = 1;
    base = base % mod;
    while (exp > 0) {
        if (exp % 2 === 1) result = (result * base) % mod;
        exp = Math.floor(exp / 2);
        base = (base * base) % mod;
    }
    return result;
}

/**
 * Checks if number is prime (simple check)
 */
export function isPrime(num) {
    if (num <= 1) return false;
    for (let i = 2, s = Math.sqrt(num); i <= s; i++)
        if (num % i === 0) return false;
    return true;
}
