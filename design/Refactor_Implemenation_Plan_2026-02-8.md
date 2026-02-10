# Implementation Plan - Scoped Parameter System

The goal is to refactor the flat parameter naming convention (e.g., `fillColor`, `baseCurveOpacity`) into a structured, scoped system (e.g., `fill.color`, `baseCurve.opacity`) to reduce technical debt and improve maintainability.

## User Review Required

> [!IMPORTANT]
> **Breaking State Change**: This refactor changes the structure of the Redux state. Persisted states (saved settings) from previous versions will likely break or fail to load correctly. A migration strategy or state reset is recommended.

> [!WARNING]
> **Reducer Logic Update**: The `Store` reducers will be updated to support **Deep Merging**. This ensures that dispatching `{ fill: { color: 'red' } }` merges into the existing `fill` object rather than replacing it.

## Unified State Strategy

The proposed JSON schema acts as the **canonical data structure** for the entire application lifecycle. This single structure serves three distinct purposes without conversion:

1.  **Reasonable Defaults**: The `DEFAULTS` constant defines the complete initial state with sensible values for *all* possible curves and sequencers.
2.  **Persistence (Auto-Save)**: The exact same structure is serialized to `localStorage` to preserve the user's session. Because parameters are namespaced by type (e.g., `curve.params.Rhodonea` vs `curve.params.Circle`), switching curve types does not lose the settings for the previous type.
3.  **Snapshots**: Saving a snapshot creates a portable copy of this state tree. Loading a snapshot simply hydrates the store with this named state, instantly restoring every setting, including those for currently inactive curve types.

## Proposed Changes

### 1. State Configuration (`src/config/defaults.js`)

Refactor the flat `DEFAULTS` object into nested scopes.

#### [MODIFY] [defaults.js](file:///Users/gregg/projects/genometry_synthesizer_ag/genometry-synthesizer/apps/Chordal_Rosette_Explorer/src/config/defaults.js)
```javascript
export const DEFAULTS = {
    rosetteA: {
        // Scoped Core Groups
        // Namespaced Strategy:
        // Parameters are isolated by type to avoid collisions and confusion.
        // The state preserves settings for all types, allowing persistent switching.
        curve: {
            type: 'Rhodonea',
            params: {
                'Rhodonea': { n: 3, d: 4, A: 200, c: 0, rot: 0 },
                'Circle': { radius: 100, rot: 0 },
                'Epitrochoid': { R: 100, r: 20, d: 50, A: 100, rot: 0 },
                'Lissajous': { a: 3, b: 2, delta: 90, A: 100, rot: 0 },
                'Hypotrochoid': { R: 100, r: 20, d: 50, A: 100, rot: 0 },
                'Superformula': { /* ... defaults ... */ },
                'Farris Mystery': { /* ... defaults ... */ },
                'Regular N-Sided Polygon': { n: 5, A: 100, rot: 0 }
            }
        },
        
        sequencer: {
            type: 'Cyclic Additive Group Modulo N',
            params: {
                 'Cyclic Additive Group Modulo N': { step: 29, totalDivs: 360, useCustomDivs: false },
                 'Multiplicative Group Modulo N': { /* ... */ },
                 'Alternating Increment Sequencer': { /* ... */ }
                 // ... other sequencers
            }
        },
            // ...
        },
        
        coset: { // New scope for coset params?
            index: 0,
            showAll: false,
            count: 1,
            distribution: 'sequential'
        },

        // Scoped Visual Groups
        stroke: { 
            visible: true,
            opacity: 0.5,
            lineWidth: 2,
            blendMode: 'lighter',
            
            // Flattened Coloring Strategy with Hoisted Source:
            // 'active' type selects which params to use.
            // 'source' is shared across all gradient types (Length vs Angle vs Index).
            coloring: {
                type: 'solid', 
                source: 'length', // 'length', 'angle', 'index'
                params: {
                    'solid': { 
                        color: '#00FFFF' 
                    },
                    'gradient-2point': { 
                        colorStart: '#00FFFF', 
                        colorEnd: '#FF00FF' 
                    },
                    'gradient-custom': { 
                        stops: [] 
                    },
                    'gradient-preset': { 
                        preset: 'rainbow' 
                    }
                }
            }
        },
        
        fill: {
            visible: true,
            opacity: 0,
            blendMode: 'source-over',
            coloring: {
                type: 'solid',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' },
                    'gradient-2point': { colorStart: '#ffffff', colorEnd: '#000000' },
                    // ...
                }
            }
        },

        baseCurve: {
            visible: false,
            opacity: 1,
            lineWidth: 2,
            blendMode: 'source-over',
            coloring: {
                type: 'solid',
                source: 'length',
                params: {
                    'solid': { color: '#666666' }
                    // ...
                }
            }
        },

        vertices: {
            visible: false,
            opacity: 1,
            radius: 2,
            blendMode: 'source-over',
            coloring: {
                type: 'solid',
                source: 'length',
                params: {
                    'solid': { color: '#ffffff' }
                    // ...
                }
            }
        }
    },
    // Similar structure for rosetteB and hybrid
    // ...
};
```

### 2. State Management (`src/engine/state/Store.js`)

Implement a generic deep merge utility to handle nested state updates.

#### [MODIFY] [Store.js](file:///Users/gregg/projects/genometry_synthesizer_ag/genometry-synthesizer/apps/Chordal_Rosette_Explorer/src/engine/state/Store.js)
- Add `deepMerge` utility function.
- Update reducers to use `deepMerge` instead of shallow spread.

```javascript
function deepMerge(target, source) {
    // ... recursive merge implementation ...
}
//...
case ACTIONS.UPDATE_ROSETTE_A:
    return {
        ...state,
        rosetteA: deepMerge(state.rosetteA, action.payload)
    };
```

