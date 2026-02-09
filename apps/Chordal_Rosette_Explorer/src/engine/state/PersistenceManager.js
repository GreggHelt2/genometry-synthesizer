import { DEFAULTS } from '../../config/defaults.js';
import { store } from './Store.js';
import { linkManager } from '../logic/LinkManager.js';
import { IndexedDBAdapter } from './IndexedDBAdapter.js';

const STORAGE_KEY = 'chordal_rosette_state_v3_6';
const DEBOUNCE_MS = 1000;

export class PersistenceManager {
    constructor() {
        this.saveTimeout = null;
        this.stateProviders = new Map(); // key -> providerFn
        this.dbAdapter = new IndexedDBAdapter(); // Initialize DB Interface

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
            return this.hydrateWithDefaults(savedData);

        } catch (e) {
            console.error('[PersistenceManager] Failed to load state:', e);
            return null;
        }
    }

    hydrateWithDefaults(savedData) {
        // We take DEFAULTS as the base, and merge savedState ON TOP.
        const freshDefaults = JSON.parse(JSON.stringify(DEFAULTS));
        const mergedState = this.deepMerge(freshDefaults, savedData.state);

        console.log('[PersistenceManager] State hydrated.');

        return {
            ...savedData,
            state: mergedState,
            links: savedData.links || []
        };
    }

    /**
     * Schedules a save operation for Auto-Save
     */
    save() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        this.saveTimeout = setTimeout(() => {
            this.forceSave();
        }, DEBOUNCE_MS);
    }

    /**
     * Captures current application state from Store, LinkManager, and Providers.
     */
    captureState() {
        const currentState = store.getState();
        const links = linkManager.getLinks();

        const payload = {
            version: '3.6',
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

        return payload;
    }

    /**
     * Writes current state to LocalStorage (Auto-Save)
     */
    forceSave() {
        try {
            const currentState = store.getState();
            if (currentState.app && currentState.app.isRecording) return;

            const payload = this.captureState();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            console.log('[PersistenceManager] Auto-saved.');
        } catch (e) {
            console.error('[PersistenceManager] Save failed:', e);
        }
    }

    // --- IDB Snapshot API ---

    /**
     * Saves a named snapshot to IndexedDB.
     */
    async saveSnapshot(name, thumbnailData = null) {
        try {
            const payload = this.captureState();
            payload.name = name; // Attach name field for Index
            if (thumbnailData) {
                payload.thumbnail = thumbnailData;
            }

            const result = await this.dbAdapter.save(payload);

            if (result.overwritten) {
                console.log(`[PersistenceManager] Overwrote existing snapshot: '${name}'`);
            } else {
                console.log(`[PersistenceManager] Saved new snapshot: '${name}'`);
            }
            return true;
        } catch (e) {
            console.error('[PersistenceManager] Snapshot save failed:', e);
            throw e;
        }
    }

    /**
     * Loads a named snapshot from IndexedDB.
     */
    async loadSnapshot(name) {
        try {
            const data = await this.dbAdapter.getByName(name);
            if (!data) throw new Error(`Snapshot '${name}' not found.`);

            return this.hydrateWithDefaults(data);
        } catch (e) {
            console.error('[PersistenceManager] Snapshot load failed:', e);
            throw e;
        }
    }

    /**
     * Lists all available snapshots (Metadata only).
     */
    async listSnapshots() {
        return await this.dbAdapter.getAllMetadata();
    }
}

export const persistenceManager = new PersistenceManager();
