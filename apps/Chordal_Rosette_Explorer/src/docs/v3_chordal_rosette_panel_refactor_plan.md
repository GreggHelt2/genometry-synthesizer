# V3 Refactoring Plan: Modularizing ChordalRosettePanel.js

## 1. Goal
Refactor the monolithic `ChordalRosettePanel.js` (~1200 lines) into a Maintainable Modular Architecture.
**Constraint**: Do NOT implement. Sketch the plan only.

## 2. Architecture Overview
We will move from a "God Class" pattern to a **Component-Orchestrator** pattern.
The `ChordalRosettePanel` will become a lightweight **Orchestrator** that:
1.  Creates the main container.
2.  Subscribes to the Global Store (`store.subscribe`).
3.  Instantiates child **Section Components**.
4.  Delegates updates: `onStoreUpdate() -> section.update(state)`.

## 3. Directory Structure
We will create a specific directory for this panel's internals to avoid cluttering `components/`.

```text
src/ui/components/
  ├── ChordalRosettePanel.js          (Entry Point / Orchestrator)
  │
  └── chordal_rosette/                (New Directory)
      ├── CoreParamsSection.js        ("Base Curve Generator" Accordion)
      ├── SequencerSection.js         ("Chordal Sequencer" Accordion)
      ├── RelativesSection.js         ("Relatives Navigation" Accordion)
      ├── AppearanceSection.js        ("Chordal Line Viz" + "Base Curve Viz" + "Vertex" + "General" Accordions)
      ├── CosetVizSection.js          ("Coset Visualization" Accordion)
      └── StatsSection.js             ("Info" / Stats Accordion)
```

## 4. Component Details

### 4.1. `ChordalRosettePanel.js` (The Orchestrator)
**Responsibilities**:
-   **Initialization**: Sets up the root DOM element and the `canvas`.
-   **State Subscription**: Listens to `store` and `linkManager`.
-   **Delegation**: Calls `section.update(params)` on all child sections.
-   **Persistence**: Manages `uiState` (accordions open/close propagation).
-   **Shared Context**: Passes `roseId`, `actionType`, and `accordionManager` to children.

### 4.2. `StatsSection.js`
**Responsibilities**:
-   **Pure Display**: Renders line counts, coprime status, and periods.
-   **Logic Extraction**: Contains the `updateStats` logic (currently lines 945-1065).
-   **Input**: Receives `params` and calculated `k` (cosets).

### 4.3. `CoreParamsSection.js`
**Responsibilities**:
-   **Accordions**: "Base Curve Generator".
-   **Curve Logic**: Handles `CurveRegistry` and rendering dynamic curve params (`n`, `d`, `c`, vs `Lissajous`).
-   **Logic Extraction**: `createCurveTypeSelector`, `renderCoreParams`.

### 4.4. `SequencerSection.js`
**Responsibilities**:
-   **Accordions**: "Chordal Sequencer".
-   **Sequencer Logic**: Handles `SequencerRegistry` and dynamic specific params.
-   **Static Controls**: Modulo Slider (`totalDivs`).
-   **Logic Extraction**: `createSequencerTypeSelector`, `updateSequencerParams`.

### 4.5. `RelativesSection.js` (New)
**Responsibilities**:
-   **Accordions**: "Relatives Navigation".
-   **Navigation Logic**: Handles "Prime", "Twin Prime", "LTC" dropdowns and "Prev/Next/Random" buttons.
-   **Logic Extraction**: `handleRelativesNav` and the relatives DOM creation.

### 4.6. `AppearanceSection.js`
**Responsibilities**:
-   **Accordions**:
    1.  "Base Curve Rendering"
    2.  "Chordal Line Viz"
    3.  "Vertex Rendering"
    4.  "General Rendering Settings"
-   **Logic Extraction**: All the `createSlider`, `createCheckbox`, `ParamColor`, `ParamSelect` calls for these sections.
-   **Complexity Note**: This is still large (~400 lines). It could be split further, but grouping "Appearance" concepts together is a good first step.