### 3. UI Modules (`LayerRenderingModule.js`)

Update the module to work with the new `coloring` structure.

#### [MODIFY] [LayerRenderingModule.js](file:///Users/gregg/projects/genometry_synthesizer_ag/genometry-synthesizer/apps/Chordal_Rosette_Explorer/src/ui/components/modules/LayerRenderingModule.js)
- Update `constructor` to accept a `scope` string.
- Update `render` to use the new `coloring` object pattern:
    - Primary selector controls `coloring.type` (Solid, Gradient 2-Point, etc.).
    - Sub-controls (Color Picker, Gradient Editor) bind to `coloring.params[type]`.
- Logic for `coloring.type`:
    - If `type` is 'solid', show Color Picker (bound to `params.solid.color`).
    - If `type` is 'gradient-2point', show Start/End pickers (bound to `params['gradient-2point'].colorStart/End`).
    - If `type` is 'gradient-custom', show Gradient Editor.
- Dispatch actions with `{ [scope]: { coloring: { params: { [type]: { [key]: value } } } } }` (or similar deep path).

### 4. UI Sections Refactoring

#### [MODIFY] [AppearanceSection.js](file:///Users/gregg/projects/genometry_synthesizer_ag/genometry-synthesizer/apps/Chordal_Rosette_Explorer/src/ui/components/chordal_rosette/AppearanceSection.js)
- `chordalModule` -> scope: `'stroke'`
- `vertexModule` -> scope: `'vertices'`
- `baseCurveModule` -> scope: `'baseCurve'`
- `fillModule` -> scope: `'fill'`

#### [MODIFY] [CoreParamsSection.js](file:///Users/gregg/projects/genometry_synthesizer_ag/genometry-synthesizer/apps/Chordal_Rosette_Explorer/src/ui/components/chordal_rosette/CoreParamsSection.js)
- **Read**: Access curve parameters via `state.curve.params[state.curve.type]`.
- **Write**: Dispatch actions with scoped path: `{ curve: { params: { [type]: { [key]: val } } } }`.
- Key mapping: `curveType` -> `curve.type`.

#### [MODIFY] [SequencerSection.js](file:///Users/gregg/projects/genometry_synthesizer_ag/genometry-synthesizer/apps/Chordal_Rosette_Explorer/src/ui/components/chordal_rosette/SequencerSection.js)
- **Read**: Access sequencer parameters via `state.sequencer.params[state.sequencer.type]`.
- **Write**: Dispatch with `{ sequencer: { params: { [type]: { [key]: val } } } }`.

#### [MODIFY] [CosetVizSection.js](file:///Users/gregg/projects/genometry_synthesizer_ag/genometry-synthesizer/apps/Chordal_Rosette_Explorer/src/ui/components/chordal_rosette/CosetVizSection.js)
- Access coset parameters via `state.coset` (shared schema for coset settings usually fine, or verify if namespacing needed). 
- *Note*: Coset params (`index`, `showAll`) seem generic enough to remain direct children of `state.coset`, but we will check for type-specificity.
- Dispatch with `{ coset: { [key]: val } }`.


## Migration Strategy

### 1. Defaults (`src/config/defaults.js`)
- **Action**: Manual Rewrite.
- **Details**: The `DEFAULTS` constant will be completely replaced with the new JSON structure. No programmatic migration needed here, as this is the source of truth.

### 2. Snapshots & Legacy State
- **Challenge**: Existing snapshots (and potentially the auto-saved session if we hadn't bumped the key) use the flat parameter structure (v2.x/3.0).
- **Solution**: Implement a `migrateState(oldState)` function in `PersistenceManager` or a helper `StateMigrator.js`.
- **Trigger**: When loading a snapshot, check `snapshot.version`. If < 3.6, run `migrateState`.

#### Migration Logic (`migrateState`)
1.  **Core Params**:
    - Move `n`, `d`, `A`, `c`, `rot` -> `curve.params.Rhodonea`.
    - Move `radius` -> `curve.params.Circle`.
    - Move `a`, `b`, `delta` -> `curve.params.Lissajous`.
    - Set `curve.type` based on the old `curveType` (or default to 'Rhodonea').
2.  **Visual Params (e.g., Fill)**:
    - If `fillGradientType` exists and != 'none':
        - Set `fill.coloring.type` = 'gradient-2point' (approximation).
        - Map `fillColor`, `fillColorEnd` -> `fill.coloring.params['gradient-2point']`.
    - Else:
        - Set `fill.coloring.type` = 'solid'.
        - Map `fillColor` -> `fill.coloring.params.solid.color`.
    - Move `fillOpacity`, `fillBlendMode` -> `fill.opacity`, `fill.blendMode` (direct copy).
3.  **Repeat** for `stroke` (was `color`, `colorEnd` at root?), `baseCurve`, `vertices`.

This ensures old creations can still be loaded, even if some advanced settings (like custom gradients) from the *very* old versions need to be approximated.

## Verification Plan

### Automated Tests
- None (UI-heavy refactor).

### Manual Verification
1.  **Load App**: Verify app loads without crashing (defaults migration).
2.  **Check Defaults**: Verify initial visual state matches previous defaults.
3.  **Interact**:
    - Change `stroke` color/opacity -> Verify update.
    - Change `fill` parameters -> Verify update.
    - Toggle `baseCurve` -> Verify visibility.
4.  **Links**: Verify parameter linking still works (might need explicit updates for key mapping `rosetteA.fill.color` vs `rosetteB.fill.color`).
    - *Note*: LinkManager uses string keys. New keys will be `rosetteA.fill.color`. We must ensure LinkManager supports dot notation or the keys are passed correctly.
