import { createElement } from '../utils/dom.js';
import { ColorUtils } from '../../engine/math/ColorUtils.js';
import { SimpleColorPicker } from './SimpleColorPicker.js';

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

        // Internal State
        // Ensure default alpha if missing
        const initial = (value && value.length > 0) ? JSON.parse(JSON.stringify(value)) : [
            { color: '#ffffff', position: 0, alpha: 1 },
            { color: '#ff0000', position: 1, alpha: 1 }
        ];

        // Normalize state (add alpha if missing)
        this.state = initial.map(s => ({
            ...s,
            alpha: s.alpha !== undefined ? s.alpha : 1
        }));

        this.isLinked = false;
        this.draggedStopIndex = -1;
        this.dragStartX = 0;
        this.isDragging = false;
        this.dragHasMoved = false;
        this.editingStopIndex = -1;
        this.selectedStopIndex = 0;

        // Picker instance
        this.picker = new SimpleColorPicker({
            onChange: (hex, alpha) => this.handlePickerChange(hex, alpha),
            onClose: () => this.handlePickerClose()
        });

        this.render({ label });
    }

    render({ label }) {
        this.container = createElement('div', 'flex flex-col mb-4 gradient-param');

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
        this.editorEl = createElement('div', 'w-full h-12 relative select-none cursor-pointer mt-2');

        // Background Checkerboard (Track only)
        this.trackBg = createElement('div', 'absolute left-0 right-0 h-4 top-4 rounded border border-gray-600');
        this.trackBg.style.background = `
            conic-gradient(#374151 90deg, #1f2937 90deg 180deg, #374151 180deg 270deg, #1f2937 270deg)
            0 0/10px 10px
        `;

        // Gradient Preview (on top)
        this.trackEl = createElement('div', 'absolute inset-0 w-full h-full rounded');
        this.trackBg.appendChild(this.trackEl);
        this.editorEl.appendChild(this.trackBg);

        // Stops Layer
        this.stopsLayer = createElement('div', 'absolute inset-0 w-full h-full pointer-events-none');
        this.editorEl.appendChild(this.stopsLayer);

        this.container.appendChild(this.editorEl);

        // --- Events ---
        this.editorEl.addEventListener('mousedown', (e) => this.handleTrackMouseDown(e));

        // Initial selection setup
        this.updateVisuals();
    }

    handleTrackMouseDown(e) {
        // Add Stop Logic
        const rect = this.editorEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let pos = x / rect.width;
        pos = Math.max(0, Math.min(1, pos));

        // Add Stop 
        this.addStop(pos, '#ffffff', 1);
    }

    addStop(position, color, alpha = 1) {
        const newStop = { position, color, alpha };
        this.state.push(newStop);
        this.sortStops();

        const index = this.state.indexOf(newStop);
        this.selectStop(index);

        this.updateVisuals();
        this.emitChange();

        // Open Picker for new stop
        setTimeout(() => this.openPickerForIndex(index), 10);
    }

    removeStop(index) {
        if (this.state.length <= 2) return;

        if (this.editingStopIndex === index) this.picker.close();

        this.state.splice(index, 1);

        // Adjust selection
        if (this.selectedStopIndex === index) {
            this.selectStop(-1);
        } else if (this.selectedStopIndex > index) {
            this.selectedStopIndex--;
        }

        this.updateVisuals();
        this.emitChange();
    }

    selectStop(index) {
        this.selectedStopIndex = index;
        this.updateVisuals(false);
    }

    handleStopMouseDown(e, index) {
        e.stopPropagation();

        // Select this stop
        this.selectStop(index);

        if (e.button === 0) {
            this.draggedStopIndex = index;
            this.isDragging = true;
            this.dragHasMoved = false;
            this.dragStartX = e.clientX;

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
        if (dx > 2) this.dragHasMoved = true;

        const rect = this.editorEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let pos = x / rect.width;
        pos = Math.max(0, Math.min(1, pos));

        this.state[this.draggedStopIndex].position = pos;

        if (this.editingStopIndex > -1) {
            this.picker.close();
            this.editingStopIndex = -1;
        }

        this.updateVisuals(false);
        this.emitChange();
    }

    handleDragEnd(e, index) {
        this.isDragging = false;

        if (!this.dragHasMoved) {
            this.openPickerForIndex(index);
        } else {
            const selectedStopObj = this.state[this.selectedStopIndex];
            this.sortStops();
            this.selectedStopIndex = this.state.indexOf(selectedStopObj);

            this.updateVisuals();
            this.emitChange();
        }

        this.draggedStopIndex = -1;
    }

    openPickerForIndex(index) {
        this.editingStopIndex = index;
        const stop = this.state[index];

        // Calculate Position relative to Handle
        const trackRect = this.trackBg.getBoundingClientRect();
        const x = trackRect.left + (trackRect.width * stop.position);
        const y = trackRect.bottom + 5;

        this.picker.show(x, y, stop.color, stop.alpha);
        this.updateVisuals(false);
    }

    handlePickerChange(hex, alpha) {
        if (this.editingStopIndex > -1 && this.state[this.editingStopIndex]) {
            const stop = this.state[this.editingStopIndex];
            stop.color = hex;
            stop.alpha = alpha;
            this.updateVisuals(false);
            this.emitChange();
        }
    }

    handlePickerClose() {
        this.editingStopIndex = -1;
        this.updateVisuals(false);
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

        const gradientStr = sortedForCss.map(s => {
            const rgb = ColorUtils.hexToRgb(s.color);
            const alpha = s.alpha !== undefined ? s.alpha : 1;
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${s.position * 100}%`;
        }).join(', ');

        this.trackEl.style.background = `linear-gradient(90deg, ${gradientStr})`;

        // 2. Update Stop Handles
        if (!rebuildDOM) {
            Array.from(this.stopsLayer.children).forEach((child, i) => {
                const stop = this.state[i];
                if (stop) {
                    child.style.left = `${stop.position * 100}%`;

                    const swatch = child.querySelector('.swatch');
                    if (swatch) {
                        const rgb = ColorUtils.hexToRgb(stop.color);
                        const alpha = stop.alpha !== undefined ? stop.alpha : 1;
                        swatch.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                    }

                    const isEditing = (i === this.editingStopIndex);
                    const isSelected = (i === this.selectedStopIndex);

                    child.classList.toggle('z-10', isSelected || isEditing);
                    const line = child.querySelector('.guideline');
                    if (line) {
                        line.style.opacity = (isSelected || isEditing) ? '1' : '0.4';
                        line.style.boxShadow = (isSelected || isEditing) ? '0 0 4px white' : '0 0 2px rgba(0,0,0,0.5)';
                    }
                }
            });
            return;
        }

        // Full Rebuild
        this.stopsLayer.innerHTML = '';
        this.state.forEach((stop, index) => {
            const stopContainer = createElement('div', 'absolute top-0 bottom-0 flex flex-col items-center pointer-events-auto cursor-ew-resize group');
            stopContainer.style.left = `${stop.position * 100}%`;
            stopContainer.style.transform = 'translateX(-50%)';
            stopContainer.style.width = '20px';

            // Delete Btn
            const deleteBtn = createElement('div', 'w-4 h-4 text-[10px] flex items-center justify-center bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full border border-gray-600 opacity-100 transition-opacity cursor-pointer');
            deleteBtn.textContent = '✕';
            deleteBtn.title = 'Remove Stop';
            deleteBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.removeStop(index);
            });

            // Guide Line
            const line = createElement('div', 'guideline w-0.5 h-full bg-white shadow-sm transition-opacity');
            line.style.height = '16px';
            line.style.marginTop = '0px';
            line.style.opacity = (index === this.selectedStopIndex) ? '1' : '0.4';
            line.style.boxShadow = (index === this.selectedStopIndex) ? '0 0 4px white' : '0 0 2px rgba(0,0,0,0.5)';

            // Swatch
            const swatch = createElement('div', 'swatch w-3 h-3 border border-white rounded-sm shadow-md mt-0.5 cursor-pointer');
            const rgb = ColorUtils.hexToRgb(stop.color);
            const alpha = stop.alpha !== undefined ? stop.alpha : 1;
            swatch.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

            // Assemble
            if (this.state.length > 2) {
                stopContainer.appendChild(deleteBtn);
            } else {
                const spacer = createElement('div', 'h-4 bg-transparent mb-0.5');
                stopContainer.appendChild(spacer);
            }
            stopContainer.appendChild(line);
            stopContainer.appendChild(swatch);

            // Events
            stopContainer.addEventListener('mousedown', (e) => this.handleStopMouseDown(e, index));
            stopContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeStop(index);
            });

            if (index === this.selectedStopIndex) stopContainer.classList.add('z-10');

            this.stopsLayer.appendChild(stopContainer);
        });
    }

    setValue(stops) {
        if (!stops || JSON.stringify(stops) === JSON.stringify(this.state)) return;

        const incoming = (stops && stops.length > 0) ? stops : [
            { color: '#ffffff', position: 0, alpha: 1 },
            { color: '#ff0000', position: 1, alpha: 1 }
        ];

        this.state = incoming.map(s => ({
            ...s,
            alpha: s.alpha !== undefined ? s.alpha : 1
        }));

        if (this.selectedStopIndex >= this.state.length) this.selectedStopIndex = 0;
        this.updateVisuals();
    }

    getElement() { return this.container; }
    toggleLink() {
        this.isLinked = !this.isLinked;
        this.updateLinkVisuals();
        if (this.onLinkToggle) this.onLinkToggle(this.isLinked);
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
