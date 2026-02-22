import { Accordion } from '../Accordion.js';
import { createElement } from '../../utils/dom.js';
import { SequencerRegistry } from '../../../engine/math/sequencers/SequencerRegistry.js';
import { CurveRegistry } from '../../../engine/math/curves/CurveRegistry.js';
import { gcd, getLinesToClose } from '../../../engine/math/MathOps.js';
import { generateChordalPolyline } from '../../../engine/math/chordal_rosette.js';
import { SegmentHistogram } from '../SegmentHistogram.js';

export class StatsSection {
    /**
     * @param {Object} orchestrator - The parent panel instance (for registration/context)
     * @param {string} roseId - 'rosetteA' or 'rosetteB'
     */
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;

        this.accordion = new Accordion('Info', false, this.handleToggle.bind(this), `${this.roseId}-stats`);

        // Register for persistence
        if (orchestrator.registerAccordion) {
            orchestrator.registerAccordion(`${this.roseId}-stats`, this.accordion);
        }

        this.content = createElement('div', 'p-2 text-xs text-gray-300 font-mono flex flex-col gap-1');
        this.accordion.append(this.content);

        // Segment Length Histogram
        this.histogram = new SegmentHistogram();
        this.accordion.append(this.histogram.element);

        // Deferred histogram update state
        this._histogramDirty = false;
        this._lastParams = null;
        this._lastK = null;
    }

    handleToggle(isOpen, id) {
        // Delegate to orchestrator for UI state persistence logic
        if (this.orchestrator.handleAccordionToggle) {
            this.orchestrator.handleAccordionToggle(isOpen, id);
        }
        // If re-opened and histogram is dirty, update now
        if (isOpen && this._histogramDirty && this._lastParams) {
            this._updateHistogram(this._lastParams, this._lastK);
        }
    }

    get element() {
        return this.accordion.element;
    }

    /**
     * @param {Object} params - The state parameters for this rose
     * @param {number} k - matching cosets count (calculated by orchestrator or passed here)
     */
    update(params, k) {
        if (!this.content) return;

        // Instantiate temporary curve to get radiansToClosure
        const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];

        // Renderer logic to create curve instance
        const curve = new CurveClass(params);
        const radiansToClose = curve.getRadiansToClosure();

        // Calculate Lines/Sequence Length based on Sequencer Type
        const currentSequencerType = params.sequencerType || 'Cyclic Additive Group Modulo N';
        let lines;
        let totalRosetteLines = 0;
        let distributionString = '';
        let isMultiplicative = false;

        if (currentSequencerType === 'Multiplicative Group Modulo N') {
            isMultiplicative = true;
            const SequencerClass = SequencerRegistry[currentSequencerType];
            if (SequencerClass) {
                const seqInstance = new SequencerClass();
                const cosets = seqInstance.getCosets(params.totalDivs, params);

                if (cosets && cosets.length > 0) {
                    // Calculate stats for ALL cosets to get distribution and total
                    const distribution = {};
                    cosets.forEach(seed => {
                        const seq = seqInstance.generate(params.totalDivs, seed, params);
                        // generate returns points. The number of chords (lines) is points.length - 1.
                        const len = seq.length > 0 ? seq.length - 1 : 0;
                        totalRosetteLines += len;
                        distribution[len] = (distribution[len] || 0) + 1;
                    });

                    // Format Distribution String
                    const sizes = Object.keys(distribution).map(Number).sort((a, b) => b - a);
                    if (sizes.length === 1) {
                        distributionString = `${sizes[0]}`;
                    } else {
                        distributionString = sizes.map(s => `${s} (${distribution[s]})`).join(', ');
                    }

                    // Use the user's selected coset index (clamped) for the simple "Lines" display
                    const index = Math.min(params.cosetIndex || 0, cosets.length - 1);
                    const sequence = seqInstance.generate(params.totalDivs, cosets[index], params);
                    lines = sequence.length > 0 ? sequence.length - 1 : 0;
                } else {
                    lines = 0;
                }
            } else {
                lines = 0;
            }
        } else {
            // Additive fallback
            lines = getLinesToClose(params.totalDivs, params.step);
            // For additive, all cosets are same size = lines.
            // Total = lines * k (number of cosets)
            totalRosetteLines = lines * k;
            distributionString = `${lines}`;
        }

        // Cycles Logic
        const cycles = radiansToClose / (2 * Math.PI);
        // eslint-disable-next-line no-unused-vars
        const cycleString = parseFloat(cycles.toFixed(3)); // Kept for reference if needed later

        // Cosets Shown Logic
        const cosetsShown = Math.min(params.cosetCount || 1, k);

        // Determine Generator 'g' for Coprime Check
        let gForCoprime = null;
        if (currentSequencerType.includes('Multiplicative')) {
            gForCoprime = params.generator;
        } else if (currentSequencerType.includes('Additive')) {
            gForCoprime = params.step;
        }

        let coprimeString = '';
        if (gForCoprime !== undefined && gForCoprime !== null) {
            const isCoprime = gcd(params.totalDivs, gForCoprime) === 1;
            const colorClass = isCoprime ? 'text-green-400' : 'text-red-400';
            coprimeString = `<div><span class="text-gray-400">Coprime:</span> <span class="${colorClass}">${isCoprime ? 'True' : 'False'}</span></div>`;
        }

        // Calculate Lines Displayed
        let segmentsDisplayed = 0;
        if (isMultiplicative) {
            // Approx
            segmentsDisplayed = lines * cosetsShown;
        } else {
            segmentsDisplayed = lines * cosetsShown;
        }

        const segmentsPerPathLabel = isMultiplicative ? distributionString : lines;

        this.content.innerHTML = `
            <div><span class="text-gray-400">Line Segments Displayed:</span> <span class="text-blue-400">${segmentsDisplayed}</span></div>
            <div><span class="text-gray-400">Closed Paths Displayed (Cosets):</span> <span class="text-blue-400">${cosetsShown}</span></div>
            <div><span class="text-gray-400">Line Segments Per Path:</span> <span class="text-blue-400">${segmentsPerPathLabel}</span></div>
            <div><span class="text-gray-400">Total Segments:</span> <span class="text-blue-400">${totalRosetteLines}</span></div>
            <div><span class="text-gray-400">Total Paths:</span> <span class="text-blue-400">${k}</span></div>
            ${coprimeString}
        `;

        // Update segment length histogram (skip if accordion is collapsed)
        if (this.histogram) {
            this._lastParams = params;
            this._lastK = k;
            if (!this.accordion.isOpen) {
                this._histogramDirty = true;
                return;
            }
            this._updateHistogram(params, k);
        }
    }

    /** @private Compute polyline and update histogram */
    _updateHistogram(params, k) {
        const currentSequencerType = params.sequencerType || 'Cyclic Additive Group Modulo N';
        const SeqClass = SequencerRegistry[currentSequencerType];
        const CurveClass = CurveRegistry[params.curveType] || CurveRegistry['Rhodonea'];
        const curve = new CurveClass(params);
        if (SeqClass && curve) {
            const seq = new SeqClass();
            let start = 0;
            if (seq.getCosets && k > 1) {
                const cosets = seq.getCosets(params.totalDivs, params);
                if (cosets) {
                    const idx = (params.cosetIndex || 0) % cosets.length;
                    start = cosets[idx];
                }
            }
            const points = generateChordalPolyline(curve, seq, params.totalDivs, start, params);
            this.histogram.update(points, {
                colorMethod: params.colorMethod,
                color: params.color,
                colorEnd: params.colorEnd,
                gradientType: params.gradientType,
                gradientStops: params.gradientStops
            });
        }
        this._histogramDirty = false;
    }
}
