import { Sequencer } from './Sequencer.js';
import { modularPow, getTotient, initTotientCache } from '../NumberTheory.js';
import { gcd } from '../MathOps.js';

// Ensure cache is initialized
initTotientCache(10000);

/**
 * Multiplicative Group Modulo N Generator.
 * Sequence: g^0, g^1, g^2, ... mod n
 * 
 * Ideally used when gcd(g, n) = 1, but handles general case by just computing powers.
 */
export class MultiplicativeGroupModuloNGenerator extends Sequencer {
    generate(n, start, params) {
        const generator = params.generator || 2;
        const seed = params.seed ?? 1;

        // Safety
        if (n < 2) return [0];

        // Generate sequence
        // We accumulate values until we hit a cycle or limit
        // Using a Set to detect cycles is easy and robust

        let seq = [];
        let val = seed % n;
        const visited = new Set();

        // Safety cap for performance, though typically cycles are <= n
        const LIMIT = Math.min(n * 2, 100000);

        for (let i = 0; i < LIMIT; i++) {
            if (visited.has(val)) {
                // If we return to the start, close the loop
                // (Only for simple cycles; if we crash into a 'tail' like rho, we might not want to close to start)
                // In multiplicative groups (finite), it's always pure cycles if we ignore 0 cases appropriately?
                // Actually, if val === seq[0], we close.
                if (seq.length > 0 && val === seq[0]) {
                    seq.push(val);
                }
                break;
            }
            visited.add(val);
            seq.push(val);

            // Next value: (val * g) % n
            val = (val * generator) % n;
        }

        return seq;
    }

    getParamsSchema() {
        return [
            {
                key: 'generator',
                label: 'Generator (g)',
                type: 'slider',
                min: 1,
                max: 100, // Can be typically up to N, but UI slider needs fixed max? 
                // Or we make it relative? For now fixed range is fine.
                step: 1,
                default: 2
            },
            {
                key: 'seed',
                label: 'Seed (Start)',
                type: 'slider',
                min: 1,
                max: 100,
                step: 1,
                default: 1
            }
        ];
    }
}
