import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamColor } from '../ParamColor.js';
import { ParamToggle } from '../ParamToggle.js';
import { dispatchDeep, getLinkKey } from '../../../engine/state/stateAdapters.js';

export class GlobalRenderingModule {
    constructor(orchestrator, roseId, actionType, keys = {}) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;
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
        // 0. Canvas Dimensions Info (read-only display rows)
        const createInfoRow = (labelText) => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between text-xs';
            const label = document.createElement('span');
            label.className = 'text-gray-400';
            label.textContent = labelText;
            const value = document.createElement('span');
            value.className = 'text-blue-400 font-mono';
            value.textContent = '—';
            row.appendChild(label);
            row.appendChild(value);
            return { row, value };
        };

        const physicalInfo = createInfoRow('Canvas Size (px)');
        this.canvasDimsValue = physicalInfo.value;
        this.container.appendChild(physicalInfo.row);

        const logicalInfo = createInfoRow('CSS Size (px)');
        this.canvasLogicalValue = logicalInfo.value;
        this.container.appendChild(logicalInfo.row);

        const dprInfo = createInfoRow('Device Pixel Ratio');
        this.canvasDprValue = dprInfo.value;
        // Add bottom margin to separate from controls below
        dprInfo.row.className += ' mb-2';
        this.container.appendChild(dprInfo.row);

        this._setupCanvasObserver();

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

        // 5. Selection Hit Tolerance (global, via ChordSelection)
        const chordSel = this.orchestrator?.chordSelection;
        if (chordSel) {
            this.controls.hitTolerance = new ParamNumber({
                key: 'hitTolerance',
                label: 'Selection Hit Tolerance',
                min: 1,
                max: 30,
                step: 1,
                value: chordSel.hitTolerance,
                onChange: (val) => chordSel.setHitTolerance(val)
            });
            this.container.appendChild(this.controls.hitTolerance.getElement());

            // Sync if changed from elsewhere
            chordSel.addEventListener('tolerancechange', (e) => {
                if (this.controls.hitTolerance) {
                    this.controls.hitTolerance.setValue(e.detail.tolerance);
                }
            });
        }
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
        if (this.controls.autoScale) this.controls.autoScale.setValue(params[this.keys.autoScale] || false);
        if (this.controls.scaleLineWidth) this.controls.scaleLineWidth.setValue(params[this.keys.scaleLineWidth] !== false);
        if (this.controls.backgroundOpacity) this.controls.backgroundOpacity.instance.setValue(params[this.keys.backgroundOpacity] ?? 0);
        if (this.controls.backgroundColor) this.controls.backgroundColor.setValue(params[this.keys.backgroundColor] || '#000000');

        // Update canvas dimensions display on every state update
        this._updateCanvasDims();
    }

    /**
     * Set up a ResizeObserver on the canvas (or its container) to keep
     * the dimension display updated whenever the canvas resizes.
     * Defers setup if the canvas reference isn't available yet.
     */
    _setupCanvasObserver() {
        const canvas = this.orchestrator?.canvas;
        if (!canvas) {
            // Canvas not available yet (e.g. hybrid panel — set after construction).
            // Defer and retry once on next frame; update() will also refresh the display.
            requestAnimationFrame(() => this._setupCanvasObserver());
            return;
        }

        // Initial read
        this._updateCanvasDims();

        // Observe the canvas's parent container for layout-driven resizes
        if (!this._resizeObserver && typeof ResizeObserver !== 'undefined') {
            const target = canvas.parentElement || canvas;
            this._resizeObserver = new ResizeObserver(() => {
                this._updateCanvasDims();
            });
            this._resizeObserver.observe(target);
        }
    }

    /**
     * Read the current canvas pixel dimensions and update the info displays.
     * Shows physical pixels, logical (CSS) pixels, and devicePixelRatio.
     */
    _updateCanvasDims() {
        const canvas = this.orchestrator?.canvas;
        if (!canvas || !this.canvasDimsValue) return;

        const w = canvas.width;
        const h = canvas.height;
        const dpr = window.devicePixelRatio || 1;

        // Physical (backing-store) pixels
        this.canvasDimsValue.textContent = (w > 0 && h > 0)
            ? `${w} × ${h}`
            : '—';

        // Logical (CSS) pixels
        if (this.canvasLogicalValue) {
            const lw = Math.round(w / dpr);
            const lh = Math.round(h / dpr);
            this.canvasLogicalValue.textContent = (w > 0 && h > 0)
                ? `${lw} × ${lh}`
                : '—';
        }

        // Device Pixel Ratio
        if (this.canvasDprValue) {
            this.canvasDprValue.textContent = `${dpr}`;
        }
    }
}
