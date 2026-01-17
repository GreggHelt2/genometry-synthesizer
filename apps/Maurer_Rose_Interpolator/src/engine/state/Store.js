import { DEFAULTS } from '../../config/defaults.js';
import { ACTIONS } from './Actions.js';

class Store {
    constructor() {
        // I need to check defaults.js first. I will abort this tool call and view defaults.js instead.
        this.state = JSON.parse(JSON.stringify(DEFAULTS));
        this.listeners = new Set();
        this.isDirty = true; // Initial render required
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    dispatch(action) {
        const prevState = this.state;
        this.state = this.reducer(this.state, action);

        if (this.state !== prevState) {
            this.isDirty = true;
            this.notify();
        }
    }

    reducer(state, action) {
        switch (action.type) {
            case ACTIONS.UPDATE_ROSE_A:
                return {
                    ...state,
                    roseA: { ...state.roseA, ...action.payload }
                };
            case ACTIONS.UPDATE_ROSE_B:
                return {
                    ...state,
                    roseB: { ...state.roseB, ...action.payload }
                };
            case ACTIONS.UPDATE_INTERPOLATION:
                return {
                    ...state,
                    interpolation: { ...state.interpolation, ...action.payload }
                };
            case ACTIONS.UPDATE_SETTINGS:
                return {
                    ...state,
                    settings: { ...state.settings, ...action.payload }
                };
            case ACTIONS.SET_PLAYING:
                return {
                    ...state,
                    app: { ...state.app, isPlaying: action.payload }
                };
            case ACTIONS.SET_RECORDING:
                return {
                    ...state,
                    app: { ...state.app, isRecording: action.payload }
                };
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
}

// Singleton instance
export const store = new Store();
