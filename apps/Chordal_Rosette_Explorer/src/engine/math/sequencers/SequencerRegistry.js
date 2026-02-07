import { AdditiveGroupModuloNGenerator } from './AdditiveGroupModuloNGenerator.js';
import { MultiplicativeGroupModuloNGenerator } from './MultiplicativeGroupModuloNGenerator.js';
import { AlternatingIncrementGenerator } from './AlternatingIncrementGenerator.js';
import { ThreeCycleIncrementGenerator } from './ThreeCycleIncrementGenerator.js';
import { FourCycleIncrementGenerator } from './FourCycleIncrementGenerator.js';

export const SequencerRegistry = {
    'Cyclic Additive Group Modulo N': AdditiveGroupModuloNGenerator,
    'Multiplicative Group Modulo N': MultiplicativeGroupModuloNGenerator,
    'Alternating Increment Sequencer': AlternatingIncrementGenerator,
    '3-Cycle Increment Sequencer': ThreeCycleIncrementGenerator,
    '4-Cycle Increment Sequencer': FourCycleIncrementGenerator,
    // Future: 'Fibonacci', etc.
};
