# Technical Debt Analysis & Roadmap to v4.0

## Executive Summary
Version 3.0 represents a significant feature milestone (Vertex Gradients, Hybrid Fills, etc.), but this rapid expansion has introduced architectural complexity. To ensure stability and extensibility for v4.0, we must address several key areas of technical debt.

## 1. The "God Class" Problem: `LayerRenderingModule`
**Severity**: High
**Location**: `src/ui/components/modules/LayerRenderingModule.js`

*   **Issue**: This single class now handles **everything** related to rendering controls: Lines, Vertices, Fills, Base Curves, Underlays.
*   **Symptoms**:
    *   Constructor takes a massive `options` object with confusing mapping keys.
    *   `render()` method has conditional blocks for every possible control type (`if (!hideSize)`, `if (showToggle)`).
    *   `updateVisibility()` contains hardcoded logic for specific features (Gradient types vs Custom).
*   **Recommendation**: Refactor into specialized sub-classes or a composition pattern:
    *   `BaseRenderingModule` (Abstract)
    *   `StrokeRenderingModule` (Width, Cap, Join)
    *   `FillRenderingModule` (No width, multiple blend modes)
    *   `VertexRenderingModule` (Radius, Shape)

## 2. Renderer Monolith
**Severity**: Medium-High
**Location**: `src/engine/renderer/Renderer.js`

*   **Issue**: The `CanvasRenderer` class mixes **Data Generation** (Collection Phase), **Camera Logic** (Scale/Pan), and **Drawing Commands** (Canvas API).
*   **Symptoms**:
    *   `renderPreview` and `renderInterpolation` are giant methods (200+ lines).
    *   Duplicated logic for "Collection" in both methods (generating points, checking sequencer).
    *   Hardcoded "Pipeline Order" (Base Curve -> Underlay -> Rose -> Vertex) making reordering impossible without code changes.
*   **Recommendation**:
    *   **Extract Pipeline**: Create a `RenderPipeline` class that defines a stack of `RenderLayers`.
    *   **Extract Logic**: Move `collectBaseCurve`, `collectRose` into a `GeometryGenerator` service.

## 3. Parameter Key Explosion & Inconsistency
**Severity**: Medium
**Location**: `src/config/defaults.js` vs UI Modules

*   **Issue**: We have separate parameter namespaces (`fill...`, `vertex...`, `baseCurve...`, `underlay...`) that are manually mapped in UI code.
*   **Symptoms**:
    *   `AppearanceSection.js` manually maps `colorMethod: 'fillColorMethod'` for one module and `colorMethod: 'vertexColorMethod'` for another.
    *   Inconsistent naming (e.g., `showRoseA` vs `showBaseCurveA` vs `showVertices`).
*   **Recommendation**:
    *   Standardize parameter schema in `defaults.js`.
    *   Use a "Scope" system (e.g., `rosetteA.fill.color`, `rosetteA.stroke.color`) instead of flat prefixes (`fillColor`, `color`). **Note**: This is a breaking state change requiring migration.

## 4. Duplicate UI Logic
**Severity**: Low-Medium
**Location**: `AppearanceSection.js` vs `HybridAppearanceSection.js`

*   **Issue**: Both files manually instantiate accordions and modules in specific orders.
*   **Symptoms**: Copy-paste coding errors (e.g., forgetting to add `showToggle` to Hybrid Fill, which just happened).
*   **Recommendation**:
    *   Data-driven UI generation. Define a `UIConfig` object that lists sections and their modules, and have a factory build the DOM.

## 5. Performance Bottlenecks
**Severity**: Medium
**Location**: Main Loop

*   **Issue**: High N/D values or complex gradients still run on the main thread.
*   **Recommendation**:
    *   **Web Workers**: Move the `GeometryGenerator` (Collection Phase) to a worker.
    *   **OffscreenCanvas**: Draw complex static layers (backgrounds, base curves) to an offscreen canvas and verify composition.

## 6. Hardcoded Strings & Magic Numbers
**Severity**: Low
*   **Issue**: String literals for colors, blend modes, and default values are scattered.
*   **Recommendation**: Centralize constants in `src/config/constants.js`.

---

## Action Plan for v4.0

1.  **Refactor Rendering Pipeline** (Split Renderer.js).
2.  **Refactor UI Modules** (Break LayerRenderingModule).
3.  **State Migration** (Adopt nested state parameters).
4.  **Worker Integration** (Geometry calculation off-main-thread).
