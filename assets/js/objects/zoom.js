/**
 * Zoom System for Scene Editor
 */

const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    currentZoom: 100, // Current zoom level in percentage
    minZoom: 10,
    maxZoom: 400,
    zoomStep: 50, // Zoom increment/decrement step
    sceneEditorElement: null,
    virtualBoxElement: null,

    /**
     * Initialize zoom system
     */
    init(sceneEditorElement) {
        if (!sceneEditorElement) {
            console.error('[ZOOM] Scene editor element not provided');
            return;
        }

        this.sceneEditorElement = sceneEditorElement;

    },

    /**
     * Set zoom level
     * @param {number} zoomLevel - Zoom level in percentage (10-400)
     */
    setZoom(zoomLevel) {
        // Clamp zoom level
        zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));

        const oldZoom = this.currentZoom;

        // If zoom didn't change, return early
        if (oldZoom === zoomLevel) {
            return this.currentZoom;
        }

        // Get scene editor element for scroll adjustment
        const sceneEditor = this.sceneEditorElement || document.getElementById('scnEditor');

        // Save current scroll position and viewport center BEFORE zoom
        let scrollLeft = 0, scrollTop = 0, viewportWidth = 0, viewportHeight = 0;
        let centerX = 0, centerY = 0;

        if (sceneEditor) {
            scrollLeft = sceneEditor.scrollLeft;
            scrollTop = sceneEditor.scrollTop;
            viewportWidth = sceneEditor.clientWidth;
            viewportHeight = sceneEditor.clientHeight;

            // Calculate the center point of the current viewport
            centerX = scrollLeft + viewportWidth / 2;
            centerY = scrollTop + viewportHeight / 2;

        }

        this.currentZoom = zoomLevel;

        // Get zoom wrapper element (refresh it each time in case DOM changed)
        const zoomWrapper = document.getElementById('scnZoomWrapper');

        // Apply zoom to the wrapper (which contains everything: virtualBox, sceneBox, objects, etc.)
        if (zoomWrapper) {
            const scale = zoomLevel / 100;

            // Apply transform to zoom wrapper
            zoomWrapper.style.transform = `scale(${scale})`;
            zoomWrapper.style.transformOrigin = '0 0';

        } else {
            console.warn('[ZOOM] ⚠ Zoom wrapper element not found!');
        }

        // Adjust scroll to maintain the same visual center point after zoom
        if (sceneEditor && oldZoom !== zoomLevel) {
            // Calculate the zoom ratio
            const zoomRatio = zoomLevel / oldZoom;

            // Calculate new center position (the content point that was at center is now at a different pixel position)
            const newCenterX = centerX * zoomRatio;
            const newCenterY = centerY * zoomRatio;

            // Calculate new scroll position to keep the same center point visible
            const newScrollLeft = newCenterX - viewportWidth / 2;
            const newScrollTop = newCenterY - viewportHeight / 2;

            // Apply new scroll position
            sceneEditor.scrollLeft = newScrollLeft;
            sceneEditor.scrollTop = newScrollTop;

        }

        // Grid is now inside zoom wrapper, so it scales automatically with the content
        // No need to redraw it on zoom change

        // Update status bar
        const footer = nw.require('./assets/js/objects/footer');
        if (footer && footer.updateSceneEditorStatus) {
            footer.updateSceneEditorStatus({
                zoom: this.currentZoom
            });
        }

        // Show notification if zoom changed
        if (oldZoom !== zoomLevel) {
            notifications.success(`Zoom: ${zoomLevel}%`);
        }

        return this.currentZoom;
    },

    /**
     * Zoom in
     */
    zoomIn() {
        return this.setZoom(this.currentZoom + this.zoomStep);
    },

    /**
     * Zoom out
     */
    zoomOut() {
        return this.setZoom(this.currentZoom - this.zoomStep);
    },

    /**
     * Reset zoom to 100%
     */
    resetZoom() {
        return this.setZoom(100);
    },

    /**
     * Zoom to fit the scene in the viewport
     */
    zoomToFit() {
        if (!this.sceneEditorElement) {
            console.warn('[ZOOM] Cannot zoom to fit - scene editor not found');
            return this.currentZoom;
        }

        const sceneBox = document.getElementById('scnSceneBox');
        if (!sceneBox) {
            console.warn('[ZOOM] Cannot zoom to fit - sceneBox not found');
            return this.currentZoom;
        }

        const sceneWidth = parseInt(sceneBox.style.width) || 640;
        const sceneHeight = parseInt(sceneBox.style.height) || 480;
        const viewportWidth = this.sceneEditorElement.clientWidth;
        const viewportHeight = this.sceneEditorElement.clientHeight;

        // Calculate zoom to fit with some padding (90% of viewport)
        const zoomX = (viewportWidth * 0.9) / sceneWidth * 100;
        const zoomY = (viewportHeight * 0.9) / sceneHeight * 100;
        const zoomLevel = Math.floor(Math.min(zoomX, zoomY));

        return this.setZoom(zoomLevel);
    },

    /**
     * Get current zoom level
     */
    getZoom() {
        return this.currentZoom;
    },

    /**
     * Get zoom settings
     */
    getSettings() {
        return {
            currentZoom: this.currentZoom,
            minZoom: this.minZoom,
            maxZoom: this.maxZoom,
            zoomStep: this.zoomStep
        };
    },

    /**
     * Apply settings
     */
    applySettings(settings) {
        if (settings.currentZoom !== undefined) {
            this.setZoom(settings.currentZoom);
        }
        if (settings.minZoom !== undefined) {
            this.minZoom = settings.minZoom;
        }
        if (settings.maxZoom !== undefined) {
            this.maxZoom = settings.maxZoom;
        }
        if (settings.zoomStep !== undefined) {
            this.zoomStep = settings.zoomStep;
        }
    }
};
