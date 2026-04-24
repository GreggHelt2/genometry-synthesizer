import { createElement } from '../utils/dom.js';

/**
 * TabStrip — A horizontal tab strip component that shows one content panel at a time.
 * 
 * Each tab can optionally have an eye toggle for layer visibility. Selecting a tab
 * switches the visible content panel. Eye toggles operate independently of tab selection.
 *
 * Usage:
 *   const tabs = new TabStrip([
 *     { id: 'chordal', label: 'Chordal', eyeToggle: true, eyeDefault: true, content: chordalDiv },
 *     { id: 'vertex',  label: 'Vertex',  eyeToggle: true, eyeDefault: false, content: vertexDiv },
 *     { id: 'general', label: 'General', content: generalDiv }
 *   ], {
 *     onTabChange: (tabId) => { ... },
 *     onEyeToggle: (tabId, isOn) => { ... },
 *     persistKey: 'rosette-appearance'
 *   });
 */
export class TabStrip {
    /**
     * @param {Array<Object>} tabs - Tab definitions
     * @param {string} tabs[].id - Unique tab identifier
     * @param {string} tabs[].label - Display label
     * @param {boolean} [tabs[].eyeToggle=false] - Whether this tab has an eye toggle
     * @param {boolean} [tabs[].eyeDefault=false] - Default eye state
     * @param {HTMLElement} tabs[].content - Content element to show when tab is active
     * @param {Object} [options]
     * @param {Function} [options.onTabChange] - (tabId) => void
     * @param {Function} [options.onEyeToggle] - (tabId, isOn) => void
     * @param {string} [options.persistKey] - Key for persistence
     */
    constructor(tabs, options = {}) {
        this.tabs = tabs;
        this.tabOrder = tabs.map(t => t.id);
        this.onTabChange = options.onTabChange || null;
        this.onEyeToggle = options.onEyeToggle || null;
        this.persistKey = options.persistKey || null;

        this.activeTab = tabs[0]?.id || null;
        this.eyeStates = {};
        this.tabButtons = {};
        this.tabContents = {};

        // Initialize eye states
        tabs.forEach(t => {
            if (t.eyeToggle) {
                this.eyeStates[t.id] = t.eyeDefault !== undefined ? t.eyeDefault : false;
            }
        });

        this.element = this.render();
    }

    render() {
        const container = createElement('div', 'tab-strip-container');

        // Tab button row — scrollable horizontal
        this.tabRow = createElement('div', 'flex overflow-x-auto');
        this.tabRow.style.cssText = `
            gap: 1px;
            background: rgba(0,0,0,0.3);
            border-bottom: 1px solid rgba(255,255,255,0.08);
            scrollbar-width: none;
            -ms-overflow-style: none;
        `;
        // Hide scrollbar for webkit
        const style = document.createElement('style');
        style.textContent = `.tab-strip-row::-webkit-scrollbar { display: none; }`;
        container.appendChild(style);
        this.tabRow.classList.add('tab-strip-row');

        this.tabs.forEach(tab => {
            const btn = this.createTabButton(tab);
            this.tabButtons[tab.id] = btn;
            this.tabRow.appendChild(btn);
        });

        container.appendChild(this.tabRow);

        // Content container — shows only active tab's content
        this.contentContainer = createElement('div', 'tab-strip-content');
        this.tabs.forEach(tab => {
            this.tabContents[tab.id] = tab.content;
            tab.content.style.display = tab.id === this.activeTab ? 'block' : 'none';
            this.contentContainer.appendChild(tab.content);
        });

        container.appendChild(this.contentContainer);

        return container;
    }

