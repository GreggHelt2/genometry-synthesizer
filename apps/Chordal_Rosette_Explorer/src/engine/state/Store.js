import { DEFAULTS } from '../../config/defaults.js';
import { ACTIONS } from './Actions.js';

/**
 * Immutably set a value at an arbitrary depth in a nested object.
 * @param {object} state - root state
 * @param {string[]} path  - e.g. ['rosetteA', 'stroke', 'opacity']
 * @param {*} value
 * @returns {object} new state with the value set
 */
function setDeep(state, path, value) {
    if (path.length === 0) return value;

    const [head, ...rest] = path;
    const child = state ? state[head] : undefined;

    return {
        ...state,
        [head]: rest.length === 0
            ? value
            : setDeep(child !== undefined ? child : {}, rest, value)
    };
}

/**
 * Shallow-merge a payload into a specific top-level slice.
 * Used by legacy UPDATE_ROSETTE_A / B / HYBRID actions during migration.
 */
function shallowMergeSlice(state, sliceKey, payload) {
    return {
        ...state,
        [sliceKey]: { ...state[sliceKey], ...payload }
    };
}

class Store {
    constructor(initialState = null) {
        this.state = initialState ? initialState : JSON.parse(JSON.stringify(DEFAULTS));
        this.listeners = new Set();
        this.isDirty = true;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(action) {
        this.listeners.forEach(listener => listener(this.state, action));
    }

    dispatch(action) {
        const prevState = this.state;
        this.state = this.reducer(this.state, action);

        if (this.state !== prevState) {
            this.isDirty = true;
            this.notify(action);
        }
    }

    reducer(state, action) {
        switch (action.type) {

            // ─── v3.0 primary action ─────────────────────
            case ACTIONS.SET_DEEP:
                return setDeep(state, action.path, action.value);

            // ─── Legacy (backward compatibility) ─────────
            case ACTIONS.UPDATE_ROSETTE_A:
                return shallowMergeSlice(state, 'rosetteA', action.payload);
            case ACTIONS.UPDATE_ROSETTE_B:
                return shallowMergeSlice(state, 'rosetteB', action.payload);
            case ACTIONS.UPDATE_HYBRID:
                return shallowMergeSlice(state, 'hybrid', action.payload);
            case ACTIONS.UPDATE_SETTINGS:
                return shallowMergeSlice(state, 'settings', action.payload);
            case ACTIONS.SET_RECORDING:
                return setDeep(state, ['app', 'isRecording'], action.payload);

            default:
                return state;
        }
    }

    getState() {
        return this.state;
    }

    clearDirty() {
        this.isDirty = false;
    }

    hydrate(newState) {
        this.state = newState;
        this.isDirty = true;
        this.notify();
    }

    /** Reset all state to factory defaults */
    reset() {
        this.state = JSON.parse(JSON.stringify(DEFAULTS));
        this.isDirty = true;
        this.notify({ type: 'RESET' });
    }
}

// Singleton instance
export const store = new Store();
