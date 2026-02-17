import { Accordion } from '../Accordion.js';
import { ParamNumber } from '../ParamNumber.js';
import { ParamSelect } from '../ParamSelect.js';
import { createElement } from '../../utils/dom.js';
import { store } from '../../../engine/state/Store.js';
import { dispatchDeep } from '../../../engine/state/stateAdapters.js';
import {
    findGeneratorsWithAnyCoincidence,
    findGeneratorsWithExactCount,
    findGeneratorsInCountRange,
    findGeneratorsForSpecificIndices,
    findCoincidentIndices,
    getCoincidenceCount
} from '../../../engine/math/CoincidentIndices.js';

const ADDITIVE_SEQ_TYPE = 'Cyclic Additive Group Modulo N';

export class CoincidentFinderSection {
    /**
     * @param {object} orchestrator - The ChordalRosettePanel instance
     * @param {string} roseId - 'rosetteA' or 'rosetteB'
     */
    constructor(orchestrator, roseId) {
        this.orchestrator = orchestrator;
        this.roseId = roseId;
        this.otherRoseId = roseId === 'rosetteA' ? 'rosetteB' : 'rosetteA';

        this.results = [];
        this.resultCounts = {};
        this.resultIndex = 0;
        this.offsetAValue = 0;
        this.offsetBValue = 0;
        this.targetCountValue = 1;
        this.minCountValue = 1;
        this.maxCountValue = 10;

        const suffix = roseId === 'rosetteA' ? 'A' : 'B';
        this.accordion = new Accordion(`Coincident Finder (${suffix})`, false, (isOpen, id) => {
            if (this.orchestrator.handleAccordionToggle) {
                this.orchestrator.handleAccordionToggle(isOpen, id);
            }
        }, `${roseId}-coincident-finder`);

        this.orchestrator.accordions.set(`${roseId}-coincident-finder`, this.accordion);
        this.element = this.accordion.element;

        this.render();
    }

