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
            const card = createElement('div', 'bg-gray-800 rounded border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors group relative shrink-0');

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

            // Delete Button (Overlay on Thumbnail)
            const delBtn = createElement('button', 'absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600/90 rounded text-white opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 hover:scale-100 shadow-sm z-10', {
                title: 'Delete Snapshot'
            });
            delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Delete snapshot "${snap.name}"?`)) {
                    this.onDelete(snap.name);
                }
            };
            thumbContainer.appendChild(delBtn);

            // Info
            const info = createElement('div', 'p-2');

            const textCol = createElement('div', 'flex flex-col overflow-hidden gap-0.5');
            const nameEl = createElement('span', 'font-bold text-white text-sm truncate', { textContent: snap.name });
            const ts = snap.timestamp ? new Date(snap.timestamp) : new Date();
            const dateStr = ts.toLocaleDateString();
            const dateEl = createElement('span', 'text-[10px] text-gray-500', { textContent: dateStr });

            textCol.appendChild(nameEl);
            textCol.appendChild(dateEl);

            info.appendChild(textCol);

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
