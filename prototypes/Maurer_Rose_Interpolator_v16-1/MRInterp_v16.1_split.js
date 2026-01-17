        // --- DOM Element Selection ---
        const canvasA = document.getElementById('canvasA'), ctxA = canvasA.getContext('2d');
        const canvasB = document.getElementById('canvasB'), ctxB = canvasB.getContext('2d');
        const canvasInterpolated = document.getElementById('canvasInterpolated'), ctxInterpolated = canvasInterpolated.getContext('2d');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const speedSlider = document.getElementById('speedSlider');
        const lcmValSpan = document.getElementById('lcm-val');
        const interpMethodSelect = document.getElementById('interp_method_select');
        const lcmOption = document.getElementById('lcm_option');
        const lcm2Option = document.getElementById('lcm2_option');
        const lcmCosetsOption = document.getElementById('lcm_cosets_option');
        const joinedCosetsOption = document.getElementById('joined_cosets_option');
        const cosetsOption = document.getElementById('cosets_option');
        const cosetsMergeOption = document.getElementById('cosets_merge_option');
        const exactMatchToggle = document.getElementById('exact_match_toggle');
        const exactMatchLabel = document.getElementById('exact_match_label');
        const colorBySegmentSection = document.getElementById('color-by-segment-section');
        const percentageDisplay = document.getElementById('percentage-display');
        const cosetsUsedDisplay = document.getElementById('cosets-used-display');
        const cosetsUsedAVal = document.getElementById('cosets-used-a-val');
        const cosetsUsedBVal = document.getElementById('cosets-used-b-val');
        const cosetMergeSelectionSection = document.getElementById('coset-merge-selection-section');
        const lcmCosetsControlsSection = document.getElementById('lcm-cosets-controls-section');
        const joinedCosetsControlsSection = document.getElementById('joined-cosets-controls-section');
        const joinedCosetsInfoDisplay = document.getElementById('joined-cosets-info-display');
        const joinedCosetsSegmentsA = document.getElementById('joined-cosets-segments-a-val');
        const joinedCosetsSegmentsB = document.getElementById('joined-cosets-segments-b-val');
        const joinedCosetsLcmVal = document.getElementById('joined-cosets-lcm-val');
        const interpCanvasSize = document.getElementById('interp-canvas-size');
        const relativeCombosToggle = document.getElementById('relativeCombosToggle');
        const relativeCombosControls = document.getElementById('relative-combos-controls');
        const recordBtn = document.getElementById('recordBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const recordingFormatSelect = document.getElementById('recordingFormat');
        const recordingBitrateSlider = document.getElementById('recordingBitrate');
        const bitrateValSpan = document.getElementById('bitrate-val');
        const fiftyFiftyBtn = document.getElementById('fiftyFiftyBtn');
        
        const controls = {
            A: {
                n: document.getElementById('nA'), d: document.getElementById('dA'), c: document.getElementById('cA'), A: document.getElementById('AA'),
                rot: document.getElementById('rotA'), 
                useCustomDivs: document.getElementById('useCustomDivsA'), totalDivsSection: document.getElementById('total-divs-section-A'),
                totalDivs: document.getElementById('totalDivsA'), totalDivsVal: document.getElementById('total-divs-val-A'),
                degLabel: document.getElementById('degLabelA'), deg: document.getElementById('degA'), 
                degFactors: document.getElementById('deg-factors-A'),
                showRhodonea: document.getElementById('showRhodoneaA'), showPoints: document.getElementById('showPointsA'),
                strokeIndividually: document.getElementById('strokeIndividuallyA'), opacity: document.getElementById('opacityA'), lineWidth: document.getElementById('lineWidthA'), pointsOpacity: document.getElementById('pointsOpacityA'),
                lineOpacity: document.getElementById('lineOpacityA'), lineOpacityVal: document.getElementById('line-opacity-val-A'),
                maurerStyle: document.getElementById('maurerStyleA'),
                showAllCosets: document.getElementById('showCosetsA'), numCosets: document.getElementById('numCosetsA'), cosetCount: document.getElementById('coset-count-A'), numCosetsVal: document.getElementById('num-cosets-val-A'),
                colorCosets: document.getElementById('colorCosetsA'), cosetColorStart: document.getElementById('cosetColorStartA'), cosetColorEnd: document.getElementById('cosetColorEndA'), cosetCompositeMode: document.getElementById('cosetCompositeModeA'),
                cosetSelection: document.getElementById('cosetSelectionA'), showStartEnd: document.getElementById('showStartEndA'),
                startEndSize: document.getElementById('startEndSizeA'), startEndSizeVal: document.getElementById('start-end-size-val-A'),
                relativesMethod: document.getElementById('relativesMethodA'),
                relativeTo: document.getElementById('relativeToA'),
                relativeToContainer: document.getElementById('relativeToContainerA'),
                relativesDropdown: document.getElementById('relativesA'),
                relativesLabel: document.getElementById('relativesLabelA'),
                relativesCounter: document.getElementById('relativesCounterA'),
                prevRelative: document.getElementById('prevRelativeA'),
                randomRelative: document.getElementById('randomRelativeA'),
                nextRelative: document.getElementById('nextRelativeA'),
                addEToN: document.getElementById('addEToNA'), addEToD: document.getElementById('addEToDA'), addEToDeg: document.getElementById('addEToDegA'),
                cyclesMultiplier: document.getElementById('cyclesMultiplierA'), cyclesMultiplierVal: document.getElementById('cycles-multiplier-val-A'),
                cyclesMultiplierSection: document.getElementById('cycles-multiplier-section-A'),
                nVal: document.getElementById('n-val-A'), dVal: document.getElementById('d-val-A'), cVal: document.getElementById('c-val-A'),
                AVal: document.getElementById('A-val-A'), rotVal: document.getElementById('rot-val-A'), degVal: document.getElementById('deg-val-A'),
                opacityVal: document.getElementById('opacity-val-A'), lineWidthVal: document.getElementById('line-width-val-A'), pointsOpacityVal: document.getElementById('points-opacity-val-A'), lines: document.getElementById('linesA'), color: '#06b6d4',
                colorBySegmentSection: document.getElementById('color-by-segment-section-A'),
                colorByMethod: document.getElementById('colorByMethodA'),
                colorRangeStart: document.getElementById('colorRangeStartA'),
                colorRangeEnd: document.getElementById('colorRangeEndA')
            },
            B: {
                n: document.getElementById('nB'), d: document.getElementById('dB'), c: document.getElementById('cB'), A: document.getElementById('AB'),
                rot: document.getElementById('rotB'), 
                useCustomDivs: document.getElementById('useCustomDivsB'), totalDivsSection: document.getElementById('total-divs-section-B'),
                totalDivs: document.getElementById('totalDivsB'), totalDivsVal: document.getElementById('total-divs-val-B'),
                degLabel: document.getElementById('degLabelB'), deg: document.getElementById('degB'), 
                degFactors: document.getElementById('deg-factors-B'),
                showRhodonea: document.getElementById('showRhodoneaB'), showPoints: document.getElementById('showPointsB'),
                strokeIndividually: document.getElementById('strokeIndividuallyB'), opacity: document.getElementById('opacityB'), lineWidth: document.getElementById('lineWidthB'), pointsOpacity: document.getElementById('pointsOpacityB'),
                 lineOpacity: document.getElementById('lineOpacityB'), lineOpacityVal: document.getElementById('line-opacity-val-B'),
                 maurerStyle: document.getElementById('maurerStyleB'),
                showAllCosets: document.getElementById('showCosetsB'), numCosets: document.getElementById('numCosetsB'), cosetCount: document.getElementById('coset-count-B'), numCosetsVal: document.getElementById('num-cosets-val-B'),
                colorCosets: document.getElementById('colorCosetsB'), cosetColorStart: document.getElementById('cosetColorStartB'), cosetColorEnd: document.getElementById('cosetColorEndB'), cosetCompositeMode: document.getElementById('cosetCompositeModeB'),
                cosetSelection: document.getElementById('cosetSelectionB'), showStartEnd: document.getElementById('showStartEndB'),
                 startEndSize: document.getElementById('startEndSizeB'), startEndSizeVal: document.getElementById('start-end-size-val-B'),
                 relativesMethod: document.getElementById('relativesMethodB'),
                 relativeTo: document.getElementById('relativeToB'),
                 relativeToContainer: document.getElementById('relativeToContainerB'),
                 relativesDropdown: document.getElementById('relativesB'),
                 relativesLabel: document.getElementById('relativesLabelB'),
                 relativesCounter: document.getElementById('relativesCounterB'),
                 prevRelative: document.getElementById('prevRelativeB'),
                 randomRelative: document.getElementById('randomRelativeB'),
                 nextRelative: document.getElementById('nextRelativeB'),
                 addEToN: document.getElementById('addEToNB'), addEToD: document.getElementById('addEToDA'), addEToDeg: document.getElementById('addEToDegB'),
                 cyclesMultiplier: document.getElementById('cyclesMultiplierB'), cyclesMultiplierVal: document.getElementById('cycles-multiplier-val-B'),
                 cyclesMultiplierSection: document.getElementById('cycles-multiplier-section-B'),
                nVal: document.getElementById('n-val-B'), dVal: document.getElementById('d-val-B'), cVal: document.getElementById('c-val-B'),
                AVal: document.getElementById('A-val-B'), rotVal: document.getElementById('rot-val-B'), degVal: document.getElementById('deg-val-B'),
                opacityVal: document.getElementById('opacity-val-B'), lineWidthVal: document.getElementById('line-width-val-B'), pointsOpacityVal: document.getElementById('points-opacity-val-B'), lines: document.getElementById('linesB'), color: '#f43f5e',
                colorBySegmentSection: document.getElementById('color-by-segment-section-B'),
                colorByMethod: document.getElementById('colorByMethodB'),
                colorRangeStart: document.getElementById('colorRangeStartB'),
                colorRangeEnd: document.getElementById('colorRangeEndB')
            },
            Interp: {
                slider: document.getElementById('interp'), valA: document.getElementById('interp-val-A'), valB: document.getElementById('interp-val-B'),
                showRhodonea: document.getElementById('showRhodoneaInterp'), showPoints: document.getElementById('showPointsInterp'), 
                strokeIndividually: document.getElementById('strokeIndividuallyInterp'), opacity: document.getElementById('opacityInterp'), opacityVal: document.getElementById('opacity-val-Interp'), 
                pointsOpacity: document.getElementById('pointsOpacityInterp'), pointsOpacityVal: document.getElementById('points-opacity-val-Interp'),
                showTrails: document.getElementById('showTrails'), trailDecay: document.getElementById('trailDecay'), 
                trailDecayVal: document.getElementById('trail-decay-val'), 
                maurerStyle: document.getElementById('maurerStyleInterp'),
                lineBrightness: document.getElementById('lineBrightness'), lineBrightnessVal: document.getElementById('line-brightness-val'),
                autoBrightnessLines: document.getElementById('autoBrightnessLines'),
                targetBrightness: document.getElementById('targetBrightness'),
                targetBrightnessVal: document.getElementById('target-brightness-val'),
                lineWidth: document.getElementById('lineWidthInterp'), lineWidthVal: document.getElementById('line-width-val-Interp'),
                lineOpacity: document.getElementById('lineOpacityInterp'), lineOpacityVal: document.getElementById('line-opacity-val-Interp'),
                compositeMode: document.getElementById('compositeMode'),
                colorPicker: document.getElementById('colorInterp'), colorVal: document.getElementById('color-val-Interp'),
                easeSpeedToggle: document.getElementById('easeSpeedToggle'),
                relativeCombosToggle: document.getElementById('relativeCombosToggle'),
                roseAPicker: document.getElementById('roseAPicker'),
                roseBPicker: document.getElementById('roseBPicker'),
                showPercentages: document.getElementById('showPercentages'), showStartEnd: document.getElementById('showStartEndInterp'),
                startEndSize: document.getElementById('startEndSizeInterp'), startEndSizeVal: document.getElementById('start-end-size-val-Interp'),
                autoScale: document.getElementById('autoScaleInterp'),
                scaleThickness: document.getElementById('scaleThickness'),
                showSimilarPoints: document.getElementById('showSimilarPointsInterp'),
                similarPointsCount: document.getElementById('similarPointsCount'),
                colorByMethod: document.getElementById('colorByMethod'), colorRangeStart: document.getElementById('colorRangeStart'), colorRangeEnd: document.getElementById('colorRangeEnd'),
                cosetMergeSelection: document.getElementById('cosetMergeSelection'),
                lcmCosetsNum: document.getElementById('lcmCosetsNum'),
                lcmCosetsNumVal: document.getElementById('lcm-cosets-num-val'),
                lcmCosetsSelection: document.getElementById('lcmCosetsSelection'),
                joinedCosetsNum: document.getElementById('joinedCosetsNum'),
                joinedCosetsNumVal: document.getElementById('joined-cosets-num-val'),
                joinedCosetsSelection: document.getElementById('joinedCosetsSelection'),
                joinedCosetsSegmentsA: document.getElementById('joined-cosets-segments-a-val'),
                joinedCosetsSegmentsB: document.getElementById('joined-cosets-segments-b-val'),
                joinedCosetsLcmVal: document.getElementById('joined-cosets-lcm-val'),
            }
        };

        // --- State ---
        let paramsA = {};
        let paramsB = {};
        let interpWeight = 0.5;
        const RESAMPLE_COUNT = 720;
        const LCM_LIMIT = 15000;
        let animationFrameId = null;
        let isPlaying = false;
        let isFirstFrame = true;
        let animationPhase = 0;
        let animationDirection = 1;
        let relativesA_list = [];
        let relativesB_list = [];
        let currentRelativeIndexA = -1;
        let currentRelativeIndexB = -1;
        let mediaRecorder;
        let recordedChunks = [];
        let isRecording = false;
        let recordedBlob = null;
        let currentRecordingFormat = '';
        const syncState = {
            n: false, d: false, c: false, A: false, rot: false, totalDivs: false, deg: false
        };

        // --- Utility Functions ---
        function getPrimeFactorization(num) {
            if (num <= 1) return "1";
            num = Math.floor(num);
            
            const factors = [];
            let d = 2;
            let n = num;

            while (n > 1) {
                while (n % d === 0) {
                    factors.push(d);
                    n /= d;
                }
                d = d + 1;
                if (d * d > n) {
                    if (n > 1) factors.push(n);
                    break;
                }
            }

            if (factors.length === 1 && factors[0] === num) {
                return "Prime";
            }

            return factors.join(' x ');
        }
        function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while(b) { [a, b] = [b, a % b]; } return a; }
        
        function toRadians(div, totalDivisions, periodIn2Pi) { 
             const totalAngle = periodIn2Pi * 2 * Math.PI;
             return div * (totalAngle / totalDivisions);
        }
        
        function lcm(a, b) {
            if (!a || !b || a === 0 || b === 0) return null;
            return Math.abs(a * b) / gcd(a, b);
        }
        function hexToRgb(hex) {
            let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
        }

        function colorToRgba(colorStr, alpha) {
            if (colorStr.startsWith('#')) {
                const rgb = hexToRgb(colorStr);
                if (rgb) {
                    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                }
            } else if (colorStr.startsWith('rgb(')) {
                return colorStr.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
            }
            return colorStr;
        }
        
        function calculateLinesToClose(D, totalDivisions) {
            if (D === 0 || totalDivisions === 0) return null;
            return totalDivisions / gcd(D, totalDivisions);
        }
        
        function calculateRhodoneaPeriodCycles(n, d) {
            if (d === 0) return 0;
            const commonDivisor = gcd(n, d);
            const n1 = n / commonDivisor;
            const d1 = d / commonDivisor;
            return (n1 % 2 !== 0 && d1 % 2 !== 0) ? (d1 / 2) : d1;
        }

        function findMatchingDegrees(n, d, targetLinesToClose, totalDivisions) {
            const matching = [];
            if (targetLinesToClose === null) return [];
            
            for (let deg = 1; deg <= totalDivisions; deg++) {
                if (calculateLinesToClose(deg, totalDivisions) === targetLinesToClose) {
                    matching.push({ n, d, deg });
                }
            }
            return matching;
        }
        
        const primeCache = new Map();
        function isPrime(num) {
            if (num <= 1) return false;
            if (num <= 3) return true;
            if (num % 2 === 0 || num % 3 === 0) return false;
            for (let i = 5; i * i <= num; i = i + 6) {
                if (num % i === 0 || num % (i + 2) === 0) return false;
            }
            return true;
        }

        function findPrimes(max) {
            if (primeCache.has(max)) {
                return primeCache.get(max);
            }
            const primes = [];
            for (let i = 2; i <= max; i++) {
                if (isPrime(i)) {
                    primes.push(i);
                }
            }
            primeCache.set(max, primes);
            return primes;
        }

        function navigateRelatives(panel, direction) {
            let controlsPanel, otherControlsPanel;
            if (panel === 'A') {
                controlsPanel = controls.A;
                otherControlsPanel = controls.B;
            } else {
                controlsPanel = controls.B;
                otherControlsPanel = controls.A;
            }
            
            const method = controlsPanel.relativesMethod.value;
            const relativeTo = controlsPanel.relativeTo.value;
            
            let currentDeg, totalDivs, targetValue;

            if (method === 'twin_primes' || method === 'cousin_primes' || method === 'hexy_primes') {
                const maxDivs = Math.max(paramsA.totalDivisions, paramsB.totalDivisions);
                let diff;
                if (method === 'twin_primes') diff = 2;
                else if (method === 'cousin_primes') diff = 4;
                else diff = 6;

                if (direction === 'prev') {
                    let nmax = Math.min(paramsA.deg, paramsB.deg);
                    for (let n = nmax - 1; n >= 3; n--) {
                        if (isPrime(n) && isPrime(n - diff)) {
                            controls.A.deg.value = n - diff;
                            controls.B.deg.value = n;
                            update();
                            return;
                        }
                    }
                } else if (direction === 'next') {
                    let nmin = Math.max(paramsA.deg, paramsB.deg) + 1;
                    for (let n = nmin; n < maxDivs - diff; n++) {
                         if (isPrime(n) && isPrime(n + diff)) {
                            controls.A.deg.value = n;
                            controls.B.deg.value = n + diff;
                            update();
                            return;
                        }
                    }
                } else { // random
                    const allPrimes = findPrimes(maxDivs);
                    const primePairs = [];
                    for (let i = 0; i < allPrimes.length - 1; i++) {
                         const p1 = allPrimes[i];
                         const p2 = allPrimes.find(p => p === p1 + diff);
                         if(p2) {
                            primePairs.push([p1, p2]);
                         }
                    }
                    if (primePairs.length > 0) {
                        const pair = primePairs[Math.floor(Math.random() * primePairs.length)];
                        controls.A.deg.value = pair[0];
                        controls.B.deg.value = pair[1];
                        update();
                        return;
                    }
                }
                return;
            }

            if (relativeTo === 'self') {
                currentDeg = parseInt(controlsPanel.deg.value);
                totalDivs = parseInt(controlsPanel.totalDivs.value);
                targetValue = (method === 'ltc') ? calculateLinesToClose(currentDeg, totalDivs) : totalDivs;
            } else { // 'other'
                currentDeg = parseInt(otherControlsPanel.deg.value);
                totalDivs = parseInt(otherControlsPanel.totalDivs.value);
                targetValue = (method === 'ltc') ? calculateLinesToClose(currentDeg, totalDivs) : totalDivs;
            }
            
            let startSearchValue = parseInt(controlsPanel.deg.value);


            if (method === 'prime') {
                const primes = findPrimes(totalDivs);
                if (primes.length === 0) return;

                let newPrime;
                if (direction === 'next') {
                    newPrime = primes.find(p => p > startSearchValue) || primes[0];
                } else if (direction === 'prev') {
                    const reversedPrimes = [...primes].reverse();
                    newPrime = reversedPrimes.find(p => p < startSearchValue) || primes[primes.length - 1];
                } else { // random
                    let availablePrimes = primes.filter(p => p !== startSearchValue);
                    if (availablePrimes.length === 0) availablePrimes = primes;
                    newPrime = availablePrimes[Math.floor(Math.random() * availablePrimes.length)];
                }
                controlsPanel.deg.value = newPrime;
                update();
                return;
            }

            if (method === 'relatively_prime' || method === 'relatively_prime_not_prime') {
                let newDeg = currentDeg;
                const checkFn = (i) => {
                    const isCoprime = gcd(i, targetValue) === 1;
                    if (method === 'relatively_prime_not_prime') {
                        return isCoprime && !isPrime(i);
                    }
                    return isCoprime;
                };

                if (direction === 'next') {
                    for (let i = startSearchValue + 1; i <= totalDivs; i++) {
                        if (checkFn(i)) { newDeg = i; break; }
                    }
                } else if (direction === 'prev') {
                    for (let i = startSearchValue - 1; i > 0; i--) {
                        if (checkFn(i)) { newDeg = i; break; }
                    }
                } else { // random
                    const candidates = [];
                    for (let i = 1; i <= totalDivs; i++) {
                        if (checkFn(i)) { candidates.push(i); }
                    }
                    let available = candidates.filter(p => p !== currentDeg);
                    if (available.length === 0) available = candidates;
                    if (available.length > 0) {
                        newDeg = available[Math.floor(Math.random() * available.length)];
                    }
                }
                controlsPanel.deg.value = newDeg;
                update();
                return;
            }
            
            if (method === 'ltc') {
                if (direction === 'random') {
                    let currentIndex, relativesList;
                    if (panel === 'A') {
                        currentIndex = currentRelativeIndexA;
                        relativesList = relativesA_list;
                    } else {
                        currentIndex = currentRelativeIndexB;
                        relativesList = relativesB_list;
                    }
                    if(relativesList.length > 0) {
                        currentIndex = Math.floor(Math.random() * relativesList.length);
                        const relative = relativesList[currentIndex];
                        if (relative) {
                            controlsPanel.n.value = relative.n;
                            controlsPanel.d.value = relative.d;
                            controlsPanel.deg.value = relative.deg;
                            controlsPanel.relativesCounter.textContent = `${currentIndex + 1} / ${relativesList.length}`;
                            controlsPanel.relativesDropdown.value = currentIndex;
                            if (panel === 'A') { currentRelativeIndexA = currentIndex; } else { currentRelativeIndexB = currentIndex; }
                        }
                    }
                } else {
                    const targetLTC = targetValue;
                    if (direction === 'next') {
                        for (let i = startSearchValue + 1; i <= totalDivs; i++) {
                            if (calculateLinesToClose(i, totalDivs) === targetLTC) {
                                controlsPanel.deg.value = i;
                                break;
                            }
                        }
                    } else if (direction === 'prev') {
                        for (let i = startSearchValue - 1; i > 0; i--) {
                            if (calculateLinesToClose(i, totalDivs) === targetLTC) {
                                controlsPanel.deg.value = i;
                                break;
                            }
                        }
                    }
                }
                update();
            }
        }

        function populateRelatives(panel, ownParams, otherParams) {
            let relativesList, label, dropdown, counter;
            if (panel === 'A') {
                relativesList = relativesA_list;
                label = controls.A.relativesLabel;
                dropdown = controls.A.relativesDropdown;
                counter = controls.A.relativesCounter;
            } else {
                relativesList = relativesB_list;
                label = controls.B.relativesLabel;
                dropdown = controls.B.relativesDropdown;
                counter = controls.B.relativesCounter;
            }

            let targetLinesToClose;
            if (ownParams.relativeTo === 'self') {
                targetLinesToClose = calculateLinesToClose(ownParams.deg, ownParams.totalDivisions);
            } else {
                targetLinesToClose = calculateLinesToClose(otherParams.deg, otherParams.totalDivisions);
            }
            
            const newRelatives = findMatchingDegrees(ownParams.n, ownParams.d, targetLinesToClose, ownParams.totalDivisions);
            
            if (JSON.stringify(relativesList) !== JSON.stringify(newRelatives)) {
                relativesList.length = 0;
                relativesList.push(...newRelatives);

                dropdown.innerHTML = '<option value="">Select...</option>';
                label.textContent = `Matches (${relativesList.length} found)`;
                counter.textContent = "- / -";
                if (panel === 'A') { currentRelativeIndexA = -1; } else { currentRelativeIndexB = -1; }

                relativesList.forEach((r, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `n:${r.n}, d:${r.d}, D:${r.deg}`;
                    dropdown.appendChild(option);
                });
            }
        }

        function generateLcm1Points(params, originalLines, targetLines, offset = 0) {
            const points = [];
            const { n, d, c, A, rot, deg, totalDivisions, periodCycles } = params;
            if (d === 0 || !originalLines || !targetLines || originalLines === 0) return [];
            
            const totalDivsInPath = originalLines * deg;
            const newDivStep = totalDivsInPath / targetLines;
            
            for (let i = 0; i <= targetLines; i++) {
                const thetaDiv = offset + (i * newDivStep);
                const thetaRad = toRadians(thetaDiv, totalDivisions, periodCycles);
                const rotRad = rot * (Math.PI / 180);
                const r = c + A * Math.sin((n / d) * (thetaRad + rotRad));
                const x = r * Math.cos(thetaRad);
                const y = r * Math.sin(thetaRad);
                points.push({ x, y });
            }
            return points;
        }

        function generateLcm2Points(originalMaurerPoints, originalLines, targetLines) {
            const newPoints = [];
            if (!originalMaurerPoints || originalMaurerPoints.length < 2 || !originalLines || !targetLines || originalLines === 0 || targetLines === 0) return [];
            
            const multiplier = targetLines / originalLines;
            if (multiplier < 1) {
                 const ratio = Math.floor(originalMaurerPoints.length / targetLines);
                 for (let i = 0; i < targetLines; i++) {
                    newPoints.push(originalMaurerPoints[i*ratio]);
                 }
                 return newPoints;
            }
            
            const lerp = (p1, p2, t) => ({ x: p1.x * (1 - t) + p2.x * t, y: p1.y * (1 - t) + p2.y * t });

            for (let i = 0; i < originalMaurerPoints.length - 1; i++) {
                const startPoint = originalMaurerPoints[i];
                const endPoint = originalMaurerPoints[i + 1];
                
                for (let j = 0; j < multiplier; j++) {
                    newPoints.push(lerp(startPoint, endPoint, j / multiplier));
                }
            }
            newPoints.push(originalMaurerPoints[originalMaurerPoints.length - 1]);
            return newPoints;
        }
        
        function generateJoinedCosetPath(params, linesToClose, numCosetsToRender, selectionMethod) {
            let joinedPoints = [];
            if (!linesToClose || !numCosetsToRender || numCosetsToRender <= 0) return [];
            
            const k = gcd(params.deg, params.totalDivisions);

            for (let i = 0; i < numCosetsToRender; i++) {
                 let offset;
                if (selectionMethod === 'distributed' && numCosetsToRender > 1) {
                    offset = Math.round(i * k / numCosetsToRender);
                } else if (selectionMethod === 'two-way') {
                     offset = (i % 2 === 0) ? Math.floor(i / 2) : k - 1 - Math.floor(i / 2);
                } else {
                    offset = i;
                }
                const cosetPoints = generateRosePoints(params, linesToClose, offset);
                joinedPoints.push(...cosetPoints);
            }
            
            return joinedPoints;
        }

        function generateMergedCosetPath(params, linesToClose, numCosetsToRender, selectionMethod) {
            let mergedPoints = [];
            if (!linesToClose || !numCosetsToRender || numCosetsToRender <= 0) return [];
            
            const k = gcd(params.deg, params.totalDivisions);

            for (let i = 0; i < numCosetsToRender; i++) {
                 let offset;
                if (selectionMethod === 'distributed' && numCosetsToRender > 1) {
                    offset = Math.round(i * k / numCosetsToRender);
                } else if (selectionMethod === 'two-way') {
                     offset = (i % 2 === 0) ? Math.floor(i / 2) : k - 1 - Math.floor(i / 2);
                } else {
                    offset = i;
                }
                const cosetPoints = generateRosePoints(params, linesToClose, offset);
                mergedPoints.push(...cosetPoints.slice(0, -1));
            }

            if (mergedPoints.length > 0) {
                mergedPoints.push(mergedPoints[0]);
            }
            
            return mergedPoints;
        }

        function generateRosePoints(params, linesToDraw, offset = 0) {
            const points = [];
            let { n, d, c, A, rot, deg, addEToN, addEToD, addEToDeg, totalDivisions, periodCycles } = params;

            let n_prime = addEToN ? n + Math.E : n;
            let d_prime = addEToD ? d + Math.E : d;
            let deg_prime = addEToDeg ? deg + Math.E : deg;

            if (d_prime === 0 || linesToDraw === null || linesToDraw <= 0) return [{x:0, y:0}];
            for (let i = 0; i <= linesToDraw; i++) {
                const thetaDiv = offset + (i * deg_prime);
                const thetaRad = toRadians(thetaDiv, totalDivisions, periodCycles);
                const rotRad = rot * (Math.PI / 180);
                const r = c + A * Math.sin((n_prime / d_prime) * (thetaRad + rotRad));
                const x = r * Math.cos(thetaRad);
                const y = r * Math.sin(thetaRad);
                points.push({ x, y });
            }
            return points;
        }
        
        function generateRhodoneaCurvePoints(params) {
            const points = [];
            let { n, d, c, A, rot, addEToN, addEToD, totalDivisions, periodCycles } = params;

            let n_prime = addEToN ? n + Math.E : n;
            let d_prime = addEToD ? d + Math.E : d;

            if (d_prime === 0) return [];
            const step = 0.5;
            for (let thetaDiv = 0; thetaDiv <= totalDivisions; thetaDiv += step) {
                const thetaRad = toRadians(thetaDiv, totalDivisions, periodCycles);
                const rotRad = rot * (Math.PI / 180);
                const r = c + A * Math.sin((n_prime / d_prime) * (thetaRad + rotRad));
                const x = r * Math.cos(thetaRad);
                const y = r * Math.sin(thetaRad);
                points.push({ x, y });
            }
            return points;
        }
        
        function distance(p1, p2) { return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)); }
        
        function minDistanceToCenter(p1, p2) {
            const a = p1;
            const b = p2;

            const ba = { x: b.x - a.x, y: b.y - a.y };
            const dot_a_ba = a.x * ba.x + a.y * ba.y;
            const dot_ba_ba = ba.x * ba.x + ba.y * ba.y;

            if (dot_ba_ba === 0) {
                return Math.sqrt(a.x * a.x + a.y * a.y);
            }
            
            const h = Math.max(0, Math.min(1, -dot_a_ba / dot_ba_ba));

            const result_vec = {
                x: a.x + ba.x * h,
                y: a.y + ba.y * h
            };

            return Math.sqrt(result_vec.x * result_vec.x + result_vec.y * result_vec.y);
        }

        function resample(points, numPoints) {
            if (points.length < 2) return new Array(numPoints).fill(points[0] || {x: 0, y: 0});
            let totalLength = 0;
            for (let i = 0; i < points.length - 1; i++) { totalLength += distance(points[i], points[i+1]); }
            if (totalLength === 0) return new Array(numPoints).fill(points[0]);
            const interval = totalLength / (numPoints - 1);
            const newPoints = [points[0]];
            let distTraveled = 0;
            let currentPointIndex = 0;
            for (let i = 1; i < numPoints - 1; i++) {
                const targetDist = i * interval;
                while(distTraveled < targetDist) {
                    if (currentPointIndex >= points.length - 1) break;
                    const segmentLength = distance(points[currentPointIndex], points[currentPointIndex + 1]);
                    if(distTraveled + segmentLength >= targetDist) {
                        const ratio = segmentLength === 0 ? 0 : (targetDist - distTraveled) / segmentLength;
                        newPoints.push({ x: points[currentPointIndex].x + ratio * (points[currentPointIndex + 1].x - points[currentPointIndex].x), y: points[currentPointIndex].y + ratio * (points[currentPointIndex + 1].y - points[currentPointIndex].y) });
                        break;
                    } else { distTraveled += segmentLength; currentPointIndex++; }
                }
            }
            newPoints.push(points[points.length - 1]);
            return newPoints;
        }

        function interpolatePoints(pointsA, pointsB, weight) {
            const interpolated = [];
            const lerp = (a, b, t) => a * (1 - t) + b * t;
            const len = Math.min(pointsA.length, pointsB.length);
            for (let i = 0; i < len; i++) {
                interpolated.push({ x: lerp(pointsA[i].x, pointsB[i].x, weight), y: lerp(pointsA[i].y, pointsB[i].y, weight) });
            }
            return interpolated;
        }

        function drawPath(ctx, points, color, lineWidth, strokeIndividually = false, colorParams = null, scaleInfo = { auto: false }, scaleThickness = false, maurerStyle = 'line') {
            if (points.length < 2) return;
            const canvas = ctx.canvas;
            const cssWidth = canvas.clientWidth;
            const cssHeight = canvas.clientHeight;
            const centerX = cssWidth / 2;
            const centerY = cssHeight / 2;
            
            let scale;
            let offsetX = 0;
            let offsetY = 0;

            if (scaleInfo.auto && scaleInfo.shapeWidth > 0 && scaleInfo.shapeHeight > 0) {
                scale = Math.min(cssWidth / scaleInfo.shapeWidth, cssHeight / scaleInfo.shapeHeight) * 0.95; 
                offsetX = scaleInfo.shapeCenterX;
                offsetY = scaleInfo.shapeCenterY;
            } else {
                scale = Math.min(cssWidth, cssHeight) / 4.5;
            }

            let finalLineWidth = lineWidth;
            if (scaleThickness) {
                const referenceWidth = 500;
                finalLineWidth = lineWidth * (canvas.width / referenceWidth);
            }
            ctx.lineWidth = finalLineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            if (strokeIndividually) {
                const useColorMapping = colorParams && colorParams.startColor && colorParams.endColor && colorParams.method !== 'none';
                
                for (let i = 0; i < points.length - 1; i++) {
                    const p1 = points[i];
                    const p2 = points[i+1];
                    let segmentColor = color;

                    if (useColorMapping) {
                        let t = 0;
                        const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);

                        if (colorParams.method === 'angle_octant') {
                            const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;
                            const octantAngle = angleDeg % 45;
                            const distanceFromMidpoint = Math.abs(octantAngle - 22.5);
                            t = 1.0 - (distanceFromMidpoint / 22.5);
                        } else if (colorParams.method === 'angle_quadrant') {
                            const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;
                            const quadrantAngle = angleDeg % 90;
                            const distanceFromPole = Math.abs(quadrantAngle - 45);
                            t = 1.0 - (distanceFromPole / 45.0);
                        } else {
                            let val;
                            if (colorParams.method === 'length') {
                                val = distance(p1, p2);
                            } else if (colorParams.method === 'distance') {
                                const midX = (p1.x + p2.x) / 2;
                                const midY = (p1.y + p2.y) / 2;
                                val = Math.sqrt(midX * midX + midY * midY);
                            } else if (colorParams.method === 'start_distance') {
                                val = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
                            } else if (colorParams.method === 'end_distance') {
                                val = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
                            } else if (colorParams.method === 'angle') {
                                val = Math.abs(angleRad);
                            } else if (colorParams.method === 'min_distance_to_center') {
                                val = minDistanceToCenter(p1, p2);
                            }
                            const range = colorParams.max - colorParams.min;
                            t = range > 0 ? (val - colorParams.min) / range : 0;
                        }
                        
                        t = Math.max(0, Math.min(1, t)); // Clamp t
                        
                        const lerp = (a, b, t) => a * (1-t) + b * t;
                        const brightness = colorParams.brightness || 1.0;
                        const r_base = Math.round(lerp(colorParams.startColor.r, colorParams.endColor.r, t));
                        const g_base = Math.round(lerp(colorParams.startColor.g, colorParams.endColor.g, t));
                        const b_base = Math.round(lerp(colorParams.startColor.b, colorParams.endColor.b, t));

                        const r = Math.min(255, Math.round(r_base * brightness));
                        const g = Math.min(255, Math.round(g_base * brightness));
                        const b = Math.min(255, Math.round(b_base * brightness));

                        const alphaMatch = color.match(/, ([0-9.]+)\)/);
                        const alpha = alphaMatch ? alphaMatch[1] : '1';
                        segmentColor = `rgba(${r},${g},${b},${alpha})`;
                    }
                    
                    ctx.strokeStyle = segmentColor;
                    ctx.beginPath();
                    if (maurerStyle === 'arc' || maurerStyle === 'arc_flipped' || maurerStyle === 'circle') {
                        const p1_scaled_x = centerX + (p1.x - offsetX) * scale;
                        const p1_scaled_y = centerY + (p1.y - offsetY) * scale;
                        const p2_scaled_x = centerX + (p2.x - offsetX) * scale;
                        const p2_scaled_y = centerY + (p2.y - offsetY) * scale;
                        
                        const midX = (p1_scaled_x + p2_scaled_x) / 2;
                        const midY = (p1_scaled_y + p2_scaled_y) / 2;
                        
                        const radius = distance({x: p1_scaled_x, y: p1_scaled_y}, {x: midX, y: midY});
                        const startAngle = (maurerStyle === 'circle') ? 0 : Math.atan2(p1_scaled_y - midY, p1_scaled_x - midX);
                        const endAngle = (maurerStyle === 'circle') ? 2 * Math.PI : Math.atan2(p2_scaled_y - midY, p2_scaled_x - midX);

                        const anticlockwise = maurerStyle === 'arc_flipped';
                        ctx.arc(midX, midY, radius, startAngle, endAngle, anticlockwise);
                    } else {
                        ctx.moveTo(centerX + (p1.x - offsetX) * scale, centerY + (p1.y - offsetY) * scale);
                        ctx.lineTo(centerX + (p2.x - offsetX) * scale, centerY + (p2.y - offsetY) * scale);
                    }
                    ctx.stroke();
                }
            } else {
                ctx.strokeStyle = color;
                ctx.beginPath();
                if (maurerStyle === 'arc' || maurerStyle === 'arc_flipped' || maurerStyle === 'circle') {
                    for (let i = 0; i < points.length - 1; i++) {
                        const p1 = points[i];
                        const p2 = points[i+1];

                        const p1_scaled_x = centerX + (p1.x - offsetX) * scale;
                        const p1_scaled_y = centerY + (p1.y - offsetY) * scale;
                        const p2_scaled_x = centerX + (p2.x - offsetX) * scale;
                        const p2_scaled_y = centerY + (p2.y - offsetY) * scale;
                        
                        const midX = (p1_scaled_x + p2_scaled_x) / 2;
                        const midY = (p1_scaled_y + p2_scaled_y) / 2;
                        
                        const radius = distance({x: p1_scaled_x, y: p1_scaled_y}, {x: midX, y: midY});
                        const startAngle = (maurerStyle === 'circle') ? 0 : Math.atan2(p1_scaled_y - midY, p1_scaled_x - midX);
                        const endAngle = (maurerStyle === 'circle') ? 2 * Math.PI : Math.atan2(p2_scaled_y - midY, p2_scaled_x - midX);
                        
                        const anticlockwise = maurerStyle === 'arc_flipped';
                        
                        ctx.arc(midX, midY, radius, startAngle, endAngle, anticlockwise);
                        ctx.stroke();
                        ctx.beginPath();
                    }
                } else {
                     const firstPoint = points[0];
                    ctx.moveTo(centerX + (firstPoint.x - offsetX) * scale, centerY + (firstPoint.y - offsetY) * scale);
                    for (let i = 1; i < points.length; i++) { 
                        const p = points[i];
                        ctx.lineTo(centerX + (p.x - offsetX) * scale, centerY + (p.y - offsetY) * scale); 
                    }
                     ctx.stroke();
                }
            }
        }
        
        function drawPoints(ctx, points, color, radius, scaleInfo = { auto: false }) {
            if (points.length === 0) return;
            const canvas = ctx.canvas;
            const cssWidth = canvas.clientWidth;
            const cssHeight = canvas.clientHeight;
            const centerX = cssWidth / 2;
            const centerY = cssHeight / 2;
            
            let scale;
            let offsetX = 0;
            let offsetY = 0;

            if (scaleInfo.auto && scaleInfo.shapeWidth > 0 && scaleInfo.shapeHeight > 0) {
                scale = Math.min(cssWidth / scaleInfo.shapeWidth, cssHeight / scaleInfo.shapeHeight) * 0.95;
                offsetX = scaleInfo.shapeCenterX;
                offsetY = scaleInfo.shapeCenterY;
            } else {
                scale = Math.min(cssWidth, cssHeight) / 4.5;
            }

            ctx.fillStyle = color;

            for (const point of points) {
                ctx.beginPath();
                ctx.arc(centerX + (point.x - offsetX) * scale, centerY + (point.y - offsetY) * scale, radius, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        
        function update() {
             function readPanelParams(panelKey) {
                const c = controls[panelKey];
                const n_val = parseInt(c.n.value);
                const d_val = parseInt(c.d.value);
                const useCustom = c.useCustomDivs.checked;

                const periodCycles = calculateRhodoneaPeriodCycles(n_val, d_val);
                let totalDivs;

                c.totalDivsSection.style.display = useCustom ? 'grid' : 'none';
                c.degLabel.textContent = useCustom ? 'Divisions' : 'Degrees';

                if (useCustom) {
                    totalDivs = parseInt(c.totalDivs.value);
                } else {
                    totalDivs = Math.round(360 * periodCycles);
                    if (totalDivs === 0) totalDivs = 360;
                }
                
                const deg_val = parseInt(c.deg.value);
                const factors = getPrimeFactorization(deg_val);
                c.degFactors.textContent = `Factors: ${factors}`;

                c.deg.max = totalDivs;
                if(deg_val > totalDivs) {
                    c.deg.value = totalDivs;
                }
                c.totalDivs.value = totalDivs;
                c.totalDivsVal.textContent = totalDivs;

                const method = c.relativesMethod.value;
                const isGenerativeMethod = method === 'prime' || method === 'relatively_prime' || method === 'relatively_prime_not_prime';
                const isPairedPrimeMethod = method === 'twin_primes' || method === 'cousin_primes';
                c.relativeToContainer.style.display = isPairedPrimeMethod ? 'none' : 'grid';
                c.relativesLabel.style.display = isGenerativeMethod || isPairedPrimeMethod ? 'none' : 'block';
                c.relativesCounter.style.display = isGenerativeMethod || isPairedPrimeMethod ? 'none' : 'inline';
                c.relativesDropdown.style.display = isGenerativeMethod || isPairedPrimeMethod ? 'none' : 'block';
                
                return { 
                    n: n_val, d: d_val, c: parseFloat(c.c.value), A: parseFloat(c.A.value), 
                    rot: parseInt(c.rot.value), deg: parseInt(c.deg.value), 
                    useCustomDivs: useCustom, totalDivisions: totalDivs, periodCycles: periodCycles,
                    lineOpacity: parseFloat(c.lineOpacity.value), showRhodonea: c.showRhodonea.checked, 
                    showPoints: c.showPoints.checked, strokeIndividually: c.strokeIndividually.checked, 
                    opacity: parseFloat(c.opacity.value), pointsOpacity: parseFloat(c.pointsOpacity.value), 
                    lineWidth: parseFloat(c.lineWidth.value), maurerStyle: c.maurerStyle.value, 
                    showAllCosets: c.showAllCosets.checked, numCosets: parseInt(c.numCosets.value), 
                    colorCosets: c.colorCosets.checked, cosetColorStart: c.cosetColorStart.value, 
                    cosetColorEnd: c.cosetColorEnd.value, cosetCompositeMode: c.cosetCompositeMode.value, 
                    cosetSelection: c.cosetSelection.value, showStartEnd: c.showStartEnd.checked, 
                    startEndSize: parseFloat(c.startEndSize.value), 
                    relativesMethod: c.relativesMethod.value,
                    relativeTo: c.relativeTo.value,
                    addEToN: c.addEToN.checked, 
                    addEToD: c.addEToD.checked, addEToDeg: c.addEToDeg.checked, 
                    cyclesMultiplier: parseInt(c.cyclesMultiplier.value),
                    colorByMethod: c.colorByMethod.value,
                    colorRangeStart: c.colorRangeStart.value,
                    colorRangeEnd: c.colorRangeEnd.value
                };
            }

            paramsA = readPanelParams('A');
            paramsB = readPanelParams('B');
            
            controls.A.colorBySegmentSection.style.display = paramsA.strokeIndividually ? 'block' : 'none';
            controls.B.colorBySegmentSection.style.display = paramsB.strokeIndividually ? 'block' : 'none';

            if (paramsA.relativesMethod === 'ltc') {
                 populateRelatives('A', paramsA, paramsB);
            }
            if (paramsB.relativesMethod === 'ltc') {
                 populateRelatives('B', paramsB, paramsA);
            }
            
            let linesToCloseA = calculateLinesToClose(paramsA.deg, paramsA.totalDivisions);
            if(paramsA.addEToN || paramsA.addEToD || paramsA.addEToDeg) {
                controls.A.cyclesMultiplierSection.style.display = 'grid';
                linesToCloseA *= paramsA.cyclesMultiplier;
            } else {
                controls.A.cyclesMultiplierSection.style.display = 'none';
            }

            let linesToCloseB = calculateLinesToClose(paramsB.deg, paramsB.totalDivisions);
             if(paramsB.addEToD || paramsB.addEToDeg) {
                controls.B.cyclesMultiplierSection.style.display = 'grid';
                linesToCloseB *= paramsB.cyclesMultiplier;
            } else {
                controls.B.cyclesMultiplierSection.style.display = 'none';
            }

            const lcmLines = lcm(linesToCloseA, linesToCloseB);
            const isExactMatch = linesToCloseA !== null && linesToCloseA > 0 && linesToCloseA === linesToCloseB;
            
            let interpMethod = interpMethodSelect.value;
            const scaleThickness = controls.Interp.scaleThickness.checked;
            cosetMergeSelectionSection.style.display = interpMethod === 'cosets_merge' ? 'grid' : 'none';
            lcmCosetsControlsSection.style.display = interpMethod === 'lcm_cosets' ? 'block' : 'none';
            joinedCosetsControlsSection.style.display = interpMethod === 'joined_cosets' ? 'block' : 'none';

            // BUG FIX: Removed programatic resetting of .checked to preserve user intent when match is missing.
            exactMatchToggle.disabled = !isExactMatch;
            exactMatchLabel.classList.toggle('text-gray-500', !isExactMatch);
            exactMatchLabel.classList.toggle('text-green-400', isExactMatch && exactMatchToggle.checked);
            
            const isLcmValid = lcmLines !== null && lcmLines <= LCM_LIMIT;
            lcmOption.disabled = !isLcmValid;
            lcm2Option.disabled = !isLcmValid;
            cosetsOption.disabled = !isLcmValid;
            cosetsMergeOption.disabled = !isLcmValid;
            lcmCosetsOption.disabled = !isLcmValid;
            lcmValSpan.textContent = isLcmValid ? lcmLines : (lcmLines > LCM_LIMIT ? `> ${LCM_LIMIT}` : 'N/A');

            if (!isLcmValid && ['lcm', 'lcm2', 'cosets', 'cosets_merge', 'lcm_cosets'].includes(interpMethod)) {
                interpMethodSelect.value = 'vertex';
                interpMethod = 'vertex';
            }
            
            const kA = gcd(paramsA.deg, paramsA.totalDivisions);
            controls.A.cosetCount.textContent = kA;

            const kB = gcd(paramsB.deg, paramsB.totalDivisions);
            controls.B.cosetCount.textContent = kB;

            if (interpMethod === 'lcm_cosets') {
                const maxCosets = Math.min(kA, kB);
                controls.Interp.lcmCosetsNum.max = maxCosets > 0 ? maxCosets : 1;
                if (parseInt(controls.Interp.lcmCosetsNum.value) > maxCosets) {
                    controls.Interp.lcmCosetsNum.value = maxCosets;
                }
                controls.Interp.lcmCosetsNumVal.textContent = controls.Interp.lcmCosetsNum.value;
            } else if (interpMethod === 'joined_cosets') {
                 const maxCosets = Math.max(kA, kB);
                 controls.Interp.joinedCosetsNum.max = maxCosets > 0 ? maxCosets : 1;
                 if(parseInt(controls.Interp.joinedCosetsNum.value) > maxCosets) {
                     controls.Interp.joinedCosetsNum.value = maxCosets;
                 }
                 controls.Interp.joinedCosetsNumVal.textContent = controls.Interp.joinedCosetsNum.value;
                 
                 const numCosetsToRender = parseInt(controls.Interp.joinedCosetsNum.value);
                 const originalSegmentsA = linesToCloseA !== null ? numCosetsToRender * (linesToCloseA + 1) : 0;
                 const originalSegmentsB = linesToCloseB !== null ? numCosetsToRender * (linesToCloseB + 1) : 0;
                 const targetSegments = lcm(originalSegmentsA, originalSegmentsB);
                 const isJoinedLcmValid = targetSegments !== null && targetSegments <= LCM_LIMIT;

                 controls.Interp.joinedCosetsSegmentsA.textContent = originalSegmentsA || 'N/A';
                 controls.Interp.joinedCosetsSegmentsB.textContent = originalSegmentsB || 'N/A';
                 if(isJoinedLcmValid) {
                     controls.Interp.joinedCosetsLcmVal.textContent = targetSegments;
                 } else {
                     controls.Interp.joinedCosetsLcmVal.textContent = `N/A (fallback to approx)`;
                 }
            }
            
            interpWeight = parseFloat(controls.Interp.slider.value);
            const useExactOverride = exactMatchToggle.checked && isExactMatch;
            
            if(useExactOverride) {
                interpMethod = 'exact_override';
            }

            const showRhodoneaInterp = controls.Interp.showRhodonea.checked;
            const showPointsInterp = controls.Interp.showPoints.checked;
            const strokeIndividuallyInterp = controls.Interp.strokeIndividually.checked;
            const maurerStyleInterp = controls.Interp.maurerStyle.value;
            colorBySegmentSection.style.display = strokeIndividuallyInterp ? 'block' : 'none';
            percentageDisplay.style.display = controls.Interp.showPercentages.checked ? 'block' : 'none';
            const showStartEndInterp = controls.Interp.showStartEnd.checked;

            const interpOpacity = parseFloat(controls.Interp.opacity.value);
            const pointsOpacityInterp = parseFloat(controls.Interp.pointsOpacity.value);
            let lineBrightness = parseFloat(controls.Interp.lineBrightness.value);
            const lineWidthInterp = parseFloat(controls.Interp.lineWidth.value);
            const lineOpacityInterp = parseFloat(controls.Interp.lineOpacity.value);
            const interpColor = controls.Interp.colorPicker.value;
            const startEndSizeInterp = parseFloat(controls.Interp.startEndSize.value);
            const showSimilarPoints = controls.Interp.showSimilarPoints.checked;

            controls.A.nVal.textContent = paramsA.n; controls.A.dVal.textContent = paramsA.d; controls.A.cVal.textContent = paramsA.c.toFixed(2); controls.A.AVal.textContent = paramsA.A.toFixed(2); controls.A.rotVal.textContent = `${paramsA.rot}°`; controls.A.degVal.textContent = `${paramsA.deg}`; controls.A.opacityVal.textContent = paramsA.opacity.toFixed(2); controls.A.lineWidthVal.textContent = paramsA.lineWidth.toFixed(1); controls.A.pointsOpacityVal.textContent = paramsA.pointsOpacity.toFixed(2); controls.A.numCosetsVal.textContent = paramsA.numCosets; controls.A.startEndSizeVal.textContent = paramsA.startEndSize.toFixed(1); controls.A.lineOpacityVal.textContent = paramsA.lineOpacity.toFixed(2); controls.A.cyclesMultiplierVal.textContent = paramsA.cyclesMultiplier;
            controls.B.nVal.textContent = paramsB.n; controls.B.dVal.textContent = paramsB.d; controls.B.cVal.textContent = paramsB.c.toFixed(2); controls.B.AVal.textContent = paramsB.A.toFixed(2); controls.B.rotVal.textContent = `${paramsB.rot}°`; controls.B.degVal.textContent = `${paramsB.deg}`; controls.B.opacityVal.textContent = paramsB.opacity.toFixed(2); controls.B.lineWidthVal.textContent = paramsB.lineWidth.toFixed(1); controls.B.pointsOpacityVal.textContent = paramsB.pointsOpacity.toFixed(2); controls.B.numCosetsVal.textContent = paramsB.numCosets; controls.B.startEndSizeVal.textContent = paramsB.startEndSize.toFixed(1); controls.B.lineOpacityVal.textContent = paramsB.lineOpacity.toFixed(2); controls.B.cyclesMultiplierVal.textContent = paramsB.cyclesMultiplier;
            controls.Interp.valA.textContent = `${((1 - interpWeight) * 100).toFixed(1)}%`; controls.Interp.valB.textContent = `${(interpWeight * 100).toFixed(1)}%`;
            controls.Interp.opacityVal.textContent = interpOpacity.toFixed(2);
            controls.Interp.pointsOpacityVal.textContent = pointsOpacityInterp.toFixed(2);
            controls.Interp.trailDecayVal.textContent = controls.Interp.trailDecay.value;
            controls.Interp.lineBrightnessVal.textContent = lineBrightness.toFixed(2);
            controls.Interp.lineWidthVal.textContent = lineWidthInterp.toFixed(1);
            controls.Interp.lineOpacityVal.textContent = lineOpacityInterp.toFixed(2);
            controls.Interp.colorVal.textContent = interpColor;
            controls.Interp.startEndSizeVal.textContent = startEndSizeInterp.toFixed(1);
            bitrateValSpan.textContent = recordingBitrateSlider.value;
             const targetBrightnessSection = document.getElementById('target-brightness-section');
             targetBrightnessSection.style.display = controls.Interp.autoBrightnessLines.checked ? 'grid' : 'none';
            controls.Interp.targetBrightnessVal.textContent = controls.Interp.targetBrightness.value
            
            const lerp = (a, b, t) => a * (1 - t) + b * t;

             if (controls.Interp.autoBrightnessLines.checked) {
                const avgLines = (linesToCloseA + linesToCloseB) / 2;
                if (avgLines > 0) {
                    const target = parseFloat(controls.Interp.targetBrightness.value);
                    lineBrightness = target / avgLines;
                }
            }
            
            ctxA.clearRect(0, 0, canvasA.clientWidth, canvasA.clientHeight);
            controls.A.lines.textContent = linesToCloseA !== null ? linesToCloseA.toFixed(0) : 'N/A';
            controls.A.numCosets.max = kA > 0 ? kA : 1;
            if (parseInt(controls.A.numCosets.value) > kA) { controls.A.numCosets.value = kA; }
            controls.A.numCosets.disabled = paramsA.showAllCosets;
            
            const cosetLimitA = paramsA.showAllCosets ? kA : parseInt(controls.A.numCosets.value);
            ctxA.globalCompositeOperation = paramsA.cosetCompositeMode;
            let allPointsA = [];
            let allCosetsA = [];
            for(let i=0; i < cosetLimitA; i++) {
                let offset;
                if (paramsA.cosetSelection === 'distributed' && cosetLimitA > 1) {
                    offset = Math.round(i * kA / cosetLimitA);
                } else if (paramsA.cosetSelection === 'two-way') {
                     offset = (i % 2 === 0) ? Math.floor(i / 2) : kA - 1 - Math.floor(i / 2);
                } else {
                    offset = i;
                }
                const pointsA = generateRosePoints(paramsA, linesToCloseA, offset);
                allPointsA.push(...pointsA);
                allCosetsA.push(pointsA);
            }

            let colorParamsA = null;
            if (paramsA.strokeIndividually && paramsA.colorByMethod !== 'none') {
                let minVal = Infinity, maxVal = -Infinity;
                const colorMethod = paramsA.colorByMethod;
                if (colorMethod === 'angle' || colorMethod === 'angle_quadrant' || colorMethod === 'angle_octant') {
                    minVal = 0; 
                    if (colorMethod === 'angle') maxVal = Math.PI;
                    else if (colorMethod === 'angle_quadrant') maxVal = 45;
                    else maxVal = 22.5;
                } else {
                    if (allPointsA.length > 1) {
                        for (let i = 0; i < allPointsA.length - 1; i++) {
                            const p1 = allPointsA[i], p2 = allPointsA[i+1];
                            let val;
                            if (colorMethod === 'length') val = distance(p1, p2);
                            else if (colorMethod === 'distance') val = Math.sqrt(Math.pow((p1.x + p2.x)/2, 2) + Math.pow((p1.y + p2.y)/2, 2));
                            else if (colorMethod === 'start_distance') val = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
                            else if (colorMethod === 'end_distance') val = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
                            else if (colorMethod === 'min_distance_to_center') val = minDistanceToCenter(p1, p2);
                            
                            if (val < minVal) minVal = val;
                            if (val > maxVal) maxVal = val;
                        }
                    }
                }
                colorParamsA = {
                    method: paramsA.colorByMethod,
                    startColor: hexToRgb(paramsA.colorRangeStart),
                    endColor: hexToRgb(paramsA.colorRangeEnd),
                    min: minVal, max: maxVal,
                    brightness: 1.0
                };
            }

            allCosetsA.forEach((pointsA, i) => {
                let cosetColor = controls.A.color;
                if (paramsA.colorCosets && !colorParamsA && cosetLimitA > 1) {
                    const t = i / (cosetLimitA - 1);
                    cosetColor = `rgb(${Math.round(lerp(hexToRgb(paramsA.cosetColorStart).r, hexToRgb(paramsA.cosetColorEnd).r, t))}, ${Math.round(lerp(hexToRgb(paramsA.cosetColorStart).g, hexToRgb(paramsA.cosetColorEnd).g, t))}, ${Math.round(lerp(hexToRgb(paramsA.cosetColorStart).b, hexToRgb(paramsA.cosetColorEnd).b, t))})`;
                }
                const finalStrokeStyleA = colorToRgba(cosetColor, paramsA.lineOpacity);
                drawPath(ctxA, pointsA, finalStrokeStyleA, paramsA.lineWidth, paramsA.strokeIndividually, colorParamsA, {}, scaleThickness, paramsA.maurerStyle);
                if (paramsA.showStartEnd && pointsA.length > 1) {
                    drawPoints(ctxA, [pointsA[0]], 'lime', paramsA.startEndSize);
                    drawPoints(ctxA, [pointsA[1]], 'red', paramsA.startEndSize);
                }
            });
            
            ctxA.globalCompositeOperation = 'source-over';
            if (paramsA.showRhodonea) {
                const rhodoneaPointsA = generateRhodoneaCurvePoints(paramsA);
                drawPath(ctxA, rhodoneaPointsA, `rgba(128, 128, 0, ${paramsA.opacity})`, 1, false, null, {}, scaleThickness, 'line');
            }
            if (paramsA.showPoints) { drawPoints(ctxA, allPointsA, `rgba(255, 255, 0, ${paramsA.pointsOpacity})`, 2.5); }
            
            ctxB.clearRect(0, 0, canvasB.clientWidth, canvasB.clientHeight);
            controls.B.lines.textContent = linesToCloseB !== null ? linesToCloseB.toFixed(0) : 'N/A';
            controls.B.numCosets.max = kB > 0 ? kB : 1;
            if (parseInt(controls.B.numCosets.value) > kB) { controls.B.numCosets.value = kB;}
            controls.B.numCosets.disabled = paramsB.showAllCosets;
            
            const cosetLimitB = paramsB.showAllCosets ? kB : parseInt(controls.B.numCosets.value);
            ctxB.globalCompositeOperation = paramsB.cosetCompositeMode;
            let allPointsB = [];
            let allCosetsB = [];
            for(let i=0; i < cosetLimitB; i++) {
                let offset;
                 if (paramsB.cosetSelection === 'distributed' && cosetLimitB > 1) {
                    offset = Math.round(i * kB / cosetLimitB);
                } else if (paramsB.cosetSelection === 'two-way') {
                     offset = (i % 2 === 0) ? Math.floor(i / 2) : kB - 1 - Math.floor(i / 2);
                } else {
                    offset = i;
                }
                const pointsB = generateRosePoints(paramsB, linesToCloseB, offset);
                allPointsB.push(...pointsB);
                allCosetsB.push(pointsB);
            }

            let colorParamsB = null;
            if (paramsB.strokeIndividually && paramsB.colorByMethod !== 'none') {
                let minVal = Infinity, maxVal = -Infinity;
                const colorMethod = paramsB.colorByMethod;
                if (colorMethod === 'angle' || colorMethod === 'angle_quadrant' || colorMethod === 'angle_octant') {
                    minVal = 0; 
                    if (colorMethod === 'angle') maxVal = Math.PI;
                    else if (colorMethod === 'angle_quadrant') maxVal = 45;
                    else maxVal = 22.5;
                } else {
                    if (allPointsB.length > 1) {
                        for (let i = 0; i < allPointsB.length - 1; i++) {
                            const p1 = allPointsB[i], p2 = allPointsB[i+1];
                            let val;
                            if (colorMethod === 'length') val = distance(p1, p2);
                            else if (colorMethod === 'distance') val = Math.sqrt(Math.pow((p1.x + p2.x)/2, 2) + Math.pow((p1.y + p2.y)/2, 2));
                            else if (colorMethod === 'start_distance') val = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
                            else if (colorMethod === 'end_distance') val = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
                            else if (colorMethod === 'min_distance_to_center') val = minDistanceToCenter(p1, p2);
                            
                            if (val < minVal) minVal = val;
                            if (val > maxVal) maxVal = val;
                        }
                    }
                }
                colorParamsB = {
                    method: paramsB.colorByMethod,
                    startColor: hexToRgb(paramsB.colorRangeStart),
                    endColor: hexToRgb(paramsB.colorRangeEnd),
                    min: minVal, max: maxVal,
                    brightness: 1.0
                };
            }

            allCosetsB.forEach((pointsB, i) => {
                let cosetColor = controls.B.color;
                if (paramsB.colorCosets && !colorParamsB && cosetLimitB > 1) {
                    const t = i / (cosetLimitB - 1);
                    cosetColor = `rgb(${Math.round(lerp(hexToRgb(paramsB.cosetColorStart).r, hexToRgb(paramsB.cosetColorEnd).r, t))}, ${Math.round(lerp(hexToRgb(paramsB.cosetColorStart).g, hexToRgb(paramsB.cosetColorEnd).g, t))}, ${Math.round(lerp(hexToRgb(paramsB.cosetColorStart).b, hexToRgb(paramsB.cosetColorEnd).b, t))})`;
                }
                const finalStrokeStyleB = colorToRgba(cosetColor, paramsB.lineOpacity);
                drawPath(ctxB, pointsB, finalStrokeStyleB, paramsB.lineWidth, paramsB.strokeIndividually, colorParamsB, {}, scaleThickness, paramsB.maurerStyle);
                 if (paramsB.showStartEnd && pointsB.length > 1) {
                    drawPoints(ctxB, [pointsB[0]], 'lime', paramsB.startEndSize);
                    drawPoints(ctxB, [pointsB[1]], 'red', paramsB.startEndSize);
                }
            });

            ctxB.globalCompositeOperation = 'source-over';
            if (paramsB.showRhodonea) {
                const rhodoneaPointsB = generateRhodoneaCurvePoints(paramsB);
                drawPath(ctxB, rhodoneaPointsB, `rgba(128, 128, 0, ${paramsB.opacity})`, 1, false, null, {}, scaleThickness, 'line');
            }
            if (paramsB.showPoints) { drawPoints(ctxB, allPointsB, `rgba(255, 255, 0, ${paramsB.pointsOpacity})`, 2.5); }

            const showTrails = controls.Interp.showTrails.checked;
            const compositeMode = controls.Interp.compositeMode.value;
            
            ctxInterpolated.globalCompositeOperation = 'source-over';
            if (showTrails) {
                ctxInterpolated.fillStyle = `rgba(0, 0, 0, ${controls.Interp.trailDecay.value})`;
                ctxInterpolated.fillRect(0, 0, canvasInterpolated.clientWidth, canvasInterpolated.clientHeight);
            } else {
                ctxInterpolated.clearRect(0, 0, canvasInterpolated.clientWidth, canvasInterpolated.clientHeight);
            }
            ctxInterpolated.globalCompositeOperation = compositeMode;

            let interpolatedPoints = [];
            let allInterpolatedCosets = [];
            let similarPoints = [];
            let hasDrawn = false;
            
            cosetsUsedDisplay.style.display = 'none';
            
            const finalLineBrightness = lineBrightness;
            const rgbColor = hexToRgb(interpColor);
            const finalColor = rgbColor ? `rgba(${Math.min(255,Math.round(rgbColor.r * finalLineBrightness))}, ${Math.min(255,Math.round(rgbColor.g * finalLineBrightness))}, ${Math.min(255,Math.round(rgbColor.b * finalLineBrightness))}, ${lineOpacityInterp})` : interpColor;

            let scaleInfo = { auto: controls.Interp.autoScale.checked };
            
            // Similar points EPSILON
            const eps = 0.0001;

            if (interpMethod === 'lcm_cosets' || interpMethod === 'exact_override') {
                const numCosetsToRender = interpMethod === 'lcm_cosets' ? parseInt(controls.Interp.lcmCosetsNum.value) : 1;
                const selectionMethod = controls.Interp.lcmCosetsSelection.value;
                const linesA = linesToCloseA;
                const linesB = linesToCloseB;

                if (isLcmValid || interpMethod === 'exact_override') {
                    const targetLines = interpMethod === 'lcm_cosets' ? lcmLines : linesA;

                     for (let i = 0; i < numCosetsToRender; i++) {
                        let offsetA, offsetB;
                        if (selectionMethod === 'distributed' && numCosetsToRender > 1) {
                            offsetA = Math.round(i * kA / numCosetsToRender);
                            offsetB = Math.round(i * kB / numCosetsToRender);
                        } else if (selectionMethod === 'two-way') {
                            offsetA = (i % 2 === 0) ? Math.floor(i / 2) : kA - 1 - Math.floor(i / 2);
                            offsetB = (i % 2 === 0) ? Math.floor(i / 2) : kB - 1 - Math.floor(i / 2);
                        } else {
                            offsetA = i;
                            offsetB = i;
                        }

                        const cosetPointsA = generateRosePoints(paramsA, linesA, offsetA);
                        const cosetPointsB = generateRosePoints(paramsB, linesB, offsetB);
                        
                        const upsampledA = generateLcm2Points(cosetPointsA, linesA, targetLines);
                        const upsampledB = generateLcm2Points(cosetPointsB, linesB, targetLines);
                        
                        const interpolatedCoset = interpolatePoints(upsampledA, upsampledB, interpWeight);
                        allInterpolatedCosets.push(interpolatedCoset);

                        if (showSimilarPoints) {
                            for (let j = 0; j < upsampledA.length; j++) {
                                const pA = upsampledA[j];
                                const pB = upsampledB[j];
                                const isSame = Math.abs(pA.x - pB.x) < eps && Math.abs(pA.y - pB.y) < eps;
                                const isNonZero = Math.abs(pA.x) > eps || Math.abs(pA.y) > eps;
                                if (isSame && isNonZero) {
                                    similarPoints.push(interpolatedCoset[j]);
                                }
                            }
                        }
                    }
                }
                
                interpolatedPoints = [].concat(...allInterpolatedCosets);
                hasDrawn = true;

            } else { 
                if (interpMethod === 'joined_cosets') {
                     const numCosetsToRender = parseInt(controls.Interp.joinedCosetsNum.value);
                     const selectionMethod = controls.Interp.joinedCosetsSelection.value;

                     const joinedA = generateJoinedCosetPath(paramsA, linesToCloseA, numCosetsToRender, selectionMethod);
                     const joinedB = generateJoinedCosetPath(paramsB, linesToCloseB, numCosetsToRender, selectionMethod);
                    
                     const originalSegmentsA = joinedA.length > 1 ? joinedA.length - 1 : 0;
                     const originalSegmentsB = joinedB.length > 1 ? joinedB.length - 1 : 0;
                     
                     const targetSegments = lcm(originalSegmentsA, originalSegmentsB);
                     const isJoinedLcmValid = targetSegments !== null && targetSegments <= LCM_LIMIT;

                     if (isJoinedLcmValid) {
                        const upsampledA = generateLcm2Points(joinedA, originalSegmentsA, targetSegments);
                        const upsampledB = generateLcm2Points(joinedB, originalSegmentsB, targetSegments);
                        interpolatedPoints = interpolatePoints(upsampledA, upsampledB, interpWeight);
                     } else {
                        const resampleCount = RESAMPLE_COUNT;
                        const resampledA = resample(joinedA, resampleCount);
                        const resampledB = resample(joinedB, resampleCount);
                        interpolatedPoints = interpolatePoints(resampledA, resampledB, interpWeight);
                     }
                } else {
                    const pointsForInterpA = generateRosePoints(paramsA, linesToCloseA);
                    const pointsForInterpB = generateRosePoints(paramsB, linesToCloseB);

                    if (interpMethod === 'lcm') {
                        const pointsA_lcm = generateLcm1Points(paramsA, linesToCloseA, lcmLines);
                        const pointsB_lcm = generateLcm1Points(paramsB, linesToCloseB, lcmLines);
                        interpolatedPoints = interpolatePoints(pointsA_lcm, pointsB_lcm, interpWeight);
                    } else if (interpMethod === 'lcm2') {
                        const pointsA_lcm2 = generateLcm2Points(pointsForInterpA, linesToCloseA, lcmLines);
                        const pointsB_lcm2 = generateLcm2Points(pointsForInterpB, linesToCloseB, lcmLines);
                        interpolatedPoints = interpolatePoints(pointsA_lcm2, pointsB_lcm2, interpWeight);
                    } else if (interpMethod === 'cosets_merge') {
                        const numCosetsA = lcmLines / linesToCloseA;
                        const numCosetsB = lcmLines / linesToCloseB;
                        cosetsUsedDisplay.style.display = 'block';
                        cosetsUsedAVal.textContent = numCosetsA.toFixed(0);
                        cosetsUsedBVal.textContent = numCosetsB.toFixed(0);
                        const mergeSelection = controls.Interp.cosetMergeSelection.value;
                        const pointsA_merged = generateMergedCosetPath(paramsA, linesToCloseA, numCosetsA, mergeSelection);
                        const pointsB_merged = generateMergedCosetPath(paramsB, linesToCloseB, numCosetsB, mergeSelection);
                        interpolatedPoints = interpolatePoints(pointsA_merged, pointsB_merged, interpWeight);
                    } else if (interpMethod === 'cosets') {
                        const numCosetsA = lcmLines / linesToCloseA;
                        const numCosetsB = lcmLines / linesToCloseB;
                        cosetsUsedDisplay.style.display = 'block';
                        cosetsUsedAVal.textContent = numCosetsA.toFixed(0);
                        cosetsUsedBVal.textContent = numCosetsB.toFixed(0);
                        interpolatedPoints = [];
                    } else if (interpMethod === 'vertex') {
                        const resampledA = resample(pointsForInterpA, RESAMPLE_COUNT);
                        const resampledB = resample(pointsForInterpB, RESAMPLE_COUNT);
                        interpolatedPoints = interpolatePoints(resampledA, resampledB, interpWeight);
                    } else { // 'parameter'
                        const paramsInterp = {
                            n: lerp(paramsA.n, paramsB.n, interpWeight), 
                            d: lerp(paramsA.d, paramsB.d, interpWeight),
                            c: lerp(paramsA.c, paramsB.c, interpWeight), 
                            A: lerp(paramsA.A, paramsB.A, interpWeight),
                            rot: Math.round(lerp(paramsA.rot, paramsB.rot, interpWeight)), 
                            deg: lerp(paramsA.deg, paramsB.deg, interpWeight),
                            addEToN: controls.A.addEToN.checked && controls.B.addEToN.checked,
                            addEToD: controls.A.addEToD.checked && controls.B.addEToD.checked,
                            addEToDeg: controls.A.addEToDeg.checked && controls.B.addEToDeg.checked,
                            totalDivisions: lerp(paramsA.totalDivisions, paramsB.totalDivisions, interpWeight),
                            periodCycles: lerp(paramsA.periodCycles, paramsB.periodCycles, interpWeight)
                        };
                        if (paramsInterp.d === 0) paramsInterp.d = 1; if (paramsInterp.deg === 0) paramsInterp.deg = 1;
                        let linesToCloseInterp = calculateLinesToClose(Math.round(paramsInterp.deg), Math.round(paramsInterp.totalDivisions));
                         if(paramsInterp.addEToN || paramsInterp.addEToD || paramsInterp.addEToDeg) {
                            linesToCloseInterp *= lerp(paramsA.cyclesMultiplier, paramsB.cyclesMultiplier, interpWeight);
                        }
                        interpolatedPoints = generateRosePoints(paramsInterp, linesToCloseInterp);
                    }
                }
            }
            
            if (scaleInfo.auto && interpolatedPoints.length > 1) {
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (const p of interpolatedPoints) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }
                scaleInfo.shapeWidth = maxX - minX;
                scaleInfo.shapeHeight = maxY - minY;
                scaleInfo.shapeCenterX = (minX + maxX) / 2;
                scaleInfo.shapeCenterY = (minY + maxY) / 2;
            }

            let colorParams = null;
            const interpColorMethod = controls.Interp.colorByMethod.value;
            if (strokeIndividuallyInterp && interpColorMethod !== 'none') {
                const allPointsForColorCal = hasDrawn ? [].concat(...allInterpolatedCosets) : interpolatedPoints;
                let minVal = Infinity, maxVal = -Infinity;
                const colorMethod = interpColorMethod;
                if (colorMethod === 'angle' || colorMethod === 'angle_quadrant' || colorMethod === 'angle_octant') {
                    minVal = 0; 
                    if (colorMethod === 'angle') maxVal = Math.PI;
                    else if (colorMethod === 'angle_quadrant') maxVal = 45;
                    else maxVal = 22.5;
                } else {
                    if (allPointsForColorCal.length > 1) {
                        for (let i = 0; i < allPointsForColorCal.length - 1; i++) {
                            const p1 = allPointsForColorCal[i], p2 = allPointsForColorCal[i+1];
                            let val;
                            if (colorMethod === 'length') val = distance(p1, p2);
                            else if (colorMethod === 'distance') val = Math.sqrt(Math.pow((p1.x + p2.x)/2, 2) + Math.pow((p1.y + p2.y)/2, 2));
                            else if (colorMethod === 'start_distance') val = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
                            else if (colorMethod === 'end_distance') val = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
                            else if (colorMethod === 'min_distance_to_center') val = minDistanceToCenter(p1, p2);
                            
                            if (val < minVal) minVal = val;
                            if (val > maxVal) maxVal = val;
                        }
                    }
                }
                colorParams = {
                    method: interpColorMethod,
                    startColor: hexToRgb(controls.Interp.colorRangeStart.value),
                    endColor: hexToRgb(controls.Interp.colorRangeEnd.value),
                    min: minVal, max: maxVal,
                    brightness: finalLineBrightness
                };
            }
            
            if (hasDrawn) {
                 allInterpolatedCosets.forEach(coset => {
                    drawPath(ctxInterpolated, coset, finalColor, lineWidthInterp, strokeIndividuallyInterp, colorParams, scaleInfo, scaleThickness, maurerStyleInterp);
                });
            } else {
                drawPath(ctxInterpolated, interpolatedPoints, finalColor, lineWidthInterp, strokeIndividuallyInterp, colorParams, scaleInfo, scaleThickness, maurerStyleInterp);
            }
            
            
            if (showRhodoneaInterp) {
                 if (interpMethod === 'parameter') {
                    const paramsInterp = { 
                        n: lerp(paramsA.n, paramsB.n, interpWeight), 
                        d: lerp(paramsA.d, paramsB.d, interpWeight), 
                        c: lerp(paramsA.c, paramsB.c, interpWeight), 
                        A: lerp(paramsA.A, paramsB.A, interpWeight), 
                        rot: Math.round(lerp(paramsA.rot, paramsB.rot, interpWeight)), 
                        addEToN: controls.A.addEToN.checked && controls.B.addEToN.checked, 
                        addEToD: controls.A.addEToD.checked && controls.B.addEToD.checked,
                        totalDivisions: lerp(paramsA.totalDivisions, paramsB.totalDivisions, interpWeight),
                        periodCycles: lerp(paramsA.periodCycles, paramsB.periodCycles, interpWeight)
                    };
                     if (paramsInterp.d === 0) paramsInterp.d = 1;
                    const rhodoneaPointsInterp = generateRhodoneaCurvePoints(paramsInterp);
                    drawPath(ctxInterpolated, rhodoneaPointsInterp, `rgba(128, 128, 0, ${interpOpacity * finalLineBrightness})`, 1, false, null, scaleInfo, scaleThickness, 'line');
                } else { 
                    const rhodoneaPointsA = generateRhodoneaCurvePoints(paramsA);
                    const rhodoneaPointsB = generateRhodoneaCurvePoints(paramsB);
                    const resampledA = resample(rhodoneaPointsA, RESAMPLE_COUNT);
                    const resampledB = resample(rhodoneaPointsB, RESAMPLE_COUNT);
                    const interpolatedRhodonea = interpolatePoints(resampledA, resampledB, interpWeight);
                    drawPath(ctxInterpolated, interpolatedRhodonea, `rgba(128, 128, 0, ${interpOpacity * finalLineBrightness})`, 1, false, null, scaleInfo, scaleThickness, 'line');
                }
            }
            if (showPointsInterp) {
                drawPoints(ctxInterpolated, interpolatedPoints, `rgba(255, 255, 0, ${pointsOpacityInterp * finalLineBrightness})`, startEndSizeInterp, scaleInfo);
            }
             if (showStartEndInterp) {
                if (hasDrawn) {
                     allInterpolatedCosets.forEach(coset => {
                        if (coset.length > 1) {
                            drawPoints(ctxInterpolated, [coset[0]], 'lime', startEndSizeInterp, scaleInfo);
                            drawPoints(ctxInterpolated, [coset[1]], 'red', startEndSizeInterp, scaleInfo);
                        }
                    });
                } else if (interpolatedPoints.length > 1) {
                     drawPoints(ctxInterpolated, [interpolatedPoints[0]], 'lime', startEndSizeInterp, scaleInfo);
                     drawPoints(ctxInterpolated, [interpolatedPoints[1]], 'red', startEndSizeInterp, scaleInfo);
                }
            }
            if (showSimilarPoints && similarPoints.length > 0) {
                drawPoints(ctxInterpolated, similarPoints, 'cyan', startEndSizeInterp, scaleInfo);
            }
            
            // Update similar points counter
            if (showSimilarPoints && (interpMethod === 'lcm_cosets' || interpMethod === 'exact_override')) {
                controls.Interp.similarPointsCount.textContent = similarPoints.length > 0 ? `(${similarPoints.length})` : '(0)';
            } else {
                controls.Interp.similarPointsCount.textContent = '';
            }

             ctxInterpolated.globalCompositeOperation = 'source-over';
        }

        function animate() {
            if (!isPlaying) return;
            const speed = parseFloat(speedSlider.value) * 3;
            
            animationPhase += speed * animationDirection;

            if (animationPhase >= Math.PI) {
                animationPhase = Math.PI;
                animationDirection = -1;
                 if (controls.Interp.relativeCombosToggle.checked && !isFirstFrame) {
                    const pickerMethod = controls.Interp.roseAPicker.value;
                    if(pickerMethod !== 'static') navigateRelatives('A', pickerMethod);
                }
            } else if (animationPhase <= 0) {
                animationPhase = 0;
                animationDirection = 1;
                if (controls.Interp.relativeCombosToggle.checked && !isFirstFrame) {
                    const pickerMethod = controls.Interp.roseBPicker.value;
                    if(pickerMethod !== 'static') navigateRelatives('B', pickerMethod);
                }
                isFirstFrame = false;
            }
            
            let currentWeight;
            if (controls.Interp.easeSpeedToggle.checked) {
                currentWeight = (1 - Math.cos(animationPhase)) / 2;
            } else {
                currentWeight = animationPhase / Math.PI;
            }

            controls.Interp.slider.value = currentWeight;
            update();
            animationFrameId = requestAnimationFrame(animate);
        }

        function handleResize() {
            const all_canvases = [ { canvas: canvasA, ctx: ctxA }, { canvas: canvasB, ctx: ctxB }, { canvas: canvasInterpolated, ctx: ctxInterpolated }];
            const MAX_RESOLUTION = 1080;

            all_canvases.forEach(({ canvas, ctx }) => {
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                
                let resolution = rect.width * dpr;
                
                resolution = Math.min(resolution, MAX_RESOLUTION);

                canvas.width = resolution;
                canvas.height = resolution;

                const scaleFactor = resolution / rect.width;
                ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);

                if (canvas.id === 'canvasInterpolated') {
                    interpCanvasSize.textContent = `${canvas.width} x ${canvas.height}px`;
                }
            });
            update();
        }
        
        function handleRelativeChange(action) {
            const wasPlaying = isPlaying;
            if (wasPlaying) {
                playPauseBtn.click();
            }

            action();

            if (wasPlaying) {
                setTimeout(() => {
                    playPauseBtn.click();
                }, 0);
            }
        }
        
        function toggleRecording() {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        }

        function startRecording() {
            const mimeType = recordingFormatSelect.value;
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                alert(`Your browser does not support recording in the format: ${mimeType}`);
                return;
            }

            const stream = canvasInterpolated.captureStream(30);
            const bitrate = parseFloat(recordingBitrateSlider.value) * 1000000;
            const options = { mimeType, videoBitsPerSecond: bitrate };
            
            recordedChunks = [];
            recordedBlob = null;
            
            try {
                mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                console.error('Exception while creating MediaRecorder:', e);
                return;
            }

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                recordedBlob = new Blob(recordedChunks, { type: mimeType });
                downloadBtn.disabled = false;
                recordingFormatSelect.disabled = false;
                recordingBitrateSlider.disabled = false;
            };

            mediaRecorder.start();
            isRecording = true;
            currentRecordingFormat = mimeType;
            
            recordBtn.textContent = 'Stop Recording';
            recordBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            recordBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
            downloadBtn.disabled = true;
            recordingFormatSelect.disabled = true;
            recordingBitrateSlider.disabled = true;
        }

        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            isRecording = false;

            recordBtn.textContent = 'Start Recording';
            recordBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            recordBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        }

        function downloadRecording() {
            if (recordedBlob) {
                const url = URL.createObjectURL(recordedBlob);
                const a = document.createElement('a');
                const extension = currentRecordingFormat.startsWith('video/mp4') ? 'mp4' : 'webm';
                a.style.display = 'none';
                a.href = url;
                a.download = `maurer-rose-v16-${new Date().toISOString()}.${extension}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }
        
        function setupSyncButton(paramName) {
            const btnA = document.getElementById(`sync-${paramName}-A`);
            const btnB = document.getElementById(`sync-${paramName}-B`);
            
            function toggleSync() {
                syncState[paramName] = !syncState[paramName];
                updateSyncVisuals(paramName);
                if (syncState[paramName]) {
                    controls.B[paramName].value = controls.A[paramName].value;
                    update();
                }
            }

            btnA.addEventListener('click', toggleSync);
            btnB.addEventListener('click', toggleSync);
        }

        function updateSyncVisuals(paramName) {
            const btnA = document.getElementById(`sync-${paramName}-A`);
            const btnB = document.getElementById(`sync-${paramName}-B`);
            const isSynced = syncState[paramName];
            
            [btnA, btnB].forEach(btn => {
                if (isSynced) {
                    btn.classList.remove('bg-gray-600');
                    btn.classList.add('bg-green-500');
                } else {
                    btn.classList.add('bg-gray-600');
                    btn.classList.remove('bg-green-500');
                }
            });
        }
        
        function syncValues(sourcePanelKey, targetPanelKey, paramName) {
            if (syncState[paramName]) {
                const sourceControl = controls[sourcePanelKey][paramName];
                const targetControl = controls[targetPanelKey][paramName];
                if (targetControl.value !== sourceControl.value) {
                    targetControl.value = sourceControl.value;
                }
            }
        }


        window.addEventListener('DOMContentLoaded', () => {
            
            ['n', 'd', 'c', 'A', 'rot', 'totalDivs', 'deg'].forEach(param => {
                setupSyncButton(param);

                controls.A[param].addEventListener('input', () => {
                    syncValues('A', 'B', param);
                    update();
                });
                controls.B[param].addEventListener('input', () => {
                    syncValues('B', 'A', param);
                    update();
                });
            });

            relativeCombosToggle.addEventListener('change', () => {
                relativeCombosControls.style.display = relativeCombosToggle.checked ? 'block' : 'none';
            });

            controls.Interp.autoBrightnessLines.addEventListener('change', () => {
                 document.getElementById('target-brightness-section').style.display = controls.Interp.autoBrightnessLines.checked ? 'grid' : 'none';
                 update();
            });

            controls.A.relativesDropdown.addEventListener('change', (e) => {
                 handleRelativeChange(() => {
                    const index = parseInt(e.target.value);
                    if (!isNaN(index) && relativesA_list[index]) {
                       const relative = relativesA_list[index];
                       controls.A.n.value = relative.n;
                       controls.A.d.value = relative.d;
                       controls.A.deg.value = relative.deg;
                       currentRelativeIndexA = index;
                       controls.A.relativesCounter.textContent = `${currentRelativeIndexA + 1} / ${relativesA_list.length}`;
                       update();
                    }
                });
            });

            controls.B.relativesDropdown.addEventListener('change', (e) => {
                handleRelativeChange(() => {
                     const index = parseInt(e.target.value);
                     if (!isNaN(index) && relativesB_list[index]) {
                       const relative = relativesB_list[index];
                       controls.B.n.value = relative.n;
                       controls.B.d.value = relative.d;
                       controls.B.deg.value = relative.deg;
                       currentRelativeIndexB = index;
                       controls.B.relativesCounter.textContent = `${currentRelativeIndexB + 1} / ${relativesB_list.length}`;
                       update();
                    }
                });
            });

            controls.A.prevRelative.addEventListener('click', () => handleRelativeChange(() => navigateRelatives('A', 'prev')));
            controls.A.randomRelative.addEventListener('click', () => handleRelativeChange(() => navigateRelatives('A', 'random')));
            controls.A.nextRelative.addEventListener('click', () => handleRelativeChange(() => navigateRelatives('A', 'next')));
            controls.B.prevRelative.addEventListener('click', () => handleRelativeChange(() => navigateRelatives('B', 'prev')));
            controls.B.randomRelative.addEventListener('click', () => handleRelativeChange(() => navigateRelatives('B', 'random')));
            controls.B.nextRelative.addEventListener('click', () => handleRelativeChange(() => navigateRelatives('B', 'next')));


            document.querySelectorAll('input, select').forEach(input => {
                const isSyncControl = Object.keys(syncState).some(p => input.id.includes(`sync-${p}`));
                if (!isSyncControl && input.id !== 'relativesA' && input.id !== 'relativesB') { 
                    const eventType = input.tagName.toLowerCase() === 'select' || input.type === 'checkbox' ? 'change' : 'input';
                    if(!input.id.includes('-A') && !input.id.includes('-B')){
                         input.addEventListener(eventType, update);
                    }
                }
            });

            playPauseBtn.addEventListener('click', () => {
                isPlaying = !isPlaying;
                playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play';
                isFirstFrame = true;
                
                if (isPlaying) {
                    const currentWeight = parseFloat(controls.Interp.slider.value);
                    if (controls.Interp.easeSpeedToggle.checked) {
                        animationPhase = Math.acos(1 - 2 * currentWeight);
                    } else {
                        animationPhase = currentWeight * Math.PI;
                    }
                    if (currentWeight >= 1) animationDirection = -1;
                    else if (currentWeight <= 0) animationDirection = 1;
                    
                    animationFrameId = requestAnimationFrame(animate);
                } else {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            });

            controls.Interp.slider.addEventListener('pointerdown', () => {
                if (isPlaying) {
                   playPauseBtn.click();
                }
            });
            
            fiftyFiftyBtn.addEventListener('click', () => {
                controls.Interp.slider.value = 0.5;
                update();
            });

            recordBtn.addEventListener('click', toggleRecording);
            downloadBtn.addEventListener('click', downloadRecording);

            handleResize();
        });
        
        window.addEventListener('resize', handleResize);

