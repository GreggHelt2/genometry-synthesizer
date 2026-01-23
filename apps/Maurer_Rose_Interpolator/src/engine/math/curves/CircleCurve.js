import { Curve } from './Curve.js';

export class CircleCurve extends Curve {
    /**
     * A simple unit circle (or scaled).
     * @param {number} radius - Radius of the circle.
     */
    constructor(radius = 1) {
        super();
        this.radius = radius;
    }

    getPoint(theta) {
        return {
            x: this.radius * Math.cos(theta),
            y: this.radius * Math.sin(theta)
        };
    }

    /**
     * A circle closes in 2*PI.
     */
    getPeriodToClosure() {
        return 2 * Math.PI;
    }

    getSignature() {
        return `Circle:${this.radius}`;
    }
}
