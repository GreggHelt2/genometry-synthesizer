/**
 * State Migration — v2.x → v3.0
 *
 * Handles:
 * 1. Pre-migration backup (download JSON files)
 * 2. Migration of flat rosette params to hierarchical scoped structure
 * 3. Migration of link paths and animation keys
 */

// ─── Backup Utilities ────────────────────────────────────

/**
 * Trigger a JSON file download in the browser.
 */
export function backupToFile(data, filename) {
    try {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        console.log(`[Migration] Backup saved: ${filename}`);
    } catch (e) {
        console.error(`[Migration] Failed to backup ${filename}:`, e);
    }
}

/**
 * Export all IndexedDB snapshots as a JSON file.
 * @param {IndexedDBAdapter} dbAdapter
 */
export async function backupIndexedDB(dbAdapter) {
    try {
        await dbAdapter.open();
        const allData = await dbAdapter.getAllMetadata();
        if (allData && allData.length > 0) {
            const exportHash = {};
            allData.forEach(item => {
                exportHash[item.name || `snapshot_${item.id}`] = item;
            });
            backupToFile(exportHash, 'pre_migration_IndexedDB.json');
        } else {
            console.log('[Migration] No IndexedDB snapshots to backup.');
        }
    } catch (e) {
        console.error('[Migration] Failed to backup IndexedDB:', e);
    }
}


// ─── Flat → Nested key mappings ──────────────────────────

/**
 * Map old flat link/animation keys to v3.0 deep paths.
 * Format: 'rosetteA.n' → 'rosetteA.curve.params.Rhodonea.n'
 */
const FLAT_PARAM_MAP = {
    // Curve params (assumes Rhodonea as default curve type at migration time)
    'n': 'curve.params.Rhodonea.n',
    'd': 'curve.params.Rhodonea.d',
    'A': 'curve.params.Rhodonea.A',
    'c': 'curve.params.Rhodonea.c',
    'rot': 'curve.params.Rhodonea.rot',
    'radius': 'curve.params.Circle.radius',

    // Sequencer params (assumes Additive as default)
    'step': 'sequencer.params.Cyclic Additive Group Modulo N.step',
    'totalDivs': 'sequencer.params.Cyclic Additive Group Modulo N.totalDivs',
    'useCustomDivs': 'sequencer.params.Cyclic Additive Group Modulo N.useCustomDivs',

    // Curve/Sequencer type selectors
    'curveType': 'curve.type',
    'sequencerType': 'sequencer.type',

    // Coset
    'cosetIndex': 'coset.index',
    'showAllCosets': 'coset.showAll',
    'cosetCount': 'coset.count',
    'cosetDistribution': 'coset.distribution',

    // Stroke
    'color': 'stroke.coloring.params.solid.color',
    'colorEnd': 'stroke.coloring.params.gradient-2point.colorEnd',
    'colorMethod': 'stroke.coloring.method',
    'gradientType': 'stroke.coloring.type',
    'gradientPreset': 'stroke.coloring.params.gradient-preset.preset',
    'gradientStops': 'stroke.coloring.params.gradient-custom.stops',
    'opacity': 'stroke.opacity',
    'blendMode': 'stroke.blendMode',
    'lineWidth': 'stroke.lineWidth',
    'antiAlias': 'stroke.antiAlias',

    // Fill
    'fillColor': 'fill.coloring.params.solid.color',
    'fillColorEnd': 'fill.coloring.params.gradient-2point.colorEnd',
    'fillOpacity': 'fill.opacity',
    'fillBlendMode': 'fill.blendMode',
    'fillColorMethod': 'fill.coloring.method',
    'fillGradientType': 'fill.coloring.type',
    'fillGradientStops': 'fill.coloring.params.gradient-custom.stops',

    // Base Curve
    'showBaseCurve': 'baseCurve.visible',
    'baseCurveLineWidth': 'baseCurve.lineWidth',
    'baseCurveColor': 'baseCurve.coloring.params.solid.color',
    'baseCurveOpacity': 'baseCurve.opacity',
    'baseCurveBlendMode': 'baseCurve.blendMode',
    'baseCurveColorMethod': 'baseCurve.coloring.method',
    'baseCurveAntiAlias': 'baseCurve.antiAlias',

    // Vertices
    'showVertices': 'vertices.visible',
    'vertexRadius': 'vertices.radius',
    'vertexColor': 'vertices.coloring.params.solid.color',
    'vertexOpacity': 'vertices.opacity',
    'vertexBlendMode': 'vertices.blendMode',

    // Background
    'backgroundColor': 'background.color',
    'backgroundOpacity': 'background.opacity',

    // Rendering
    'autoScale': 'rendering.autoScale',
    'scaleLineWidth': 'rendering.scaleLineWidth',
    'connectMode': 'rendering.connectMode',
    'connectDetail': 'rendering.connectDetail',
    'waveAmplitude': 'rendering.waveAmplitude',
    'waveFrequency': 'rendering.waveFrequency',
    'waveAlternateFlip': 'rendering.waveAlternateFlip',
    'splineTension': 'rendering.splineTension',
    'splineBias': 'rendering.splineBias',
    'splineContinuity': 'rendering.splineContinuity',
    'splineAlpha': 'rendering.splineAlpha',
};

