import { createElement } from '../utils/dom.js';

export class SnapshotSidebar {
    constructor(parentContainer, { onLoad, onDelete }) {
        this.parentContainer = parentContainer;
        this.onLoad = onLoad;
        this.onDelete = onDelete;
        this.isOpen = false;
        this.onDelete = onDelete;
        this.isOpen = false;
        this.allSnapshots = []; // Store full list
        this.filterQuery = '';  // Current search regex string
        this.filteredSnapshots = []; // Currently visible list
        this.selectedIndex = -1; // Index in filteredSnapshots

        this._boundHandleKeydown = this.handleKeydown.bind(this);
        this.render();
    }

    handleKeydown(e) {
        if (!this.isOpen) return;

        // Ignore inputs (except our own search input)
        // This prevents hijacking Enter from other UI components (like Color Picker)
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
        if (isInput && e.target !== this.searchInput) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.moveSelection(-1);
        } else if (e.key === 'Enter') {
            // Load selected
            if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredSnapshots.length) {
                const snap = this.filteredSnapshots[this.selectedIndex];
                this.onLoad(snap.name);
            }
        }
    }

    moveSelection(delta) {
        const len = this.filteredSnapshots.length;
        if (len === 0) return;

        let newIndex = this.selectedIndex + delta;

        // Clamp
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= len) newIndex = len - 1;

        if (newIndex !== this.selectedIndex) {
            this.selectedIndex = newIndex;
            this.updateSelectionVisuals();
            this.scrollToSelected();

            // Auto-load on selection change
            if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredSnapshots.length) {
                const snap = this.filteredSnapshots[this.selectedIndex];
                this.onLoad(snap.name);
            }
        }
    }

    scrollToSelected() {
        // Simple logic: find element by data-index or just re-render is easiest but expensive?
        // Let's use re-render for now as list isn't huge, OR just toggle classes if we keep ref to elements?
        // Re-rendering whole list on every arrow key is bad. 
        // Better: Query DOM for current selected and new selected.

        // Actually, let's defer scroll logic to 'updateSelectionVisuals'
    }

    updateSelectionVisuals() {
        // Toggle classes on DOM elements
        const cards = this.listElement.children;
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (i === this.selectedIndex) {
                card.classList.add('border-blue-500', 'ring-1', 'ring-blue-500');
                card.classList.remove('border-gray-700', 'hover:border-gray-500');

                // Scroll into view
                card.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            } else {
                card.classList.remove('border-blue-500', 'ring-1', 'ring-blue-500');
                card.classList.add('border-gray-700', 'hover:border-gray-500');
            }
        }
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

        // Search Input
        const searchContainer = createElement('div', 'p-2 border-b border-gray-700 bg-gray-800');
        this.searchInput = createElement('input', 'w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500', {
            type: 'text',
            placeholder: 'Filter (Name, *Glob, n=4)...'
        });

        this.searchInput.addEventListener('input', (e) => {
            this.filterQuery = e.target.value;
            this.applyFilter();
        });

        searchContainer.appendChild(this.searchInput);
        wrapper.appendChild(searchContainer);

        // List Container
        this.listElement = createElement('div', 'flex-1 overflow-y-auto p-3 flex flex-col gap-3');
        wrapper.appendChild(this.listElement);

        this.container.appendChild(wrapper);

        // Append to parent
        // Note: Main.js needs to ensure this is appended as a flex child *after* the main content column
        this.parentContainer.appendChild(this.container);
    }

    updateList(snapshots) {
        this.allSnapshots = snapshots;
        this.applyFilter();
    }

    applyFilter() {
        let filtered = this.allSnapshots;
        let query = this.filterQuery;

        // 1. Extract Deep Search Terms (key=value)
        // Regex to find "key=value" or "key:value". 
        // We capture key (group 1) and value (group 2).
        const deepTerms = [];
        const deepRegex = /\b([a-zA-Z0-9_\.]+)(?:=|:)([^ ]+)/g;

        let match;
        while ((match = deepRegex.exec(query)) !== null) {
            deepTerms.push({ key: match[1], value: match[2] });
        }

        // Remove deep terms from query to get the "Name" search part
        let nameQuery = query.replace(deepRegex, '').trim();

        // 2. Filter by Deep Terms (Intersection/AND)
        if (deepTerms.length > 0) {
            filtered = filtered.filter(snap => {
                return deepTerms.every(term => this.matchesDeepSearch(snap, term.key, term.value));
            });
        }

        // 3. Filter by Name (Hybrid Glob/Regex)
        if (nameQuery) {
            try {
                let pattern = nameQuery;

                // Hybrid Logic: Check for explicit regex characters
                // If NO advanced regex syntax is present, treat '*' as a GLOB wildcard (.*)
                // We exclude '.' from this check so 'v1.0' still works as expected (wildcard dot is standard enough, or literal enough)
                const hasAdvancedRegex = /[\\^$|+?(){}\[\]]/.test(pattern);

                if (!hasAdvancedRegex) {
                    // Replace glob * with regex .*
                    pattern = pattern.replace(/\*/g, '.*');
                }

                const regex = new RegExp(pattern, 'i');
                filtered = filtered.filter(s => regex.test(s.name));
            } catch (e) {
                // If invalid regex, fallback to simple substring match
                const lower = nameQuery.toLowerCase();
                filtered = filtered.filter(s => s.name.toLowerCase().includes(lower));
            }
        }

        // Update state
        this.filteredSnapshots = filtered;
        // Reset selection on filter change
        this.selectedIndex = -1;

        this.renderSnapshots(filtered);
    }

    matchesDeepSearch(obj, targetKey, targetValue) {
        // Recursive search for property path ending with targetKey having targetValue
        // Uses iterative stack to avoid recursion limit (though improbable here)

        const stack = [{ node: obj, path: '' }];

        while (stack.length > 0) {
            const { node, path } = stack.pop();

            if (!node || typeof node !== 'object') continue;

            for (const k of Object.keys(node)) {
                // Skip massive fields we don't care about if they exist (like thumbnail data if we wanted)
                // but checking string length handles it naturally.

                const val = node[k];
                const fullPath = path ? `${path}.${k}` : k;

                if (val && typeof val === 'object') {
                    stack.push({ node: val, path: fullPath });
                } else {
                    // Leaf (primitive)
                    // Check path match: exact match OR suffix match (dot notation)
                    // e.g. "n" matches "state.rosetteA.n" (suffix '.n')
                    // e.g. "rosetteA.n" matches "state.rosetteA.n" (suffix '.rosetteA.n')

                    const isPathMatch = (fullPath === targetKey) || fullPath.endsWith('.' + targetKey);

                    if (isPathMatch) {
                        // Check value match (loose equality for string vs number)
                        // Case insensitive for extra usability?
                        if (String(val) == targetValue) return true;
                    }
                }
            }
        }
        return false;
    }

    renderSnapshots(snapshots) {
        this.listElement.innerHTML = '';

        if (snapshots.length === 0) {
            const msg = this.allSnapshots.length === 0 ? 'No snapshots saved.' : 'No matches found.';
            const empty = createElement('div', 'text-center text-gray-500 py-8 italic text-sm', { textContent: msg });
            this.listElement.appendChild(empty);
            return;
        }

        // Sort by timestamp desc
        snapshots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        snapshots.forEach((snap, index) => {
            const isSelected = index === this.selectedIndex;
            // Conditional classes
            const borderClass = isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700 hover:border-gray-500';

            const card = createElement('div', `bg-gray-800 rounded border ${borderClass} overflow-hidden transition-colors group relative shrink-0`);
            // Store index for referencing? Not strictly needed if loop order matches filteredSnapshots

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

            // Load on click (and Select)
            card.onclick = () => {
                this.selectedIndex = index;
                this.updateSelectionVisuals();
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
            window.addEventListener('keydown', this._boundHandleKeydown);
        } else {
            this.container.style.width = '0px';
            window.removeEventListener('keydown', this._boundHandleKeydown);
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
