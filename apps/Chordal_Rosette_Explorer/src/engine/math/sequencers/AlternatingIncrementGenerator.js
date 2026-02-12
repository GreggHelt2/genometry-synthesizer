import { Sequencer } from './Sequencer.js';
import { gcd } from '../MathOps.js';

/**
 * Alternating Increment Sequencer (AIS).
 * Defined by two increments A and B that alternate.
 * s_0 = start
 * s_1 = s_0 + A
 * s_2 = s_1 + B
 * s_3 = s_2 + A
 * ...
 */
export class AlternatingIncrementGenerator extends Sequencer {
    generate(n, start, params) {
        const stepA = params.incrementA ?? 1;
        const stepB = params.incrementB ?? 2;

        const seq = [];
        let current = start;
        let phase = 0; // 0 for adding A, 1 for adding B

        // Safety cap: The max period of a state machine (val, phase) is 2*n.
        // We add a minimal buffer just in case.
        const maxSteps = 2 * n + 10;

        for (let i = 0; i < maxSteps; i++) {
            seq.push(current);

            // Update state
            const inc = (phase === 0) ? stepA : stepB;
            current = (current + inc) % n;
            phase = 1 - phase;

            // Check closure: Back to (start, phase=0)
            if (current === start && phase === 0) {
                // We add the 'closing' point to complete the visual polygon 
                // (matching standard behavior which often includes the wrapper point)
                // However, standard Additive sequencer usually generates n/gcd points.
                // The renderer often draws lines between points.
                // If we want a closed loop, we usually include the start point again at the end,
                // OR the renderer handles 'closePath'. 
                // Looking at AdditiveGroupModuloNGenerator.js:
                // It does `for (let i = 0; i <= count; i++)`, pushing `start + i*step`.
                // It pushes the final point which equals start (mod n).
                // So we should push 'current' (which is 'start') one last time and break.
                seq.push(current);
                break;
            }
        }

        return seq;
    }

    /**
     * For AIS, the "effective step" over a full period (2 steps) is D = A + B.
     * The sequence decomposes into two interleaved affine cosets of step D.
     * The "pseudo-cosets" of the AIS are generally determined by gcd(n, A+B).
     * Returns offsets [0, 1, ... k-1] where k = gcd(n, A+B).
     */
    getCosets(n, params) {
        const stepA = params.incrementA ?? 1;
        const stepB = params.incrementB ?? 2;
        const effectiveStep = stepA + stepB;

        const k = gcd(n, effectiveStep);
        const cosets = [];
        for (let i = 0; i < k; i++) {
            cosets.push(i);
        }
        return cosets;
    }

    getParamsSchema() {
        return [
            {
                key: 'incrementA',
                label: 'Increment A',
                type: 'slider',
                min: 1,
                max: 360,
                step: 1
            },
            {
                key: 'incrementB',
                label: 'Increment B',
                type: 'slider',
                min: 1,
                max: 360,
                step: 1
            }
        ];
    }
}
