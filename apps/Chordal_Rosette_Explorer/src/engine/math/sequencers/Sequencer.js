/**
 * Base class for all Sequencers.
 * Sequencers determine the order in which integer points (0..n-1) are visited
 * to form the chords of a rosette.
 */
export class Sequencer {
    constructor() {
        if (this.constructor === Sequencer) {
            throw new Error('Abstract class "Sequencer" cannot be instantiated directly.');
        }
    }

    /**
     * Generates a sequence of integers.
     * @param {number} n - The modulo/total divisions (size of the group).
     * @param {number} start - The starting index (offset).
     * @param {Object} params - Additional parameters specific to the sequencer.
     * @returns {number[]} Array of integer values.
     */
    generate(n, start, params) {
        throw new Error('Method "generate" must be implemented.');
    }

    /**
     * Optional: Returns all disjoint coset seeds (indices) for "Show All" logic.
     * If not implemented, Renderer might fallback to GCD logic or single offset.
     * @returns {number[]|null} Array of seeds or null.
     */
    getCosets(n, params) {
        return null;
    }

    /**
     * Returns the schema for UI generation.
     * @returns {Array<{key: string, label: string, type: string, min: number, max: number, step: number, default: number}>}
     */
    getParamsSchema() {
        return [];
    }
}
