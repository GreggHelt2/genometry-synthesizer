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
            this.rot = ((radius.rot || 0) * Math.PI) / 180;
        } else {
            this.radius = radius;
            this.rot = 0;
        }
    }

    getPoint(theta) {
        const totalAngle = theta + this.rot;
        return {
            x: this.radius * Math.cos(totalAngle),
            y: this.radius * Math.sin(totalAngle)
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
            { key: 'radius', type: 'number', label: 'Radius', min: 10, max: 300, step: 1, default: 100 },
            { key: 'rot', type: 'slider', label: 'Rotation (deg)', min: 0, max: 360, step: 1, default: 0 }
        ];
    }

    getSignature() {
        return `Circle:${this.radius}`;
    }
}
