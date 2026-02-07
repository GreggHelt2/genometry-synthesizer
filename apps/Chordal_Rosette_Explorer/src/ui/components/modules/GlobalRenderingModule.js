import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamColor } from '../ParamColor.js';
import { ParamToggle } from '../ParamToggle.js';
import { store } from '../../../engine/state/Store.js';

export class GlobalRenderingModule {
    constructor(orchestrator, roseId, actionType, keys = {}) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;
        this.actionType = actionType;
        this.keys = Object.assign({
            autoScale: 'autoScale',
            scaleLineWidth: 'scaleLineWidth',
            backgroundOpacity: 'backgroundOpacity',
            backgroundColor: 'backgroundColor'
        }, keys);

        this.container = document.createElement('div');
        this.container.className = 'flex flex-col gap-1';
        this.controls = {};
        this.render();
    }

    render() {
        // 1. Auto Scale
        this.controls.autoScale = new ParamToggle({
            key: this.keys.autoScale,
            label: 'Auto Scale',
            value: false,
            onChange: (val) => this.dispatch(this.keys.autoScale, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.autoScale, isActive, this.controls.autoScale)
        });
        this.initLinkState(this.keys.autoScale, this.controls.autoScale);
        this.container.appendChild(this.controls.autoScale.getElement());

        // 2. Scale Line Width
        this.controls.scaleLineWidth = new ParamToggle({
            key: this.keys.scaleLineWidth,
            label: 'Scale Line Width',
            value: true,
            onChange: (val) => this.dispatch(this.keys.scaleLineWidth, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.scaleLineWidth, isActive, this.controls.scaleLineWidth)
        });
        this.initLinkState(this.keys.scaleLineWidth, this.controls.scaleLineWidth);
        this.container.appendChild(this.controls.scaleLineWidth.getElement());

        // 3. Background Opacity
        this.controls.backgroundOpacity = this.createSlider(this.keys.backgroundOpacity, 0, 1, 0.01, 'Background Opacity');
        this.container.appendChild(this.controls.backgroundOpacity.container);

        // 4. Background Color
        this.controls.backgroundColor = new ParamColor({
            key: this.keys.backgroundColor,
            label: 'Background Color',
            value: '#000000',
            onChange: (val) => this.dispatch(this.keys.backgroundColor, val)
        });
        this.container.appendChild(this.controls.backgroundColor.getElement());
    }

    createSlider(key, min, max, step, label) {
        const paramGui = new ParamNumber({
            key: key,
            label: label,
            min: min,
            max: max,
            step: step,
            value: min,
            onChange: (val) => this.dispatch(key, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(key, isActive, paramGui)
        });

        this.initLinkState(key, paramGui);

        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(paramGui);
        }

        return {
            container: paramGui.getElement(),
            instance: paramGui
        };
    }

    handleLinkToggle(key, isActive, control) {
        const myKey = `${this.roseId}.${key}`;
        const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
        const otherKey = `${otherRoseId}.${key}`;

        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const linked = linkManager.toggleLink(myKey, otherKey);
            if (linked !== isActive) {
                control.setLinkActive(linked);
            }
        });
    }

    initLinkState(key, control) {
        const myKey = `${this.roseId}.${key}`;
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            if (linkManager.isLinked(myKey)) {
                control.setLinkActive(true);
            }
        });
    }

    updateLinkVisuals() {
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            Object.keys(this.controls).forEach(k => {
                const control = this.controls[k];
                let instance = control;
                if (control.instance) instance = control.instance;

                if (instance && typeof instance.setLinkActive === 'function') {
                    const paramKey = this.keys[k];
                    if (paramKey) {
                        const fullKey = `${this.roseId}.${paramKey}`;
                        instance.setLinkActive(linkManager.isLinked(fullKey));
                    }
                }
            });
        });
    }

    dispatch(key, val) {
        store.dispatch({
            type: this.actionType,
            payload: { [key]: val }
        });
    }

    update(params) {
        if (this.controls.autoScale) this.controls.autoScale.setValue(params[this.keys.autoScale] || false);
        if (this.controls.scaleLineWidth) this.controls.scaleLineWidth.setValue(params[this.keys.scaleLineWidth] !== false);
        if (this.controls.backgroundOpacity) this.controls.backgroundOpacity.instance.setValue(params[this.keys.backgroundOpacity] ?? 0);
        if (this.controls.backgroundColor) this.controls.backgroundColor.setValue(params[this.keys.backgroundColor] || '#000000');
    }
}
