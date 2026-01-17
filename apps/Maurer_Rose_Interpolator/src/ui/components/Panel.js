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
}
