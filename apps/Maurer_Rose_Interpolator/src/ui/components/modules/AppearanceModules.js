import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamColor } from '../ParamColor.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamGradient } from '../ParamGradient.js';
import { store } from '../../../engine/state/Store.js';

// Mixin pattern or just factory functions? 
// Classes are better for maintaining state references if needed.

export class LayerRenderingModule {
    /**
     * Creates standard rendering controls: Color Method, Color, Blend Mode, Opacity, Size, Anti-Alias
     * @param {Object} orchestrator - Parent panel implementation
     * @param {string} roseId - ID prefix for persistence keys if needed
     * @param {string} actionType - Redux action type to dispatch
     * @param {Object} keys - Map of internal param keys to state keys
     * @param {Object} options - Configuration options { showToggle: { key, label, value? }, sizeLabel: string }
     */
    constructor(orchestrator, roseId, actionType, keys = {}, options = {}) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;
        this.actionType = actionType;
        this.options = options;
        this.keys = Object.assign({
            colorMethod: 'colorMethod',
            color: 'color',
            colorEnd: 'colorEnd',
            gradientType: 'gradientType',
            gradientPreset: 'gradientPreset',
            gradientStops: 'gradientStops',
            blendMode: 'blendMode',
            opacity: 'opacity',
            size: 'lineWidth',
            antiAlias: 'antiAlias'
        }, keys);

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
                value: toggleConfig.value !== undefined ? toggleConfig.value : true,
                onChange: (val) => this.dispatch(toggleConfig.key, val),
                onLinkToggle: (isActive) => this.handleLinkToggle(toggleConfig.key, isActive, this.controls.showToggle)
            });
            this.initLinkState(toggleConfig.key, this.controls.showToggle);
            this.container.appendChild(this.controls.showToggle.getElement());
        }

        // 1. Color Method
        const methodOptions = [
            { value: 'solid', label: 'Single Color' },
            { value: 'length', label: 'Length Gradient' },
            { value: 'angle', label: 'Angle Gradient' },
            { value: 'sequence', label: 'Sequence Gradient' }
        ];

        this.controls.colorMethod = new ParamSelect({
            key: this.keys.colorMethod,
            label: 'Color Method',
            options: methodOptions,
            value: 'solid',
            onChange: (val) => {
                this.dispatch(this.keys.colorMethod, val);
                this.updateVisibility(val);
            }
        });
        this.container.appendChild(this.controls.colorMethod.getElement());

        // 2. Gradient Type (Hidden for solid)
        const gradientTypes = [
            { value: '2-point', label: '2-Point Interpolation' },
            { value: 'cyclic', label: 'Cyclic (Start-End-Start)' },
            { value: 'custom', label: 'Custom' },
            { value: 'preset', label: 'Preset (Rainbow)' } // Placeholder
        ];

        this.controls.gradientType = new ParamSelect({
            key: this.keys.gradientType,
            label: 'Gradient Type',
            options: gradientTypes,
            value: '2-point',
            onChange: (val) => this.dispatch(this.keys.gradientType, val)
        });
        this.container.appendChild(this.controls.gradientType.getElement());

        // 3. Start Color
        this.controls.color = new ParamColor({
            key: this.keys.color,
            label: 'Color', // Label updated dynamically
            value: '#ffffff',
            onChange: (val) => this.dispatch(this.keys.color, val)
        });
        this.container.appendChild(this.controls.color.getElement());

        // 4. End Color (Hidden for solid)
        this.controls.colorEnd = new ParamColor({
            key: this.keys.colorEnd,
            label: 'End Color',
            value: '#000000',
            onChange: (val) => this.dispatch(this.keys.colorEnd, val)
        });
        this.container.appendChild(this.controls.colorEnd.getElement());

        // 4b. Custom Gradient (Grapick)
        this.controls.gradientStops = new ParamGradient({
            key: this.keys.gradientStops,
            label: 'Gradient Editor',
            value: [],
            onChange: (val) => this.dispatch(this.keys.gradientStops, val)
        });
        this.container.appendChild(this.controls.gradientStops.getElement());


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

        this.controls.blendMode = new ParamSelect({
            key: this.keys.blendMode,
            label: 'Blend Mode',
            options: blendModes,
            value: 'source-over',
            onChange: (val) => this.dispatch(this.keys.blendMode, val)
        });
        this.container.appendChild(this.controls.blendMode.getElement());

        // 6. Size (Line Width / Radius)
        const sizeLabel = this.options.sizeLabel || 'Line Width';
        this.controls.size = this.createSlider(this.keys.size, 0.1, 20, 0.1, sizeLabel);
        this.container.appendChild(this.controls.size.container);

        // 7. Opacity
        this.controls.opacity = this.createSlider(this.keys.opacity, 0, 1, 0.01, 'Opacity');
        this.container.appendChild(this.controls.opacity.container);

        // 8. Anti-Alias (Toggle)
        this.controls.antiAlias = new ParamToggle({
            key: this.keys.antiAlias,
            label: 'Anti-aliasing',
            value: true,
            onChange: (val) => this.dispatch(this.keys.antiAlias, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.antiAlias, isActive, this.controls.antiAlias)
        });
        this.initLinkState(this.keys.antiAlias, this.controls.antiAlias);
        this.container.appendChild(this.controls.antiAlias.getElement());

        // Initial Visibility
        this.updateVisibility('solid');
    }

    updateVisibility(method) {
        const isGradient = method !== 'solid';

        // Toggle Gradient Controls
        this.controls.gradientType.getElement().style.display = isGradient ? 'flex' : 'none';

        // Get current gradient type to decide between 2-point controls and custom
        // We need access to current state? Or pass it in?
        // updateVisibility is usually called with just method, but we need type too.
        // We can check the control value if it exists or define a separate update method.
        // Let's grab value from control if possible or default to 2-point.
        const type = this.controls.gradientType.lastValue || '2-point';

        const isCustom = type === 'custom';

        // 2-Point / Cyclic Controls
        this.controls.colorEnd.getElement().style.display = (isGradient && !isCustom) ? 'flex' : 'none';

        // Custom Controls
        if (this.controls.gradientStops) {
            this.controls.gradientStops.getElement().style.display = (isGradient && isCustom) ? 'flex' : 'none';
        }

        // Start Color visibility?
        // In Custom mode, start/end are defined in stops. So hide standard color picker too?
        // Yes, likely hide "Start Color" if using custom editor.
        this.controls.color.getElement().style.display = (isCustom && isGradient) ? 'none' : 'flex';

        // Update Start Color Label
        // Accessed via private property or just assume ParamColor structure?
        // ParamColor has setLabel method? Let's check or just re-render.
        // Assuming strict component interface, we might not have setLabel.
        // But for CSS Grid layout in ParamColor, changing label text content might be enough?
        // Let's rely on standard ParamColor: it renders title.
        // We can access DOM directly if needed.
        const colorLabel = this.controls.color.getElement().querySelector('span'); // Simple heuristic
        if (colorLabel) {
            colorLabel.textContent = isGradient ? 'Start Color' : 'Color';
        }
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
        if (this.controls.showToggle && this.options.showToggle) {
            this.controls.showToggle.setValue(params[this.options.showToggle.key] !== false);
        }

        const method = params[this.keys.colorMethod] || 'solid';
        if (this.controls.colorMethod) {
            this.controls.colorMethod.setValue(method);
            this.updateVisibility(method);
        }

        if (this.controls.color) this.controls.color.setValue(params[this.keys.color] || '#ffffff');
        if (this.controls.colorEnd) this.controls.colorEnd.setValue(params[this.keys.colorEnd] || '#000000');

        const gradType = params[this.keys.gradientType] || '2-point';
        if (this.controls.gradientType) {
            this.controls.gradientType.setValue(gradType);
            // Re-run visibility check because type might have changed which affects sub-controls
            this.updateVisibility(method);
        }

        if (this.controls.gradientStops) {
            this.controls.gradientStops.setValue(params[this.keys.gradientStops] || []);
        }

        if (this.controls.blendMode) this.controls.blendMode.setValue(params[this.keys.blendMode] || 'source-over');

        if (this.controls.size) this.controls.size.instance.setValue(params[this.keys.size] ?? 1);
        if (this.controls.opacity) this.controls.opacity.instance.setValue(params[this.keys.opacity] ?? 1);

        if (this.controls.antiAlias) this.controls.antiAlias.setValue(params[this.keys.antiAlias] !== false);
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
