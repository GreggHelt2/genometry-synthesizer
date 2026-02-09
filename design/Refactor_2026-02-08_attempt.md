# Refactor Attempt (2026-02-08)

This document details the refactoring attempt to implement a Scoped Parameter System for the Chordal Rosette Explorer.

# Part I: Implementation Plan - Scoped Parameter System

## 1. Goal
The goal is to refactor the flat parameter naming convention (e.g., `fillColor`, `baseCurveOpacity`) into a structured, scoped system (e.g., `fill.color`, `baseCurve.opacity`) to reduce technical debt and improve maintainability.

## 2. Unified State Strategy

The proposed JSON schema acts as the **canonical data structure** for the entire application lifecycle. This single structure serves three distinct purposes without conversion:

1.  **Reasonable Defaults**: The `DEFAULTS` constant defines the complete initial state with sensible values for *all* possible curves and sequencers.
2.  **Persistence (Auto-Save)**: The exact same structure is serialized to `localStorage` to preserve the user's session. Use the `curve.params.Rhodonea` vs `curve.params.Circle` pattern to preserve settings when switching types.
3.  **Snapshots**: Saving a snapshot creates a portable copy of this state tree.

### 2.1. State Configuration (`src/config/defaults.js`)

Refactor the flat `DEFAULTS` object into nested scopes.

```javascript
export const DEFAULTS = {
    rosetteA: {
        // Scoped Core Groups
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
            }
        },
        
        coset: { // New scope for coset params
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
                }
            }
        }
    },
    // Similar structure for rosetteB and hybrid
};
```

## 3. Plan Components

### 3.1. State Management (`src/engine/state/Store.js`)
Implement `deepMerge` to handle nested state updates without overwriting.

### 3.2. UI Modules (`LayerRenderingModule.js`)
Update rendering modules to navigate the new `coloring.type` and `coloring.params[type]` structure.

### 3.3. UI Sections
Map UI components to their specific scopes (`stroke`, `fill`, `vertices`, `baseCurve`) and nested curve/sequencer params.

---

# Part II: Execution & Failure Analysis

This section documents the specific problems encountered during the execution of Part I and how they relate to the JSON data structure defined in Section 2.1.

## 1. The "Blank Canvas" / NaN Coordinate Issue
**Symptom**: Upon loading the app, all canvases were blank. Console logs showed point coordinates were `NaN`.
**Relation to JSON**: The JSON structure nests curve parameters under `curve.params[type]`. 
- **Bug**: `Renderer.createCurve` was still looking for flat parameters (e.g., `params.n`).
- **Conflict**: The state provided `rosetteA.curve.params.Rhodonea.n`, so `params.n` was `undefined`.
**Fix**: Refactored `Renderer.createCurve` to intelligently look for `params.curve.params[type]` before falling back to flat params.

## 2. Hybrid Rendering Failure
**Symptom**: The Hybrid canvas remained blank even after individual rosettes were fixed.
**Relation to JSON**: The hybrid state structure also nests parameters (e.g., `hybrid.stroke`, `hybrid.params`).
- **Bug**: `Renderer.renderInterpolation` failed to extract `weight` or `samples` from the new `hybrid` state.
- **Conflict**: It expected `state.hybrid.weight` but the value might have been nested or the renderer was using an old property name.
**Fix**: Updated `renderInterpolation` to correctly access `state.hybrid.params` and resolving styles from `state.hybrid.stroke`.

## 3. Styling Ignored (Opacity, Vertices, Base Curves)
**Symptom**: Changing "Opacity", "Show Vertices", or "Show Base Curve" in the UI had no effect.
**Relation to JSON**: The JSON structure defines these visual properties in their own scopes (`stroke`, `vertices`, `baseCurve`).
- **Bug**: The Renderer was reading legacy flat properties like `params.opacity` or `params.showVertices`.
- **Conflict**: The UI was correctly updating the new JSON paths (e.g., `rosetteA.stroke.opacity`), but the Renderer was reading from the old flat locations (which were undefined or stale).
**Fix**: Completely refactored `Renderer.renderPreview` to destructure and use the nested style objects defined in **Part I**.

## 4. Broken Gradients and Advanced Coloring
**Symptom**: Selecting "2-Point Gradient" in the UI resulted in a solid white line or default color.
**Relation to JSON**: The JSON structure defines coloring as a discriminated union: `coloring: { type, source, params: { ... } }`.
- **Bug**: `Renderer.js` ignored this structure and hardcoded `colorMethod: 'solid'`.
- **Conflict**: Even when `coloring.type` was set to `'gradient-2point'`, the renderer didn't know where to find `colorStart` (now at `coloring.params['gradient-2point'].colorStart`).
**Fix**: Updated `renderPreview` and `renderInterpolation` to:
- Dynamically map `coloring.type` (from JSON) to a valid `colorMethod`.
- Extract the correct parameter subset (stops, presets) from `coloring.params[type]`.

## 5. Missing File Confusion
**Symptom**: User asked "Why did you delete package.js?".
**Analysis**: No file named `package.js` existed or was deleted. The user likely meant `package.json` (which is present in the intended directory structure).
