import { store } from './engine/state/Store.js';
import { ACTIONS } from './engine/state/Actions.js';
import { CanvasRenderer } from './engine/renderer/Renderer.js';
import { ChordalRosettePanel } from './ui/components/ChordalRosettePanel.js';
import { InterpolationPanel } from './ui/components/InterpolationPanel.js';
import { createElement } from './ui/utils/dom.js';
import { Recorder } from './engine/recorder/Recorder.js';
import { persistenceManager } from './engine/state/PersistenceManager.js';
import { linkManager } from './engine/logic/LinkManager.js';
import { SnapshotModal } from './ui/components/SnapshotModal.js';
import { SnapshotSidebar } from './ui/components/SnapshotSidebar.js';

// Application Bootstrapper
class App {
    constructor() {
        const savedState = this.initPersistence();
        this.initUI();
        this.initRenderer();

        // Restore UI-specific state (Animations)
        this.setupPersistenceProviders();
        if (savedState && savedState.animations) {
            this.restoreAnimationState(savedState.animations);
        }
        if (savedState && savedState.ui) {
            this.restoreUIState(savedState.ui);
        }

        this.loop();
    }

    initPersistence() {
        // 1. Load saved state
        const saved = persistenceManager.load();

        if (saved) {
            // Hydrate Store
            if (saved.state) {
                store.hydrate(saved.state);
            }
            // Hydrate Links
            if (saved.links) {
                linkManager.restoreLinks(saved.links);
            }
        }

        // 2. Setup Save Triggers
        store.subscribe((state, action) => {
            // Optimization: Skip saving for transient updates (animations, dragging)
            if (action && action.meta && action.meta.transient) {
                return;
            }
            persistenceManager.save();
        });
        linkManager.subscribe(() => persistenceManager.save());

        return saved;
    }

    setupPersistenceProviders() {
        persistenceManager.registerStateProvider('animations', () => {
            return {
                rosetteA: this.panelA ? this.panelA.getAnimationState() : {},
                rosetteB: this.panelB ? this.panelB.getAnimationState() : {},
                interpolation: this.interpPanel ? this.interpPanel.getAnimationState() : {}
            };
        });

        // UI Layout Persistence
        persistenceManager.registerStateProvider('ui', () => {
            return {
                rosetteA: this.panelA ? this.panelA.getUIState() : {},
                rosetteB: this.panelB ? this.panelB.getUIState() : {},
                interpolation: this.interpPanel ? this.interpPanel.getUIState() : {}
            };
        });
    }

    restoreAnimationState(animState) {
        if (animState.rosetteA && this.panelA) {
            this.panelA.restoreAnimationState(animState.rosetteA);
        }
        if (animState.rosetteB && this.panelB) {
            this.panelB.restoreAnimationState(animState.rosetteB);
        }
        if (animState.interpolation && this.interpPanel) {
            this.interpPanel.restoreAnimationState(animState.interpolation);
        }
    }

    restoreUIState(uiState) {
        if (uiState.rosetteA && this.panelA) {
            this.panelA.restoreUIState(uiState.rosetteA);
        }
        if (uiState.rosetteB && this.panelB) {
            this.panelB.restoreUIState(uiState.rosetteB);
        }
        if (uiState.interpolation && this.interpPanel) {
            this.interpPanel.restoreUIState(uiState.interpolation);
        }
    }

    // --- Snapshot Loading Logic ---
    async handleLoadState(payload) {
        console.log('[App] Loading snapshot:', payload.name);

        // 1. Hydrate Store (Sync)
        if (payload.state) {
            store.hydrate(payload.state);
        }

        // 2. Hydrate Links (Sync)
        if (payload.links) {
            linkManager.restoreLinks(payload.links);
        }

        // 3. Restore Late State (Async components)
        // We wait a tick to ensure UI has processed store updates if needed, though usually sync is fine.
        if (payload.animations) {
            this.restoreAnimationState(payload.animations);
        }
        if (payload.ui) {
            this.restoreUIState(payload.ui);
        }

        // 4. Force Persistence to disk so this becomes the new "Current Session"
        persistenceManager.forceSave();
    }

    getCompositeThumbnail() {
        // Create offscreen canvas for composite (3:1 aspect ratio)
        // e.g. 300x100
        const width = 300;
        const height = 100;
        const subWidth = 100;

        const cvs = document.createElement('canvas');
        cvs.width = width;
        cvs.height = height;
        const ctx = cvs.getContext('2d');

        // Fill background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Helper to draw scaled image
        const drawSource = (sourceCanvas, xOffset) => {
            if (sourceCanvas && sourceCanvas.width > 0) {
                // Source might be large (600x600), scale down to 100x100
                ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, xOffset, 0, subWidth, height);
            }
        };

