/**
 * Rectangle Selection - Allows selecting multiple objects by dragging a selection rectangle
 */

module.exports = {
    isActive: false,
    hadDrag: false,  // Flag to track if user dragged (not just clicked)
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    selectionBox: null,
    sceneEditorElement: null,

    /**
     * Initialize rectangle selection
     */
    init(sceneEditorElement) {
        if (!sceneEditorElement) {
            console.error('[RECT_SELECT] Scene editor element not provided');
            return;
        }

        this.sceneEditorElement = sceneEditorElement;

        // Create selection box element
        this.createSelectionBox();

        // Attach event listeners
        this.attachEventListeners();
    },

    /**
     * Create the visual selection box
     */
    createSelectionBox() {
        // Remove existing selection box if any
        const existing = document.getElementById('rectangleSelectionBox');
        if (existing) {
            existing.remove();
        }

        this.selectionBox = document.createElement('div');
        this.selectionBox.id = 'rectangleSelectionBox';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px dashed var(--secondary);
            background: rgba(94, 205, 187, 0.1);
            pointer-events: none;
            z-index: 10000;
            display: none;
        `;

        this.sceneEditorElement.appendChild(this.selectionBox);
    },

    /**
     * Attach mouse event listeners
     */
    attachEventListeners() {
        this._boundOnMouseDown = this.onMouseDown.bind(this);
        this._boundOnMouseMove = this.onMouseMove.bind(this);
        this._boundOnMouseUp = this.onMouseUp.bind(this);

        this.sceneEditorElement.addEventListener('mousedown', this._boundOnMouseDown);
    },

    /**
     * Get current zoom scale
     */
    getZoomScale() {
        const zoom = window.zoom;
        if (zoom && zoom.currentZoom) {
            return zoom.currentZoom / 100;
        }
        return 1;
    },

    /**
     * Handle mouse down - start selection
     */
    onMouseDown(e) {
        // Only start rectangle selection if clicking on empty space (not on an object)
        // and not holding Ctrl or Shift
        if (e.target.classList.contains('__ajs_scene_object') ||
            e.target.closest('.__ajs_scene_object') ||
            e.ctrlKey || e.shiftKey) {
            return;
        }

        const sceneEditor = window.sceneEditor;
        if (!sceneEditor) return;

        // Store absolute mouse position (viewport coordinates)
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.currentX = this.startX;
        this.currentY = this.startY;

        this.isActive = true;
        this.hadDrag = false;  // Reset drag flag

        // Attach move and up listeners
        document.addEventListener('mousemove', this._boundOnMouseMove);
        document.addEventListener('mouseup', this._boundOnMouseUp);

        // Show selection box
        this.updateSelectionBox();
        this.selectionBox.style.display = 'block';
    },

    /**
     * Handle mouse move - update selection rectangle
     */
    onMouseMove(e) {
        if (!this.isActive) return;

        // Update absolute mouse position
        this.currentX = e.clientX;
        this.currentY = e.clientY;

        this.hadDrag = true;  // User is dragging

        this.updateSelectionBox();
    },

    /**
     * Handle mouse up - finalize selection
     */
    onMouseUp(e) {
        if (!this.isActive) return;

        // Remove move and up listeners
        document.removeEventListener('mousemove', this._boundOnMouseMove);
        document.removeEventListener('mouseup', this._boundOnMouseUp);

        // Check if mouse is within scene editor bounds
        const editorRect = this.sceneEditorElement.getBoundingClientRect();
        if (e.clientX < editorRect.left || e.clientX > editorRect.right ||
            e.clientY < editorRect.top || e.clientY > editorRect.bottom) {
            // Mouse is outside scene editor, cancel selection
            this.selectionBox.style.display = 'none';
            this.isActive = false;
            return;
        }

        // Calculate selection rectangle
        const selectionRect = {
            left: Math.min(this.startX, this.currentX),
            top: Math.min(this.startY, this.currentY),
            right: Math.max(this.startX, this.currentX),
            bottom: Math.max(this.startY, this.currentY)
        };

        const rectWidth = selectionRect.right - selectionRect.left;
        const rectHeight = selectionRect.bottom - selectionRect.top;

        // Only select if rectangle is large enough (minimum 5px in both dimensions)
        // This prevents accidental selection from simple clicks
        const MIN_SELECTION_SIZE = 5;
        if (rectWidth < MIN_SELECTION_SIZE || rectHeight < MIN_SELECTION_SIZE) {
            this.selectionBox.style.display = 'none';
            this.isActive = false;
            return;
        }

        // Select all objects within rectangle
        this.selectObjectsInRectangle(selectionRect);

        // Hide selection box
        this.selectionBox.style.display = 'none';
        this.isActive = false;
    },

    /**
     * Update selection box visual position and size
     */
    updateSelectionBox() {
        // Get editor position
        const editorRect = this.sceneEditorElement.getBoundingClientRect();

        // Calculate selection rectangle in viewport coordinates
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);

        // Convert to coordinates relative to sceneEditor (with scroll)
        const relativeLeft = left - editorRect.left + this.sceneEditorElement.scrollLeft;
        const relativeTop = top - editorRect.top + this.sceneEditorElement.scrollTop;

        // Display the rectangle
        this.selectionBox.style.left = relativeLeft + 'px';
        this.selectionBox.style.top = relativeTop + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    },

    /**
     * Select all objects that intersect with the selection rectangle
     */
    selectObjectsInRectangle(selectionRect) {
        const sceneEditor = window.sceneEditor;
        if (!sceneEditor || !sceneEditor.sceneData) return;

        // First pass: find which objects should be selected
        const objectsToSelect = [];

        sceneEditor.sceneData.objects.forEach(obj => {
            if (obj.locked) {
                return; // Skip locked objects
            }

            // Get the actual DOM element
            const elem = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${obj.oid}"]`);
            if (!elem) {
                return;
            }

            // Check if element is visible
            const computedStyle = window.getComputedStyle(elem);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || parseFloat(computedStyle.opacity) === 0) {
                return;
            }

            // Get object's bounding rectangle (in viewport coordinates, includes zoom)
            const objRect = elem.getBoundingClientRect();

            // Check if element has size
            if (objRect.width === 0 || objRect.height === 0) {
                return;
            }

            // Check if object is completely contained within selection rectangle
            if (this.rectangleContainsObject(selectionRect, objRect)) {
                objectsToSelect.push({ element: elem, data: obj });
            }
        });

        // Only apply selection if we found objects to select
        // This preserves the current selection if rectangle selection finds nothing
        if (objectsToSelect.length > 0) {
            // Now deselect all current objects
            document.querySelectorAll(".clickable_selected").forEach((elem) => {
                elem.classList.remove("clickable_selected");
            });

            // Deselect in hierarchy
            document.querySelectorAll('.hierarchy-object-item').forEach(item => {
                item.classList.remove('selected');
            });

            // Deactivate transform controls before selecting new objects
            const transformControls = window.transformControls;
            if (transformControls) {
                transformControls.deactivate();
            }

            // Clear and rebuild selection
            sceneEditor.selectedObjects = [];

            // Apply new selection
            objectsToSelect.forEach(obj => {
                obj.element.classList.add('clickable_selected');
                sceneEditor.selectedObjects.push(obj);

                // Select in hierarchy
                const hierarchyItem = document.querySelector(`.hierarchy-object-item[oid="${obj.data.oid}"]`);
                if (hierarchyItem) {
                    hierarchyItem.classList.add('selected');
                }
            });
        }

        const selectedCount = objectsToSelect.length;

        // Activate transform controls if objects selected
        if (selectedCount > 0) {
            // Use setTimeout to ensure DOM updates are complete before activating transform controls
            setTimeout(() => {
                const transformControls = window.transformControls;
                if (transformControls) {
                    if (selectedCount > 1 && transformControls.activateMultiple) {
                        transformControls.activateMultiple(sceneEditor.selectedObjects);
                    } else if (selectedCount === 1) {
                        transformControls.activate(sceneEditor.selectedObjects[0].element, sceneEditor.selectedObjects[0].data);
                    }
                }
            }, 50);
        }

        // Update status bar
        const footer = nw.require('./assets/js/objects/footer');
        if (footer) {
            const sceneBox = document.getElementById('scnSceneBox');
            const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
            const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;

            footer.updateSceneEditorStatus({
                selectedCount: selectedCount,
                screenWidth: screenWidth,
                screenHeight: screenHeight
            });
        }

        // Update align toolbar state
        const alignTools = window.alignTools || nw.require('./assets/js/objects/alignTools');
        if (alignTools && alignTools.updateToolbarState) {
            alignTools.updateToolbarState();
        }
    },

    /**
     * Check if object rectangle is completely contained within selection rectangle
     */
    rectangleContainsObject(selectionRect, objRect) {
        // Object must be completely inside the selection rectangle
        return objRect.left >= selectionRect.left &&
               objRect.right <= selectionRect.right &&
               objRect.top >= selectionRect.top &&
               objRect.bottom <= selectionRect.bottom;
    },

    /**
     * Cleanup
     */
    destroy() {
        if (this.selectionBox && this.selectionBox.parentNode) {
            this.selectionBox.parentNode.removeChild(this.selectionBox);
        }

        if (this.sceneEditorElement) {
            this.sceneEditorElement.removeEventListener('mousedown', this._boundOnMouseDown);
        }

        document.removeEventListener('mousemove', this._boundOnMouseMove);
        document.removeEventListener('mouseup', this._boundOnMouseUp);
    }
};
