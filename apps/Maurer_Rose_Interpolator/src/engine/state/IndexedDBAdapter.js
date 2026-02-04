export class IndexedDBAdapter {
    /**
     * @param {string} dbName - Database name
     * @param {string} storeName - Main object store name
     * @param {number} version - Schema version
     */
    constructor(dbName = 'ChordalRosetteDB', storeName = 'snapshots', version = 1) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = version;
        this.db = null;
    }

    /**
     * Opens the database connection.
     * Handles schema upgrades (creating stores and indices).
     */
    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    // Use autoIncrement ID as key strictly for stability
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });

                    // Index 1: Name (Unique per snapshot)
                    // We enforce uniqueness on name to prevent user confusion, 
                    // though ID is the primary key.
                    store.createIndex('name', 'name', { unique: true });

                    // Index 2: Timestamp (for sorting)
                    store.createIndex('timestamp', 'timestamp', { unique: false });

                    // Index 3: Tags (Future-proofing for Emergent Properties search)
                    // multiEntry: true allows indexing each element of the array separately.
                    store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('[IndexedDBAdapter] Open Error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Saves a snapshot.
     * - If payload has 'id', it updates existing.
     * - If payload is new, it inserts.
     * - Handles 'name' collisions if unique constraint is hit.
     */
    async save(payload) {
        await this.open();
        return new Promise((resolve, reject) => {
            // Ensure payload has minimal required fields for indices
            const data = {
                timestamp: Date.now(),
                tags: [],
                ...payload
            };

            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);

            // First, try to find if a snapshot with this NAME already exists
            // because we want "Save 'Foo'" to overwrite 'Foo' even if we don't know Foo's ID yet.
            const nameIndex = store.index('name');
            const nameRequest = nameIndex.get(data.name);

            nameRequest.onsuccess = () => {
                const existingReq = nameRequest.result;
                if (existingReq) {
                    // Update: attach the existing ID to the new payload to force an overwrite
                    data.id = existingReq.id;
                }

                // Perform Put
                const putRequest = store.put(data);
                putRequest.onsuccess = () => resolve({ id: putRequest.result, overwritten: !!existingReq });
                putRequest.onerror = (e) => reject(e.target.error);
            };

            nameRequest.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Retrieves a snapshot by its Name (via Index).
     */
    async getByName(name) {
        await this.open();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index('name');
            const request = index.get(name);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Retrieves all snapshots, but only minimal metadata.
     * returns Array of { id, name, timestamp, tags }
     * We purposefully exclude the heavy 'state' blob for the list view.
     */
    async getAllMetadata() {
        await this.open();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.openCursor();
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const { id, name, timestamp, tags, thumbnail } = cursor.value;
                    results.push({ id, name, timestamp, tags, thumbnail });
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Deletes a snapshot by Name.
     */
    async deleteByName(name) {
        await this.open();
        return new Promise((resolve, reject) => {
            // First lookup ID by name
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const index = store.index('name');
            const getKeyRequest = index.getKey(name); // getKey is faster than get (doesn't load value)

            getKeyRequest.onsuccess = () => {
                const id = getKeyRequest.result;
                if (id) {
                    const delRequest = store.delete(id);
                    delRequest.onsuccess = () => resolve(true);
                    delRequest.onerror = (e) => reject(e.target.error);
                } else {
                    resolve(false); // Nothing to delete
                }
            };
            getKeyRequest.onerror = (e) => reject(e.target.error);
        });
    }
}
