import { DEFAULTS } from '../../config/defaults.js';
import { store } from './Store.js';
import { linkManager } from '../logic/LinkManager.js';

const STORAGE_KEY = 'chordal_rosette_state_v2_1';
const DEBOUNCE_MS = 1000;

export class PersistenceManager {
    constructor() {
        this.saveTimeout = null;
        this.stateProviders = new Map(); // key -> providerFn

        // Ensure pending saves are flushed on unload
        window.addEventListener('beforeunload', () => {
            if (this.saveTimeout) {
                this.forceSave();
            }
        });
    }

    /**
     * Registers a state provider.
     * @param {string} key - Top level key in saved JSON (e.g. 'animations')
     * @param {Function} providerFn - Returns serializable object
     */
    registerStateProvider(key, providerFn) {
        this.stateProviders.set(key, providerFn);
    }

    /**
     * Deep merges source object into target object.
     * Only merges if keys match or are new.
     * Arrays are overwritten, not merged.
     */
    deepMerge(target, source) {
        if (!source || typeof source !== 'object') return target;
        if (!target || typeof target !== 'object') return source;

        const output = { ...target };

        Object.keys(source).forEach(key => {
            const sourceVal = source[key];
            const targetVal = target[key];

            if (Array.isArray(sourceVal)) {
                // Determine if we should replace or merge arrays?
                // For this app (links, etc), replacing usually makes sense 
                // but let's see. If defaults has an array and user has an array, user wins.
                // If defaults key is an object and user is object, recurse.
                output[key] = sourceVal;
            } else if (sourceVal && typeof sourceVal === 'object') {
                if (targetVal && typeof targetVal === 'object') {
                    output[key] = this.deepMerge(targetVal, sourceVal);
                } else {
                    output[key] = sourceVal;
                }
            } else {
                output[key] = sourceVal;
            }
        });

        return output;
    }

    /**
     * Loads state from localStorage and merges with DEFAULTS.
     * Returns { state, links, ...providers } or null.
     */
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                console.log('[PersistenceManager] No saved state found. Using defaults.');
                return null;
            }

            const savedData = JSON.parse(raw);

            // 1. Merge State
            // We take DEFAULTS as the base, and merge savedState ON TOP.
            // But wait, my deepMerge implementation above (target, source) 
            // treats 'source' as the overrides.
            // So we want deepMerge(DEFAULTS, savedData.state).
            // HOWEVER, we must be careful not to mutate DEFAULTS.

            const freshDefaults = JSON.parse(JSON.stringify(DEFAULTS));
            const mergedState = this.deepMerge(freshDefaults, savedData.state);

            console.log('[PersistenceManager] State loaded and merged.');

            // Return full object, consumer routes data
            return {
                ...savedData,
                state: mergedState,
                links: savedData.links || []
            };

        } catch (e) {
            console.error('[PersistenceManager] Failed to load state:', e);
            return null;
        }
    }

    /**
     * Schedules a save operation.
     */
    save() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        this.saveTimeout = setTimeout(() => {
            this.forceSave();
        }, DEBOUNCE_MS);
    }

    forceSave() {
        try {
            const currentState = store.getState();

            // Guard: Don't save if recording (performance) or animating?
            // Actually, saving during animation is fine if debounced, 
            // but maybe check if recording.
            if (currentState.app && currentState.app.isRecording) return;

            const links = linkManager.getLinks();

            const payload = {
                version: '2.1',
                timestamp: Date.now(),
                state: currentState,
                links: links
            };

            // Collect data from providers
            this.stateProviders.forEach((providerFn, key) => {
                try {
                    payload[key] = providerFn();
                } catch (err) {
                    console.error(`[PersistenceManager] Provider '${key}' failed:`, err);
                }
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            console.log('[PersistenceManager] Saved.');
        } catch (e) {
            console.error('[PersistenceManager] Save failed:', e);
        }
    }
}

export const persistenceManager = new PersistenceManager();
