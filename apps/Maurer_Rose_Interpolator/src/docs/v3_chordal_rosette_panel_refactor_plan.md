# Refactoring Plan: Modularizing ChordalRosettePanel.js

## Goal
Reduce the complexity of `ChordalRosettePanel.js` (currently ~1200 lines) by breaking it down into smaller, focused functional components. This will improve readability, maintainability, and testability.

## Current Architecture
Currently, `ChordalRosettePanel` acts as both the **Controller** and the **View** for:
1.  **Core Parameters**: Base curve logic (n, d, Rose/Lissajous switches).
2.  **Sequencer Logic**: Handling multiple sequencer types and their dynamic inputs.
3.  **Appearance**: Colors, opacity, line width, blend modes.
4.  **Stats**: Calculating and displaying mathematical properties (Coprime, Period, etc.).
5.  **State Management**: Direct interaction with the global Store.

## Proposed Modular Architecture

We will split the "View" logic into distinct sub-components, while keeping `ChordalRosettePanel` as the main **Orchestrator/Controller**.

### 1. `ChordalRosettePanel.js` (The Orchestrator)
**Responsibility**:
-   Main entry point.
-   Instantiates and manages the sub-sections.
-   Handles global state subscriptions (Store updates).
-   Passes data down to sub-components.
-   Handles "Accordion" referencing.

### 2. `CoreParamsSection.js`
**Responsibility**:
-   Renders the "Mathematical Parameters" accordion.
-   Handles Curve Type switching (Rose vs Lissajous vs Farris).
-   Renders `n`, `d`, `c`, `Lissajous Ratio` inputs.
-   **Key Benefit**: Isolates the dense `renderCoreParams` logic.

### 3. `SequencerSection.js`
**Responsibility**:
-   Renders the "Animation & Sequencer" accordion.
-   Handles Sequencer Type switching.
-   Dynamically renders sequencer-specific inputs based on selection.
-   **Key Benefit**: This is the most complex dynamic part of the current file; moving it out will massively clean up the main file.

### 4. `AppearanceSection.js`
**Responsibility**:
-   Renders "Rendering Settings" (Color, Opacity, Line Width, Blend Mode).
-   Handles the "Base Curve Rendering" toggle and sub-settings.
-   **Key Benefit**: Separates pure visual styling from mathematical logic.

### 5. `StatsDisplay.js`
**Responsibility**:
-   Calculates and renders the "Mathematical Properties" text block.
-   Pure function of the state.
-   **Key Benefit**: Moves the long string formatting and logic out of the UI rendering loop.

---

## File Structure

```text
src/ui/components/
  ├── ChordalRosettePanel.js  (Main Wrapper ~300 lines)
  └── panels/
      ├── CoreParamsSection.js
      ├── SequencerSection.js
      ├── AppearanceSection.js
      └── StatsDisplay.js
```

## Refactoring Steps

1.  **Extract Stats**: Move `updateStats` logic to `StatsDisplay.js`.
2.  **Extract Appearance**: Move helper methods and strict rendering values for appearance to `AppearanceSection.js`.
3.  **Extract Core Params**: Move `renderCoreParams` and curve-type logic.
4.  **Extract Sequencer**: Move `updateSequencerParams` and selector logic.
5.  **Connect**: user `ChordalRosettePanel` to instantiate these classes, passing a reference to `this` (or `this.container`) and the `store`.

## Benefits
-   **File Size**: Each file will be < 300 lines.
-   **Cognitive Load**: easier to reason about "just the sequencer" vs "the whole app".
-   **Reusability**: Components could potentially be reused for other panels (e.g., `AppearanceSection` might be shared with Interpolator).