        // 1. Rosette A
        if (this.panelA && this.panelA.canvas) {
            drawSource(this.panelA.canvas, 0);
        }

        // 2. Hybrid (Middle)
        if (this.canvas) {
            drawSource(this.canvas, 100);
        }

        // 3. Rosette B
        if (this.panelB && this.panelB.canvas) {
            drawSource(this.panelB.canvas, 200);
        }

        // Optional: draw thin dividers?
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(100, 0); ctx.lineTo(100, 100);
        ctx.moveTo(200, 0); ctx.lineTo(200, 100);
        ctx.stroke();

        return cvs.toDataURL('image/jpeg', 0.7); // Use JPEG 0.7 for size/quality balance
    }

    initUI() {
        const app = document.getElementById('app');
        app.className = 'flex flex-col h-screen w-screen bg-black text-white';

        // 1. Header Row
        const header = createElement('div', 'h-10 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 font-bold text-sm text-gray-400');

        const titleText = createElement('span', '', { textContent: 'Chordal Rosette Explorer v4.2' });
        header.appendChild(titleText);

        // Snapshot Controls Container
        const snapControls = createElement('div', 'flex gap-2');

        // Save Controls Group
        const saveGroup = createElement('div', 'flex items-center gap-2 bg-gray-800 rounded p-0.5 border border-gray-700');

        // Save Input
        const saveInput = createElement('input', 'bg-transparent border-none text-xs text-white px-2 py-1 w-32 focus:outline-none placeholder-gray-500', {
            type: 'text',
            placeholder: 'Snapshot Name...'
        });

        // Allow Enter key to save
        saveInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });

        // Save Button
        const saveBtn = createElement('button', 'px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors', { textContent: 'Save' });
        saveBtn.onclick = async () => {
            try {
                const name = saveInput.value;
                if (name && name.trim()) {
                    // Capture Thumbnail
                    const thumb = this.getCompositeThumbnail();

                    await persistenceManager.saveSnapshot(name.trim(), thumb);

                    // Refresh Sidebar if open (or just always refresh list)
                    if (this.sidebar) {
                        const list = await persistenceManager.listSnapshots();
                        this.sidebar.updateList(list);
                    }

                    // Visual feedback
                    const originalText = saveBtn.textContent;
                    saveBtn.textContent = 'Saved!';
                    saveBtn.classList.add('text-green-400');
                    setTimeout(() => {
                        saveBtn.textContent = originalText;
                        saveBtn.classList.remove('text-green-400');
                        saveInput.value = ''; // Clear input
                    }, 1500);
                } else {
                    alert('Please enter a snapshot name.');
                }
            } catch (err) {
                console.error('Save failed:', err);
                alert('Error saving snapshot: ' + err.message);
            }
        };

        saveGroup.appendChild(saveInput);
        saveGroup.appendChild(saveBtn);

        // Toggle Sidebar Button
        const sidebarBtn = createElement('button', 'px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-white border border-gray-600 transition-colors flex items-center gap-1', {
            title: 'Toggle Snapshots'
        });
        sidebarBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            <span>Snapshots</span>
        `;
        sidebarBtn.onclick = async () => {
            if (this.sidebar) {
                // Refresh list right before opening
                if (!this.sidebar.isOpen) {
                    const list = await persistenceManager.listSnapshots();
                    this.sidebar.updateList(list);
                }
                this.sidebar.toggle();
            }
        };

        snapControls.appendChild(saveGroup);
        snapControls.appendChild(sidebarBtn);
        header.appendChild(snapControls);

        app.appendChild(header);

        // 2. Main Content Row (Flex Container for Columns)
        const mainContent = createElement('div', 'flex-1 flex flex-row overflow-hidden relative w-full');
        app.appendChild(mainContent);

        // -- Main UI Columns Wrappeer --
        // We wrap the 3 visual columns in a flexible div that will shrink when sidebar opens
        const visualArea = createElement('div', 'flex-1 flex flex-col md:flex-row overflow-hidden relative min-w-0');

        // Column 1: Curve A
        this.panelA = new ChordalRosettePanel('rose-a', 'Chordal Rosette A', 'rosetteA');
        // Override classes to ensure equal width (flex-1)
        this.panelA.element.className = 'flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden border-r border-gray-700';

        // Column 2: Center Area (Interpolation)
        this.centerArea = createElement('div', 'flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden border-r border-gray-700 relative');

        // Center Title (To align with Rose Panels)
        const centerTitle = createElement('h2', 'text-xl font-bold p-4 text-center', { textContent: 'Hybrid' });
        this.centerArea.appendChild(centerTitle);

        // Canvas Layer (Aligned with Preview Canvases)
        this.canvasContainer = createElement('div', 'w-full aspect-square bg-black border-b border-gray-700 relative flex-none');
        this.canvas = createElement('canvas', 'w-full h-full block');
        this.canvas.width = 600; // Init larger
        this.canvas.height = 600;
        this.canvasContainer.appendChild(this.canvas);
        this.centerArea.appendChild(this.canvasContainer);

        // Controls Layer (Scrollable area below canvas)
        const centerControls = createElement('div', 'flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden');

        this.interpPanel = new InterpolationPanel('interp', 'Controls');
        // Give the hybrid panel a reference to the hybrid canvas so its
        // GlobalRenderingModule can report canvas dimensions.
        this.interpPanel.canvas = this.canvas;
        // Fit container, ensure flex growth, constrain overflow to force internal scroll
        this.interpPanel.element.className = 'flex-1 flex flex-col w-full min-h-0 overflow-hidden';

        centerControls.appendChild(this.interpPanel.element);
        this.centerArea.appendChild(centerControls);

        // Column 3: Curve B
        this.panelB = new ChordalRosettePanel('rose-b', 'Chordal Rosette B', 'rosetteB');
        this.panelB.element.className = 'flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden';

        // Mount Columns to Visual Area
        this.panelA.mount(visualArea);
        visualArea.appendChild(this.centerArea);
        this.panelB.mount(visualArea);

        // Append Visual Area to Main Content
        mainContent.appendChild(visualArea);

        // -- Sidebar (Flex Child) --
        this.sidebar = new SnapshotSidebar(mainContent, {
            onLoad: async (name) => {
                try {
                    const payload = await persistenceManager.loadSnapshot(name);
                    this.handleLoadState(payload);
                } catch (e) {
                    console.error(e);
                    alert('Error loading snapshot');
                }
            },
            onDelete: async (name) => {
                await persistenceManager.dbAdapter.deleteByName(name);
                // Refresh list
                const list = await persistenceManager.listSnapshots();
                this.sidebar.updateList(list);
            }
        });

        // 3. Footer Row
        const footer = createElement('div', 'h-6 bg-gray-900 border-t border-gray-700 flex items-center justify-center text-xs text-gray-500', { textContent: 'Ready' });
        app.appendChild(footer);
    }

    initRenderer() {
        // Main Renderer (Interpolation)
        this.hybridRenderer = new CanvasRenderer(this.canvas);

        // Preview Renderers (targeting the canvases created inside RosePanels)
        this.rosetteRendererA = new CanvasRenderer(this.panelA.canvas);
        this.rosetteRendererB = new CanvasRenderer(this.panelB.canvas);

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
        this.hybridRenderer.resize(rect.width, rect.height);

        // Previews
        // Use the container to measure, ensuring we respect the aspect-square from CSS
        const rectA = this.panelA.canvas.parentElement.getBoundingClientRect();
        if (rectA.width > 0) this.rosetteRendererA.resize(rectA.width, rectA.height);

        const rectB = this.panelB.canvas.parentElement.getBoundingClientRect();
        if (rectB.width > 0) this.rosetteRendererB.resize(rectB.width, rectB.height);

        // Force render
        this.renderAll(true);
    }

    loop() {
        const state = store.getState();

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

        // Optimization: Only render if dirty, unless forced
        if (!force && !store.isDirty) {
            return;
        }

        // Check for recording stop (if state says stop but recorder is running)
        if (this.recorder && !state.app.isRecording && this.recorder.isRecording) {
            this.recorder.stop().then(blob => {
                if (blob) {
                    const format = this.interpPanel.formatSelect.value;
                    const ext = format.includes('mp4') ? 'mp4' : 'webm';
                    const filename = `chordal_rosette_${Date.now()}.${ext}`;
                    this.recorder.download(blob, filename);
                }
            });
        }

        // Render Main
        this.hybridRenderer.renderInterpolation(state);

        // Render Previews
        // Optimization: Previews only need update if Rose params changed, but for now global dirty is fine.
        const hl = state.app?.segmentHighlight;
        const linked = hl?.linked;
        this.rosetteRendererA.renderPreview(state.rosetteA, 'rgba(255, 100, 100, 0.8)', (linked || hl?.target === 'rosetteA') ? hl : null);
        this.rosetteRendererB.renderPreview(state.rosetteB, 'rgba(100, 100, 255, 0.8)', (linked || hl?.target === 'rosetteB') ? hl : null);

        store.clearDirty();
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
