import { createElement } from '../utils/dom.js';

export class SnapshotSidebar {
    constructor(parentContainer, { onLoad, onDelete }) {
        this.parentContainer = parentContainer;
        this.onLoad = onLoad;
        this.onDelete = onDelete;
        this.isOpen = false;
        this.snapshots = [];

        this.render();
    }

    render() {
        // Main Container
        // Initial state: width 0, hidden overflow.
        // We use a fixed width when open, or a flexible basis if we want more fluid resizing, 
        // but fixed width is easier for the "squeeze" calculation.
        this.container = createElement('div', 'bg-gray-900 border-l border-gray-700 flex flex-col transition-all duration-300 ease-in-out overflow-hidden h-full');
        this.container.style.width = '0px';
        // Force flex-shrink 0 so it doesn't get squashed, it controls the squeezing
        this.container.style.flexShrink = '0';

        // Content Wrapper (to ensure content doesn't reflow weirdly during transition)
        // We set this to the target width (e.g. 320px)
        const wrapper = createElement('div', 'w-[320px] flex flex-col h-full');

        // Header
        const header = createElement('div', 'p-4 border-b border-gray-700 flex justify-between items-center flex-none');
        const title = createElement('h2', 'text-lg font-bold text-white', { textContent: 'Snapshots' });

        const closeBtn = createElement('button', 'text-gray-400 hover:text-white', { textContent: '✕' });
        closeBtn.onclick = () => this.toggle(false);

        header.appendChild(title);
        header.appendChild(closeBtn);
        wrapper.appendChild(header);

        // List Container
        this.listElement = createElement('div', 'flex-1 overflow-y-auto p-3 flex flex-col gap-3');
        wrapper.appendChild(this.listElement);

        this.container.appendChild(wrapper);

        // Append to parent
        // Note: Main.js needs to ensure this is appended as a flex child *after* the main content column
        this.parentContainer.appendChild(this.container);
    }

    updateList(snapshots) {
        this.snapshots = snapshots;
        this.listElement.innerHTML = '';

        if (snapshots.length === 0) {
            const empty = createElement('div', 'text-center text-gray-500 py-8 italic text-sm', { textContent: 'No snapshots saved.' });
            this.listElement.appendChild(empty);
            return;
        }

        // Sort by timestamp desc
        snapshots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        snapshots.forEach(snap => {
            const card = createElement('div', 'bg-gray-800 rounded border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors group relative');

            // Thumbnail
            // Expecting a 3:1 composite image
            const thumbContainer = createElement('div', 'w-full aspect-[3/1] bg-black border-b border-gray-700 relative');
            if (snap.thumbnail) {
                const img = createElement('img', 'w-full h-full object-cover');
                img.src = snap.thumbnail;
                thumbContainer.appendChild(img);
            } else {
                // Placeholder if missing
                const placeholder = createElement('div', 'w-full h-full flex items-center justify-center text-gray-600 text-xs', { textContent: 'No Preview' });
                thumbContainer.appendChild(placeholder);
            }

            // Info
            const info = createElement('div', 'p-2 flex items-center justify-between');

            const textCol = createElement('div', 'flex flex-col overflow-hidden');
            const nameEl = createElement('span', 'font-bold text-white text-sm truncate', { textContent: snap.name });
            const dateStr = new Date(snap.timestamp).toLocaleDateString();
            const dateEl = createElement('span', 'text-[10px] text-gray-400', { textContent: dateStr });

            textCol.appendChild(nameEl);
            textCol.appendChild(dateEl);

            // Actions
            const actions = createElement('div', 'flex items-center gap-1');

            // Delete Button (only visible on hover or always? Let's do always for utility but subtle)
            const delBtn = createElement('button', 'p-1.5 rounded hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors', {
                title: 'Delete Snapshot'
            });
            delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete snapshot "${snap.name}"?`)) {
                    this.onDelete(snap.name);
                }
            };

            actions.appendChild(delBtn);

            info.appendChild(textCol);
            info.appendChild(actions);

            card.appendChild(thumbContainer);
            card.appendChild(info);

            // Load on click
            card.onclick = () => {
                this.onLoad(snap.name);
            };
            card.style.cursor = 'pointer';

            this.listElement.appendChild(card);
        });
    }

    toggle(forceState) {
        const nextState = typeof forceState === 'boolean' ? forceState : !this.isOpen;
        this.isOpen = nextState;

        if (this.isOpen) {
            this.container.style.width = '320px'; // Open width
        } else {
            this.container.style.width = '0px';
        }

        // Trigger resize event for canvas layout after transition
        // We wait for the transition to finish (300ms) or fire immediately and repeatedly?
        // Ideally repeatedly to animate smoothly, but canvases might be heavy.
        // Let's fire once at start and once at end.
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);

        // Also fire immediately to start the process
        window.dispatchEvent(new Event('resize'));
    }
}
