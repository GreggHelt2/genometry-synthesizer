# Refactoring Proposal: Maurer Rose Interpolator v17 (Code Name: "Grounded")

## 1. Executive Summary

The current Maurer Rose Interpolator (v16.1) is a feature-rich prototype built as a single-page application with a monolithic codebase (~1800 lines of JS). While functional, the current architecture (DOM-as-state, monolithic update loop, global variables) makes it difficult to maintain, extend, or test.

This proposal outlines a ground-up rewrite ("v17") to establish a robust, modular, and scalable architecture. This will support the continued expansion of features while maintaining code quality and developer sanity.

## 2. Architectural Goals

1.  **Separation of Concerns**: Strictly separate business logic (math/generation), application state, rendering, and UI handling.
2.  **Centralized State Management**: Move away from "DOM as Source of Truth". Implement a distinct State Store that drives the UI and Renderer.
3.  **Modularity**: Break the application into small, single-purpose ES Modules.
4.  **Scalability**: Ensure new features (e.g., new interpolation methods, new coloring modes) can be added without modifying the core engine.
5.  **Performance Check**: Optimize the rendering pipeline to handle high-vertex counts more efficiently.

## 3. Technology Stack

*   **Language**: Modern JavaScript (ES6+ Modules).
*   **Build Tool**: **Vite**. It provides a fast dev server, HMR (Hot Module Replacement), and efficient bundling, while allowing us to stick to "Vanilla" JS without the overhead of a heavy framework like React or Vue.
*   **Styling**: **Tailwind CSS**.

## 4. Proposed Architecture

### 4.1. Core Modules (The "Engine")

These modules are pure logic and have zero knowledge of the DOM.

*   **`engine/math/`**:
    *   **`curves/`**: **[NEW]** Directory for curve definitions.
        *   `Curve.js`: Base class/Interface defining the contract (e.g., `getPoint(theta)`, `getEquation()`).
        *   `RhodoneaCurve.js`: Implementation of the current rose curves (r = sin(k*theta)).
        *   *(Future)*: `Superformula.js`, `Lissajous.js`, etc.
    *   `maurer.js`: Functions to generate the polyline points from a `Curve` instance.
    *   `lcm.js`: Specialized math for LCM, GCD, prime factorization.
    *   `interpolation.js`: Algorithms for morphing sets of points.
*   **`engine/state/`**:
    *   `Store.js`: A simpler Redux-like or Proxy-based state manager. Needs to support dynamic parameter sets based on the active Curve type.
    *   `Actions.js`: Defined actions for modifying state.

### 4.2. Rendering System

*   **`renderer/`**:
    *   `CanvasRenderer.js`: A class that accepts a Canvas context and a State object, then draws the frame.
    *   `layers/`: Sub-modules for drawing specific parts: `RoseLayer.js` (now generic to `CurveLayer.js`?), `CosetsLayer.js`, `UIOverlayLayer.js`.

### 4.3. UI Components (The "Shell")

We will use a lightweight Component pattern to manage DOM sections.

*   **`ui/`**:
    *   **`components/`**:
        *   `Accordion.js`: **[NEW]** A reusable collapsible drawer component for organizing valid groups of controls.
        *   `Panel.js`: Base class.
    *   `RosePanel.js`: A reusable class that manages one "Rose Control Panel". Will use Accordions to hide advanced settings (e.g., "Generative", "Styling", "Cosets").
    *   `InterpolationPanel.js`: Manages the center controls, also organized with Accordions.
    *   `NotificationSystem.js`: For toasts/alerts.

### 4.4. Application Entry

*   **`main.js`**: The bootstrapper. It initializes the Store, instantiates the UI components, creates the Renderer, and starts the Animation Loop.

### 4.5. Performance Strategy **[NEW]**

To guarantee 30fps+ animation and immediate UI feedback:

1.  **Geometric Memoization**: The `Curve` classes and `maurer.js` generators will cache their point data. Recalculation (e.g., `Math.sin/cos` in a loop) only occurs when relevant parameters (n, d, c, A) change.
2.  **Optimized Render Loop**:
    *   Use `requestAnimationFrame` for all drawing.
    *   Decouple "Simulation" (Parameter Morphing) from "Rendering".
3.  **Canvas Layering**: Use separate canvas instances (or offscreen canvases) for different layers if needed (e.g., separating the static grid/rhodonea curve from the animating Maurer points) to minimize clear/redraw cycles.
4.  **Worker Threads (Future)**: Heavy computations (like finding "Matches" or calculating massive LCMs for interpolation) can be moved to a Web Worker to prevent UI thread blocking.

## 5. Directory Structure

```
apps/Maurer_Rose_Interpolator/
├── index.html              # Entry point
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies
├── src/
│   ├── main.js             # Entry logic
│   ├── config/             # Constants and defaults
│   │   └── defaults.js
│   ├── engine/             # Pure Logic
│   │   ├── math/
│   │   │   ├── core.js     # GCD, Primes
│   │   │   ├── geometry.js # Point, Distance
│   │   │   └── maurer.js   # Rose generation
│   │   └── state/
│   │       ├── store.js    # State container
│   │       └── signals.js  # Event bus
│   ├── renderer/           # Canvas Handling
│   │   ├── Renderer.js     # Main render loop
│   │   └── styles/         # Visual styling helpers
│   └── ui/                 # DOM Interaction
│       ├── components/
│       │   ├── Panel.js    # Base class
│       │   ├── RoseSettings.js
│       │   └── InterpControls.js
│       └── utils/
│           └── dom.js      # Helper functions
└── public/                 # Static assets
```

## 6. Migration Strategy

1.  **Setup**: Initialize Vite project in the new directory.
2.  **Extraction (Phase 1)**: Port the math functions from the existing prototype to `src/engine/math`.
3.  **State (Phase 2)**: Design the State schema and Store.
4.  **Renderer (Phase 3)**: Create the `CanvasRenderer` and implement basic drawing.
5.  **UI Wiring (Phase 4)**: Recreate the HTML structure and bind the UI components.
6.  **Feature Parity (Phase 5)**: Re-enable advanced features (Animation, Interpolation, Cosets, Recording).

## 7. Immediate Next Steps

1.  Approve this plan.
2.  Wait for me to initialize the project and begin Phase 1.