### 4.7. `CosetVizSection.js` (New)
**Responsibilities**:
-   **Accordions**: "Coset Visualization".
-   **Logic**: Handles `showAllCosets`, `cosetCount`, `cosetIndex`, `distribution`.
-   **Dependencies**: Needs to know `k` (total cosets) calculated from the Sequencer state.

## 5. Refactoring Strategy (Step-by-Step)

1.  **Preparation**: Create `src/ui/components/chordal_rosette/` folder.
2.  **Phase 1 - Low Hanging Fruit (Stats & Relatives)**:
    -   Extract `StatsSection.js` (Pure render).
    -   Extract `RelativesSection.js` (Self-contained logic).
    -   *Verify*: Orchestrator imports and updates them.
3.  **Phase 2 - The Heavy Lifters (Core & Sequencer)**:
    -   Extract `CoreParamsSection.js`. Move `CurveRegistry` dependency here.
    -   Extract `SequencerSection.js`. Move `SequencerRegistry` dependency here.
    -   *critical*: Ensure `dynamicParamsContainer` logic works in new context.
4.  **Phase 3 - Visuals (Appearance)**:
    -   Extract `AppearanceSection.js`.
    -   Move generic helpers (`createSlider`, `createCheckbox`) to a shared utility base class or mixin if needed, OR just let each section use `ParamNumber` directly (preferred for "No-Dependency" style).
5.  **Phase 4 - Cleanup**:
    -   Remove ~900 lines from `ChordalRosettePanel.js`.
    -   Ensure `linkVisuals` updates still propagate to child sections (pass `linkManager` to children or expose an `updateLinks()` method on children).

## 6. Persistence & State Restoration Strategy
The `ChordalRosettePanel` acts as the persistence gateway for `App` (via `main.js`). It must expose `getUIState`, `restoreUIState`, `getAnimationState`, and `restoreAnimationState`.

### 6.1. The "Central Registration" Pattern
Instead of delegating persistence logic to child sections (which would require complex traversal), we will use a **Registration Pattern**.
*   **Concept**: Sub-components "register" their stateful elements (Accordions, Params) with the Orchestrator upon creation.
*   **Result**: The Orchestrator retains a flat list of all relevant objects (`this.animationParams`, `this.accordions`), allowing existing `get/restore` methods to work with minimal changes.

### 6.2. Implementation Details

#### A. Accordion Registration
The Orchestrator will expose a method:
```javascript
registerAccordion(id, accordionInstance) {
    this.accordions.set(id, accordionInstance);
}
```
**Child Component Usage**:
```javascript
// In AppearanceSection.js
const generalAccordion = new Accordion('General', ...);
this.orchestrator.registerAccordion(`${this.roseId}-general`, generalAccordion);
```
**Persistence Flow**:
1.  `App` calls `panel.getUIState()`.
2.  Panel iterates `this.accordions` map (populated by children).
3.  Panel returns state object (Same as V2).

#### B. Animation Param Registration
The Orchestrator will expose:
```javascript
registerParam(paramInstance) {
    if (!this.animationParams) this.animationParams = new Set();
    this.animationParams.add(paramInstance);
    
    // Auto-cleanup on dispose
    const originalDispose = paramInstance.dispose.bind(paramInstance);
    paramInstance.dispose = () => {
        this.animationParams.delete(paramInstance);
        originalDispose();
    };
}
```
**Child Component Usage**:
```javascript
// In CoreParamsSection.js
const slider = new ParamNumber({ ... });
this.orchestrator.registerParam(slider);
```
**Benefits**:
*   No changes needed to `PersistenceManager.js` or `main.js`.
*   Memory leaks prevented via auto-cleanup.
*   Animation state restoration remains O(N) linear loop in Orchestrator.

