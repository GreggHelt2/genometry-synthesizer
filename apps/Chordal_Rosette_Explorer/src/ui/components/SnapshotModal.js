import { createElement, $id } from '../utils/dom.js';

export class SnapshotModal {
    constructor(onLoadSnapshot) {
        this.onLoadSnapshot = onLoadSnapshot; // Callback when user chooses a snapshot
        this.overlay = null;
    }

    show(snapshots) {
        this.dispose(); // Cleanup any existing modal

        // Overlay
        this.overlay = createElement('div', 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm');

        // Modal Container
        const container = createElement('div', 'bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]');

        // Header
        const header = createElement('div', 'p-4 border-b border-gray-700 flex justify-between items-center');
        const title = createElement('h2', 'text-xl font-bold text-white', { textContent: 'Load Snapshot' });
        const closeBtn = createElement('button', 'text-gray-400 hover:text-white', { textContent: '✕' });
        closeBtn.onclick = () => this.dispose();

        header.appendChild(title);
        header.appendChild(closeBtn);
        container.appendChild(header);

        // List Container
        const list = createElement('div', 'flex-1 overflow-y-auto p-2 flex flex-col gap-2');

        if (snapshots.length === 0) {
            const empty = createElement('div', 'text-center text-gray-500 py-8 italic', { textContent: 'No saved snapshots found.' });
            list.appendChild(empty);
        } else {
            // Sort by timestamp desc (newest first)
            snapshots.sort((a, b) => b.timestamp - a.timestamp);

            snapshots.forEach(snap => {
                const item = createElement('div', 'flex items-center justify-between p-3 bg-gray-800 rounded hover:bg-gray-750 border border-gray-700 transition-colors');

                // Info
                const info = createElement('div', 'flex flex-col');
                const name = createElement('span', 'font-bold text-white', { textContent: snap.name });
                const date = new Date(snap.timestamp).toLocaleString();
                const time = createElement('span', 'text-xs text-gray-400', { textContent: date });
                info.appendChild(name);
                info.appendChild(time);

                // Load Button
                const loadBtn = createElement('button', 'px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white font-medium', { textContent: 'Load' });

                loadBtn.onclick = () => {
                    this.onLoadSnapshot(snap.name);
                    this.dispose();
                };

                item.appendChild(info);
                item.appendChild(loadBtn);
                list.appendChild(item);
            });
        }

        container.appendChild(list);
        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);

        // Click outside to close
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.dispose();
        };
    }

    dispose() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
