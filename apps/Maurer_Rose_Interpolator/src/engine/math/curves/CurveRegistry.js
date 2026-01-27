import { RhodoneaCurve } from './RhodoneaCurve.js';
import { CircleCurve } from './CircleCurve.js';
import { EpitrochoidCurve } from './EpitrochoidCurve.js';
import { HypotrochoidCurve } from './HypotrochoidCurve.js';
import { LissajousCurve } from './LissajousCurve.js';
import { SuperformulaCurve } from './SuperformulaCurve.js';
import { FarrisCurve } from './FarrisCurve.js';
import { RegularNGonCurve } from './RegularNGonCurve.js';

export const CurveRegistry = {
    'Rhodonea': RhodoneaCurve,
    'Circle': CircleCurve,
    'Epitrochoid': EpitrochoidCurve,
    'Hypotrochoid': HypotrochoidCurve,
    'Lissajous': LissajousCurve,
    'Superformula': SuperformulaCurve,
    'Farris Mystery': FarrisCurve,
    'Regular N-Sided Polygon': RegularNGonCurve
};
