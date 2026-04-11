# Chordal Rosette Explorer

A real-time, interactive tool for visualizing, animating, and exploring **Chordal Rosettes** — mathematical polylines formed by connecting sequences of points on parametric curves with straight-line chords. The application extends the classical **Maurer Rose** construction (1987) into a general-purpose geometric synthesizer, supporting morphing between two independent structures, group-theoretic decomposition, and a rich multi-layer rendering pipeline.

**[▶ Try the live demo](https://gregghelt2.github.io/genometry-synthesizer)**

---

## What Is a Chordal Rosette?

Take a parametric curve (such as a rose, a Lissajous figure, or a trochoid), and a sequence determined by a sequence generator. Then map the sequence to points on the curve, and connect succesive points in the mapped sequence with chords. The resulting polyline is a **chordal rosette**. By varying the base curve, the sequence generator, and the sequence to curve mapping, different geometric patterns emerge.

The explorer generalizes this construction along three axes:

| Axis | Classical (Maurer Rose) | Chordal Rosette Explorer |
|------|------------------------|--------------------------|
| **Base Curve** | Rose curve only | 11 parametric curve families |
| **Sequencing** | Additive step mod *N* | 5 pluggable sequencer generators |
| **Visualization** | Single static image | Dual-rosette morphing, multi-layer rendering, animation |

### Theoretical Roots

The mathematical lineage runs from Peter Maurer's original 1987 paper through Gregg Helt's 2016 **P-Curves** generalization, which introduced arbitrary base curves. The explorer is a modern implementation of these ideas, enriched with group theory (coset decomposition), number theory (period detection, primitive roots), and real-time, chordal endpoint interpolation (hybrid chordal rosettes)

---

## Key Features

### Polymorphic Curve Engine

The application supports **many base curve types**, each with its own parameter schema that dynamically generates UI controls:

| Curve Type | Description |
|------------|-------------|
| **Rhodonea** | Classical rose curves r = sin(kθ) with amplitude and petal controls |
| **Blended Rhodonea** | Weighted interpolation between two independent Rhodonea parameter sets |
| **Circle** | Unit circle — the simplest base for pure sequencer exploration |
| **Hypotrochoid** | Curves traced by a point on a circle rolling inside a larger circle |
| **Epitrochoid** | Curves traced by a point on a circle rolling outside another circle |
| **Lissajous** | Parametric curves defined by orthogonal sinusoidal frequencies |
| **Superformula** | Gielis superformula — a generalization of superellipses to polar coordinates |
| **Farris Mystery Curve** | Three-frequency complex exponential linkage curves |
| **Regular N-Sided Polygon** | Equilateral polygons used as discrete base curves |
| **Pausinger Binomial** | Curves based on weighted complex binomials |
| **Complex Polynomial Mandala** | Curves from complex polynomial evaluation (Poelke et al. 2014) |

### Pluggable Chordal Sequencers

Sequencers determine *which* vertices on the base curve are connected by chords. Five generators are available, each producing fundamentally different topologies:

- **Cyclic Additive Group Modulo N** — The classic sᵢ₊₁ = sᵢ + d (mod N)
- **Multiplicative Group Modulo N** — Power-based residue sequences exploring cyclic subgroups and primitive roots
- **Alternating Increment Sequencer** — Two alternating step sizes (a, b) producing bipartite patterns
- **3-Cycle Increment Sequencer** — Three-phase repeating step pattern
- **4-Cycle Increment Sequencer** — Four-phase repeating step pattern

### Dual-Rosette Morphing (Hybridization)

The central feature is the ability to configure two independent rosettes (**Rosette A** and **Rosette B**) and smoothly morph between them in real time. Hybridization operates on the **chordal rosettes themselves** — it interpolates between matched vertex pairs across the two rosettes, not between the underlying base curves. Each vertex position in the hybrid result is a weighted average of the corresponding vertices from Rosette A and Rosette B:

```
V_hybrid[i] = (1 − w) · V_A[i] + w · V_B[i]
```

Because the two rosettes may have different vertex counts, the engine uses **LCM-based resampling** to upsample both polylines to a common segment count before interpolation, guaranteeing topological closure throughout the morph:

- **LCM Vertex Matching** — Both rosettes are upsampled to their Least Common Multiple segment count, ensuring every vertex in one rosette has a geometric partner in the other. The upsampled vertices lie exactly on the original chordal line segments, preserving geometric fidelity
- **Ring Matching** — When rosettes have different coset counts, topological LCM mapping duplicates rings from the lower-cardinality set to match the higher one, preserving the full group structure throughout the animation
- **Approximate Resampling** — Automatic performance fallback when exact LCM would exceed a user-configurable threshold (default 20,000 segments), switching to linear interpolation across polyline indices
- **Blended Visualization** — A secondary, alternative mode that blends the *base curves themselves* (point-by-point weighted averages at shared parameter values) rather than the chordal endpoints, producing a single geometric composite from which new chords are derived. This yields different visual results when the rosettes have different closure ranges or sequencing rules

### Group-Theoretic Exploration

When gcd(d, N) > 1, the chordal sequence decomposes into disjoint cosets (rings):

- **Coset Navigation** — Sequential, Distributed, or Two-Way strategies for selecting which cosets to display
- **Show All Cosets** — Renders the complete group structure simultaneously
- **Relatives Navigation** — Discovers mathematically significant neighbors: primes, twin primes, cousin primes, and LTC matches (generators sharing the same vertex count)

### Advanced Rendering Pipeline

A two-pass **Collection → Camera → Draw** architecture supporting:

- **Multi-Layer Composition** — Independent rendering controls (color, opacity, blend mode, line width, anti-aliasing) for chordal lines, base curves, vertices, fills, and hybrid underlays
- **Property-Mapped Gradients** — Chord color driven by segment length, drawing sequence, or radial angle, with 2-point linear, cyclic, and custom multi-stop gradient interpolation modes
- **Chordal Fill** — Interior area rendering using the even-odd winding rule to preserve the lacy, self-intersecting structure
- **Vertex Index Labeling** — Sequential 0-based labels with configurable font sizes and dark text outlines for readability
- **Auto-Scale with Centered Origin** — Dynamic camera fitting that keeps geometric (0, 0) at the canvas center while uniformly scaling the rosette, with a user-settable ratio from 0.5× to 1.5×
- **Scale Line Width** — Compensation to maintain constant visual stroke thickness regardless of zoom level
- **High-DPI (Retina)** — Automatic device pixel ratio scaling

### Per-Parameter Animation System

Every numeric parameter has an independent **LFO (Low Frequency Oscillator)** with:

- Configurable waveform shapes (Sine, Triangle, Linear, and easing-based curves including Back, Elastic, Bounce)
- Symmetric Min → Max → Min cycle logic
- Independent period, range, and phase controls
- Real-time waveform preview canvas with a moving phase indicator
- Adaptive range expansion (or strict hard limits for normalized parameters like morph weight)

### Bidirectional Parameter Linking

The **LinkManager** enables mirror-linking between Rosette A and Rosette B parameters (and sometimes three-way linking with Hybrid parameters). Changing a linked parameter on one side instantly propagates to the other, with a value-based echo guard to prevent infinite recursion. Links are visualized with green highlighting and persist across sessions.

### Chord Selection & Analysis

- **Interactive Histogram** — Visual distribution of chord lengths with click, Ctrl+Click (multiselect), and Shift+Click (range) selection
- **Canvas Hit Detection** — Direct chord selection by clicking on the rendered rosette, using inverse camera transforms for coordinate accuracy
- **Grow / Shrink** — Chain operations that expand or contract the selection along the polyline
- **Custom Selection Color** — Real-time color picker for highlight preferences, persisted in state

### Multi-Tier Persistence

- **Tier 1 — Active Session (localStorage)** — Synchronous, debounced auto-save of the complete parameter state, link configuration, animation settings, and UI layout (accordion fold states). Hydrates instantly on page load with zero flicker
- **Tier 2 — Snapshot Library (IndexedDB)** — Unlimited named snapshots with searchable metadata. Features a visual sidebar with 3:1 composite filmstrip thumbnails, hybrid search (glob wildcards, regex, deep property matching via `key=value`), keyboard navigation, and search density badges
- **Import / Export** — Bulk snapshot export to JSON and import with conflict detection

### Recording & Export

- **Canvas Image Export** — One-click PNG capture with context-aware filenames (`{snapshot}_{panel}_{timestamp}.png`)
- **Video Recording** — WebM and MP4 (H.264) recording of animations via the MediaRecorder API

### Custom Color System

A fully dependency-free color infrastructure:

- **SimpleColorPicker** — HSV + Alpha picker with both popup and permanent inline modes
- **ParamGradient** — Native multi-stop gradient editor with persistent delete buttons, pointer-based feedback, and hex-only state purity
- **Per-Stop Alpha** — Interpolated opacity along gradient stops, composed with global layer opacity

---

## Architecture

The application follows a **Component-Orchestrator** architecture with a Redux-like singleton store:

```
src/
├── config/         # defaults.js — initial state and constants
├── engine/
│   ├── logic/      # LinkManager — bidirectional parameter sync
│   ├── math/
│   │   ├── curves/       # 11 curve implementations + CurveRegistry
│   │   └── sequencers/   # 5 sequencer generators + SequencerRegistry
│   ├── recorder/   # Video capture and export
│   ├── renderer/   # Two-pass canvas renderer + PolylineLayer
│   └── state/      # Store, Actions, stateAdapters
├── ui/
│   ├── components/
│   │   ├── chordal_rosette/  # Modular sections (Core, Sequencer, Appearance, Stats, Coset)
│   │   ├── hybrid/           # Modular sections (Animation, Appearance, Coset)
│   │   └── modules/          # Shared LayerRenderingModule, GlobalRenderingModule
│   └── utils/      # DOM helpers, canvas utilities
└── main.js         # App entry point and top-level orchestrator
```

**Key patterns:**
- **Central Registration** — Modular sub-sections register their accordions and parameters with the parent orchestrator, maintaining a single point of contact for persistence and linking
- **Schema-Driven UI** — Curve and sequencer registries define their own parameter schemas; the UI generates controls dynamically
- **Sidecar Persistence** — A non-invasive adapter (`PersistenceManager`) handles serialization without modifying the core state shape
- **Transient Action Filtering** — High-frequency updates (animation frames, slider dragging) are tagged as transient and skip persistence scheduling, preserving 60fps rendering performance

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

### Installation & Development

```bash
cd apps/Chordal_Rosette_Explorer
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

### Tech Stack

- **Build Tool**: [Vite](https://vitejs.dev/) 5.x
- **Language**: Vanilla JavaScript (ES Modules)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 3.x
- **Dependencies**: Zero runtime dependencies — all UI components, color pickers, gradient editors, and IndexedDB adapters are custom implementations

---

## Project Structure

This repository uses a monorepo-style layout:

```
genometry-synthesizer/
├── apps/
│   └── Chordal_Rosette_Explorer/   # Main application
├── deep_research/                   # Research papers and analysis
├── design/                          # UI architecture exports (PDF)
├── experiments/                     # Exploratory prototypes
├── papers/                          # Reference literature
└── prototypes/                      # Legacy versions
```

---

## Mathematical Background

### Maurer Roses → P-Curves → Chordal Rosettes

1. **Maurer Roses (Peter Maurer, 1987)**: Introduced discrete polylines on rose curves r = sin(kθ), where vertices at multiples of d° are connected sequentially. The interplay of k and d produces intricate patterns whose structure is governed by modular arithmetic.

2. **P-Curves (Helt, 2016)**: Generalized the construction to arbitrary parametric base curves and introduced the **Lines To Close** metric: LTC = N / gcd(d, N), quantifying how many chords are needed before the polyline closes.

3. **Chordal Rosettes and Hybridized Chordal Roseettes**: See accompanying paper

### Group Decomposition

When gcd(d, N) > 1, the additive generator s → s + d (mod N) cannot reach all N vertices from a single starting point. The vertices decompose into gcd(d, N) disjoint **cosets** — independent rings that together tile the full curve. The explorer visualizes this decomposition and allows navigation through individual cosets or combinations.

---

## License

This project is licensed under the [Apache License 2.0](LICENSE).