/**
 * Hybrid-specific flat key mappings.
 */
const HYBRID_FLAT_MAP = {
    'weight': 'mix.weight',
    'method': 'mix.method',
    'samples': 'mix.samples',
    'resampleMethod': 'mix.resampleMethod',
    'approxResampleThreshold': 'mix.approxResampleThreshold',
    'mixType': 'mix.mixType',

    'showRoseA': 'underlay.showRoseA',
    'showRoseB': 'underlay.showRoseB',
    'underlayOpacity': 'underlay.opacity',

    // Stroke
    'color': 'stroke.coloring.params.solid.color',
    'colorEnd': 'stroke.coloring.params.gradient-2point.colorEnd',
    'colorMethod': 'stroke.coloring.method',
    'gradientType': 'stroke.coloring.type',
    'gradientPreset': 'stroke.coloring.params.gradient-preset.preset',
    'gradientStops': 'stroke.coloring.params.gradient-custom.stops',
    'opacity': 'stroke.opacity',
    'blendMode': 'stroke.blendMode',
    'lineWidth': 'stroke.lineWidth',

    // Fill
    'fillColor': 'fill.coloring.params.solid.color',
    'fillColorEnd': 'fill.coloring.params.gradient-2point.colorEnd',
    'fillOpacity': 'fill.opacity',
    'fillBlendMode': 'fill.blendMode',
    'fillColorMethod': 'fill.coloring.method',
    'fillGradientType': 'fill.coloring.type',
    'fillGradientStops': 'fill.coloring.params.gradient-custom.stops',

    // Hybrid base curves (A/B specific)
    'showBaseCurveA': 'baseCurveA.visible',
    'baseCurveLineWidthA': 'baseCurveA.lineWidth',
    'baseCurveColorA': 'baseCurveA.coloring.params.solid.color',
    'baseCurveOpacityA': 'baseCurveA.opacity',
    'baseCurveBlendModeA': 'baseCurveA.blendMode',
    'showBaseCurveB': 'baseCurveB.visible',
    'baseCurveLineWidthB': 'baseCurveB.lineWidth',
    'baseCurveColorB': 'baseCurveB.coloring.params.solid.color',
    'baseCurveOpacityB': 'baseCurveB.opacity',
    'baseCurveBlendModeB': 'baseCurveB.blendMode',

    // Vertices
    'showVertices': 'vertices.visible',
    'vertexRadius': 'vertices.radius',
    'vertexColor': 'vertices.coloring.params.solid.color',
    'vertexOpacity': 'vertices.opacity',
    'vertexBlendMode': 'vertices.blendMode',

    // Background
    'backgroundColor': 'background.color',
    'backgroundOpacity': 'background.opacity',

    // Rendering
    'autoScale': 'rendering.autoScale',
    'scaleLineWidth': 'rendering.scaleLineWidth',
    'connectMode': 'rendering.connectMode',
    'connectDetail': 'rendering.connectDetail',
    'waveAmplitude': 'rendering.waveAmplitude',
    'waveFrequency': 'rendering.waveFrequency',
    'waveAlternateFlip': 'rendering.waveAlternateFlip',
    'splineTension': 'rendering.splineTension',
    'splineBias': 'rendering.splineBias',
    'splineContinuity': 'rendering.splineContinuity',
    'splineAlpha': 'rendering.splineAlpha',
};

