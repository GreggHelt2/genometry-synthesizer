import { createElement } from '../utils/dom.js';

export class ParamGradient {
    /**
     * @param {Object} props
     * @param {string} props.key - Internal parameter key
     * @param {string} props.label - Display label
     * @param {Array} props.value - Initial stops array [{color, position}, ...]
     * @param {Function} props.onChange - Callback with new stops array
     * @param {Function} props.onLinkToggle - Optional link toggle callback
     */
    constructor({ key, label, value, onChange, onLinkToggle }) {
        this.key = key;
        this.onChange = onChange;
        this.onLinkToggle = onLinkToggle;

        // Deep copy state to ensure isolation
        this.state = (value && value.length > 0) ? JSON.parse(JSON.stringify(value)) : [
            { color: '#ffffff', position: 0 },
            { color: '#ff0000', position: 1 }
        ];

        this.isLinked = false;
        this.draggedStopIndex = -1;
        this.dragStartX = 0;
        this.isDragging = false;
        this.dragHasMoved = false;

        this.render({ label });
    }

    render({ label }) {
        this.container = createElement('div', 'flex flex-col mb-4 gradient-param'); // Increased margin

        // --- Header ---
        const header = createElement('div', 'flex justify-between items-center mb-1');
        const labelEl = createElement('span', 'text-xs text-gray-400 font-medium', { textContent: label });

        this.linkBtn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent', {
            title: 'Link Parameter'
        });
        this.linkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

        if (this.onLinkToggle) {
            this.linkBtn.addEventListener('click', () => this.toggleLink());
        } else {
            this.linkBtn.classList.add('invisible');
        }

        header.appendChild(labelEl);
        header.appendChild(this.linkBtn);
        this.container.appendChild(header);

        // --- Editor Visuals ---
        // Need height for Top(X) + Track + Bottom(Swatch)
        // Let's say: 12px (X) + 16px (Track) + 16px (Swatch) + spacing = ~48px height
        this.editorEl = createElement('div', 'w-full h-12 relative select-none cursor-pointer mt-2');

        // Background Checkerboard (Track only)
        // Center the track vertically. h-4 = 16px.
        // top-4 gives room for top handles (approx)
        this.trackBg = createElement('div', 'absolute left-0 right-0 h-4 top-4 rounded border border-gray-600');
        this.trackBg.style.background = `
            conic-gradient(#374151 90deg, #1f2937 90deg 180deg, #374151 180deg 270deg, #1f2937 270deg)
            0 0/10px 10px
        `;

        // Gradient Preview (on top of checkerboard)
        this.trackEl = createElement('div', 'absolute inset-0 w-full h-full rounded opacity-90');
        this.trackBg.appendChild(this.trackEl);
        this.editorEl.appendChild(this.trackBg);

        // Stops Layer (Full Editor Size)
        this.stopsLayer = createElement('div', 'absolute inset-0 w-full h-full pointer-events-none');
        this.editorEl.appendChild(this.stopsLayer);

        this.container.appendChild(this.editorEl);

        // --- Invisible Native Color Input ---
        this.colorInput = createElement('input', 'absolute opacity-0 w-0 h-0 pointer-events-none', { type: 'color' });
        this.container.appendChild(this.colorInput);

        // --- Events ---
        // 1. Add Stop (Clicking the editor background/track)
        this.editorEl.addEventListener('mousedown', (e) => this.handleTrackMouseDown(e));

        // 2. Color Input Logic
        this.colorInput.addEventListener('input', (e) => this.handleColorChange(e));
        this.colorInput.addEventListener('change', (e) => this.handleColorChangeFinal(e));

        this.updateVisuals();
    }

    handleTrackMouseDown(e) {
        // If the event target is the Editor or Track, we add a stop.
        // If it was a Stop Handle/Swatch, that element stopped propagation, so we won't get here.

        // Calculate position relative to the TRACK (not the full editor height if we want precision)
        // Actually, let's map the X coordinate of the editor to 0-1.

        const rect = this.editorEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let pos = x / rect.width;
        pos = Math.max(0, Math.min(1, pos));

        // Add Stop
        this.addStop(pos, '#ffffff');
    }

    addStop(position, color) {
        const newStop = { position, color };
        this.state.push(newStop);
        this.sortStops();
        this.updateVisuals();
        this.emitChange();
    }

    removeStop(index) {
        if (this.state.length <= 2) return; // Enforce min 2
        this.state.splice(index, 1);
        this.updateVisuals();
        this.emitChange();
    }

    handleStopMouseDown(e, index) {
        // Critical: Stop bubbling so track doesn't receive "Add Stop"
        e.stopPropagation();

        // Left Click -> Start Drag logic
        if (e.button === 0) {
            this.draggedStopIndex = index;
            this.isDragging = true;
            this.dragHasMoved = false; // Reset move tracker
            this.dragStartX = e.clientX;

            // Global listeners for drag/up
            const moveHandler = (ev) => this.handleDragMove(ev);
            const upHandler = (ev) => {
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', upHandler);
                this.handleDragEnd(ev, index);
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
        }
    }

    handleDragMove(e) {
        if (!this.isDragging) return;

        const dx = Math.abs(e.clientX - this.dragStartX);
        if (dx > 2) {
            this.dragHasMoved = true;
        }

        const rect = this.editorEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let pos = x / rect.width;
        pos = Math.max(0, Math.min(1, pos));

        this.state[this.draggedStopIndex].position = pos;

        // Live update visuals (no sort to keep index stable)
        this.updateVisuals(false);
        this.emitChange();
    }

    handleDragEnd(e, index) {
        this.isDragging = false;

        // If we didn't move significantly, treat as Click -> Open Picker
        if (!this.dragHasMoved) {
            this.openColorPicker(index);
        } else {
            // If we did move, sort and save
            this.sortStops();
            this.updateVisuals();
            this.emitChange();
        }

        this.draggedStopIndex = -1;
    }

    openColorPicker(index) {
        this.editingStopIndex = index;
        this.colorInput.value = this.state[index].color;
        this.colorInput.click();
    }

    handleColorChange(e) {
        if (this.editingStopIndex > -1 && this.state[this.editingStopIndex]) {
            this.state[this.editingStopIndex].color = e.target.value;
            this.updateVisuals();
            this.emitChange();
        }
    }

    handleColorChangeFinal(e) {
        this.handleColorChange(e);
        this.editingStopIndex = -1;
    }

    sortStops() {
        this.state.sort((a, b) => a.position - b.position);
    }

    emitChange() {
        if (this.onChange) {
            this.onChange(JSON.parse(JSON.stringify(this.state)));
        }
    }

    updateVisuals(rebuildDOM = true) {
        // 1. Update Track Gradient CSS
        const sortedForCss = [...this.state].sort((a, b) => a.position - b.position);
        const gradientStr = sortedForCss.map(s => `${s.color} ${s.position * 100}%`).join(', ');
        this.trackEl.style.background = `linear-gradient(90deg, ${gradientStr})`;

        // 2. Update Stop Handles
        if (!rebuildDOM) {
            // Lightweight update: just move existing elements
            Array.from(this.stopsLayer.children).forEach((child, i) => {
                if (this.state[i]) {
                    child.style.left = `${this.state[i].position * 100}%`;
                    // Update the color swatch background (it's the last child in our structure)
                    const swatch = child.lastElementChild;
                    if (swatch) swatch.style.backgroundColor = this.state[i].color;
                }
            });
            return;
        }

        // Full Rebuild
        this.stopsLayer.innerHTML = '';
        this.state.forEach((stop, index) => {
            // Container for the Handle Assembly
            // Centered on the position: -translate-x-1/2
            // pointer-events-auto is CRITICAL here since parent is none
            const stopContainer = createElement('div', 'absolute top-0 bottom-0 flex flex-col items-center pointer-events-auto cursor-ew-resize group');
            stopContainer.style.left = `${stop.position * 100}%`;
            stopContainer.style.transform = 'translateX(-50%)'; // Center it
            stopContainer.style.width = '20px'; // Hit area

            // 1. Delete Button (Top) - X
            // Hidden by default, show on hover? User asked for "X above".
            const deleteBtn = createElement('div', 'w-4 h-4 text-[10px] flex items-center justify-center bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full border border-gray-600 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer');
            deleteBtn.textContent = '✕';
            deleteBtn.title = 'Remove Stop';

            deleteBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // prevent drag start
                // We handle click here manually because 'click' event might be messy with mousedown
                // Actually standard click is fine if we stop prop on mousedown
                this.removeStop(index);
            });
            // Stop mousedown propagation so it doesn't trigger track-click ADD or stop-drag MOVE
            // wait, if we stop prop, we can't drag. But this is delete button. Correct.

            // 2. Guide Line (Middle) - Crossing the track
            const line = createElement('div', 'w-0.5 h-full bg-white opacity-40 shadow-sm');
            line.style.height = '16px';
            line.style.marginTop = '0px';
            line.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';

            // 3. Color Swatch (Bottom)
            const swatch = createElement('div', 'w-3 h-3 border border-white rounded-sm shadow-md mt-0.5');
            swatch.style.backgroundColor = stop.color;

            // Assemble
            if (this.state.length > 2) {
                stopContainer.appendChild(deleteBtn);
            } else {
                // Spacing filler if no delete button
                const spacer = createElement('div', 'h-4 bg-transparent mb-0.5');
                stopContainer.appendChild(spacer);
            }
            stopContainer.appendChild(line);
            stopContainer.appendChild(swatch);

            // Events on the CONTAINER
            // Any mousedown on container starts drag
            stopContainer.addEventListener('mousedown', (e) => this.handleStopMouseDown(e, index));

            // Right click context menu
            stopContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeStop(index);
            });

            this.stopsLayer.appendChild(stopContainer);
        });
    }

    setValue(stops) {
        if (!stops || JSON.stringify(stops) === JSON.stringify(this.state)) return;
        this.state = JSON.parse(JSON.stringify(stops));
        this.updateVisuals();
    }

    getElement() {
        return this.container;
    }

    // ... Link methods same as before ...
    toggleLink() {
        this.isLinked = !this.isLinked;
        this.updateLinkVisuals();
        if (this.onLinkToggle) {
            this.onLinkToggle(this.isLinked);
        }
    }

    updateLinkVisuals() {
        if (this.isLinked) {
            this.linkBtn.classList.remove('text-gray-500', 'border-transparent');
            this.linkBtn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
        } else {
            this.linkBtn.classList.add('text-gray-500', 'border-transparent');
            this.linkBtn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
        }
    }

    setLinkActive(isActive) {
        if (this.isLinked !== isActive) {
            this.isLinked = isActive;
            this.updateLinkVisuals();
        }
    }
}
