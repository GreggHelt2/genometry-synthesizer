import Grapick from 'grapick';
import 'grapick/dist/grapick.min.css';
import { createElement } from '../utils/dom.js';
import { ColorUtils } from '../../engine/math/ColorUtils.js';

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
        this.isUpdating = false;
        this.isInternalUpdate = false;
        // Initialize with default stops if empty (handles missing state)
        if (!value || value.length === 0) {
            this.lastValue = [
                { color: '#ffffff', position: 0 },
                { color: '#ff0000', position: 1 }
            ];
            // Notify parent of default initialization so it persists
            if (this.onChange) {
                // Defer slightly to ensure component is ready? 
                // Or just fire. React/Redux usually handles immediate updates ok, but 
                // in vanilla custom setup, immediate dispatch might race.
                // But since we are inside constructor, it might be safer to just set lastValue 
                // and let the next interaction or save cycle pick it up?
                // NO, if we don't dispatch, the state remains empty until user interacts.
                // Better to dispatch.
                setTimeout(() => this.onChange(this.lastValue), 0);
            }
        } else {
            this.lastValue = value;
        }

        this.isLinked = false;

        this.render({ label });
        this.setValue(this.lastValue);
    }

    render({ label }) {
        this.container = createElement('div', 'flex flex-col mb-3 gradient-param');

        // Header: Label + Link
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

        // Grapick container
        this.grapickEl = createElement('div', 'w-full h-8 relative');
        // Custom styling to match app theme
        this.grapickEl.style.cssText = `
            background: #1f2937;
            border-radius: 4px;
            border: 1px solid #374151;
        `;
        this.container.appendChild(this.grapickEl);

        // Initialize Grapick
        this.gp = new Grapick({
            el: this.grapickEl,
            min: 0,
            max: 100, // Grapick works in percentages usually
            direction: '90deg', // Horizontal visual
            height: '100%',
        });

        // Event Handling
        this.gp.on('change', (complete) => {
            if (this.isUpdating) return;

            // Sanitize handlers IN-PLACE to prevent Grapick from holding invalid values
            // that might crash its own or our UI elements.
            let sanitized = false;
            this.gp.getHandlers().forEach(h => {
                let color = h.getColor();
                if (color.startsWith('rgb')) {
                    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    if (match) {
                        const r = parseInt(match[1]);
                        const g = parseInt(match[2]);
                        const b = parseInt(match[3]);
                        const hex = ColorUtils.rgbToHex(r, g, b);

                        // Force update handler to Hex
                        // Verify it's actually different to avoid redundant updates?
                        // rgb vs hex is different string, so yes.

                        // Temporarily suppress isUpdating to avoid recursion from this sanitization
                        // Actually, we want to suppress the *result* of this set.
                        // But we are inside a change event. 
                        // We must set isUpdating = true for the duration of these sets.
                        this.isUpdating = true;
                        h.setColor(hex);
                        this.isUpdating = false;
                        sanitized = true;
                    }
                }
            });

            // If we just sanitized, Grapick state is now clean. 
            // We can proceed to read it.
            // Note: h.setColor might trigger change sync? Grapick is synchronous usually.

            // Convert Grapick stops to our format
            const stops = this.gp.getHandlers().map(h => {
                return {
                    color: h.getColor(), // Should be hex now
                    position: h.getPosition() / 100
                };
            });

            // Sort by position to be safe
            stops.sort((a, b) => a.position - b.position);

            if (this.onChange) {
                this.isInternalUpdate = true;
                this.onChange(stops);
                this.isInternalUpdate = false;
            }
        });

        // Handle Color Selection (Custom Trigger)
        // Grapick handlers are clickable. We can intercept or use its built-in handler select event.
        // Grapick doesn't have a built-in picker; it expects you to plug one in.
        // We'll create a hidden native color input to bridge this.

        this.tempColorInput = createElement('input', 'absolute opacity-0 w-0 h-0 pointer-events-none', { type: 'color' });
        this.container.appendChild(this.tempColorInput);
        this.activeHandler = null;

        this.gp.on('handler:select', (handler) => {
            this.activeHandler = handler;
            let color = handler.getColor();

            // Check if rgba and convert to hex if needed
            if (color.startsWith('rgb')) {
                // We need a helper for this. 
                // Since we can't easily import ColorUtils inside method if not imported at top,
                // let's assume we import it.
                // Or quick hack: use a temp element to convert? No, use ColorUtils.
                // But ColorUtils might not handle rgba string parsing easily if it expects separate r,g,b.
                // ColorUtils.rgbToHex expects 3 numbers.

                // Let's import ColorUtils first.
                // Assuming we added the import.

                const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (match) {
                    const r = parseInt(match[1]);
                    const g = parseInt(match[2]);
                    const b = parseInt(match[3]);
                    color = ColorUtils.rgbToHex(r, g, b);
                }
            }

            this.tempColorInput.value = color;
            // Trigger native picker
            this.tempColorInput.click();
        });

        this.tempColorInput.addEventListener('input', (e) => {
            if (this.activeHandler) {
                this.activeHandler.setColor(e.target.value);
                // Trigger change manually as setColor might not trigger 'change' completely in all versions?
                // Grapick usually triggers change on setColor.
            }
        });

        // Add default hooks for interactions
        this.gp.setColorPicker(handler => {
            // This is called when a handler is clicked if configured, 
            // but we used handler:select event above which is more explicit.
        });
    }

    getElement() {
        return this.container;
    }

    setValue(stops) {
        // Defaults is safer for UX to prevent empty state.
        const effectiveStops = (stops && stops.length > 0) ? stops : [
            { color: '#ffffff', position: 0 },
            { color: '#ff0000', position: 1 }
        ];

        // Avoid infinite loops if value is same
        if (JSON.stringify(effectiveStops) === JSON.stringify(this.lastValue) && this.gp.getHandlers().length > 0) return;

        this.lastValue = effectiveStops;

        // If this update was triggered by our own interaction (e.g. dragging), 
        // do NOT destroy/recreate handlers, as that breaks the active drag in Grapick.
        if (this.isInternalUpdate) return;

        // Prevent event loop
        this.isUpdating = true;

        // Simple syncing:
        // Remove all
        const handlers = [...this.gp.getHandlers()];
        handlers.forEach(h => h.remove());

        // Add new
        effectiveStops.forEach(s => {
            this.gp.addHandler(s.position * 100, s.color);
        });

        this.isUpdating = false;
    }

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
