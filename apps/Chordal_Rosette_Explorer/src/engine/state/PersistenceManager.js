import { DEFAULTS } from '../../config/defaults.js';
import { store } from './Store.js';
import { linkManager } from '../logic/LinkManager.js';
import { IndexedDBAdapter } from './IndexedDBAdapter.js';
import { migrateV2ToV3, backupToFile, backupIndexedDB } from './stateMigration.js';

const STORAGE_KEY = 'chordal_rosette_state_v3_0';
const LEGACY_STORAGE_KEYS = ['chordal_rosette_state_v2_1', 'chordal_rosette_state_v2'];
const DEBOUNCE_MS = 1000;

export class PersistenceManager {
    constructor() {
        this.saveTimeout = null;
        this.stateProviders = new Map();
        this.dbAdapter = new IndexedDBAdapter();

        window.addEventListener('beforeunload', () => {
            if (this.saveTimeout) {
                this.forceSave();
            }
        });
    }

    registerStateProvider(key, providerFn) {
        this.stateProviders.set(key, providerFn);
    }

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
     * Loads state from localStorage. Handles v2.x → v3.0 migration.
     */
    load() {
        try {
            // Try v3.0 key first
            let raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                // Try legacy keys
                for (const legacyKey of LEGACY_STORAGE_KEYS) {
                    raw = localStorage.getItem(legacyKey);
                    if (raw) {
                        console.log(`[PersistenceManager] Found legacy state (${legacyKey}). Will migrate to v3.0.`);
                        break;
                    }
                }
            }

            if (!raw) {
                console.log('[PersistenceManager] No saved state found. Using defaults.');
                return null;
            }

            let savedData = JSON.parse(raw);

            // Check version and migrate if needed
            if (this.needsMigration(savedData)) {
                console.log('[PersistenceManager] State requires migration to v3.0.');

                // Backup before migration
                backupToFile(savedData, 'pre_migration_localStorage.json');

                // Also backup IndexedDB (async, fire-and-forget for now)
                backupIndexedDB(this.dbAdapter).catch(e =>
                    console.warn('[PersistenceManager] IDB backup failed:', e)
                );

                savedData = migrateV2ToV3(savedData, DEFAULTS);

                // Write migrated state to v3.0 key
                localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));

                // Clean up legacy keys
                LEGACY_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
            }

            return this.hydrateWithDefaults(savedData);

        } catch (e) {
            console.error('[PersistenceManager] Failed to load state:', e);
            return null;
        }
    }

    needsMigration(savedData) {
        if (!savedData.version) return true;
        const ver = parseFloat(savedData.version);
        return isNaN(ver) || ver < 3.0;
    }

    hydrateWithDefaults(savedData) {
        const freshDefaults = JSON.parse(JSON.stringify(DEFAULTS));
        const mergedState = this.deepMerge(freshDefaults, savedData.state);

        console.log('[PersistenceManager] State hydrated.');

        return {
            ...savedData,
            state: mergedState,
            links: savedData.links || []
        };
    }

    save() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        this.saveTimeout = setTimeout(() => {
            this.forceSave();
        }, DEBOUNCE_MS);
    }

    captureState() {
        const currentState = store.getState();
        const links = linkManager.getLinks();

        const now = new Date();
        const payload = {
            version: '3.0',
            timestamp: now.getTime(),
            timeReadable: now.toLocaleString('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                timeZoneName: 'short'
            }),
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

    async saveSnapshot(name, thumbnailData = null) {
        try {
            const payload = this.captureState();
            payload.name = name;
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

    async loadSnapshot(name) {
        try {
            const data = await this.dbAdapter.getByName(name);
            if (!data) throw new Error(`Snapshot '${name}' not found.`);

            // Migrate snapshot if needed
            let snapshotData = data;
            if (this.needsMigration(snapshotData)) {
                console.log(`[PersistenceManager] Migrating snapshot '${name}' to v3.0.`);
                snapshotData = migrateV2ToV3(snapshotData, DEFAULTS);
                // Save migrated snapshot back
                snapshotData.name = name;
                if (data.thumbnail) snapshotData.thumbnail = data.thumbnail;
                await this.dbAdapter.save(snapshotData);
            }

            return this.hydrateWithDefaults(snapshotData);
        } catch (e) {
            console.error('[PersistenceManager] Snapshot load failed:', e);
            throw e;
        }
    }

    async listSnapshots() {
        return await this.dbAdapter.getAllMetadata();
    }
}

export const persistenceManager = new PersistenceManager();
