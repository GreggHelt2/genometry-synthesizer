import { AdditiveGroupModuloNGenerator } from './AdditiveGroupModuloNGenerator.js';
import { MultiplicativeGroupModuloNGenerator } from './MultiplicativeGroupModuloNGenerator.js';
import { AlternatingIncrementGenerator } from './AlternatingIncrementGenerator.js';

export const SequencerRegistry = {
    'Cyclic Additive Group Modulo N': AdditiveGroupModuloNGenerator,
    'Multiplicative Group Modulo N': MultiplicativeGroupModuloNGenerator,
    'Alternating Increment Sequencer': AlternatingIncrementGenerator,
    // Future: 'Fibonacci', etc.
};
