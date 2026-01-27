import { store } from './engine/state/Store.js';
import { ACTIONS } from './engine/state/Actions.js'; // Added import
import { CanvasRenderer } from './engine/renderer/Renderer.js';
import { ChordalRosettePanel } from './ui/components/ChordalRosettePanel.js';
import { InterpolationPanel } from './ui/components/InterpolationPanel.js';
import { createElement } from './ui/utils/dom.js';
import { Recorder } from './engine/recorder/Recorder.js';

// Application Bootstrapper
class App {
    constructor() {
        this.initUI();
        this.initRenderer();
        this.loop();
    }

    initUI() {
        const app = document.getElementById('app');
        app.className = 'flex flex-col h-screen w-screen bg-black text-white';

        // 1. Header Row
        const header = createElement('div', 'h-10 bg-gray-900 border-b border-gray-700 flex items-center px-4 font-bold text-sm text-gray-400', { textContent: 'Maurer Rose Interpolator v17' });
        app.appendChild(header);

        // 2. Main Content Row (Flex Container for Columns)
        const mainContent = createElement('div', 'flex-1 flex flex-col md:flex-row overflow-hidden relative');
        app.appendChild(mainContent);

        // Column 1: Curve A
        this.panelA = new ChordalRosettePanel('rose-a', 'Chordal Rosette A', 'roseA');
        // Override classes to ensure equal width (flex-1)
        this.panelA.element.className = 'flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden border-r border-gray-700';

        // Column 2: Center Area (Interpolation)
        this.centerArea = createElement('div', 'flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden border-r border-gray-700 relative');

        // Center Title (To align with Rose Panels)
        const centerTitle = createElement('h2', 'text-xl font-bold p-4 text-center', { textContent: 'Interpolation' });
        this.centerArea.appendChild(centerTitle);

        // Canvas Layer (Aligned with Preview Canvases)
        this.canvasContainer = createElement('div', 'w-full aspect-square bg-black border-b border-gray-700 relative flex-none');
        this.canvas = createElement('canvas', 'w-full h-full block');
        this.canvas.width = 600; // Init larger
        this.canvas.height = 600;
        this.canvasContainer.appendChild(this.canvas);
        this.centerArea.appendChild(this.canvasContainer);

        // Controls Layer (Scrollable area below canvas)
        const centerControls = createElement('div', 'flex-1 overflow-y-auto p-2 bg-gray-800');
        this.interpPanel = new InterpolationPanel('interp', 'Controls');
        // Reset interp panel styling to fit container
        this.interpPanel.element.className = 'w-full space-y-2';

        centerControls.appendChild(this.interpPanel.element);
        this.centerArea.appendChild(centerControls);

        // Column 3: Curve B
        this.panelB = new ChordalRosettePanel('rose-b', 'Chordal Rosette B', 'roseB');
        this.panelB.element.className = 'flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden';

        // Mount Columns to Main Content
        this.panelA.mount(mainContent);
        mainContent.appendChild(this.centerArea);
        this.panelB.mount(mainContent);

        // 3. Footer Row
        const footer = createElement('div', 'h-6 bg-gray-900 border-t border-gray-700 flex items-center justify-center text-xs text-gray-500', { textContent: 'Ready' });
        app.appendChild(footer);
    }

    initRenderer() {
        // Main Renderer (Interpolation)
        this.mainRenderer = new CanvasRenderer(this.canvas);

        // Preview Renderers (targeting the canvases created inside RosePanels)
        this.previewRendererA = new CanvasRenderer(this.panelA.canvas);
        this.previewRendererB = new CanvasRenderer(this.panelB.canvas);

        // Initial Resize
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        // Recorder
        this.recorder = new Recorder(this.canvas);
    }

    handleResize() {
        // Prevent feedback loop: Reset canvas sizes to 0 to let CSS layout (aspect-square) dictate container size
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.panelA.canvas.width = 0;
        this.panelA.canvas.height = 0;
        this.panelB.canvas.width = 0;
        this.panelB.canvas.height = 0;

        // Main Canvas
        const rect = this.canvasContainer.getBoundingClientRect();
        this.mainRenderer.resize(rect.width, rect.height);

        // Previews
        // Use the container to measure, ensuring we respect the aspect-square from CSS
        const rectA = this.panelA.canvas.parentElement.getBoundingClientRect();
        if (rectA.width > 0) this.previewRendererA.resize(rectA.width, rectA.height);

        const rectB = this.panelB.canvas.parentElement.getBoundingClientRect();
        if (rectB.width > 0) this.previewRendererB.resize(rectB.width, rectB.height);

        // Force render
        this.renderAll(true);
    }

    loop() {
        const state = store.getState();

        if (state.app.isPlaying) {
            // Update weight
            // Simple ping-pong logic
            let speed = 0.01 * state.app.animationSpeed;
            let dir = this.animDir || 1;
            let newWeight = state.interpolation.weight + (speed * dir);

            if (newWeight >= 1) {
                newWeight = 1;
                this.animDir = -1;
            } else if (newWeight <= 0) {
                newWeight = 0;
                this.animDir = 1;
            }
            // Use this.animDir for next frame

            store.dispatch({
                type: ACTIONS.UPDATE_INTERPOLATION,
                payload: { weight: newWeight }
            });
        }

        // Recorder State Monitor
        if (this.recorder) {
            if (state.app.isRecording && !this.recorder.isRecording) {
                const format = this.interpPanel.formatSelect.value;
                this.recorder.start(format);
            }
        }

        this.renderAll();
        requestAnimationFrame(() => this.loop());
    }

    renderAll(force = false) {
        const state = store.getState();

        // Optimization: Only render if playing or dirty, unless forced
        if (!force && !state.app.isPlaying && !store.isDirty) {
            return;
        }

        // Check for recording stop (if state says stop but recorder is running)
        if (this.recorder && !state.app.isRecording && this.recorder.isRecording) {
            this.recorder.stop().then(blob => {
                if (blob) {
                    const format = this.interpPanel.formatSelect.value;
                    const ext = format.includes('mp4') ? 'mp4' : 'webm';
                    const filename = `maurer_rose_${Date.now()}.${ext}`;
                    this.recorder.download(blob, filename);
                }
            });
        }

        // Render Main
        this.mainRenderer.renderInterpolation(state);

        // Render Previews
        // Optimization: Previews only need update if Rose params changed, but for now global dirty is fine.
        this.previewRendererA.renderPreview(state.roseA, 'rgba(255, 100, 100, 0.8)');
        this.previewRendererB.renderPreview(state.roseB, 'rgba(100, 100, 255, 0.8)');

        store.clearDirty();
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
