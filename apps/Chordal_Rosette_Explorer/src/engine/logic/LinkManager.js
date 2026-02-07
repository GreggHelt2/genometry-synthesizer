import { store } from '../state/Store.js';
import { ACTIONS } from '../state/Actions.js';

export class LinkManager {
    constructor() {
        this.links = new Map(); // key -> Set<key> (adjacency list)
        this.isProcessing = false;

        // Initialize state snapshot immediately
        try {
            this.lastKnownState = JSON.parse(JSON.stringify(store.getState()));
        } catch (e) {
            console.error('[LinkManager] Failed to initialize state:', e);
            this.lastKnownState = {};
        }

        // Listen to store changes to propagate updates
        store.subscribe(this.handleStoreUpdate.bind(this));
    }

    /**
     * Toggles a link between two parameters.
     * Currently assumes specific pairing logic (A.n <-> B.n), 
     * but this method allows registering generic links.
     * @param {string} keyA 
     * @param {string} keyB 
     */
    toggleLink(keyA, keyB) {
        if (this.areLinked(keyA, keyB)) {
            this.removeLink(keyA, keyB);
            return false;
        } else {
            this.addLink(keyA, keyB);
            // Sync immediately: A -> B (Arbitrary choice, or could rely on next update)
            this.sync(keyA, keyB);
            return true;
        }
    }

    addLink(keyA, keyB) {
        if (!this.links.has(keyA)) this.links.set(keyA, new Set());
        if (!this.links.has(keyB)) this.links.set(keyB, new Set());

        this.links.get(keyA).add(keyB);
        this.links.get(keyB).add(keyA);
        // console.log(`[LinkManager] Linked ${keyA} <-> ${keyB}`);
        this.notifyListeners();
    }

    removeLink(keyA, keyB) {
        if (this.links.has(keyA)) this.links.get(keyA).delete(keyB);
        if (this.links.has(keyB)) this.links.get(keyB).delete(keyA);
        // console.log(`[LinkManager] Unlinked ${keyA} <-> ${keyB}`);
        this.notifyListeners();
    }

    areLinked(keyA, keyB) {
        return this.links.has(keyA) && this.links.get(keyA).has(keyB);
    }

    subscribe(callback) {
        if (!this.listeners) this.listeners = new Set();
        this.listeners.add(callback);
        // Return unsubscribe
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        if (this.listeners) {
            this.listeners.forEach(cb => cb());
        }
    }

    /**
     * Manually sync Source -> Target
     */
    sync(sourceKey, targetKey) {
        const state = store.getState();
        const [sourceRoseId, sourceParam] = this.parseKey(sourceKey);
        const [targetRoseId, targetParam] = this.parseKey(targetKey);

        if (!state[sourceRoseId] || !state[targetRoseId]) return;

        const sourceVal = state[sourceRoseId][sourceParam];
        const targetVal = state[targetRoseId][targetParam];

        if (sourceVal !== targetVal) {
            // console.log(`[LinkManager] Syncing ${sourceKey} (${sourceVal}) -> ${targetKey}`);
            store.dispatch({
                type: targetRoseId === 'rosetteA' ? ACTIONS.UPDATE_ROSETTE_A : ACTIONS.UPDATE_ROSETTE_B,
                payload: { [targetParam]: sourceVal }
            });
        }
    }

    handleStoreUpdate(state) {
        // We do NOT use a recursion guard (isProcessing) here.
        // We rely on 'pendingUpdates' to prevent infinite loops when we dispatch our own updates.
        // If we blocked recursion, we would miss the immediate echo of our dispatch, 
        // leading to stale pendingUpdates and state desync.
        this.checkDiffAndPropagate(state);
    }

    checkDiffAndPropagate(newState) {
        if (!this.lastKnownState) {
            this.lastKnownState = JSON.parse(JSON.stringify(newState));
            this.pendingUpdates = new Map();
            return;
        }

        if (!this.pendingUpdates) this.pendingUpdates = new Map();

        const changes = [];
        // Helper to find changes in Rosette A or B
        ['rosetteA', 'rosetteB'].forEach(roseId => {
            const oldR = this.lastKnownState[roseId];
            const newR = newState[roseId];
            if (!oldR || !newR) return;

            Object.keys(newR).forEach(param => {
                const newVal = newR[param];
                if (newVal !== oldR[param]) {
                    // Check for echo of our own update
                    const key = `${roseId}.${param}`;

                    if (this.pendingUpdates.has(key)) {
                        const expectedVal = this.pendingUpdates.get(key);
                        // Tolerant equality check
                        if (Math.abs(Number(newVal) - Number(expectedVal)) < 0.000001) {
                            // This is our echo. Ignore.
                            this.pendingUpdates.delete(key);
                            return;
                        } else {
                            // Value mismatch (user override/race?). Treat as new change.
                            // console.warn(`[LinkManager] Value mismatch for pending ${key}: got ${newVal}, expected ${expectedVal}`);
                            this.pendingUpdates.delete(key);
                        }
                    }
                    changes.push({ roseId, param, val: newVal });
                }
            });
        });

        // Propagate changes unique links
        changes.forEach(change => {
            const sourceKey = `${change.roseId}.${change.param}`;
            if (this.links.has(sourceKey)) {
                const targets = this.links.get(sourceKey);
                targets.forEach(targetKey => {
                    // Propagate to target
                    const [targetRoseId, targetParam] = this.parseKey(targetKey);
                    const currentTargetVal = newState[targetRoseId][targetParam];

                    if (currentTargetVal !== change.val) {
                        // Expect this update to come back
                        this.pendingUpdates.set(targetKey, change.val);

                        store.dispatch({
                            type: targetRoseId === 'rosetteA' ? ACTIONS.UPDATE_ROSETTE_A : ACTIONS.UPDATE_ROSETTE_B,
                            payload: { [targetParam]: change.val }
                        });
                    }
                });
            }
        });

        // Update local cache to the LATEST store state
        this.lastKnownState = JSON.parse(JSON.stringify(store.getState()));
    }

    /**
     * Heloer: 'rosetteA.n' -> ['rosetteA', 'n']
     */
    parseKey(key) {
        const parts = key.split('.');
        return [parts[0], parts.slice(1).join('.')];
    }
    isLinked(key) {
        return this.links.has(key) && this.links.get(key).size > 0;
    }

    // --- Persistence Methods ---

    /**
     * Returns an array of link pairs for saving.
     * Format: [['rosetteA.n', 'rosetteB.n'], ...]
     * We need to avoid duplicates (A-B and B-A).
     */
    getLinks() {
        const uniqueLinks = new Set();
        const exportList = [];

        this.links.forEach((neighbors, keyA) => {
            neighbors.forEach(keyB => {
                // Create a canonical string for the pair to check uniqueness
                const pair = [keyA, keyB].sort().join('<->');
                if (!uniqueLinks.has(pair)) {
                    uniqueLinks.add(pair);
                    exportList.push([keyA, keyB]);
                }
            });
        });

        return exportList;
    }

    /**
     * Restore links from a saved array of pairs.
     */
    restoreLinks(linksArray) {
        if (!Array.isArray(linksArray)) return;

        // Clear existing? Or just add?
        // Let's clear to be safe implies a full restore.
        this.links.clear();

        linksArray.forEach(pair => {
            if (Array.isArray(pair) && pair.length === 2) {
                this.addLink(pair[0], pair[1]);
            }
        });

        // After restoring, we should probably sync values to ensure consistency?
        // Or assume the saved state already has consistent values.
        // Let's assume saved state is consistent.
    }
}

export const linkManager = new LinkManager();
