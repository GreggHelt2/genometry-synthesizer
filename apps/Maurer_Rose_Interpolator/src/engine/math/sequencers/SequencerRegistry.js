import { AdditiveGroupModuloNGenerator } from './AdditiveGroupModuloNGenerator.js';
import { MultiplicativeGroupModuloNGenerator } from './MultiplicativeGroupModuloNGenerator.js';

export const SequencerRegistry = {
    'Cyclic Additive Group Modulo N': AdditiveGroupModuloNGenerator,
    'Multiplicative Group Modulo N': MultiplicativeGroupModuloNGenerator,
    // Future: 'Fibonacci', etc.
};
