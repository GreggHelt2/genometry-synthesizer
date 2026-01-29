import { isPrime, gcd, getLinesToClose } from './MathOps.js';

export class RelativesFinder {
    /**
     * Finds the next/prev/random relative based on the current value and relationship type.
     * @param {number} currentVal - The current Generator (d) value.
     * @param {string} type - 'prime', 'twin', 'cousin', 'ltc'.
     * @param {string} direction - 'next', 'prev', 'random'.
     * @param {number} totalDivs - N (for LTC calculations).
     * @param {number} maxVal - Maximum range to search (e.g., N).
     * @returns {number|null} - The found value or null if none found.
     */
    static findRelative(currentVal, type, direction, totalDivs, maxVal = 360) {
        switch (type) {
            case 'prime':
                return this.findPrime(currentVal, direction, maxVal);
            case 'twin':
                return this.findTwinPrime(currentVal, direction, maxVal);
            case 'cousin':
                return this.findCousinPrime(currentVal, direction, maxVal);
            case 'ltc':
                return this.findExampleWithSameLTC(currentVal, direction, totalDivs, maxVal);
            default:
                return null;
        }
    }

    static findPrime(current, direction, max) {
        if (direction === 'random') {
            // Random prime within range
            const primes = [];
            for (let i = 2; i < max; i++) {
                if (isPrime(i)) primes.push(i);
            }
            if (primes.length === 0) return current;
            return primes[Math.floor(Math.random() * primes.length)];
        }

        let step = direction === 'next' ? 1 : -1;
        let check = current + step;

        while (check > 1 && check < max * 2) { // Allow going slightly above max
            if (isPrime(check)) return check;
            check += step;
        }
        return current; // Return original if limits hit
    }

    static findTwinPrime(current, direction, max) {
        // Twin primes are pairs (p, p+2) both prime.
        // We look for a p such that (p, p+2) are twin primes.
        // Or should we assume 'current' is one of them?
        // Prototype behavior: Navigates to the next number that is part of a twin pair.

        let step = direction === 'next' ? 1 : -1;
        let check = current + step;

        // Random logic
        if (direction === 'random') {
            const twins = [];
            for (let i = 2; i < max; i++) {
                if (isPrime(i) && isPrime(i + 2)) twins.push(i);
                // Also i+2 is part of it, but usually we list the start
            }
            if (twins.length === 0) return current;
            return twins[Math.floor(Math.random() * twins.length)];
        }

        while (check > 1 && check < max * 2) {
            // To be "in" a twin pair, either (check, check+2) is prime pair OR (check-2, check) is prime pair
            // But usually navigating means "jump to a number that represents a twin prime configuration"
            // Let's assume we just want to find p such that p is prime and p+2 is prime (or p-2).
            // Simple definition: Is this number a twin prime?
            if (this.isTwinPrime(check)) return check;
            check += step;
        }
        return current;
    }

    static isTwinPrime(n) {
        if (!isPrime(n)) return false;
        return isPrime(n + 2) || isPrime(n - 2);
    }

    static findCousinPrime(current, direction, max) {
        // Cousin primes: (p, p+4)
        let step = direction === 'next' ? 1 : -1;
        if (direction === 'random') {
            const cousins = [];
            for (let i = 2; i < max; i++) {
                if (this.isCousinPrime(i)) cousins.push(i);
            }
            return cousins.length ? cousins[Math.floor(Math.random() * cousins.length)] : current;
        }

        let check = current + step;
        while (check > 1 && check < max * 2) {
            if (this.isCousinPrime(check)) return check;
            check += step;
        }
        return current;
    }

    static isCousinPrime(n) {
        if (!isPrime(n)) return false;
        return isPrime(n + 4) || isPrime(n - 4);
    }

    static findExampleWithSameLTC(current, direction, totalDivs, max) {
        const targetLTC = getLinesToClose(totalDivs, current);

        // Find all numbers < max that result in this LTC
        const matches = [];
        for (let i = 1; i < max; i++) {
            // Skip current if not random? No, logic below handles nav
            if (getLinesToClose(totalDivs, i) === targetLTC) {
                matches.push(i);
            }
        }

        if (matches.length === 0) return current;

        if (direction === 'random') {
            return matches[Math.floor(Math.random() * matches.length)];
        }

        // Sort matches to ensure order
        matches.sort((a, b) => a - b);

        const currentIndex = matches.indexOf(current);
        if (currentIndex === -1) {
            // If current isn't in list (maybe > max?), just pick closest or first
            return matches[0];
        }

        if (direction === 'next') {
            const nextIdx = (currentIndex + 1) % matches.length;
            return matches[nextIdx];
        } else {
            const prevIdx = (currentIndex - 1 + matches.length) % matches.length;
            return matches[prevIdx];
        }
    }
}
