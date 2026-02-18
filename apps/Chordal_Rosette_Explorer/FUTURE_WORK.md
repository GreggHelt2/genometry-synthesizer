# Chordal Rosette Explorer — Future Work & Deferred Items

## Curve Special Points — Numerical Fallbacks (Deferred)

The self-intersection and boundary-point detection algorithms (based on Erb's spectral 
node methodology) currently provide **analytical** solutions for:
- **Rhodonea** (rose curves)
- **Lissajous** curves
- **Hypotrochoid** curves
- **Epitrochoid** curves

The following curve types lack closed-form self-intersection solutions and require 
**numerical fallback** implementations:

### SuperformulaCurve
- Zero points, double points, and boundary points all need numerical sampling
- The Gielis superformula with rational symmetry parameter `m` *may* admit 
  grid-based solutions similar to Rhodonea (see Erb's framework), but this 
  requires further investigation

### FarrisCurve (3-chain linkage / Mystery Curve)
- Self-intersections depend on all 3 frequency/radius pairs
- Numerical sampling and proximity-based deduplication needed
- If all frequencies are integer, a grid-based approach using LCM of frequencies 
  may work (see Erb's extension to multi-frequency curves)

### Reference
- **Paper**: "Applying Spectral Node Methodologies to Self-Intersecting Planar and 
  Spherical Curves: An Extension of Erb's Rhodonea Framework"
- **Local copy**: `deep_research/Self-Intersection Algorithms for Complex Curves.pdf`
