/**
 * CoincidentIndices.js
 * 
 * Algorithms for finding coincident indices in additive cyclic groups Z_n.
 * 
 * Given two sequences S_A(i) = (a₀ + i·gA) mod n and S_B(i) = (b₀ + i·gB) mod n,
 * a coincident index is an i where S_A(i) ≡ S_B(i) (mod n).
 * 
 * This reduces to solving the linear congruence: Δg·i ≡ Δb (mod n)
 * where Δg = gA - gB and Δb = b₀ - a₀.
 * 
 * Based on: "Algorithms for Coincident Indices in Additive Cyclic Modulo Groups, v9"
 */

import { gcd } from './MathOps.js';

// ─── Extended Euclidean Algorithm ────────────────────────

/**
 * Extended Euclidean Algorithm.
 * Finds integers x, y such that a·x + b·y = gcd(a, b).
 * 
 * @param {number} a
 * @param {number} b
 * @returns {{ gcd: number, x: number, y: number }}
 */
export function extendedGcd(a, b) {
    if (b === 0) return { gcd: a, x: 1, y: 0 };
    const result = extendedGcd(b, a % b);
    return {
        gcd: result.gcd,
        x: result.y,
        y: result.x - Math.floor(a / b) * result.y
    };
}

// ─── Linear Congruence Solver ────────────────────────────

/**
 * Solves the linear congruence a·i ≡ b (mod n) for all i in {0, …, n-1}.
 * 
 * @param {number} a - Coefficient (Δg)
 * @param {number} b - RHS (Δb)
 * @param {number} n - Modulus
 * @returns {number[] | null} Sorted array of all solutions, or null if none exist.
 */
export function solveLinearCongruence(a, b, n) {
    if (n <= 0) return null;

    // Normalize a and b into [0, n)
    a = ((a % n) + n) % n;
    b = ((b % n) + n) % n;

    if (a === 0) {
        // 0·i ≡ b (mod n) → solvable iff b ≡ 0 (mod n)
        if (b === 0) {
            // Every i is a solution
            const solutions = [];
            for (let i = 0; i < n; i++) solutions.push(i);
            return solutions;
        }
        return null;
    }

    const d = gcd(a, n);

    // Solvability: d must divide b
    if (b % d !== 0) return null;

    // Reduce: (a/d)·i ≡ (b/d) (mod n/d)
    const aReduced = a / d;
    const bReduced = b / d;
    const nReduced = n / d;

    // Find the modular inverse of aReduced mod nReduced via EEA
    const eea = extendedGcd(aReduced, nReduced);
    // eea.x is the inverse since gcd(aReduced, nReduced) = 1
    const inverse = ((eea.x % nReduced) + nReduced) % nReduced;

    // Primary solution
    const i0 = (inverse * bReduced) % nReduced;

    // All d solutions: i = i0 + k·(n/d) for k = 0, …, d-1
    const period = nReduced; // = n / d
    const solutions = [];
    for (let k = 0; k < d; k++) {
        solutions.push(i0 + k * period);
    }

    solutions.sort((x, y) => x - y);
    return solutions;
}

// ─── Core Coincident Index Functions ─────────────────────

/**
 * Finds all coincident indices between two additive sequences in Z_n.
 * 
 * S_A(i) = (startA + i·gA) mod n
 * S_B(i) = (startB + i·gB) mod n
 * 
 * @param {number} n - Group modulus (totalDivs)
 * @param {number} gA - Generator for sequence A (step)
 * @param {number} gB - Generator for sequence B (step)
 * @param {number} [startA=0] - Starting offset for A
 * @param {number} [startB=0] - Starting offset for B
 * @returns {number[]} Sorted array of coincident index positions
 */
export function findCoincidentIndices(n, gA, gB, startA = 0, startB = 0) {
    if (n <= 0) return [];

    const deltaG = gA - gB;   // Δg = gA - gB
    const deltaB = startB - startA;  // Δb = b₀ - a₀

    const result = solveLinearCongruence(deltaG, deltaB, n);
    return result || [];
}

/**
 * Fast coincidence count without computing all indices.
 * 
 * @param {number} n
 * @param {number} gA
 * @param {number} gB
 * @param {number} [startA=0]
 * @param {number} [startB=0]
 * @returns {number} Number of coincident indices
 */
export function getCoincidenceCount(n, gA, gB, startA = 0, startB = 0) {
    if (n <= 0) return 0;

    const deltaG = ((gA - gB) % n + n) % n;
    const deltaB = ((startB - startA) % n + n) % n;

    if (deltaG === 0) {
        return deltaB === 0 ? n : 0;
    }

    const d = gcd(deltaG, n);
    return (deltaB % d === 0) ? d : 0;
}

/**
 * Checks if g is a generator of Z_n (i.e., gcd(g, n) = 1).
 * 
 * @param {number} g
 * @param {number} n
 * @returns {boolean}
 */
