import { createElement } from '../utils/dom.js';

export class Panel {
    constructor(id, title) {
        this.id = id;
        this.title = title;
        this.element = this.createContainer();
    }

    createContainer() {
        return createElement('div', 'flex flex-col h-full bg-gray-900 text-white overflow-y-auto w-full border-r border-gray-700');
    }

    mount(parent) {
        if (typeof parent === 'string') {
            document.querySelector(parent).appendChild(this.element);
        } else {
            parent.appendChild(this.element);
        }
    }

    alignLabels(container) {
        if (!container) return;

        // Reset widths to auto to get natural width
        const labels = container.querySelectorAll('.param-label');
        if (labels.length === 0) return;

        labels.forEach(el => el.style.width = 'auto');

        // Find max width
        let maxWidth = 0;
        labels.forEach(el => {
            const w = el.getBoundingClientRect().width;
            if (w > maxWidth) maxWidth = w;
        });

        // Apply max width
        if (maxWidth > 0) {
            labels.forEach(el => el.style.width = `${Math.ceil(maxWidth)}px`);
        }
    }
}
