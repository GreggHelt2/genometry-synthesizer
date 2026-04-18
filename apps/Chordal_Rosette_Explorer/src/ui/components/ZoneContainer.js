import { createElement } from '../utils/dom.js';

/**
 * ZoneContainer — A collapsible zone wrapper that groups related accordion sections.
 * 
 * Provides a subtle visual grouping header (icon + title in colored text) with
 * optional collapse/expand behavior. When collapsed, all child content is hidden.
 * 
 * Usage:
 *   const zone = new ZoneContainer('Geometry', '🔷', { color: '#60a5fa', collapsible: false });
 *   zone.append(coreParamsSection.element);
 *   zone.append(sequencerSection.element);
 *   controlsContainer.appendChild(zone.element);
 */
export class ZoneContainer {
    /**
     * @param {string} title - Zone title text (e.g., 'Geometry', 'Style', 'Analysis')
     * @param {string} icon - Emoji or text icon (e.g., '🔷', '🎨', '📊')
     * @param {Object} [options]
     * @param {string} [options.color='#9ca3af'] - CSS color for the zone header text
     * @param {boolean} [options.collapsible=false] - Whether the zone header is clickable to collapse
     * @param {boolean} [options.defaultCollapsed=false] - Start collapsed (only if collapsible)
     * @param {Function} [options.onToggle] - Callback (isOpen, zoneId) when toggled
     * @param {string} [options.id] - Unique ID for persistence
     */
    constructor(title, icon, options = {}) {
        this.title = title;
        this.icon = icon;
        this.color = options.color || '#9ca3af';
        this.collapsible = options.collapsible || false;
        this.isOpen = !(options.defaultCollapsed && options.collapsible);
        this.onToggle = options.onToggle || null;
        this.id = options.id || null;

        this.element = this.render();
    }

    render() {
        const container = createElement('div', 'zone-container');

        // Zone Header
        this.header = createElement('div', 'flex items-center gap-2 px-3 py-1.5 select-none');
        this.header.style.cssText = `
            border-bottom: 1px solid rgba(255,255,255,0.06);
            background: rgba(255,255,255,0.02);
        `;

        if (this.collapsible) {
            this.header.style.cursor = 'pointer';
            this.header.addEventListener('click', () => this.toggle());
        }

        // Collapse indicator (only for collapsible zones)
        if (this.collapsible) {
            this.collapseIcon = createElement('span', 'text-xs transition-transform duration-200', {
                textContent: '▼'
            });
            this.collapseIcon.style.color = this.color;
            this.collapseIcon.style.opacity = '0.5';
            this.collapseIcon.style.transform = this.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
            this.header.appendChild(this.collapseIcon);
        }

        // Icon
        const iconEl = createElement('span', 'text-sm', { textContent: this.icon });
        this.header.appendChild(iconEl);

        // Title
        const titleEl = createElement('span', 'text-[10px] font-semibold uppercase tracking-widest', {
            textContent: this.title
        });
        titleEl.style.color = this.color;
        this.header.appendChild(titleEl);

        container.appendChild(this.header);

        // Zone Body — holds child accordion elements
        this.body = createElement('div', '');
        this.body.style.display = this.isOpen ? 'block' : 'none';
        container.appendChild(this.body);

        return container;
    }

    /**
     * Toggle the zone open/closed (only works if collapsible).
     */
    toggle() {
        if (!this.collapsible) return;
        this.isOpen = !this.isOpen;
        this.body.style.display = this.isOpen ? 'block' : 'none';
        if (this.collapseIcon) {
            this.collapseIcon.style.transform = this.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
        }
        if (this.onToggle) this.onToggle(this.isOpen, this.id);
    }

    /**
     * Set open/closed state without triggering onToggle callback.
     * Used for restoring persisted state.
     * @param {boolean} isOpen
     */
    setOpen(isOpen) {
        if (this.isOpen === isOpen) return;
        this.isOpen = isOpen;
        this.body.style.display = this.isOpen ? 'block' : 'none';
        if (this.collapseIcon) {
            this.collapseIcon.style.transform = this.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
        }
    }

    /**
     * Append a child element to the zone body.
     * @param {HTMLElement} child
     */
    append(child) {
        this.body.appendChild(child);
    }
}
