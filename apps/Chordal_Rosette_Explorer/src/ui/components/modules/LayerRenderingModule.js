import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamColor } from '../ParamColor.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamGradient } from '../ParamGradient.js';
import { dispatchDeep, getLinkKey } from '../../../engine/state/stateAdapters.js';

export class LayerRenderingModule {
    /**
     * Creates standard rendering controls: Color Method, Color, Blend Mode, Opacity, Size, Anti-Alias
     * @param {Object} orchestrator - Parent panel implementation
     * @param {string} roseId - ID prefix for persistence keys if needed
     * @param {string} actionType - (LEGACY, unused) Redux action type
     * @param {Object} keys - Map of internal param keys to flat state keys
     * @param {Object} options - Configuration options { showToggle: { key, label, value? }, sizeLabel: string }
     */
    constructor(orchestrator, roseId, actionType, keys = {}, options = {}) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;
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
            antiAlias: 'antiAlias',
            // Connection params
            connectMode: 'connectMode',
            connectDetail: 'connectDetail',
            waveAmplitude: 'waveAmplitude',
            waveFrequency: 'waveFrequency',
            waveAlternateFlip: 'waveAlternateFlip',
            splineTension: 'splineTension',
            splineBias: 'splineBias',
            splineContinuity: 'splineContinuity',
            splineAlpha: 'splineAlpha',
            bezierBulge: 'bezierBulge'
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

        // 1. Connection Mode (Optional)
        if (this.options.showConnectMode) {
            const modeOptions = [
                { value: 'straight', label: 'Straight' },
                { value: 'sine', label: 'Sine Wave' },
                { value: 'quadratic-bezier', label: 'Quadratic Bezier' },
                { value: 'kb-spline', label: 'Kochanek-Bartels Spline' },
                { value: 'catmull-rom', label: 'Catmull-Rom Spline' },
                { value: 'circle-spline', label: 'Circle Spline' },
                { value: 'arc', label: 'Arc' },
                { value: 'arc-flipped', label: 'Arc Flipped' },
                { value: 'circle', label: 'Circle' }
            ];

            this.controls.connectMode = new ParamSelect({
                key: this.keys.connectMode,
                label: 'Connect Mode',
                options: modeOptions,
                value: 'straight',
                onChange: (val) => {
                    this.dispatch(this.keys.connectMode, val);
                    this.updateConnectModeVisibility(val);
                },
                onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.connectMode, isActive, this.controls.connectMode)
            });
            this.initLinkState(this.keys.connectMode, this.controls.connectMode);
            this.container.appendChild(this.controls.connectMode.getElement());

            // Details (Shared)
            this.controls.connectDetail = this.createSlider(this.keys.connectDetail, 2, 100, 1, 'Detail');
            this.container.appendChild(this.controls.connectDetail.container);

            // Wave Params
            this.controls.waveAmplitude = this.createSlider(this.keys.waveAmplitude, 0, 100, 1, 'Amplitude');
            this.container.appendChild(this.controls.waveAmplitude.container);

            this.controls.waveFrequency = this.createSlider(this.keys.waveFrequency, 1, 50, 1, 'Frequency');
            this.container.appendChild(this.controls.waveFrequency.container);

            this.controls.waveAlternateFlip = new ParamToggle({
                key: this.keys.waveAlternateFlip,
                label: 'Alternate Wave Mirror',
                value: false,
                onChange: (val) => this.dispatch(this.keys.waveAlternateFlip, val)
            });
            this.container.appendChild(this.controls.waveAlternateFlip.getElement());

            // KB Spline Params
            this.controls.splineTension = this.createSlider(this.keys.splineTension, -1, 1, 0.1, 'Tension');
            this.container.appendChild(this.controls.splineTension.container);

            this.controls.splineBias = this.createSlider(this.keys.splineBias, -1, 1, 0.1, 'Bias');
            this.container.appendChild(this.controls.splineBias.container);

            this.controls.splineContinuity = this.createSlider(this.keys.splineContinuity, -1, 1, 0.1, 'Continuity');
            this.container.appendChild(this.controls.splineContinuity.container);

