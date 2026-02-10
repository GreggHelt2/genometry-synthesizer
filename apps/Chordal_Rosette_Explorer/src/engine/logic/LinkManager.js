import { store } from '../state/Store.js';
import { ACTIONS } from '../state/Actions.js';

/**
 * Safely get a value at a deep path in an object.
 * @param {object} obj
 * @param {string[]} path - e.g. ['stroke', 'opacity']
 * @returns {*}
 */
function getDeep(obj, path) {
    let current = obj;
    for (const key of path) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[key];
    }
    return current;
}

/**
 * Deep-equal check for two values (handles primitives and nested objects/arrays).
 */
function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => deepEqual(a[k], b[k]));
}

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

        this.pendingUpdates = new Map();

        // Listen to store changes to propagate updates
        store.subscribe(this.handleStoreUpdate.bind(this));
    }

    /**
     * Toggles a link between two parameters.
     * Keys are full dot-paths, e.g. 'rosetteA.stroke.opacity'
     */
    toggleLink(keyA, keyB) {
        if (this.areLinked(keyA, keyB)) {
            this.removeLink(keyA, keyB);
            return false;
        } else {
            this.addLink(keyA, keyB);
            this.sync(keyA, keyB);
            return true;
        }
    }

    addLink(keyA, keyB) {
        if (!this.links.has(keyA)) this.links.set(keyA, new Set());
        if (!this.links.has(keyB)) this.links.set(keyB, new Set());

        this.links.get(keyA).add(keyB);
        this.links.get(keyB).add(keyA);
        this.notifyListeners();
    }

    removeLink(keyA, keyB) {
        if (this.links.has(keyA)) this.links.get(keyA).delete(keyB);
        if (this.links.has(keyB)) this.links.get(keyB).delete(keyA);
        this.notifyListeners();
    }

    areLinked(keyA, keyB) {
        return this.links.has(keyA) && this.links.get(keyA).has(keyB);
    }

    subscribe(callback) {
        if (!this.listeners) this.listeners = new Set();
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        if (this.listeners) {
            this.listeners.forEach(cb => cb());
        }
    }

    /**
     * Parse a full dot-path key into [rootSlice, ...deepPath].
     * e.g. 'rosetteA.stroke.opacity' -> ['rosetteA', 'stroke', 'opacity']
     * e.g. 'rosetteA.curve.params.Rhodonea.n' -> ['rosetteA', 'curve', 'params', 'Rhodonea', 'n']
     */
    parseKey(key) {
        return key.split('.');
    }

    /**
     * Manually sync Source -> Target using SET_DEEP
     */
    sync(sourceKey, targetKey) {
        const state = store.getState();
        const sourcePath = this.parseKey(sourceKey);
        const targetPath = this.parseKey(targetKey);

        const sourceVal = getDeep(state, sourcePath);
        const targetVal = getDeep(state, targetPath);

        if (!deepEqual(sourceVal, targetVal)) {
            store.dispatch({
                type: ACTIONS.SET_DEEP,
                path: targetPath,
                value: sourceVal
            });
        }
    }

    handleStoreUpdate(state) {
        this.checkDiffAndPropagate(state);
    }

    checkDiffAndPropagate(newState) {
        // Re-entrancy guard: prevent infinite loop when our own dispatches
        // trigger another store notification that calls us back
        if (this._propagating) return;

        if (!this.lastKnownState) {
            this.lastKnownState = JSON.parse(JSON.stringify(newState));
            this.pendingUpdates = new Map();
            return;
        }

        if (!this.pendingUpdates) this.pendingUpdates = new Map();

        // Collect all changed linked keys
        const changes = [];

        this.links.forEach((targets, sourceKey) => {
            const path = this.parseKey(sourceKey);
            const newVal = getDeep(newState, path);
            const oldVal = getDeep(this.lastKnownState, path);

            if (!deepEqual(newVal, oldVal)) {
                // Check for echo of our own update
                if (this.pendingUpdates.has(sourceKey)) {
                    const expectedVal = this.pendingUpdates.get(sourceKey);
                    if (typeof newVal === 'number' && typeof expectedVal === 'number') {
                        if (Math.abs(newVal - expectedVal) < 0.000001) {
                            this.pendingUpdates.delete(sourceKey);
                            return;
                        }
                    } else if (deepEqual(newVal, expectedVal)) {
                        this.pendingUpdates.delete(sourceKey);
                        return;
                    }
                    this.pendingUpdates.delete(sourceKey);
                }
                changes.push({ sourceKey, val: newVal });
            }
        });

        // Propagate changes to linked targets (with guard)
        this._propagating = true;
        try {
            changes.forEach(change => {
                const targets = this.links.get(change.sourceKey);
                if (!targets) return;

                targets.forEach(targetKey => {
                    const targetPath = this.parseKey(targetKey);
                    const currentTargetVal = getDeep(newState, targetPath);

                    if (!deepEqual(currentTargetVal, change.val)) {
                        this.pendingUpdates.set(targetKey, change.val);

                        store.dispatch({
                            type: ACTIONS.SET_DEEP,
                            path: targetPath,
                            value: change.val
                        });
                    }
                });
            });
        } finally {
            this._propagating = false;
        }

        // Update local cache to the LATEST store state
        this.lastKnownState = JSON.parse(JSON.stringify(store.getState()));
    }

    isLinked(key) {
        return this.links.has(key) && this.links.get(key).size > 0;
    }

    // --- Persistence Methods ---

    /**
     * Returns an array of link pairs for saving.
     * Format: [['rosetteA.stroke.opacity', 'rosetteB.stroke.opacity'], ...]
     */
    getLinks() {
        const uniqueLinks = new Set();
        const exportList = [];

        this.links.forEach((neighbors, keyA) => {
            neighbors.forEach(keyB => {
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

        this.links.clear();

        linksArray.forEach(pair => {
            if (Array.isArray(pair) && pair.length === 2) {
                this.addLink(pair[0], pair[1]);
            }
        });
    }
}

export const linkManager = new LinkManager();