export function isGenerator(g, n) {
    if (n <= 0) return false;
    g = ((g % n) + n) % n;
    return gcd(g, n) === 1;
}

/**
 * Returns all positive divisors of n as a sorted array.
 * 
 * @param {number} n
 * @returns {number[]}
 */
export function getDivisors(n) {
    if (n <= 0) return [];
    const divs = [];
    for (let i = 1; i * i <= n; i++) {
        if (n % i === 0) {
            divs.push(i);
            if (i !== n / i) divs.push(n / i);
        }
    }
    divs.sort((a, b) => a - b);
    return divs;
}

/**
 * Returns all generators of Z_n (integers in [1, n-1] coprime to n).
 * 
 * @param {number} n
 * @returns {number[]}
 */
export function getAllGenerators(n) {
    const gens = [];
    for (let g = 1; g < n; g++) {
        if (gcd(g, n) === 1) gens.push(g);
    }
    return gens;
}

// ─── Part A.1: Generators with any coincidence ───────────

/**
 * Finds all generators g' of Z_n that have at least one coincident index 
 * with the reference generator g (given offsets).
 * 
 * When startA = startB = 0: every g' ≠ g is valid (since gcd(g-g', n) ≥ 1
 * and Δb = 0 always satisfies the divisibility condition).
 * When offsets differ: filters by the solvability condition gcd(Δg, n) | Δb.
 * 
 * @param {number} n - Modulus
 * @param {number} g - Reference generator
 * @param {number} [startA=0] - Offset for the reference sequence
 * @param {number} [startB=0] - Offset for the candidate sequences
 * @returns {number[]} Array of valid generators
 */
export function findGeneratorsWithAnyCoincidence(n, g, startA = 0, startB = 0) {
    const deltaB = ((startB - startA) % n + n) % n;
    const results = [];

    for (let gPrime = 1; gPrime < n; gPrime++) {
        if (gcd(gPrime, n) !== 1) continue; // must be a generator
        if (gPrime === g) continue; // skip self

        const deltaG = ((g - gPrime) % n + n) % n;
        if (deltaG === 0) continue;

        const d = gcd(deltaG, n);
        if (deltaB % d === 0) {
            results.push(gPrime);
        }
    }

    return results;
}

// ─── Part A.2: Generators with exact coincidence count ───

/**
 * Targeted GCD Algorithm: finds all generators g' where the number of
 * coincident indices with g is exactly `count`.
 * 
 * Algorithm:
 * 1. Feasibility: count must divide n, and count must divide Δb
 * 2. Reduced modulus m = n / count
 * 3. Find all k coprime to m (coprimality ensures GCD is exactly count, not more)
 * 4. For each k: Δg = k · count, then g' = (g - Δg) mod n
 * 5. Filter: g' must be a generator of Z_n
 * 
 * @param {number} n - Modulus
 * @param {number} g - Reference generator
 * @param {number} count - Desired exact coincidence count
 * @param {number} [startA=0]
 * @param {number} [startB=0]
 * @returns {number[]} Array of valid generators
 */
export function findGeneratorsWithExactCount(n, g, count, startA = 0, startB = 0) {
    if (count <= 0 || n <= 0) return [];

    const deltaB = ((startB - startA) % n + n) % n;

    // Feasibility: count must divide n
    if (n % count !== 0) return [];

    // Feasibility: count must divide Δb
    if (deltaB % count !== 0) return [];

    const m = n / count; // reduced modulus
    const results = [];

    // Generate all k coprime to m (k in 1..m-1)
    // k=0 would give Δg=0, meaning g'=g (skip)
    for (let k = 1; k < m; k++) {
        if (gcd(k, m) !== 1) continue; // must be coprime to m

        const deltaG = k * count;
        const gPrime = ((g - deltaG) % n + n) % n;

        // g' must be a generator of Z_n
        if (gPrime === 0) continue;
        if (gcd(gPrime, n) !== 1) continue;

        // Double-check: verify coincidence count is exactly `count`
        // gcd(deltaG, n) should equal count since k is coprime to m = n/count
        // So deltaG = k·count and gcd(k·count, n) = count·gcd(k, n/count) = count·gcd(k,m) = count·1 = count
        results.push(gPrime);
    }

    // Also check the negative direction: g' = g + deltaG
    // Actually, the loop above already covers both directions because
    // k ranges over 1..m-1 and g' = (g - k·count) mod n wraps around.
    // But let's deduplicate just in case.
    const unique = [...new Set(results)];
    unique.sort((a, b) => a - b);
    return unique;
}

// ─── Part A.3: Generators in coincidence count range ─────

