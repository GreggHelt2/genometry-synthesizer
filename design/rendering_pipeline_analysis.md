# Rendering Pipeline Analysis

## Overview
This document outlines the rendering pipeline for the Maurer Rose Interpolator application. It details the execution order of rendering layers, the mapping between UI controls and the pipeline, and implemented optimizations.

## Rendering Execution Order (`Renderer.js`)
The `renderPreview` (and `renderInterpolation`) methods generally follow this sequence:

1.  **Preparation Phase**
    *   Clear Canvas.
    *   Set Anti-aliasing (`imageSmoothingEnabled`).
    *   **Background Rendering**: Draws solid background fill if `backgroundOpacity > 0`.

2.  **Collection Phase** (Data Generation)
    *   Calculates points for all enabled "renderables" but does *not* draw them yet.
    *   **Base Curve**: Generates smooth curve points.
    *   **Rosette / Underlay / Hybrid**: Generates chordal polyline points based on Sequencer and Maurer Rose logic.
    *   *Note*: This phase also calculates the **Bounding Box** (`MaxExtent`) of all collected geometric points.

3.  **Camera Setup**
    *   Calculates `ActiveScale` based on the Bounding Box and `autoScale` setting.
    *   Resets and applies Context Transform (Centering + Scaling).
    *   Calculates `LineWidthScale`. If `scaleLineWidth` is false, line width is inverted against the scale to remain constant in screen pixels.

4.  **Drawing Phase** (Layered Rendering)
    *   Iterates through collected renderables in order of addition.
    *   **Order**:
        1.  **Base Curve**: Drawn first (behind everything).
        2.  **Chordal Rosette / Hybrid / Underlay**:
            *   **Fill**: Drawn *first*, behind the strokes.
                *   *Logic*: Checks `showFill` and opacity.
                *   *Optimization*: If valid, calculates Gradient (Radial or Linear) and performs `context.fill()`.
            *   **Stroke** (The Lines): Drawn *on top* of the fill.
    *   **Vertices**: Drawn last (on top of everything).

## Top-Down Rendering Order
Effectively, the visual stacking order (bottom to top) is:
1.  Background Color
2.  Base Curve
3.  Fill (Gradient/Solid)
4.  Chordal Lines (Gradient/Solid)
5.  Vertices

## UI vs. Pipeline Mapping

### Chordal Rosette View (`AppearanceSection.js`)
The UI modules are presented in this order (top to bottom):
1.  **Chordal Line Viz**: Controls the main `Rosette` stroke.
2.  **Vertex Rendering**: Controls the overlay `Vertices`.
3.  **Base Curve Rendering**: Controls the background `Base Curve`.
4.  **Fill Rendering**: Controls the background `Fill`.
5.  **General Rendering Settings**: Global background and scaling options.

*   *Note*: The UI order does not strictly reflect rendering order (e.g., Vertex is arguably "top" layer, but Base Curve UI is in the middle). This is organized by feature importance.

### Hybrid View (`HybridAppearanceSection.js`)
The UI is organized hierarchically:
1.  **Hybridization Visualization**: The main interpolated result (Stroke).
2.  **Interpolation Details**: Technical settings (Resampling).
3.  **Base Chordal Rendering**: Controls for "Source A" and "Source B" underlays.
    *   These are rendered as `type: 'underlay'` in the pipeline, typically behind the main hybrid curve if added first (though current collection logic adds Base Curve -> Underlay -> Hybrid, so Underlays are behind Hybrid).
    *   *Correction*: In `renderInterpolation`, `collectBaseCurve` runs first, then `collectUnderlay`, then `collectHybrid`. So Underlays are *behind* the Hybrid curve. Use `underlayOpacity` to blend.
4.  **Base Curve Rendering**: Controls for "Source A Curve" and "Source B Curve".
5.  **Fill Rendering**: Hybrid Fill.
6.  **Vertex Rendering**: Hybrid Vertices.
7.  **General**: Backgrounds.

## Optimizations

### 1. Batch vs. Segmented Rendering
The `PolylineLayer` and `Renderer` implement a crucial optimization branch:

*   **Fast Path (Batch)**:
    *   **Condition**: `Opacity === 1` AND `BlendMode === 'source-over'` AND `ColorMethod === 'solid'`.
    *   **Implementation**: `PolylineLayer.draw` creates a single `Path2D` (or series of `moveTo/lineTo`) and calls `ctx.stroke()` **once**.
    *   **Benefit**: Extremely fast for thousands of lines.
    *   **Limitation**: Self-intersecting lines do not "stack" opacity. The entire path is drawn at once.

*   **Accurate Path (Segmented)**:
    *   **Condition**: `Opacity < 1` OR `BlendMode !== 'source-over'` OR `ColorMethod !== 'solid'` (Gradient).
    *   **Implementation**: `PolylineLayer.drawColoredSegments` iterates through *each segment*.
    *   **Benefit**:
        *   Allows per-segment coloring (Gradients).
        *   Allows "Self-Blending": If opacity is 0.5, crossing lines will appearing darker (0.75) where they overlap.
    *   **Cost**: Significantly more draw calls.

### 2. Approximate Resampling (Hybrid)
*   **Problem**: Hybrid interpolation requires matching point counts. If Rosette A has 5 segments and Rosette B has 7, the LCM is 35. If coprime counts are large (e.g., 360 vs 361), LCM can be massive (>100k), crashing the browser.
*   **Optimization**: `approxResampleThreshold` (Default 20k).
*   **Logic**: If the target LCM segment count exceeds this threshold, the system switches to **Approximate Resampling**:
    *   It resamples both curves to a fixed reasonable number (e.g., 20k) regardless of exact integer math.
    *   This prevents UI freezes while maintaining visually accurate morphing.

### 3. Visibility Checks
*   The renderer eagerly checks flags like `showBaseCurve`, `showFill`, `showVertices`. If false, those logic branches are completely skipped, saving all collection and drawing costs.