    render() {
        // Status info
        this.statusDiv = createElement('div', 'text-xs text-gray-400 mb-2 p-1', {
            textContent: '—'
        });
        this.accordion.append(this.statusDiv);

        // Query Mode selector
        this.modeSelect = new ParamSelect({
            key: `coincidentMode_${this.roseId}`,
            label: 'Query Mode',
            options: [
                { value: 'any', label: 'Any Coincidence' },
                { value: 'exact', label: 'Exact Count' },
                { value: 'range', label: 'Count Range' },
                { value: 'specific', label: 'Specific Indices' }
            ],
            value: 'any',
            onChange: (val) => {
                this.queryMode = val;
                this.updateQueryUI();
            }
        });
        this.accordion.append(this.modeSelect.getElement());
        this.queryMode = 'any';

        // Count input (for exact mode)
        this.countControl = new ParamNumber({
            key: `coincidentCount_${this.roseId}`,
            label: 'Target Count',
            min: 1,
            max: 360,
            step: 1,
            value: 1,
            onChange: (val) => { this.targetCountValue = val; }
        });
        this.accordion.append(this.countControl.getElement());

        // Min Count (for range mode)
        this.minCountControl = new ParamNumber({
            key: `coincidentMinCount_${this.roseId}`,
            label: 'Min Count',
            min: 0,
            max: 360,
            step: 1,
            value: 1,
            onChange: (val) => { this.minCountValue = val; }
        });
        this.accordion.append(this.minCountControl.getElement());

        // Max Count (for range mode)
        this.maxCountControl = new ParamNumber({
            key: `coincidentMaxCount_${this.roseId}`,
            label: 'Max Count',
            min: 0,
            max: 360,
            step: 1,
            value: 10,
            onChange: (val) => { this.maxCountValue = val; }
        });
        this.accordion.append(this.maxCountControl.getElement());

        // Specific Indices input (for specific mode)
        this.indicesInputWrapper = createElement('div', 'mb-2');
        const indicesLabel = createElement('label', 'block text-xs text-gray-500 mb-1', {
            textContent: 'Indices (comma-separated)'
        });
        this.indicesInput = createElement('input', 'w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm text-white', {
            type: 'text',
            value: '0',
            placeholder: '0, 1, 2'
        });
        this.indicesInputWrapper.appendChild(indicesLabel);
        this.indicesInputWrapper.appendChild(this.indicesInput);
        this.accordion.append(this.indicesInputWrapper);

        // Offset controls
        this.offsetAControl = new ParamNumber({
            key: `coincidentOffsetA_${this.roseId}`,
            label: 'Offset A (a₀)',
            min: 0,
            max: 360,
            step: 1,
            value: 0,
            onChange: (val) => { this.offsetAValue = val; }
        });
        this.accordion.append(this.offsetAControl.getElement());

        this.offsetBControl = new ParamNumber({
            key: `coincidentOffsetB_${this.roseId}`,
            label: 'Offset B (b₀)',
            min: 0,
            max: 360,
            step: 1,
            value: 0,
            onChange: (val) => { this.offsetBValue = val; }
        });
        this.accordion.append(this.offsetBControl.getElement());

        // Search button
        this.searchBtn = createElement('button',
            'w-full px-3 py-1.5 bg-indigo-700 rounded hover:bg-indigo-600 transition-colors text-sm mb-2', {
            textContent: '🔍 Find Generators'
        });
        this.searchBtn.addEventListener('click', () => this.runSearch());
        this.accordion.append(this.searchBtn);

        // Results area
        this.resultsDiv = createElement('div', 'text-xs text-gray-300 p-1 mb-2', {
            textContent: ''
        });
        this.resultsDiv.style.fontFamily = 'monospace';
        this.resultsDiv.style.maxHeight = '80px';
        this.resultsDiv.style.overflowY = 'auto';
        this.accordion.append(this.resultsDiv);

        // Navigation
        const navRow = createElement('div', 'flex gap-1 mb-2');

        this.prevBtn = createElement('button',
            'flex-1 px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-xs disabled:opacity-50', {
            textContent: '◀ Prev'
        });
        this.prevBtn.addEventListener('click', () => this.navigate(-1));

        this.nextBtn = createElement('button',
            'flex-1 px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-xs disabled:opacity-50', {
            textContent: 'Next ▶'
        });
        this.nextBtn.addEventListener('click', () => this.navigate(1));

        this.randomBtn = createElement('button',
            'flex-1 px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors text-xs disabled:opacity-50', {
            textContent: '🎲 Random'
        });
        this.randomBtn.addEventListener('click', () => this.navigateRandom());

        navRow.appendChild(this.prevBtn);
        navRow.appendChild(this.nextBtn);
        navRow.appendChild(this.randomBtn);
        this.accordion.append(navRow);

        // Detail readout for selected generator
        this.detailDiv = createElement('div', 'text-xs text-gray-400 p-1', {
            textContent: ''
        });
        this.detailDiv.style.fontFamily = 'monospace';
        this.accordion.append(this.detailDiv);

        // Initialize UI visibility
        this.updateQueryUI();
    }

    updateQueryUI() {
        const mode = this.queryMode;
        this.countControl.getElement().style.display = (mode === 'exact') ? '' : 'none';
        this.minCountControl.getElement().style.display = (mode === 'range') ? '' : 'none';
        this.maxCountControl.getElement().style.display = (mode === 'range') ? '' : 'none';
        this.indicesInputWrapper.style.display = (mode === 'specific') ? '' : 'none';
    }

    getParams() {
        const state = store.getState();
        const thisRose = state[this.roseId];
        const otherRose = state[this.otherRoseId];

        const seqType = thisRose?.sequencer?.type || '';
        const otherSeqType = otherRose?.sequencer?.type || '';

        const getSeqParams = (rose) => {
            const type = rose?.sequencer?.type || ADDITIVE_SEQ_TYPE;
            return rose?.sequencer?.params?.[type] || {};
        };

        const myParams = getSeqParams(thisRose);
        const otherParams = getSeqParams(otherRose);

        return {
            isAdditive: seqType === ADDITIVE_SEQ_TYPE,
            otherIsAdditive: otherSeqType === ADDITIVE_SEQ_TYPE,
            n: myParams.totalDivs || 360,
            otherN: otherParams.totalDivs || 360,
            myStep: myParams.step || 1,
            otherStep: otherParams.step || 1
        };
    }