/**
 * Finds all generators g' where the coincidence count with g falls
 * within [minCount, maxCount].
 * 
 * Implementation: find all divisors d of n where minCount ≤ d ≤ maxCount,
 * then run findGeneratorsWithExactCount for each.
 * 
 * @param {number} n
 * @param {number} g
 * @param {number} minCount
 * @param {number} maxCount
 * @param {number} [startA=0]
 * @param {number} [startB=0]
 * @returns {Array<{generator: number, count: number}>}
 */
export function findGeneratorsInCountRange(n, g, minCount, maxCount, startA = 0, startB = 0) {
    const divisors = getDivisors(n);
    const results = [];

    for (const d of divisors) {
        if (d < minCount || d > maxCount) continue;

        const gens = findGeneratorsWithExactCount(n, g, d, startA, startB);
        for (const gPrime of gens) {
            results.push({ generator: gPrime, count: d });
        }
    }

    // Sort by generator value
    results.sort((a, b) => a.generator - b.generator);
    return results;
}

// ─── Part A.4: Generators for specific prescribed indices ─

/**
 * Simultaneous Coincidence Algorithm: finds generators g' that produce
 * coincidences at ALL of the specified indices.
 * 
 * Algorithm:
 * 1. For each pair of prescribed indices, the difference Δg must divide
 *    gcd(all index gaps, n).
 * 2. Let D = gcd(gaps, n). Then Δg = k·D for some integer k.
 * 3. Substitute into the anchor congruence and solve for k.
 * 4. Reconstruct g' and filter for generators.
 * 
 * @param {number} n - Modulus
 * @param {number} g - Reference generator
 * @param {number[]} indices - Prescribed coincident indices (at least one)
 * @param {number} [startA=0]
 * @param {number} [startB=0]
 * @returns {number[]} Array of valid generators
 */
export function findGeneratorsForSpecificIndices(n, g, indices, startA = 0, startB = 0) {
    if (!indices || indices.length === 0 || n <= 0) return [];

    const deltaB = ((startB - startA) % n + n) % n;

    if (indices.length === 1) {
        // Single index: solve Δg·i₀ ≡ Δb (mod n) for Δg
        // i.e., i₀·Δg ≡ Δb (mod n)
        const i0 = ((indices[0] % n) + n) % n;

        if (i0 === 0) {
            // Index 0: any Δg works as long as Δb ≡ 0 (mod n)
            // But we need ALL coincidences to include i=0, which means Δb ≡ 0 (mod gcd(Δg,n))
            // Since i=0: S_A(0) = startA, S_B(0) = startB. Coincidence iff startA ≡ startB (mod n).
            if (deltaB !== 0) return [];
            // Any generator g' ≠ g works (since i=0 is always a coincident index when Δb=0)
            return getAllGenerators(n).filter(gp => gp !== g);
        }

        // Solve: i0·Δg ≡ Δb (mod n)
        const solutions = solveLinearCongruence(i0, deltaB, n);
        if (!solutions) return [];

        const results = [];
        for (const deltaGVal of solutions) {
            const gPrime = ((g - deltaGVal) % n + n) % n;
            if (gPrime === 0) continue;
            if (gcd(gPrime, n) !== 1) continue;
            if (gPrime === g) continue;
            results.push(gPrime);
        }
        return [...new Set(results)].sort((a, b) => a - b);
    }

    // Multiple indices: use the Displacement-Difference Logic
    const anchor = ((indices[0] % n) + n) % n;

    // Calculate D = gcd of all (index_j - anchor) values, combined with n
    let D = n;
    for (let j = 1; j < indices.length; j++) {
        const gap = ((indices[j] - indices[0]) % n + n) % n;
        D = gcd(D, gap);
    }

    if (D === 0) {
        // All indices are the same — degenerate to single-index case
        return findGeneratorsForSpecificIndices(n, g, [indices[0]], startA, startB);
    }

    // Δg must be a multiple of D: Δg = k·D
    // Substitute into anchor congruence: (k·D)·anchor ≡ Δb (mod n)
    // i.e., (D·anchor)·k ≡ Δb (mod n)
    const coeff = (D * anchor) % n;
    const solutions = solveLinearCongruence(coeff, deltaB, n);

    if (!solutions) return [];

    const results = [];
    for (const k of solutions) {
        const deltaG = (k * D) % n;
        const gPrime = ((g - deltaG) % n + n) % n;

        if (gPrime === 0) continue;
        if (gcd(gPrime, n) !== 1) continue;
        if (gPrime === g) continue;

        // Verify that ALL prescribed indices are actually coincident
        // (The algebra should guarantee this, but verify for safety)
        let allMatch = true;
        for (const idx of indices) {
            const valA = ((startA + idx * g) % n + n) % n;
            const valB = ((startB + idx * gPrime) % n + n) % n;
            if (valA !== valB) {
                allMatch = false;
                break;
            }
        }

        if (allMatch) {
            results.push(gPrime);
        }
    }

    return [...new Set(results)].sort((a, b) => a - b);
}
