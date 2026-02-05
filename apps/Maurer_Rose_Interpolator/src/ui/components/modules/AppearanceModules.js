import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamColor } from '../ParamColor.js';
import { ParamToggle } from '../ParamToggle.js';
import { store } from '../../../engine/state/Store.js';

// Mixin pattern or just factory functions? 
// Classes are better for maintaining state references if needed.

export class LayerRenderingModule {
    /**
     * Creates standard rendering controls: Color Method, Color, Blend Mode, Opacity, Line Width, Anti-Alias
     * @param {Object} orchestrator - Parent panel implementation
     * @param {string} roseId - ID prefix for persistence keys if needed (e.g. 'rosetteA')
     * @param {string} actionType - Redux action type to dispatch
     * @param {Object} keys - Map of internal param keys to state keys (allow remapping)
     * @param {Object} options - Configuration options { showToggle: { key, label, value? } }
     */
    constructor(orchestrator, roseId, actionType, keys = {}, options = {}) {
        this.orchestrator = orchestrator;
        this.roseId = roseId; // Save roseId
        this.actionType = actionType;
        this.options = options;
        this.keys = Object.assign({
            colorMethod: 'colorMethod',
            color: 'color',
            blendMode: 'blendMode',
            opacity: 'opacity',
            lineWidth: 'lineWidth',
            antiAlias: 'antiAlias'
        }, keys);

        // No own accordion, usually appended to a parent container or accordion
        this.container = document.createElement('div');
        this.container.className = 'flex flex-col gap-1';

        this.controls = {};
        this.render();
    }

    render() {
        // Optional: Show Toggle
        if (this.options.showToggle) {
            const toggleConfig = this.options.showToggle;
            this.controls.showToggle = new ParamToggle({
                key: toggleConfig.key,
                label: toggleConfig.label || 'Show',
                value: toggleConfig.value !== undefined ? toggleConfig.value : true, // Default true if not specified? Or false? Usually init from state outside.
                // Wait, modules don't normally set initial value from constructor, they rely on update().
                // But ParamToggle needs an initial value. 
                // Let's default to false to be safe, update() will fix it.
                // Actually, if we don't pass value, ParamToggle defaults to false.
                onChange: (val) => this.dispatch(toggleConfig.key, val),
                onLinkToggle: (isActive) => this.handleLinkToggle(toggleConfig.key, isActive, this.controls.showToggle)
            });
            this.initLinkState(toggleConfig.key, this.controls.showToggle);
            this.container.appendChild(this.controls.showToggle.getElement());
        }

        // 1. Color Method
        const methodOptions = [
            { value: 'solid', label: 'Single Color' },
            { value: 'length', label: 'Length' },
            { value: 'angle', label: 'Angle' },
            { value: 'sequence', label: 'Sequence' }
        ];

        this.controls.colorMethod = new ParamSelect({
            key: this.keys.colorMethod,
            label: 'Color Method',
            options: methodOptions,
            value: 'solid',
            onChange: (val) => this.dispatch(this.keys.colorMethod, val)
        });
        this.container.appendChild(this.controls.colorMethod.getElement());

        // 2. Color
        this.controls.color = new ParamColor({
            key: this.keys.color,
            label: 'Color',
            value: '#ffffff',
            onChange: (val) => this.dispatch(this.keys.color, val)
        });
        this.container.appendChild(this.controls.color.getElement());

        // 3. Blend Mode
        const blendModes = [
            { value: 'source-over', label: 'Normal' },
            { value: 'lighter', label: 'Lighter (Add)' },
            { value: 'multiply', label: 'Multiply' },
            { value: 'screen', label: 'Screen' },
            { value: 'overlay', label: 'Overlay' },
            { value: 'darken', label: 'Darken' },
            { value: 'lighten', label: 'Lighten' },
            { value: 'color-dodge', label: 'Color Dodge' },
            { value: 'color-burn', label: 'Color Burn' },
            { value: 'hard-light', label: 'Hard Light' },
            { value: 'soft-light', label: 'Soft Light' },
            { value: 'difference', label: 'Difference' },
            { value: 'exclusion', label: 'Exclusion' },
            { value: 'hue', label: 'Hue' },
            { value: 'saturation', label: 'Saturation' },
            { value: 'color', label: 'Color' },
            { value: 'luminosity', label: 'Luminosity' }
        ];

        this.controls.blendMode = new ParamSelect({
            key: this.keys.blendMode,
            label: 'Blend Mode',
            options: blendModes,
            value: 'source-over',
            onChange: (val) => this.dispatch(this.keys.blendMode, val)
        });
        this.container.appendChild(this.controls.blendMode.getElement());

        // 4. Line Width
        this.controls.lineWidth = this.createSlider(this.keys.lineWidth, 0.1, 10, 0.1, 'Line Width');
        this.container.appendChild(this.controls.lineWidth.container);

        // 5. Opacity
        this.controls.opacity = this.createSlider(this.keys.opacity, 0, 1, 0.01, 'Opacity');
        this.container.appendChild(this.controls.opacity.container);

        // 6. Anti-Alias (Toggle)
        this.controls.antiAlias = new ParamToggle({
            key: this.keys.antiAlias,
            label: 'Anti-aliasing',
            value: true,
            onChange: (val) => this.dispatch(this.keys.antiAlias, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.antiAlias, isActive, this.controls.antiAlias)
        });
        this.initLinkState(this.keys.antiAlias, this.controls.antiAlias);
        this.container.appendChild(this.controls.antiAlias.getElement());
    }