            // Catmull-Rom Params
            this.controls.splineAlpha = this.createSlider(this.keys.splineAlpha, 0, 1, 0.1, 'Alpha');
            this.container.appendChild(this.controls.splineAlpha.container);

            // Quadratic Bezier Params
            this.controls.bezierBulge = this.createSlider(this.keys.bezierBulge, -2, 2, 0.1, 'Bulge');
            this.container.appendChild(this.controls.bezierBulge.container);
        }

        // 2. Color Method
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
            },
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.colorMethod, isActive, this.controls.colorMethod)
        });
        this.initLinkState(this.keys.colorMethod, this.controls.colorMethod);
        this.container.appendChild(this.controls.colorMethod.getElement());

        // 2. Gradient Type (Hidden for solid)
        const gradientTypes = [
            { value: '2-point', label: '2-Point Interpolation' },
            { value: 'cyclic', label: 'Cyclic (Start-End-Start)' },
            { value: 'custom', label: 'Custom' },
            { value: 'preset', label: 'Preset (Rainbow)' }
        ];

        this.controls.gradientType = new ParamSelect({
            key: this.keys.gradientType,
            label: 'Gradient Type',
            options: gradientTypes,
            value: '2-point',
            onChange: (val) => this.dispatch(this.keys.gradientType, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.gradientType, isActive, this.controls.gradientType)
        });
        this.initLinkState(this.keys.gradientType, this.controls.gradientType);
        this.container.appendChild(this.controls.gradientType.getElement());

        // 3. Start Color
        this.controls.color = new ParamColor({
            key: this.keys.color,
            label: 'Color',
            value: '#ffffff',
            onChange: (val) => this.dispatch(this.keys.color, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.color, isActive, this.controls.color)
        });
        this.initLinkState(this.keys.color, this.controls.color);
        this.container.appendChild(this.controls.color.getElement());

        // 4. End Color (Hidden for solid)
        this.controls.colorEnd = new ParamColor({
            key: this.keys.colorEnd,
            label: 'End Color',
            value: '#000000',
            onChange: (val) => this.dispatch(this.keys.colorEnd, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.colorEnd, isActive, this.controls.colorEnd)
        });
        this.initLinkState(this.keys.colorEnd, this.controls.colorEnd);
        this.container.appendChild(this.controls.colorEnd.getElement());

        // 4b. Custom Gradient (Grapick)
        this.controls.gradientStops = new ParamGradient({
            key: this.keys.gradientStops,
            label: 'Gradient Editor',
            value: [],
            onChange: (val) => this.dispatch(this.keys.gradientStops, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.gradientStops, isActive, this.controls.gradientStops)
        });
        this.initLinkState(this.keys.gradientStops, this.controls.gradientStops);
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
            onChange: (val) => this.dispatch(this.keys.blendMode, val),
            onLinkToggle: (isActive) => this.handleLinkToggle(this.keys.blendMode, isActive, this.controls.blendMode)
        });
        this.initLinkState(this.keys.blendMode, this.controls.blendMode);
        this.container.appendChild(this.controls.blendMode.getElement());

        // 6. Size (Line Width / Radius)
        if (!this.options.hideSize) {
            const sizeLabel = this.options.sizeLabel || 'Line Width';
            this.controls.size = this.createSlider(this.keys.size, 0.1, 20, 0.1, sizeLabel);
            this.container.appendChild(this.controls.size.container);
        }

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

        this.controls.gradientType.getElement().style.display = isGradient ? 'flex' : 'none';

        const type = this.controls.gradientType.lastValue || '2-point';
        const isCustom = type === 'custom';

        this.controls.colorEnd.getElement().style.display = (isGradient && !isCustom) ? 'flex' : 'none';

        if (this.controls.gradientStops) {
            this.controls.gradientStops.getElement().style.display = (isGradient && isCustom) ? 'flex' : 'none';
        }

        this.controls.color.getElement().style.display = (isCustom && isGradient) ? 'none' : 'flex';

        const colorLabel = this.controls.color.getElement().querySelector('span');
        if (colorLabel) {
            colorLabel.textContent = isGradient ? 'Start Color' : 'Color';
        }

        const connectMode = this.controls.connectMode ? this.controls.connectMode.lastValue : 'straight';
        this.updateConnectModeVisibility(connectMode);
    }

    updateConnectModeVisibility(mode) {
        if (!this.controls.connectDetail) return;

        const isStraight = mode === 'straight';
        const isWave = mode === 'sine' || mode === 'cosine';
        const isKB = mode === 'kb-spline';
        const isCatmull = mode === 'catmull-rom';

        this.controls.connectDetail.container.style.display = !isStraight ? 'flex' : 'none';

        if (this.controls.bezierBulge) this.controls.bezierBulge.container.style.display = (mode === 'quadratic-bezier') ? 'flex' : 'none';

        this.controls.waveAmplitude.container.style.display = isWave ? 'flex' : 'none';
        this.controls.waveFrequency.container.style.display = isWave ? 'flex' : 'none';
        this.controls.waveAlternateFlip.getElement().style.display = isWave ? 'flex' : 'none';

        this.controls.splineTension.container.style.display = isKB ? 'flex' : 'none';
        this.controls.splineBias.container.style.display = isKB ? 'flex' : 'none';
        this.controls.splineContinuity.container.style.display = isKB ? 'flex' : 'none';

        this.controls.splineAlpha.container.style.display = isCatmull ? 'flex' : 'none';
    }

    handleLinkToggle(key, isActive, control) {
        const myKey = getLinkKey(key, this.roseId);
        const otherRoseId = this.roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';
        const otherKey = getLinkKey(key, otherRoseId);

        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const linked = linkManager.toggleLink(myKey, otherKey);
            if (linked !== isActive) {
                control.setLinkActive(linked);
            }
        });
    }

    initLinkState(key, control) {
        const myKey = getLinkKey(key, this.roseId);
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
                        const fullKey = getLinkKey(paramKey, this.roseId);
                        instance.setLinkActive(linkManager.isLinked(fullKey));
                    }
                }
            });
        });
    }

    dispatch(key, val) {
        dispatchDeep(key, val, this.roseId);
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
            this.updateVisibility(method);
        }

        if (this.controls.gradientStops) {
            this.controls.gradientStops.setValue(params[this.keys.gradientStops] || []);
        }

        if (this.controls.blendMode) this.controls.blendMode.setValue(params[this.keys.blendMode] || 'source-over');

        if (this.controls.size) this.controls.size.instance.setValue(params[this.keys.size] ?? 1);
        if (this.controls.opacity) this.controls.opacity.instance.setValue(params[this.keys.opacity] ?? 1);

        if (this.controls.antiAlias) this.controls.antiAlias.setValue(params[this.keys.antiAlias] !== false);

        // Update Connection Mode Controls
        const connectMode = params[this.keys.connectMode] || 'straight';
        if (this.controls.connectMode) {
            this.controls.connectMode.setValue(connectMode);
            this.updateConnectModeVisibility(connectMode);
        }

        if (this.controls.connectDetail) this.controls.connectDetail.instance.setValue(params[this.keys.connectDetail] ?? 20);

        if (this.controls.waveAmplitude) this.controls.waveAmplitude.instance.setValue(params[this.keys.waveAmplitude] ?? 10);
        if (this.controls.waveFrequency) this.controls.waveFrequency.instance.setValue(params[this.keys.waveFrequency] ?? 5);
        if (this.controls.waveAlternateFlip) this.controls.waveAlternateFlip.setValue(params[this.keys.waveAlternateFlip] || false);

        if (this.controls.splineTension) this.controls.splineTension.instance.setValue(params[this.keys.splineTension] ?? 0);
        if (this.controls.splineBias) this.controls.splineBias.instance.setValue(params[this.keys.splineBias] ?? 0);
        if (this.controls.splineContinuity) this.controls.splineContinuity.instance.setValue(params[this.keys.splineContinuity] ?? 0);
        if (this.controls.splineAlpha) this.controls.splineAlpha.instance.setValue(params[this.keys.splineAlpha] ?? 0.5);
        if (this.controls.bezierBulge) {
            const val = params[this.keys.bezierBulge] ?? 0;
            this.controls.bezierBulge.instance.setValue(val);
        }
    }
}
