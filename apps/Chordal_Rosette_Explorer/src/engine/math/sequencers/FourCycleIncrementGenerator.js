import { Sequencer } from './Sequencer.js';
import { gcd } from '../MathOps.js';

/**
 * 4-Cycle Increment Sequencer.
 * Defined by four increments A, B, C, and D that cycle sequentially.
 */
export class FourCycleIncrementGenerator extends Sequencer {
    generate(n, start, params) {
        const stepA = params.incrementA ?? 1;
        const stepB = params.incrementB ?? 2;
        const stepC = params.incrementC ?? 3;
        const stepD = params.incrementD ?? 4;

        const seq = [];
        let current = start;
        let phase = 0; // 0->A, 1->B, 2->C, 3->D

        // Safety cap
        const maxSteps = 4 * n + 100;

        for (let i = 0; i < maxSteps; i++) {
            seq.push(current);

            // Update state
            let inc;
            if (phase === 0) inc = stepA;
            else if (phase === 1) inc = stepB;
            else if (phase === 2) inc = stepC;
            else inc = stepD;

            current = (current + inc) % n;
            phase = (phase + 1) % 4;

            // Check closure: (start, phase=0)
            if (current === start && phase === 0) {
                seq.push(current);
                break;
            }
        }

        return seq;
    }

    getCosets(n, params) {
        const stepA = params.incrementA ?? 1;
        const stepB = params.incrementB ?? 2;
        const stepC = params.incrementC ?? 3;
        const stepD = params.incrementD ?? 4;
        const effectiveStep = stepA + stepB + stepC + stepD;

        const k = gcd(n, effectiveStep);
        const cosets = [];
        for (let i = 0; i < k; i++) {
            cosets.push(i);
        }
        return cosets;
    }

    getParamsSchema() {
        return [
            { key: 'incrementA', label: 'Increment A', type: 'slider', min: 1, max: 360, step: 1 },
            { key: 'incrementB', label: 'Increment B', type: 'slider', min: 1, max: 360, step: 1 },
            { key: 'incrementC', label: 'Increment C', type: 'slider', min: 1, max: 360, step: 1 },
            { key: 'incrementD', label: 'Increment D', type: 'slider', min: 1, max: 360, step: 1 }
        ];
    }
}