    handleLinkToggle(key, isActive, control) {
        const fullKey = `${this.orchestrator.roseId}.${key}`; // Use orchestrator.roseId exposed? 
        // Wait, constructor didn't save roseId to `this.roseId`. It only used it for keys or ignored it?
        // Constructor was: constructor(orchestrator, roseId, actionType, keys = {})
        // I need to save roseId.

        // Let's assume I fix constructor below.
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
        // We need roseId.
        const myKey = `${this.roseId}.${key}`;
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            if (linkManager.isLinked(myKey)) {
                control.setLinkActive(true);
            }
        });
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
            onLinkToggle: (isActive) => {
                // We need reference to paramGui instance to call setLinkActive
                // But variable isn't initialized? Closures work fine.
                // But wait, `this.handleLinkToggle` logic is cleaner. 
                // However, I need to pass control.
                // Let's rely on variable `paramGui` being available in closure.

                // Oops, handleLinkToggle tries to use `this.roseId`.
                this.handleLinkToggle(key, isActive, paramGui);
            }
        });

        this.initLinkState(key, paramGui);

        // Register if Orchestrator supports it
        if (this.orchestrator.registerParam) {
            this.orchestrator.registerParam(paramGui);
        }

        return {
            container: paramGui.getElement(),
            instance: paramGui
        };
    }

    updateLinkVisuals() {
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            Object.keys(this.controls).forEach(k => {
                const control = this.controls[k];
                // control might be instance (ParamToggle) or object { container, instance }
                let instance = control;
                if (control.instance) instance = control.instance;

                if (instance && typeof instance.setLinkActive === 'function') {
                    // Find key for this control. 
                    // this.controls keys match this.keys keys? 
                    // No, `this.controls.lineWidth` uses `this.keys.lineWidth`.
                    // So we must look up the correct semantic key?
                    // Actually, for `this.controls.colorMethod`, key is `this.keys.colorMethod`.
                    // Is `k` the internal property name (e.g. 'lineWidth')? Yes.
                    // The actual param key is `this.keys[k]`.

                    const paramKey = this.keys[k];
                    // If keys don't map 1:1, we might have issues.
                    // But in constructor: `this.keys = Object.assign({ ... }, keys)`
                    // And `this.controls.lineWidth = ...`

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
        if (this.controls.showToggle && this.options.showToggle) {
            this.controls.showToggle.setValue(params[this.options.showToggle.key] !== false);
        }

        if (this.controls.colorMethod) this.controls.colorMethod.setValue(params[this.keys.colorMethod] || 'solid');
        if (this.controls.color) this.controls.color.setValue(params[this.keys.color] || '#ffffff');
        if (this.controls.blendMode) this.controls.blendMode.setValue(params[this.keys.blendMode] || 'source-over');

        if (this.controls.lineWidth) this.controls.lineWidth.instance.setValue(params[this.keys.lineWidth] ?? 1);
        if (this.controls.opacity) this.controls.opacity.instance.setValue(params[this.keys.opacity] ?? 1);

        if (this.controls.antiAlias) this.controls.antiAlias.setValue(params[this.keys.antiAlias] !== false);
    }
}

export class VertexVizModule {
    /**
     * @param {Object} orchestrator 
     * @param {string} roseId 
     * @param {string} actionType 
     * @param {Object} keys 
     */
    constructor(orchestrator, roseId, actionType, keys = {}) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;
        this.actionType = actionType;
        this.keys = Object.assign({
            showVertices: 'showVertices',
            vertexRadius: 'vertexRadius',
            vertexColor: 'vertexColor',
            vertexOpacity: 'vertexOpacity',
            vertexBlendMode: 'vertexBlendMode'
        }, keys);

        this.container = document.createElement('div');
        this.container.className = 'flex flex-col gap-1';
        this.controls = {};
        this.render();
    }

    render() {
        // 1. Toggle
        this.controls.showVertices = new ParamToggle({
            key: this.keys.showVertices,
            label: 'Show Vertices',
            value: false,
            onChange: (val) => this.dispatch(this.keys.showVertices, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.showVertices, isActive, this.controls.showVertices)
        });
        this.initLinkState(this.keys.showVertices, this.controls.showVertices);
        this.container.appendChild(this.controls.showVertices.getElement());

        // 2. Radius
        this.controls.vertexRadius = this.createSlider(this.keys.vertexRadius, 0.5, 20, 0.5, 'Radius');
        this.container.appendChild(this.controls.vertexRadius.container);

        // 3. Color
        this.controls.vertexColor = new ParamColor({
            key: this.keys.vertexColor,
            label: 'Color',
            value: '#ffffff',
            onChange: (val) => this.dispatch(this.keys.vertexColor, val)
        });
        this.container.appendChild(this.controls.vertexColor.getElement());

        // 4. Opacity
        this.controls.vertexOpacity = this.createSlider(this.keys.vertexOpacity, 0, 1, 0.01, 'Opacity');
        this.container.appendChild(this.controls.vertexOpacity.container);

        // 5. Blend Mode
        const blendModes = [
            { value: 'source-over', label: 'Normal' },
            { value: 'lighter', label: 'Lighter (Add)' },
            { value: 'multiply', label: 'Multiply' },
            { value: 'screen', label: 'Screen' },
            { value: 'overlay', label: 'Overlay' },
            { value: 'darken', label: 'Darken' },
            { value: 'lighten', label: 'Lighten' },
            { value: 'color-dodge', label: 'Color Dodge' },
            { value: 'color-burn', label: 'Color Burn' },
            { value: 'hard-light', label: 'Hard Light' },
            { value: 'soft-light', label: 'Soft Light' },
            { value: 'difference', label: 'Difference' },
            { value: 'exclusion', label: 'Exclusion' },
            { value: 'hue', label: 'Hue' },
            { value: 'saturation', label: 'Saturation' },
            { value: 'color', label: 'Color' },
            { value: 'luminosity', label: 'Luminosity' }
        ];

        this.controls.vertexBlendMode = new ParamSelect({
            key: this.keys.vertexBlendMode,
            label: 'Blend Mode',
            options: blendModes,
            value: 'source-over',
            onChange: (val) => this.dispatch(this.keys.vertexBlendMode, val)
        });
        this.container.appendChild(this.controls.vertexBlendMode.getElement());
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
        if (this.controls.showVertices) this.controls.showVertices.setValue(params[this.keys.showVertices]);
        if (this.controls.vertexRadius) this.controls.vertexRadius.instance.setValue(params[this.keys.vertexRadius] ?? 2);
        if (this.controls.vertexColor) this.controls.vertexColor.setValue(params[this.keys.vertexColor] || '#ffffff');
        if (this.controls.vertexOpacity) this.controls.vertexOpacity.instance.setValue(params[this.keys.vertexOpacity] ?? 1);
        if (this.controls.vertexBlendMode) this.controls.vertexBlendMode.setValue(params[this.keys.vertexBlendMode] || 'source-over');
    }
}

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
