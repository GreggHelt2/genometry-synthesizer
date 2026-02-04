export class AnimationController {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.isPlaying = false;
        this.startTime = 0;
        this.animationFrame = null;

        // Configuration
        this.min = 0;
        this.max = 1;
        this.period = 10; // Seconds for a full cycle (min -> max -> min)
        this.easingType = 'InOut'; // In, Out, InOut
        this.easingShape = 'Sine'; // Sine, Quad, Cubic, Quart, Quint, Expo, Circ, Back, Elastic, Bounce
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Reset phase to match current value?? 
        // ideally we'd find the time t where the value matches, but simplest is to just start fresh or continue
        // For now, let's just resume/start based on clock

        this.lastFrameTime = performance.now();
        // Maintain a virtual accumulated time so we can pause/resume smoothly
        this.accumulatedTime = this.accumulatedTime || 0;

        const loop = (now) => {
            if (!this.isPlaying) return;

            const dt = (now - this.lastFrameTime) / 1000; // seconds
            this.lastFrameTime = now;
            this.accumulatedTime += dt;

            const val = this.computeValue(this.accumulatedTime);
            this.onUpdate(val);

            this.animationFrame = requestAnimationFrame(loop);
        };

        this.animationFrame = requestAnimationFrame(loop);
    }

    stop() {
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    reset() {
        this.stop();
        this.accumulatedTime = 0;
    }

    setConfig({ min, max, period, type, shape }) {
        if (min !== undefined) this.min = min;
        if (max !== undefined) this.max = max;
        if (period !== undefined) this.period = Math.max(0.1, period); // Prevent divide by zero
        if (type !== undefined) this.easingType = type;
        if (shape !== undefined) this.easingShape = shape;
    }

    getConfig() {
        return {
            min: this.min,
            max: this.max,
            period: this.period,
            type: this.easingType,
            shape: this.easingShape,
            isPlaying: this.isPlaying
        };
    }

    /**
     * computeValue
     * @param {number} totalTime - Total elapsed time in seconds
     * @returns {number} - The animated value
     */
    computeValue(totalTime) {
        // 1. Calculate normalized phase (0..1) within the period
        // Handle negative time correctly: ((a % n) + n) % n
        const t = ((totalTime % this.period) + this.period) % this.period / this.period;

        // 2. Symmetric Logic:
        // The cycle goes Min -> Max -> Min.
        // First half (0 to 0.5): Min -> Max
        // Second half (0.5 to 1): Max -> Min

        let progress; // 0..1 representing position on the ramp Min->Max

        if (t < 0.5) {
            // Rising: normalize 0..0.5 to 0..1
            progress = this.applyEasing(t * 2);
        } else {
            // Falling: normalize 0.5..1 to 1..0 (go backwards)
            progress = this.applyEasing((1 - t) * 2);
        }

        // 3. Map progress (0..1) to value (Min..Max)
        return this.min + (this.max - this.min) * progress;
    }

    /**
     * Get the current phase (0..1) for visualization
     */
    getPhase() {
        if (!this.accumulatedTime) return 0;
        return ((this.accumulatedTime % this.period) + this.period) % this.period / this.period;
    }

    applyEasing(t) {
        const funcName = `ease${this.easingType}${this.easingShape}`;
        const fn = Easings[funcName] || Easings.easeInOutSine;
        return fn(t);
    }
}

// --- Penner Easing Functions ---
// Adapted from standard implementations

const Easings = {
    // Linear (fallback/base)
    easeLinear: t => t,

    // Linear (Alias for Sawtooth behavior)
    easeInLinear: t => t,
    easeOutLinear: t => t,
    easeInOutLinear: t => t,

    // Sine
    easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
    easeOutSine: t => Math.sin((t * Math.PI) / 2),
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

    // Quad
    easeInQuad: t => t * t,
    easeOutQuad: t => 1 - (1 - t) * (1 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

    // Cubic
    easeInCubic: t => t * t * t,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

    // Quart
    easeInQuart: t => t * t * t * t,
    easeOutQuart: t => 1 - Math.pow(1 - t, 4),
    easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,

    // Quint
    easeInQuint: t => t * t * t * t * t,
    easeOutQuint: t => 1 - Math.pow(1 - t, 5),
    easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,

    // Expo
    easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,

    // Circ
    easeInCirc: t => 1 - Math.sqrt(1 - Math.pow(t, 2)),
    easeOutCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
    easeInOutCirc: t => t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

    // Back
    easeInBack: t => { const c1 = 1.70158; const c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
    easeOutBack: t => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    easeInOutBack: t => { const c1 = 1.70158; const c2 = c1 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; },

    // Elastic
    easeInElastic: t => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4); },
    easeOutElastic: t => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
    easeInOutElastic: t => { const c5 = (2 * Math.PI) / 4.5; return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1; },

    // Bounce
    easeInBounce: t => 1 - Easings.easeOutBounce(1 - t),
    easeOutBounce: t => { const n1 = 7.5625; const d1 = 2.75; if (t < 1 / d1) { return n1 * t * t; } else if (t < 2 / d1) { return n1 * (t -= 1.5 / d1) * t + 0.75; } else if (t < 2.5 / d1) { return n1 * (t -= 2.25 / d1) * t + 0.9375; } else { return n1 * (t -= 2.625 / d1) * t + 0.984375; } },
    easeInOutBounce: t => t < 0.5 ? (1 - Easings.easeOutBounce(1 - 2 * t)) / 2 : (1 + Easings.easeOutBounce(2 * t - 1)) / 2,
};