    createTabButton(tab) {
        const btn = createElement('button', 'flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors whitespace-nowrap');
        btn.style.cssText = `
            background: rgba(30,30,50,0.8);
            color: #9ca3af;
            border: none;
            cursor: pointer;
            flex-shrink: 0;
            min-width: 0;
            border-bottom: 2px solid transparent;
        `;

        // Eye toggle (if applicable) — uses same SVG + green highlight as Accordion
        if (tab.eyeToggle) {
            const eyeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            const eyeBtn = createElement('span', 'inline-flex items-center justify-center cursor-pointer rounded border transition-colors');
            eyeBtn.style.cssText = 'width: 18px; height: 18px; margin-right: 3px; flex-shrink: 0;';
            eyeBtn.innerHTML = eyeSvg;
            eyeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEye(tab.id);
            });
            btn._eyeEl = eyeBtn;
            btn.appendChild(eyeBtn);
            // Apply initial visual
            this._applyEyeVisual(eyeBtn, this.eyeStates[tab.id]);
        }

        // Label
        const labelSpan = createElement('span', '', { textContent: tab.label });
        btn.appendChild(labelSpan);

        // Click to activate tab
        btn.addEventListener('click', () => {
            this.setActiveTab(tab.id);
        });

        // Apply active styling for default tab
        if (tab.id === this.activeTab) {
            this.applyActiveStyle(btn);
        }

        return btn;
    }

    applyActiveStyle(btn) {
        btn.style.background = 'rgba(50,50,80,0.9)';
        btn.style.color = '#e5e7eb';
        btn.style.borderBottomColor = '#818cf8';
    }

    applyInactiveStyle(btn) {
        btn.style.background = 'rgba(30,30,50,0.8)';
        btn.style.color = '#9ca3af';
        btn.style.borderBottomColor = 'transparent';
    }

    /**
     * Switch to a specific tab.
     * @param {string} tabId
     */
    setActiveTab(tabId) {
        if (tabId === this.activeTab) return;
        if (!this.tabButtons[tabId]) return;

        // Deactivate old
        if (this.activeTab && this.tabButtons[this.activeTab]) {
            this.applyInactiveStyle(this.tabButtons[this.activeTab]);
            if (this.tabContents[this.activeTab]) {
                this.tabContents[this.activeTab].style.display = 'none';
            }
        }

        // Activate new
        this.activeTab = tabId;
        this.applyActiveStyle(this.tabButtons[tabId]);
        if (this.tabContents[tabId]) {
            this.tabContents[tabId].style.display = 'block';
        }

        if (this.onTabChange) this.onTabChange(tabId);
    }

    /**
     * @returns {string} Current active tab ID
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * Toggle the eye state for a tab.
     * @param {string} tabId
     */
    toggleEye(tabId) {
        if (this.eyeStates[tabId] === undefined) return;
        this.eyeStates[tabId] = !this.eyeStates[tabId];
        this.syncEyeVisual(tabId);
        if (this.onEyeToggle) this.onEyeToggle(tabId, this.eyeStates[tabId]);
    }

    /**
     * Set eye state for a tab programmatically.
     * @param {string} tabId
     * @param {boolean} isOn
     */
    setEyeState(tabId, isOn) {
        if (this.eyeStates[tabId] === undefined) return;
        this.eyeStates[tabId] = isOn;
        this.syncEyeVisual(tabId);
    }

    syncEyeVisual(tabId) {
        const btn = this.tabButtons[tabId];
        if (!btn || !btn._eyeEl) return;
        this._applyEyeVisual(btn._eyeEl, this.eyeStates[tabId]);
        // Dim the tab label when eye is off
        const label = btn.querySelector('span:last-child');
        if (label) {
            label.style.opacity = this.eyeStates[tabId] ? '1' : '0.4';
        }
    }

    _applyEyeVisual(eyeEl, isActive) {
        if (isActive) {
            eyeEl.style.color = '#4ade80';       // green-400
            eyeEl.style.borderColor = '#4ade80';
            eyeEl.style.background = 'rgba(55,65,81,0.8)'; // gray-700
        } else {
            eyeEl.style.color = '#6b7280';       // gray-500
            eyeEl.style.borderColor = 'transparent';
            eyeEl.style.background = 'transparent';
        }
    }
}
