import { gcd, getPrimeFactors } from './MathOps.js';

export class Generator {
    /**
     * Checks if a number includes specific prime factors we might want to avoid or target.
     * @param {number} n 
     */
    static isPrime(num) {
        for (let i = 2, s = Math.sqrt(num); i <= s; i++) {
            if (num % i === 0) return false;
        }
        return num > 1;
    }

    static getPrimes(min, max) {
        const primes = [];
        for (let i = min; i <= max; i++) {
            if (this.isPrime(i)) primes.push(i);
        }
        return primes;
    }

    /**
     * Generates parameters where n and d are distinct primes.
     * Often creates dense, high-frequency roses.
     */
    static generatePrimes(minVal = 2, maxVal = 100) {
        const primes = this.getPrimes(minVal, maxVal);
        const matches = [];

        for (let i = 0; i < primes.length; i++) {
            for (let j = i + 1; j < primes.length; j++) {
                // n and d are distinct primes
                matches.push({ n: primes[i], d: primes[j] });
                matches.push({ n: primes[j], d: primes[i] });
            }
        }

        return matches;
    }

    /**
     * Generates parameters where n and d are Twin Primes (difference of 2).
     * Creates roses with specific symmetry.
     */
    static generateTwinPrimes(minVal = 2, maxVal = 150) {
        const primes = this.getPrimes(minVal, maxVal);
        const matches = [];

        for (let i = 0; i < primes.length - 1; i++) {
            if (primes[i + 1] - primes[i] === 2) {
                matches.push({ n: primes[i], d: primes[i + 1] });
                matches.push({ n: primes[i + 1], d: primes[i] });
            }
        }

        return matches;
    }

    /**
     * Generates parameters based on Fibonacci sequence.
     * Uses Golden Ratio approximations.
     */
    static generateFibonacci(maxVal = 200) {
        const fib = [1, 2];
        let next = 3;
        while (next <= maxVal) {
            fib.push(next);
            next = fib[fib.length - 1] + fib[fib.length - 2];
        }

        const matches = [];
        for (let i = 0; i < fib.length - 1; i++) {
            // Adjacent Fibonacci numbers are coprime
            matches.push({ n: fib[i], d: fib[i + 1] });
            matches.push({ n: fib[i + 1], d: fib[i] });
        }
        return matches;
    }

    /**
     * Generates parameters that ensure 'Perfect Closure'.
     * Ideally where gcd(n, d) = 1 (coprime) for single loops,
     * or specific ratios for multi-loop patterns.
     */
    static generatePerfect(limit = 100) {
        const matches = [];
        // Randomly sample coprimes
        for (let i = 0; i < 50; i++) {
            const n = Math.floor(Math.random() * limit) + 2;
            const d = Math.floor(Math.random() * limit) + 2;
            if (gcd(n, d) === 1) {
                matches.push({ n, d });
            }
        }
        return matches;
    }

    static getRandomMatch(type = 'perfect') {
        let pool = [];
        switch (type) {
            case 'primes': pool = this.generatePrimes(3, 100); break;
            case 'twin': pool = this.generateTwinPrimes(3, 200); break;
            case 'fib': pool = this.generateFibonacci(200); break;
            case 'perfect': pool = this.generatePerfect(150); break;
            default: pool = this.generatePerfect(100);
        }
        if (pool.length === 0) return { n: 29, d: 31 }; // Fallback
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