    runSearch() {
        const params = this.getParams();

        if (!params.isAdditive) {
            this.statusDiv.textContent = 'Requires Additive Group sequencer';
            this.results = [];
            this.updateResults();
            return;
        }

        const n = params.n;
        const otherG = params.otherStep;
        const startA = this.offsetAValue;
        const startB = this.offsetBValue;

        this.statusDiv.textContent = 'Searching…';
        this.results = [];
        this.resultCounts = {};
        this.resultIndex = 0;

        // Use requestAnimationFrame to avoid UI blocking
        requestAnimationFrame(() => {
            try {
                switch (this.queryMode) {
                    case 'any':
                        this.results = findGeneratorsWithAnyCoincidence(n, otherG, startA, startB);
                        break;
                    case 'exact': {
                        const count = Math.round(this.targetCountValue);
                        this.results = findGeneratorsWithExactCount(n, otherG, count, startA, startB);
                        break;
                    }
                    case 'range': {
                        const minC = Math.round(this.minCountValue);
                        const maxC = Math.round(this.maxCountValue);
                        const rangeResults = findGeneratorsInCountRange(n, otherG, minC, maxC, startA, startB);
                        // Normalize: extract generator numbers, store counts separately
                        this.resultCounts = {};
                        this.results = rangeResults.map(r => {
                            this.resultCounts[r.generator] = r.count;
                            return r.generator;
                        });
                        break;
                    }
                    case 'specific': {
                        const indicesStr = this.indicesInput.value || '0';
                        const indices = indicesStr.split(',').map(s => parseInt(s.trim(), 10)).filter(v => !isNaN(v));
                        this.results = findGeneratorsForSpecificIndices(n, otherG, indices, startA, startB);
                        break;
                    }
                }

                this.statusDiv.textContent = `Found ${this.results.length} generators (n=${n}, other g=${otherG})`;
                this.updateResults();
            } catch (err) {
                this.statusDiv.textContent = `Error: ${err.message}`;
                console.error('[CoincidentFinder]', err);
            }
        });
    }

    updateResults() {
        if (this.results.length === 0) {
            this.resultsDiv.textContent = 'No results';
            this.prevBtn.disabled = true;
            this.nextBtn.disabled = true;
            this.randomBtn.disabled = true;
            this.detailDiv.textContent = '';
            return;
        }

        this.prevBtn.disabled = false;
        this.nextBtn.disabled = false;
        this.randomBtn.disabled = false;

        // Show results list (compact)
        const display = this.results.map((g, i) =>
            i === this.resultIndex ? `[${g}]` : `${g}`
        ).join(', ');
        this.resultsDiv.textContent = `{${display}}`;

        // Show detail for selected
        this.showSelectedDetail();
    }

    showSelectedDetail() {
        if (this.results.length === 0) return;

        const params = this.getParams();
        const selectedG = this.results[this.resultIndex];
        const n = params.n;
        const otherG = params.otherStep;
        const startA = this.offsetAValue;
        const startB = this.offsetBValue;

        const count = getCoincidenceCount(n, selectedG, otherG, startA, startB);
        const indices = findCoincidentIndices(n, selectedG, otherG, startA, startB);

        let indicesStr;
        if (indices.length <= 20) {
            indicesStr = `{${indices.join(', ')}}`;
        } else {
            indicesStr = `{${indices.slice(0, 20).join(', ')}, … (${indices.length})}`;
        }

        this.detailDiv.textContent =
            `g=${selectedG}  count=${count}\n` +
            `indices: ${indicesStr}\n` +
            `[${this.resultIndex + 1}/${this.results.length}]`;
    }

    navigate(delta) {
        if (this.results.length === 0) return;
        this.resultIndex = ((this.resultIndex + delta) % this.results.length + this.results.length) % this.results.length;
        this.applySelected();
        this.updateResults();
    }

    navigateRandom() {
        if (this.results.length <= 1) return;
        let newIdx;
        do {
            newIdx = Math.floor(Math.random() * this.results.length);
        } while (newIdx === this.resultIndex && this.results.length > 1);
        this.resultIndex = newIdx;
        this.applySelected();
        this.updateResults();
    }

    applySelected() {
        if (this.results.length === 0) return;
        const selectedG = this.results[this.resultIndex];
        // Immediately apply to this rosette's step parameter
        dispatchDeep('step', selectedG, this.roseId);
    }

    update(flatParams) {
        const params = this.getParams();

        // Gray out if not additive sequencer
        this.accordion.element.style.opacity = params.isAdditive ? '1' : '0.5';

        if (!params.isAdditive) {
            this.statusDiv.textContent = 'Requires Additive Group sequencer';
            return;
        }

        // Update offset max values
        this.offsetAControl.setMax(params.n - 1);
        this.offsetBControl.setMax(params.n - 1);
        this.countControl.setMax(params.n);
        this.minCountControl.setMax(params.n);
        this.maxCountControl.setMax(params.n);
    }
}
