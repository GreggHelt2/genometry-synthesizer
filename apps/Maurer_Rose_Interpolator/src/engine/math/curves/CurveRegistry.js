import { RhodoneaCurve } from './RhodoneaCurve.js';
import { CircleCurve } from './CircleCurve.js';
import { EpitrochoidCurve } from './EpitrochoidCurve.js';
import { HypotrochoidCurve } from './HypotrochoidCurve.js';
import { LissajousCurve } from './LissajousCurve.js';

export const CurveRegistry = {
    'Rhodonea': RhodoneaCurve,
    'Circle': CircleCurve,
    'Epitrochoid': EpitrochoidCurve,
    'Hypotrochoid': HypotrochoidCurve,
    'Lissajous': LissajousCurve
};
