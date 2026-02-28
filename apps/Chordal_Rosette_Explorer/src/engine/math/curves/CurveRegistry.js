import { RhodoneaCurve } from './RhodoneaCurve.js';
import { BlendedRhodoneaCurve } from './BlendedRhodoneaCurve.js';
import { CircleCurve } from './CircleCurve.js';
import { EpitrochoidCurve } from './EpitrochoidCurve.js';
import { HypotrochoidCurve } from './HypotrochoidCurve.js';
import { LissajousCurve } from './LissajousCurve.js';
import { SuperformulaCurve } from './SuperformulaCurve.js';
import { FarrisCurve } from './FarrisCurve.js';
import { RegularNGonCurve } from './RegularNGonCurve.js';

export const CurveRegistry = {
    'Rhodonea': RhodoneaCurve,
    'Blended Rhodonea': BlendedRhodoneaCurve,
    'Circle': CircleCurve,
    'Epitrochoid': EpitrochoidCurve,
    'Hypotrochoid': HypotrochoidCurve,
    'Lissajous': LissajousCurve,
    'Superformula': SuperformulaCurve,
    'Farris Mystery': FarrisCurve,
    'Regular N-Sided Polygon': RegularNGonCurve
};