// ─── Deep set helper ─────────────────────────────────────

function setDeepObj(obj, dotPath, value) {
    const parts = dotPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] == null || typeof current[parts[i]] !== 'object') {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

// ─── Core migration ─────────────────────────────────────

/**
 * Migrate a flat rosette state (v2.x) into v3.0 hierarchical structure.
 * Preserves any nested sub-objects already present (from partial v2.1 migration).
 */
function migrateRosetteState(flatRose, defaults) {
    // Start from a deep clone of defaults to ensure complete structure
    const result = JSON.parse(JSON.stringify(defaults));

    if (!flatRose) return result;

    // If the v2.1 state already has nested sub-objects, deep-merge them first
    const NESTED_KEYS = ['curve', 'sequencer', 'coset', 'stroke', 'fill', 'baseCurve', 'vertices', 'background', 'rendering'];
    NESTED_KEYS.forEach(key => {
        if (flatRose[key] && typeof flatRose[key] === 'object') {
            deepMergeInto(result[key], flatRose[key]);
        }
    });

    // Then migrate remaining flat keys
    Object.keys(flatRose).forEach(key => {
        if (NESTED_KEYS.includes(key)) return; // Already handled
        if (key === 'params') return; // Skip legacy params hash

        const value = flatRose[key];
        if (FLAT_PARAM_MAP[key]) {
            setDeepObj(result, FLAT_PARAM_MAP[key], value);
        }
        // Unknown flat keys are intentionally dropped
    });

    return result;
}

/**
 * Migrate flat hybrid state (v2.x) into v3.0 structure.
 */
function migrateHybridState(flatHybrid, defaults) {
    const result = JSON.parse(JSON.stringify(defaults));

    if (!flatHybrid) return result;

    // Merge existing nested sub-objects
    const NESTED_KEYS = ['mix', 'underlay', 'stroke', 'fill', 'vertices', 'sourceA', 'sourceB', 'baseCurveA', 'baseCurveB', 'background', 'rendering'];
    NESTED_KEYS.forEach(key => {
        if (flatHybrid[key] && typeof flatHybrid[key] === 'object') {
            deepMergeInto(result[key], flatHybrid[key]);
        }
    });

    // Migrate from v2.1 "params" hash if present
    if (flatHybrid.params && typeof flatHybrid.params === 'object') {
        Object.keys(flatHybrid.params).forEach(key => {
            if (HYBRID_FLAT_MAP[key]) {
                setDeepObj(result, HYBRID_FLAT_MAP[key], flatHybrid.params[key]);
            }
        });
    }

    // Migrate remaining flat keys
    Object.keys(flatHybrid).forEach(key => {
        if (NESTED_KEYS.includes(key) || key === 'params') return;

        const value = flatHybrid[key];
        if (HYBRID_FLAT_MAP[key]) {
            setDeepObj(result, HYBRID_FLAT_MAP[key], value);
        }
    });

    return result;
}

/**
 * Deep merge source into target (mutating target).
 */
function deepMergeInto(target, source) {
    if (!source || typeof source !== 'object') return;
    if (!target || typeof target !== 'object') return;

    Object.keys(source).forEach(key => {
        const sv = source[key];
        const tv = target[key];
        if (Array.isArray(sv)) {
            target[key] = sv;
        } else if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
            if (!tv || typeof tv !== 'object') {
                target[key] = {};
            }
            deepMergeInto(target[key], sv);
        } else {
            target[key] = sv;
        }
    });
}

