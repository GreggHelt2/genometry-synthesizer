import { Accordion } from '../Accordion.js';
import { createElement } from '../../utils/dom.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamToggle } from '../ParamToggle.js';
import { ParamSelect } from '../ParamSelect.js';
import { ParamColor } from '../ParamColor.js';
import { CurveRegistry } from '../../../engine/math/curves/CurveRegistry.js';
import { dispatchDeep, getLinkKey } from '../../../engine/state/stateAdapters.js';

/**
 * SpecialPointsSection — accordion section for visualizing
 * zero points, self-intersection double points, and boundary points
 * on the base curve. Uses Erb's spectral node methodology.
 */
export class SpecialPointsSection {
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;

        this.accordion = new Accordion(
            'Curve Special Points', false,
            this.handleToggle.bind(this),
            `${this.roseId}-specialPoints`
        );

        // Master eye toggle for visibility
        this.accordion.addEyeToggle(false, (visible) => {
            this.dispatch('showSpecialPoints', visible);
        });

        if (orchestrator.registerAccordion) {
            orchestrator.registerAccordion(`${this.roseId}-specialPoints`, this.accordion);
        }

        this.controls = {};
        this.renderContent();
    }

    handleToggle(isOpen, id) {
        if (this.orchestrator.handleAccordionToggle) {
            this.orchestrator.handleAccordionToggle(isOpen, id);
        }
        if (isOpen) {
            requestAnimationFrame(() => {
                if (this.orchestrator.alignLabels) this.orchestrator.alignLabels(this.accordion.content);
            });
        }
    }

    get element() {
        return this.accordion.element;
    }

    renderContent() {
        // --- Info readout ---
        this.infoDiv = createElement('div', 'text-xs text-gray-400 mb-2 p-1', {
            textContent: 'Zero: 0 | Double: 0 | Boundary: 0'
        });
        this.accordion.append(this.infoDiv);

        // --- Zero Points ---
        const zeroHeader = createElement('div', 'text-xs text-gray-300 font-semibold mt-2 mb-1 px-1', {
            textContent: '● Zero Points (Origin)'
        });
        zeroHeader.style.color = '#FF4444';
        this.accordion.append(zeroHeader);

        this.controls.showZeroPoints = new ParamToggle({
            key: 'showZeroPoints',
            label: 'Show Zero Points',
            value: true,
            onChange: (val) => this.dispatch('showZeroPoints', val)
        });
        this.accordion.append(this.controls.showZeroPoints.getElement());

        this.controls.zeroPointsColor = new ParamColor({
            key: 'zeroPointsColor',
            label: 'Color',
            value: '#FF4444',
            onChange: (val) => this.dispatch('zeroPointsColor', val),
            onLinkToggle: (isActive) => this.handleLinkToggle('zeroPointsColor', isActive, this.controls.zeroPointsColor)
        });
        this.initLinkState('zeroPointsColor', this.controls.zeroPointsColor);
        this.accordion.append(this.controls.zeroPointsColor.getElement());

        this.controls.zeroPointsSize = new ParamNumber({
            key: 'zeroPointsSize', label: 'Size', min: 1, max: 20, step: 0.5, value: 5,
            onChange: (val) => this.dispatch('zeroPointsSize', val)
        });
        this.accordion.append(this.controls.zeroPointsSize.getElement());

        this.controls.zeroPointsOpacity = new ParamNumber({
            key: 'zeroPointsOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05, value: 1,
            onChange: (val) => this.dispatch('zeroPointsOpacity', val)
        });
        this.accordion.append(this.controls.zeroPointsOpacity.getElement());

        // --- Double Points ---
        const doubleHeader = createElement('div', 'text-xs text-gray-300 font-semibold mt-2 mb-1 px-1', {
            textContent: '● Double Points (Self-Intersections)'
        });
        doubleHeader.style.color = '#FFD700';
        this.accordion.append(doubleHeader);

        this.controls.showDoublePoints = new ParamToggle({
            key: 'showDoublePoints',
            label: 'Show Double Points',
            value: true,
            onChange: (val) => this.dispatch('showDoublePoints', val)
        });
        this.accordion.append(this.controls.showDoublePoints.getElement());

        this.controls.doublePointsColor = new ParamColor({
            key: 'doublePointsColor',
            label: 'Color',
            value: '#FFD700',
            onChange: (val) => this.dispatch('doublePointsColor', val),
            onLinkToggle: (isActive) => this.handleLinkToggle('doublePointsColor', isActive, this.controls.doublePointsColor)
        });
        this.initLinkState('doublePointsColor', this.controls.doublePointsColor);
        this.accordion.append(this.controls.doublePointsColor.getElement());

        this.controls.doublePointsSize = new ParamNumber({
            key: 'doublePointsSize', label: 'Size', min: 1, max: 20, step: 0.5, value: 5,
            onChange: (val) => this.dispatch('doublePointsSize', val)
        });
        this.accordion.append(this.controls.doublePointsSize.getElement());

        this.controls.doublePointsOpacity = new ParamNumber({
            key: 'doublePointsOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05, value: 1,
            onChange: (val) => this.dispatch('doublePointsOpacity', val)
        });
        this.accordion.append(this.controls.doublePointsOpacity.getElement());

        // --- Boundary Points ---
        const boundaryHeader = createElement('div', 'text-xs text-gray-300 font-semibold mt-2 mb-1 px-1', {
            textContent: '● Boundary Points (Petal Tips)'
        });
        boundaryHeader.style.color = '#44FF44';
        this.accordion.append(boundaryHeader);

        this.controls.showBoundaryPoints = new ParamToggle({
            key: 'showBoundaryPoints',
            label: 'Show Boundary Points',
            value: true,
            onChange: (val) => this.dispatch('showBoundaryPoints', val)
        });
        this.accordion.append(this.controls.showBoundaryPoints.getElement());

        this.controls.boundaryPointsColor = new ParamColor({
            key: 'boundaryPointsColor',
            label: 'Color',
            value: '#44FF44',
            onChange: (val) => this.dispatch('boundaryPointsColor', val),
            onLinkToggle: (isActive) => this.handleLinkToggle('boundaryPointsColor', isActive, this.controls.boundaryPointsColor)
        });
        this.initLinkState('boundaryPointsColor', this.controls.boundaryPointsColor);
        this.accordion.append(this.controls.boundaryPointsColor.getElement());

        this.controls.boundaryPointsSize = new ParamNumber({
            key: 'boundaryPointsSize', label: 'Size', min: 1, max: 20, step: 0.5, value: 5,
            onChange: (val) => this.dispatch('boundaryPointsSize', val)
        });
        this.accordion.append(this.controls.boundaryPointsSize.getElement());

        this.controls.boundaryPointsOpacity = new ParamNumber({
            key: 'boundaryPointsOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05, value: 1,
            onChange: (val) => this.dispatch('boundaryPointsOpacity', val)
        });
        this.accordion.append(this.controls.boundaryPointsOpacity.getElement());

        // --- Shared controls ---
        const sharedHeader = createElement('div', 'text-xs text-gray-300 font-semibold mt-3 mb-1 px-1', {
            textContent: 'Shared Settings'
        });
        this.accordion.append(sharedHeader);

        // Shape selector
        this.controls.shapeSelect = new ParamSelect({
            key: 'specialPointsShape',
            label: 'Marker Shape',
            options: [
                { value: 'circle', label: 'Circle' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'square', label: 'Square' }
            ],
            value: 'circle',
            onChange: (val) => this.dispatch('specialPointsShape', val)
        });
        this.accordion.append(this.controls.shapeSelect.getElement());
    }

    dispatch(key, val) {
        dispatchDeep(key, val, this.roseId);
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
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            const myKey = getLinkKey(key, this.roseId);
            if (linkManager.isLinked(myKey)) {
                control.setLinkActive(true);
            }
        });
    }

    updateLinkVisuals() {
        import('../../../engine/logic/LinkManager.js').then(({ linkManager }) => {
            Object.keys(this.controls).forEach(key => {
                const control = this.controls[key];
                if (control && typeof control.setLinkActive === 'function') {
                    const fullKey = getLinkKey(key, this.roseId);
                    control.setLinkActive(linkManager.isLinked(fullKey));
                }
            });
        });
    }

    /**
     * Called from ChordalRosettePanel.updateUI with flattened params.
     */
    update(params) {
        // Update eye toggle
        if (this.accordion.setEyeState) {
            this.accordion.setEyeState(params.showSpecialPoints);
        }

        // Update toggles
        if (this.controls.showZeroPoints) this.controls.showZeroPoints.setValue(params.showZeroPoints);
        if (this.controls.showDoublePoints) this.controls.showDoublePoints.setValue(params.showDoublePoints);
        if (this.controls.showBoundaryPoints) this.controls.showBoundaryPoints.setValue(params.showBoundaryPoints);

        // Update colors
        if (this.controls.zeroPointsColor) this.controls.zeroPointsColor.setValue(params.zeroPointsColor);
        if (this.controls.doublePointsColor) this.controls.doublePointsColor.setValue(params.doublePointsColor);
        if (this.controls.boundaryPointsColor) this.controls.boundaryPointsColor.setValue(params.boundaryPointsColor);

        // Update shape
        if (this.controls.shapeSelect) this.controls.shapeSelect.setValue(params.specialPointsShape || 'circle');

        // Update sizes
        if (this.controls.zeroPointsSize) this.controls.zeroPointsSize.setValue(params.zeroPointsSize ?? 5);
        if (this.controls.doublePointsSize) this.controls.doublePointsSize.setValue(params.doublePointsSize ?? 5);
        if (this.controls.boundaryPointsSize) this.controls.boundaryPointsSize.setValue(params.boundaryPointsSize ?? 5);

        // Update opacities
        if (this.controls.zeroPointsOpacity) this.controls.zeroPointsOpacity.setValue(params.zeroPointsOpacity ?? 1);
        if (this.controls.doublePointsOpacity) this.controls.doublePointsOpacity.setValue(params.doublePointsOpacity ?? 1);
        if (this.controls.boundaryPointsOpacity) this.controls.boundaryPointsOpacity.setValue(params.boundaryPointsOpacity ?? 1);

        // Update info readout by computing special points
        this._updateInfo(params);
    }

    _updateInfo(params) {
        const curveType = params.curveType || 'Rhodonea';
        const CurveClass = CurveRegistry[curveType];
        if (!CurveClass) {
            this.infoDiv.textContent = 'Zero: — | Double: — | Boundary: —';
            return;
        }

        // Build curve params from flat params
        const curveParams = {};
        const schema = CurveClass.getParamsSchema();
        schema.forEach(s => {
            if (params[s.key] !== undefined) curveParams[s.key] = params[s.key];
        });

        try {
            const curve = new CurveClass(curveParams);
            const sp = curve.getSpecialPoints();
            this.infoDiv.textContent =
                `Zero: ${sp.zeroPoints.length} | Double: ${sp.doublePoints.length} | Boundary: ${sp.boundaryPoints.length}`;
        } catch (e) {
            this.infoDiv.textContent = 'Zero: — | Double: — | Boundary: —';
        }
    }
}