## 7. Communication Interface
Each Section Class will implement:
```javascript
class Section {
    constructor(orchestrator, container) { 
        this.orchestrator = orchestrator; // For registration
        this.container = container; 
        ...
    }
    update(params) { ... }
    updateLinks() { ... } // Optional
}
```

## 8. Risks & Mitigations
-   **Link Manager Sync**: The `linkManager` currently finds controls by closures or direct references.
    -   *Mitigation*: Ensure `linkManager` subscriptions in the Orchestrator call `section.updateLinks()`, and sections iterate their own controls.
-   **Accordion State**: Preserving open/closed state across reloads.
    -   *Mitigation*: Pass a persistent `onToggle(id, isOpen)` callback to sections so the Orchestrator maintains the single source of truth for UI state.

## 9. Reusability Strategy
The refactor of `ChordalRosettePanel` creates an opportunity to standardize UI components across the app, specifically for `InterpolationPanel.js`.

### 9.1. Analysis of `InterpolationPanel`
`InterpolationPanel.js` currently duplicates significant logic from `ChordalRosettePanel`:
1.  **Rendering Settings**: `colorMethod`, `color`, `blendMode` (re-declared options arrays).
2.  **Vertex Rendering**: Exact same toggle/radius/color/opacity logic.
3.  **Base Curve Viz**: Duplicated logic for displaying base curves.
4.  **Accordions**: Manually manages accordion state similarly to the Rosette panel.

### 9.2. Proposed Shared Components
We will extract the `AppearanceSection` components into reusable factories or classes in `src/ui/components/modules/`.

#### A. `AppearanceModules` (New)
Instead of a monolithic `AppearanceSection`, we can create granular, reusable feature modules:
*   `RenderingControlsModule`: Handles Color, Line Width, Opacity, Blend Mode.
    *   *Usage*: Instantiated by `ChordalRosettePanel` AND `InterpolationPanel`.
*   `VertexVizModule`: Handles Show Vertices, Radius, Color, Opacity.
    *   *Usage*: Shared 1:1.

#### B. Implementation Plan for Reuse
1.  **Draft** the modules during the `AppearanceSection` refactor (Phase 3).
2.  **Verify** them within `ChordalRosettePanel` first.
3.  **Future Step**: Refactor `InterpolationPanel` to import `RenderingControlsModule` instead of manually creating sliders/selects.

### 9.3. Benefit
*   **Consistency**: Changing "Blend Mode" options in one place updates both panels.
*   **Maintenance**: Fixes to slider logic or style updates propagate globally.
*   **Code Reduction**: `InterpolationPanel.js` could shrink by ~300 lines.

## 10. Data Persistence & Schema Impact
Refactoring UI components often risks breaking "Save/Load" features if the underlying data model changes.
**Guarantee**: This refactor is purely a **View Layer** change.

### 10.1. Data Model (Store) Stability
*   **No Changes to Redux Schema**: The `defaults.js` structure (`rosetteA.n`, `rosetteA.sequencerType`, `rosetteA.baseCurveColor`, etc.) remains exactly the same.
*   **Binding Strategy**: New components (`CoreParamsSection`, `AppearanceModules`) will bind to the **exact same IDs and Redux keys** as the old monolithic code.
    *   *Example*: The "Line Width" slider in `RenderingControlsModule` will still dispatch `UPDATE_ROSETTE_A` with payload `{ lineWidth: val }`, just as before.

### 10.2. Persistence compatibility
*   **Backward Compatibility**: Old save files (JSON) and IndexedDB snapshots will load 100% correctly because the keys they populate in the Store match the keys the new UI components read from.
*   **Forward Compatibility**: New snapshots saved after the refactor will be identical in structure to old ones.
*   **Verification**: We will verify this by loading a pre-refactor snapshot (if available) or checking that specific complex configs (e.g., Specific Coset Index + Custom Color) persist across a page reload (Auto-Save).

