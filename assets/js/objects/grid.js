/**
 * Grid & Snap-to-Grid System
 */

const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    enabled: true,
    snapEnabled: true,
    showLines: true, // Show grid lines (true) or only intersections (false)
    gridSize: 16, // Grid cell size in pixels
    gridCanvas: null,
    sceneEditorElement: null,

    /**
     * Initialize grid system
     */
    init(sceneEditorElement) {
        if (!sceneEditorElement) {
            console.error('[GRID] Scene editor element not provided');
            return;
        }

        this.sceneEditorElement = sceneEditorElement;
        this.createGridCanvas();

    },

    /**
     * Create canvas element for grid visualization
     */
    createGridCanvas() {
        // Remove existing grid canvas if any
        const existing = document.getElementById('gridCanvas');
        if (existing) {
            existing.remove();
        }

        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.id = 'gridCanvas';
        this.gridCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 10000;
            display: block;
            image-rendering: pixelated;
        `;

        // Insert into zoom wrapper so it scales with the content
        const zoomWrapper = document.getElementById('scnZoomWrapper');
        if (zoomWrapper) {
            zoomWrapper.insertBefore(this.gridCanvas, zoomWrapper.firstChild);
        } else {
            console.error('[GRID] Zoom wrapper not found!');
        }
    },

    /**
     * Toggle grid visibility
     */
    toggle() {
        this.enabled = !this.enabled;

        if (this.enabled) {
            this.show();
            notifications.success('Grid enabled');
        } else {
            this.hide();
            notifications.success('Grid disabled');
        }

    },

    /**
     * Show grid
     */
    show() {
        this.enabled = true;

        if (!this.gridCanvas) {
            console.warn('[GRID] Canvas not initialized, creating now...');
            this.createGridCanvas();
        }

        this.drawGrid();
        this.gridCanvas.style.display = 'block';

    },

    /**
     * Hide grid
     */
    hide() {
        this.enabled = false;
        if (this.gridCanvas) {
            this.gridCanvas.style.display = 'none';
        }
    },

    /**
     * Toggle snap to grid
     */
    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;

        if (this.snapEnabled) {
            notifications.success('Snap to grid enabled');
        } else {
            notifications.success('Snap to grid disabled');
        }

    },

    /**
     * Toggle between showing grid lines or only intersections
     */
    toggleShowLines() {
        this.showLines = !this.showLines;

        if (this.showLines) {
            notifications.success('Grid lines mode');
        } else {
            notifications.success('Grid intersections mode');
        }

        // Redraw grid with new mode
        if (this.enabled) {
            this.drawGrid();
        }

    },

    /**
     * Set grid size
     */
    setGridSize(size) {
        if (size < 5 || size > 100) {
            notifications.warning('Grid size must be between 5 and 100');
            return;
        }

        this.gridSize = size;

        if (this.enabled) {
            this.drawGrid();
        }

    },

    /**
     * Draw grid on canvas
     */
    drawGrid() {
        // Recreate canvas if it doesn't exist or is not in the DOM
        if (!this.gridCanvas || !this.gridCanvas.parentElement) {
            this.createGridCanvas();
        }

        if (!this.gridCanvas) {
            console.error('[GRID] Failed to create canvas');
            return;
        }

        // Get sceneBox to align grid with scene origin
        const sceneBox = document.getElementById('scnSceneBox');
        if (!sceneBox) {
            console.warn('[GRID] Cannot draw grid - sceneBox not found');
            return;
        }

        // Get virtualBox to cover entire sceneEditor viewport
        const virtualBox = document.getElementById('scnVirtualBox');
        if (!virtualBox) {
            console.warn('[GRID] Cannot draw grid - virtualBox not found');
            return;
        }

        // Get scene position for alignment
        const sceneLeft = parseInt(sceneBox.style.left) || 0;
        const sceneTop = parseInt(sceneBox.style.top) || 0;

        // Get virtualBox dimensions to cover entire viewport
        const viewportWidth = parseInt(virtualBox.style.width) || virtualBox.clientWidth || 1920;
        const viewportHeight = parseInt(virtualBox.style.height) || virtualBox.clientHeight || 1080;


        // Set canvas size to cover entire viewport
        this.gridCanvas.width = viewportWidth;
        this.gridCanvas.height = viewportHeight;
        this.gridCanvas.style.width = viewportWidth + 'px';
        this.gridCanvas.style.height = viewportHeight + 'px';

        // Position canvas at top-left of virtualBox
        this.gridCanvas.style.left = '0px';
        this.gridCanvas.style.top = '0px';

        const ctx = this.gridCanvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, viewportWidth, viewportHeight);

        if (this.showLines) {
            // Draw grid lines mode

            // Draw regular grid lines in RED
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;

            // Calculate grid starting points aligned with scene origin
            // We want the grid to pass through sceneLeft, sceneTop at (0,0) of the scene
            const startX = sceneLeft % this.gridSize;
            const startY = sceneTop % this.gridSize;

            // Vertical lines
            for (let x = startX; x <= viewportWidth; x += this.gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, viewportHeight);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = startY; y <= viewportHeight; y += this.gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(viewportWidth, y);
                ctx.stroke();
            }

            // Draw thicker lines every 10 cells in RED
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.35)';
            ctx.lineWidth = 2;

            // Calculate thick line starting points
            const thickStartX = sceneLeft % (this.gridSize * 10);
            const thickStartY = sceneTop % (this.gridSize * 10);

            // Vertical thick lines
            for (let x = thickStartX; x <= viewportWidth; x += this.gridSize * 10) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, viewportHeight);
                ctx.stroke();
            }

            // Horizontal thick lines
            for (let y = thickStartY; y <= viewportHeight; y += this.gridSize * 10) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(viewportWidth, y);
                ctx.stroke();
            }
        } else {
            // Draw intersections only mode
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';

            // Calculate grid starting points aligned with scene origin
            const startX = sceneLeft % this.gridSize;
            const startY = sceneTop % this.gridSize;

            // Draw intersection points
            for (let x = startX; x <= viewportWidth; x += this.gridSize) {
                for (let y = startY; y <= viewportHeight; y += this.gridSize) {
                    // Draw small circle at each intersection
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw larger points at major intersections (every 10 cells)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.45)';

            const thickStartX = sceneLeft % (this.gridSize * 10);
            const thickStartY = sceneTop % (this.gridSize * 10);

            for (let x = thickStartX; x <= viewportWidth; x += this.gridSize * 10) {
                for (let y = thickStartY; y <= viewportHeight; y += this.gridSize * 10) {
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

    },

    /**
     * Snap a value to the grid
     */
    snap(value) {
        if (!this.snapEnabled) {
            return value;
        }

        return Math.round(value / this.gridSize) * this.gridSize;
    },

    /**
     * Snap a point (x, y) to the grid
     */
    snapPoint(x, y) {
        return {
            x: this.snap(x),
            y: this.snap(y)
        };
    },

    /**
     * Get grid settings
     */
    getSettings() {
        return {
            enabled: this.enabled,
            snapEnabled: this.snapEnabled,
            showLines: this.showLines,
            gridSize: this.gridSize
        };
    },

    /**
     * Apply settings
     */
    applySettings(settings) {
        if (settings.gridSize !== undefined) {
            this.setGridSize(settings.gridSize);
        }

        if (settings.snapEnabled !== undefined) {
            this.snapEnabled = settings.snapEnabled;
        }

        if (settings.showLines !== undefined) {
            this.showLines = settings.showLines;
        }

        if (settings.enabled !== undefined) {
            if (settings.enabled) {
                this.show();
            } else {
                this.hide();
            }
        }
    }
};
