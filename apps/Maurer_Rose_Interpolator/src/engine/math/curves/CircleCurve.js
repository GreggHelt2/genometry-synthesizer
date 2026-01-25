import { Curve } from './Curve.js';

export class CircleCurve extends Curve {
    /**
     * A simple unit circle (or scaled).
     * @param {number} radius - Radius of the circle.
     */
    constructor(radius = 100) {
        super();
        // Handle if initialized with object (from Renderer) or direct value
        if (typeof radius === 'object') {
            this.radius = radius.radius || 100;
        } else {
            this.radius = radius;
        }
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
    getRadiansToClosure() {
        return 2 * Math.PI;
    }

    static getParamsSchema() {
        return [
            { key: 'radius', type: 'number', label: 'Radius', min: 10, max: 300, step: 1, default: 100 }
        ];
    }

    getSignature() {
        return `Circle:${this.radius}`;
    }
}