/**
 * Migrate a v2.x link key to v3.0 path.
 * e.g. 'rosetteA.n' → 'rosetteA.curve.params.Rhodonea.n'
 */
function migrateLinkKey(key) {
    const parts = key.split('.');
    if (parts.length < 2) return key;

    const rootSlice = parts[0]; // 'rosetteA' or 'rosetteB'
    const flatParam = parts.slice(1).join('.');

    // Check if it's already a deep path (v2.1 partial migration)
    if (flatParam.includes('.')) return key;

    if (rootSlice === 'hybrid') {
        const mapped = HYBRID_FLAT_MAP[flatParam];
        return mapped ? `hybrid.${mapped}` : key;
    }

    const mapped = FLAT_PARAM_MAP[flatParam];
    return mapped ? `${rootSlice}.${mapped}` : key;
}

/**
 * Migrate an animation key (relative to rosette) to v3.0 path.
 * e.g. 'opacity' → 'stroke.opacity', 'n' → 'curve.params.Rhodonea.n'
 */
function migrateAnimationKey(key) {
    // If already deep (.contains dot), leave as-is
    if (key.includes('.')) return key;

    return FLAT_PARAM_MAP[key] || key;
}

// ─── Main migration entry point ─────────────────────────

/**
 * Migrate a full saved data blob from v2.x to v3.0.
 * @param {object} savedData - the full persistence blob
 * @param {object} defaults - v3.0 DEFAULTS
 * @returns {object} migrated data in v3.0 format
 */
export function migrateV2ToV3(savedData, defaults) {
    console.log('[Migration] Starting v2.x → v3.0 migration...');

    const result = {
        version: '4.0',
        timestamp: savedData.timestamp || Date.now(),
        timeReadable: savedData.timeReadable || new Date().toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZoneName: 'short'
        })
    };

    // Migrate state
    const oldState = savedData.state || savedData;
    result.state = {};

    result.state.rosetteA = migrateRosetteState(oldState.rosetteA, defaults.rosetteA);
    result.state.rosetteB = migrateRosetteState(oldState.rosetteB, defaults.rosetteB);
    result.state.hybrid = migrateHybridState(oldState.hybrid, defaults.hybrid);
    result.state.settings = oldState.settings || JSON.parse(JSON.stringify(defaults.settings));
    result.state.app = oldState.app || JSON.parse(JSON.stringify(defaults.app));

    // Migrate links
    if (savedData.links && Array.isArray(savedData.links)) {
        result.links = savedData.links.map(pair => {
            if (Array.isArray(pair) && pair.length === 2) {
                return [migrateLinkKey(pair[0]), migrateLinkKey(pair[1])];
            }
            return pair;
        });
    }

    // Migrate animations
    if (savedData.animations) {
        result.animations = {};
        ['rosetteA', 'rosetteB', 'interpolation'].forEach(section => {
            const oldAnim = savedData.animations[section];
            if (oldAnim && typeof oldAnim === 'object') {
                result.animations[section] = {};
                Object.keys(oldAnim).forEach(key => {
                    const newKey = section === 'interpolation' ? key : migrateAnimationKey(key);
                    result.animations[section][newKey] = oldAnim[key];
                });
            } else {
                result.animations[section] = {};
            }
        });
    }

    // Preserve UI state as-is
    if (savedData.ui) {
        result.ui = savedData.ui;
    }

    console.log('[Migration] Migration complete.');
    return result;
}
