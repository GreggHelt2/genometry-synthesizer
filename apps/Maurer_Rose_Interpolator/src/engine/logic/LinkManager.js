import { store } from '../state/Store.js';
import { ACTIONS } from '../state/Actions.js';

export class LinkManager {
    constructor() {
        this.links = new Map(); // key -> Set<key> (adjacency list)
        this.isProcessing = false;

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
        console.log(`[LinkManager] Linked ${keyA} <-> ${keyB}`);
        this.notifyListeners();
    }

    removeLink(keyA, keyB) {
        if (this.links.has(keyA)) this.links.get(keyA).delete(keyB);
        if (this.links.has(keyB)) this.links.get(keyB).delete(keyA);
        console.log(`[LinkManager] Unlinked ${keyA} <-> ${keyB}`);
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
            console.log(`[LinkManager] Syncing ${sourceKey} (${sourceVal}) -> ${targetKey}`);
            store.dispatch({
                type: targetRoseId === 'rosetteA' ? ACTIONS.UPDATE_ROSETTE_A : ACTIONS.UPDATE_ROSETTE_B,
                payload: { [targetParam]: sourceVal }
            });
        }
    }

    handleStoreUpdate(state) {
        if (this.isProcessing) return; // Recursion guard

        // This is tricky: Store doesn't tell us *what* changed, just the new state.
        // We need diffing or we just check all active links?
        // Checking all active links is safer for "enforcement" but heavy?
        // Let's rely on basic diffing or just check consistency of all links.

        this.isProcessing = true;
        try {
            // Check consistency of all links
            // To avoid double dispatching, iterate unique pairs or used visited set
            const visited = new Set();

            for (const [keyA, targets] of this.links.entries()) {
                for (const keyB of targets) {
                    const linkId = [keyA, keyB].sort().join('<->');
                    if (visited.has(linkId)) continue;
                    visited.add(linkId);

                    // Verify consistency
                    // How do we know which one is the "Source of Truth" (changed recently)?
                    // Without action history, we assume consistency is desired. 
                    // But if A=3 and B=4, which one wins?
                    // Ideally the one that changed changed *most recently*.
                    // The Store doesn't give us Diff.
                    // For now, we might need to store `lastState` in this Manager to diff.
                }
            }

            // Wait - relying on global store subscription is hard without diffs.
            // Better approach: User Input triggers the sync via LinkManager explicitly?
            // "The parameter linking should tie changes in another ParamGui to changes in this ParamGui"

            // If ParamGui A changes, it dispatches UPDATE_A.
            // We want B to update.
            // If we are in `handleStoreUpdate`, we see A=new, B=old.
            // But we might also see B=new, A=old if B was changed!
            // We need to know *what changed*.

            // IMPLEMENTATION DECISION:
            // Store `lastKnownState` locally.
            this.checkDiffAndPropagate(state);

        } finally {
            this.isProcessing = false;
        }
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
                        if (Math.abs(newVal - expectedVal) < 0.000001) {
                            // This is our echo. Ignore.
                            // console.log(`[LinkManager] Ignoring echo for ${key}`);
                            this.pendingUpdates.delete(key);
                            return;
                        } else {
                            // Value mismatch (user override/race?). Treat as new change.
                            this.pendingUpdates.delete(key);
                        }
                    }
                    changes.push({ roseId, param, val: newVal });
                }
            });
        });

        // Update local cache
        this.lastKnownState = JSON.parse(JSON.stringify(newState));

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
    }

    /**
     * Heloer: 'rosetteA.n' -> ['rosetteA', 'n']
     */
    parseKey(key) {
        const parts = key.split('.');
        return [parts[0], parts.slice(1).join('.')];
    }
}

export const linkManager = new LinkManager();
