import { createElement } from '../utils/dom.js';

export class Accordion {
    constructor(title, isOpen = false, onToggle = null) {
        this.title = title;
        this.isOpen = isOpen;
        this.onToggle = onToggle;
        this.element = this.render();
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.content.style.display = this.isOpen ? 'block' : 'none';
        this.icon.style.transform = this.isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        if (this.onToggle) this.onToggle(this.isOpen);
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
        const header = createElement('div', 'flex justify-between items-center p-2 cursor-pointer bg-gray-800 hover:bg-gray-700 select-none');
        header.addEventListener('click', () => this.toggle());

        this.titleEl = createElement('span', 'font-bold text-sm', { textContent: this.title });
        this.icon = createElement('span', 'transition-transform duration-200 text-xs', { textContent: '▼' }); // simple arrow
        if (this.isOpen) this.icon.style.transform = 'rotate(180deg)';

        header.appendChild(this.titleEl);
        header.appendChild(this.icon);

        // Content
        this.content = createElement('div', 'p-2 bg-gray-900', {
            style: this.isOpen ? 'display: block' : 'display: none'
        });

        container.appendChild(header);
        container.appendChild(this.content);

        return container;
    }

    append(child) {
        this.content.appendChild(child);
    }
}
