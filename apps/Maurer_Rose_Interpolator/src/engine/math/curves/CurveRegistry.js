import { RhodoneaCurve } from './RhodoneaCurve.js';
import { CircleCurve } from './CircleCurve.js';
import { EpitrochoidCurve } from './EpitrochoidCurve.js';

export const CurveRegistry = {
    'Rhodonea': RhodoneaCurve,
    'Circle': CircleCurve,
    'Epitrochoid': EpitrochoidCurve
};
