import { createElement } from '../utils/dom.js';

export class Accordion {
    constructor(title, isOpen = false, onToggle = null, id = null) {
        this.title = title;
        this.isOpen = isOpen;
        this.onToggle = onToggle;
        this.id = id;
        this.element = this.render();
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.content.style.display = this.isOpen ? 'block' : 'none';
        // Open: Down (0deg), Closed: Right (-90deg)
        this.icon.style.transform = this.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
        if (this.onToggle) this.onToggle(this.isOpen, this.id);
    }

    setTitle(newTitle) {
        this.title = newTitle;
        if (this.titleEl) {
            this.titleEl.textContent = newTitle;
        }
    }

    render() {
        const container = createElement('div', 'border-b border-gray-700 mb-2');

        // Header
        this.header = createElement('div', 'flex justify-between items-center p-2 cursor-pointer bg-gray-800 hover:bg-gray-700 select-none');
        this.header.addEventListener('click', () => this.toggle());

        this.titleEl = createElement('span', 'font-bold text-sm uppercase tracking-wider text-gray-200', { textContent: this.title });
        // Using '▼' (Down) as base.
        // Open: rotate(0deg) = Down
        // Closed: rotate(-90deg) = Right
        this.icon = createElement('span', 'transition-transform duration-200 text-lg leading-none', { textContent: '▼' });

        // Initial State
        this.icon.style.transform = this.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';

        // Actions container (between title and expand arrow)
        this.actionsContainer = createElement('div', 'flex items-center gap-1 ml-auto mr-2');

        this.header.appendChild(this.titleEl);
        this.header.appendChild(this.actionsContainer);
        this.header.appendChild(this.icon);

        // Content
        this.content = createElement('div', 'p-2 bg-gray-900', {
            style: this.isOpen ? 'display: block' : 'display: none'
        });

        container.appendChild(this.header);
        container.appendChild(this.content);

        return container;
    }

    /**
     * Add a clickable action button to the accordion header.
     * Uses the same styling as the link/play buttons in ParamNumber etc.
     * @param {string} innerHTML - SVG or content for the button
     * @param {Function} onClick - Click handler (receives the click event)
     * @param {string} [tooltip] - Optional tooltip text
     * @returns {HTMLElement} The created button element
     */
    addHeaderAction(innerHTML, onClick, tooltip) {
        const btn = createElement('button', 'p-1 rounded hover:bg-gray-600 text-gray-500 transition-colors border border-transparent');
        btn.innerHTML = innerHTML;
        btn.title = tooltip || '';
        btn.style.lineHeight = '0';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(e);
        });
        this.actionsContainer.appendChild(btn);
        return btn;
    }

    /**
     * Add an eye toggle button to the accordion header for layer visibility.
     * Uses SVG icons matching the existing icon style (link, play, etc.)
     * @param {boolean} initialState - Initial visibility state (true = visible)
     * @param {Function} onToggle - Called with (isVisible) when toggled
     * @returns {{ element: HTMLElement, setActive: Function }} Control object
     */
    addEyeToggle(initialState, onToggle) {
        const eyeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

        let active = initialState;
        const btn = this.addHeaderAction(eyeSvg, () => {
            active = !active;
            updateVisual();
            onToggle(active);
        }, 'Toggle visibility');

        const updateVisual = () => {
            if (active) {
                btn.classList.remove('text-gray-500', 'border-transparent');
                btn.classList.add('text-green-400', 'bg-gray-700', 'border-green-400');
            } else {
                btn.classList.remove('text-green-400', 'bg-gray-700', 'border-green-400');
                btn.classList.add('text-gray-500', 'border-transparent');
            }
        };

        updateVisual();

        return {
            element: btn,
            setActive(val) {
                active = val;
                updateVisual();
            }
        };
    }

    /**
     * Add a labeled eye toggle with a tiny label underneath (e.g. 'A' or 'B').
     * @param {boolean} initialState - Initial visibility state
     * @param {Function} onToggle - Called with (isVisible) when toggled
     * @param {string} label - Short label text shown below the eye icon
     * @returns {{ element: HTMLElement, setActive: Function }} Control object
     */
    addLabeledEyeToggle(initialState, onToggle, label) {
        const eyeToggle = this.addEyeToggle(initialState, onToggle);
        // Wrap the button with a label below
        const wrapper = createElement('div', 'flex flex-col items-center');
        wrapper.style.gap = '0';
        eyeToggle.element.parentNode.replaceChild(wrapper, eyeToggle.element);
        wrapper.appendChild(eyeToggle.element);
        const labelEl = createElement('span', 'text-gray-500 leading-none', { textContent: label });
        labelEl.style.cssText = 'font-size: 8px; margin-top: -1px; user-select: none;';
        wrapper.appendChild(labelEl);
        return eyeToggle;
    }

    append(child) {
        this.content.appendChild(child);
    }
}
