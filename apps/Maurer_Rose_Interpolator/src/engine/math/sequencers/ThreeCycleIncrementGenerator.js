import { Sequencer } from './Sequencer.js';
import { gcd } from '../MathOps.js';

/**
 * 3-Cycle Increment Sequencer.
 * Defined by three increments A, B, and C that cycle sequentially.
 * s_0 = start
 * s_1 = s_0 + A
 * s_2 = s_1 + B
 * s_3 = s_2 + C
 * s_4 = s_3 + A
 * ...
 */
export class ThreeCycleIncrementGenerator extends Sequencer {
    generate(n, start, params) {
        const stepA = params.incrementA ?? 1;
        const stepB = params.incrementB ?? 2;
        const stepC = params.incrementC ?? 3;

        const seq = [];
        let current = start;
        let phase = 0; // 0->A, 1->B, 2->C

        // Safety cap: The max period is 3*n.
        const maxSteps = 3 * n + 100;

        for (let i = 0; i < maxSteps; i++) {
            seq.push(current);

            // Update state
            let inc;
            if (phase === 0) inc = stepA;
            else if (phase === 1) inc = stepB;
            else inc = stepC;

            current = (current + inc) % n;
            phase = (phase + 1) % 3;

            // Check closure: Back to (start, phase=0)
            if (current === start && phase === 0) {
                // Determine loop closure logic (same as AIS, push final point if connection is needed)
                seq.push(current);
                break;
            }
        }

        return seq;
    }

    /**
     * Effective step over a full period (3 steps) is D = A + B + C.
     */
    getCosets(n, params) {
        const stepA = params.incrementA ?? 1;
        const stepB = params.incrementB ?? 2;
        const stepC = params.incrementC ?? 3;
        const effectiveStep = stepA + stepB + stepC;

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
                step: 1,
                default: 1
            },
            {
                key: 'incrementB',
                label: 'Increment B',
                type: 'slider',
                min: 1,
                max: 360,
                step: 1,
                default: 2
            },
            {
                key: 'incrementC',
                label: 'Increment C',
                type: 'slider',
                min: 1,
                max: 360,
                step: 1,
                default: 3
            }
        ];
    }
}
