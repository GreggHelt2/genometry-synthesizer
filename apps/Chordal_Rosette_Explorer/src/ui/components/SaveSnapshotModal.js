import { createElement } from '../utils/dom.js';

export class SaveSnapshotModal {
    constructor(onSave) {
        this.onSave = onSave; // Callback(name)
        this.overlay = null;
    }

    show() {
        this.dispose();

        // Overlay
        this.overlay = createElement('div', 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm');

        // Modal Container
        const container = createElement('div', 'bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-fade-in');

        // Header
        const header = createElement('div', 'p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800');
        const title = createElement('h2', 'text-lg font-bold text-white', { textContent: 'Save Snapshot' });
        const closeBtn = createElement('button', 'text-gray-400 hover:text-white transition-colors', { textContent: '✕' });
        closeBtn.onclick = () => this.dispose();

        header.appendChild(title);
        header.appendChild(closeBtn);
        container.appendChild(header);

        // Body
        const body = createElement('div', 'p-4 flex flex-col gap-4');

        // Input Group
        const label = createElement('label', 'text-xs text-gray-400 font-bold uppercase tracking-wider', { textContent: 'Snapshot Name' });
        const input = createElement('input', 'w-full bg-black border border-gray-600 rounded p-2 text-white focus:border-blue-500 focus:outline-none transition-colors');
        input.placeholder = "e.g., 'Red-5-Fold'";
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') this.dispose();
        };

        // Actions
        const actions = createElement('div', 'flex justify-end gap-2');

        const cancelBtn = createElement('button', 'px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors', { textContent: 'Cancel' });
        cancelBtn.onclick = () => this.dispose();

        const confirmBtn = createElement('button', 'px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white font-bold transition-colors', { textContent: 'Save' });
        confirmBtn.onclick = () => {
            const name = input.value.trim();
            if (name) {
                this.onSave(name);
                this.dispose();
            } else {
                input.style.borderColor = 'red';
                input.focus();
            }
        };

        body.appendChild(label);
        body.appendChild(input);
        body.appendChild(actions);

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        container.appendChild(body);
        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);

        // Auto-focus input
        setTimeout(() => input.focus(), 50);

        // Close on overlay click
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
