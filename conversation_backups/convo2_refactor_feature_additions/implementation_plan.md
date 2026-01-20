# Implementation Plan - Blend Modes

## Goal
Implement "Blend Modes" for Rose A, Rose B, and Interpolation canvases, replicating the functionality from the v16.1 prototype. This allows users to control how drawing operations blend with the existing canvas content (e.g., additive blending with 'lighter').

## Proposed Changes

### Configuration
*   [ ] `defaults.js`: Add `blendMode: 'source-over'` to `roseA`, `roseB`, and `interpolation`.

### UI Components
*   **`RosePanel.js`**:
    *   Add "Blend Mode" dropdown to the visual settings section (near Opacity/Color).
    *   Populate with standard Canvas blend modes (source-over, lighter, multiply, screen, overlay, etc.).
    *   Dispatch `UPDATE_ROSE_A` / `UPDATE_ROSE_B`.
*   **`InterpolationPanel.js`**:
    *   Add "Blend Mode" dropdown.
    *   Dispatch `UPDATE_INTERPOLATION`.

### Rendering Logic (`Renderer.js`)
*   **`renderPreview`**:
    *   Set `this.ctxA.globalCompositeOperation = paramsA.blendMode` before drawing.
    *   Reset to `source-over` after.
    *   Same for `this.ctxB`.
*   **`renderInterpolation`**:
    *   Set `this.ctx.globalCompositeOperation = state.interpolation.blendMode`.
    *   Reset to `source-over` after.

### Verification
*   **Visual Test**: Set Rose A Opacity to 0.5, Color Red. Set Blend Mode to 'Lighter' (Additive). Overlapping lines should become bright red/magenta/white.
*   **Interpolation Test**: ensure blend mode affects the interpolated rose against the background (or trails if enabled later).
