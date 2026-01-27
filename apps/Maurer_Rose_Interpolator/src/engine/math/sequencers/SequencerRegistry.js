import { AdditiveGroupModuloNGenerator } from './AdditiveGroupModulaNGenerator.js';
import { MultiplicativeGroupModuloNGenerator } from './MultiplicativeGroupModuloNGenerator.js';

export const SequencerRegistry = {
    'Cyclic Additive Group Modulo N': AdditiveGroupModuloNGenerator,
    'Multiplicative Group Modulo N': MultiplicativeGroupModuloNGenerator,
    // Future: 'Fibonacci', etc.
};
