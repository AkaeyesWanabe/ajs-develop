/**
 * Clipboard Manager - Handles copy/cut/paste operations
 */

const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    clipboardData: null,
    isCut: false,
    placementMode: false,
    placementPreview: null,
    placementMouseHandler: null,
    placementClickHandler: null,

    /**
     * Copy selected objects to clipboard
     */
    copy() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (!sceneEditor.sceneData || !sceneEditor.selectedObjects || sceneEditor.selectedObjects.length === 0) {
            notifications.warning('No objects selected to copy');
            return false;
        }

        // Deep copy selected objects data
        this.clipboardData = sceneEditor.selectedObjects.map(sel => {
            return JSON.parse(JSON.stringify(sel.data));
        });

        this.isCut = false;

        notifications.success(`Copied ${this.clipboardData.length} object${this.clipboardData.length > 1 ? 's' : ''}`);
        return true;
    },

    /**
     * Cut selected objects (copy + mark for deletion on paste)
     */
    cut() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (!sceneEditor.sceneData || !sceneEditor.selectedObjects || sceneEditor.selectedObjects.length === 0) {
            notifications.warning('No objects selected to cut');
            return false;
        }

        // Copy to clipboard
        this.clipboardData = sceneEditor.selectedObjects.map(sel => {
            return JSON.parse(JSON.stringify(sel.data));
        });

        this.isCut = true;

        // Store original OIDs for deletion after paste
        this.cutObjectOIDs = sceneEditor.selectedObjects.map(sel => sel.data.oid);

        notifications.success(`Cut ${this.clipboardData.length} object${this.clipboardData.length > 1 ? 's' : ''}`);
        return true;
    },

    /**
     * Paste objects from clipboard - activates placement mode
     */
    paste() {

        if (!this.clipboardData || this.clipboardData.length === 0) {
            notifications.warning('Clipboard is empty');
            return false;
        }

        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (!sceneEditor.sceneData) {
            notifications.error('No scene is open');
            return false;
        }

        // Enter placement mode
        this.enterPlacementMode();
        return true;
    },

    /**
     * Enter placement mode - shows preview and waits for click to place
     */
    enterPlacementMode() {
        if (this.placementMode) {
            this.exitPlacementMode();
        }

        this.placementMode = true;
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        // Get scene editor element (NOT sceneBox - we listen on scnEditor like objectPlacer does)
        const sceneEditorElement = document.getElementById('scnEditor');
        const virtualBox = document.getElementById('scnVirtualBox');

        if (!sceneEditorElement || !virtualBox) {
            console.error('[CLIPBOARD] Scene elements not found');
            this.placementMode = false;
            return;
        }

        this.sceneEditorElement = sceneEditorElement;

        // Create preview container
        this.placementPreview = document.createElement('div');
        this.placementPreview.id = 'clipboard-placement-preview';
        this.placementPreview.style.cssText = `
            position: absolute;
            pointer-events: none;
            opacity: 0.6;
            z-index: 9999;
            display: none;
        `;

        // Add preview to virtualBox (same as objectPlacer)
        virtualBox.appendChild(this.placementPreview);

        // Calculate bounds for multiple objects
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.clipboardData.forEach(objData => {
            const x = objData.properties.x || 0;
            const y = objData.properties.y || 0;
            const w = objData.properties.width || 50;
            const h = objData.properties.height || 50;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
        });

        const groupWidth = maxX - minX;
        const groupHeight = maxY - minY;

        // Create preview elements for each object
        this.clipboardData.forEach(objData => {
            const previewElem = document.createElement('div');
            const relX = (objData.properties.x || 0) - minX;
            const relY = (objData.properties.y || 0) - minY;

            previewElem.style.cssText = `
                position: absolute;
                left: ${relX}px;
                top: ${relY}px;
                width: ${objData.properties.width || 50}px;
                height: ${objData.properties.height || 50}px;
                background: rgba(100, 149, 237, 0.4);
                border: 2px dashed rgba(100, 149, 237, 0.8);
                box-sizing: border-box;
            `;
            this.placementPreview.appendChild(previewElem);
        });

        // Store group dimensions for centering on cursor
        this.placementPreview.dataset.groupWidth = groupWidth;
        this.placementPreview.dataset.groupHeight = groupHeight;
        this.placementPreview.dataset.offsetX = minX;
        this.placementPreview.dataset.offsetY = minY;

        // Mouse move handler to update preview position (same approach as objectPlacer)
        this.placementMouseHandler = (e) => {
            if (!this.placementMode || !this.placementPreview) return;

            // Get group dimensions from preview dataset
            const groupWidth = parseFloat(this.placementPreview.dataset.groupWidth);
            const groupHeight = parseFloat(this.placementPreview.dataset.groupHeight);

            // Get scnEditor position
            const editorRect = this.sceneEditorElement.getBoundingClientRect();
            const scrollX = this.sceneEditorElement.scrollLeft;
            const scrollY = this.sceneEditorElement.scrollTop;

            // Calculate position relative to scnEditor + scroll (= relative to scnVirtualBox)
            const x = e.clientX - editorRect.left + scrollX;
            const y = e.clientY - editorRect.top + scrollY;

            // Center preview on cursor
            let previewX = x - groupWidth / 2;
            let previewY = y - groupHeight / 2;

            // Apply snap to grid if enabled
            const grid = window.grid || nw.require('./assets/js/objects/grid');
            if (grid && grid.snapEnabled) {
                const snappedPos = grid.snapPoint(previewX, previewY);
                previewX = snappedPos.x;
                previewY = snappedPos.y;
            }

            this.placementPreview.style.left = previewX + 'px';
            this.placementPreview.style.top = previewY + 'px';
            this.placementPreview.style.display = 'block';
        };

        // Click handler to place objects (same approach as objectPlacer)
        this.placementClickHandler = (e) => {
            // Only handle left click, ignore right click (for context menu) and middle click
            if (e.button !== 0) {
                // Let right click through for context menu
                return;
            }


            if (!this.placementMode) {
                console.warn('[CLIPBOARD] Click ignored - not in placing mode');
                return;
            }

            // Stop event from propagating ONLY for left click
            e.stopPropagation();

            // Get group dimensions and offsets from preview dataset
            const groupWidth = parseFloat(this.placementPreview.dataset.groupWidth);
            const groupHeight = parseFloat(this.placementPreview.dataset.groupHeight);
            const minX = parseFloat(this.placementPreview.dataset.offsetX);
            const minY = parseFloat(this.placementPreview.dataset.offsetY);

            // Get scnEditor position
            const editorRect = this.sceneEditorElement.getBoundingClientRect();
            const scrollX = this.sceneEditorElement.scrollLeft;
            const scrollY = this.sceneEditorElement.scrollTop;

            // Calculate position relative to scnEditor + scroll
            let x = e.clientX - editorRect.left + scrollX;
            let y = e.clientY - editorRect.top + scrollY;


            // Get scnSceneBox to calculate offset (objects are positioned relative to scnSceneBox)
            const sceneBox = document.getElementById('scnSceneBox');
            if (sceneBox) {
                const sceneBoxRect = sceneBox.getBoundingClientRect();
                const virtualBoxRect = document.getElementById('scnVirtualBox').getBoundingClientRect();

                // Calculate sceneBox offset within virtualBox
                const offsetX = sceneBoxRect.left - virtualBoxRect.left;
                const offsetY = sceneBoxRect.top - virtualBoxRect.top;


                // Adjust position to be relative to scnSceneBox
                x = x - offsetX;
                y = y - offsetY;

            } else {
                console.warn('[CLIPBOARD] scnSceneBox not found - using raw position');
            }

            // Center objects on click position
            const baseX = x - groupWidth / 2;
            const baseY = y - groupHeight / 2;


            // Apply snap to grid if enabled
            const grid = window.grid || nw.require('./assets/js/objects/grid');
            let finalX = baseX;
            let finalY = baseY;

            if (grid && grid.snapEnabled) {
                const snappedPos = grid.snapPoint(baseX, baseY);
                finalX = snappedPos.x;
                finalY = snappedPos.y;
            }

            // Place the objects
            this.placeObjectsAtPosition(finalX, finalY, minX, minY);

            // Exit placement mode
            this.exitPlacementMode();
        };

        // Attach event listeners to sceneEditorElement (same as objectPlacer)
        this.sceneEditorElement.addEventListener('mousemove', this.placementMouseHandler);
        this.sceneEditorElement.addEventListener('click', this.placementClickHandler);


        // ESC to cancel placement
        this.placementEscHandler = (e) => {
            if (e.key === 'Escape') {
                this.exitPlacementMode();
                notifications.info('Paste cancelled');
            }
        };
        document.addEventListener('keydown', this.placementEscHandler);

        // Change cursor (on sceneEditorElement)
        this.sceneEditorElement.style.cursor = 'crosshair';

        notifications.info('Click to place objects (ESC to cancel)');
    },

    /**
     * Place objects at the specified position
     */
    placeObjectsAtPosition(baseX, baseY, originalMinX, originalMinY) {

        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');


        // Deselect all objects first
        if (sceneEditor.deselectAllObjects) {
            sceneEditor.deselectAllObjects();
        }

        const pastedObjects = [];
        const createCommands = [];

        // If this is a cut operation, delete original objects first
        if (this.isCut && this.cutObjectOIDs) {
            this.cutObjectOIDs.forEach(oid => {
                const objData = sceneEditor.sceneData.objects.find(o => o.oid === oid);
                if (objData) {
                    sceneEditor.destroyObject(objData);
                }
            });
            this.cutObjectOIDs = null;
        }

        // Prepare objects for pasting
        this.clipboardData.forEach((objData, index) => {

            // Generate new OID
            const newOid = 'object_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + index;

            // Clone object data
            const newObjectData = JSON.parse(JSON.stringify(objData));
            newObjectData.oid = newOid;

            // Calculate new position relative to group placement
            const relX = (objData.properties.x || 0) - originalMinX;
            const relY = (objData.properties.y || 0) - originalMinY;

            newObjectData.properties.x = baseX + relX;
            newObjectData.properties.y = baseY + relY;


            // Update name to indicate it's a copy (unless it was cut)
            if (!this.isCut) {
                const baseName = newObjectData.properties.name || 'Object';
                newObjectData.properties.name = `${baseName} (Copy)`;
            }


            pastedObjects.push(newObjectData);

            // Create command for this object
            const createCommand = new commands.CreateObjectCommand(sceneEditor, newObjectData);
            createCommands.push(createCommand);
        });

        // Execute all create commands in a batch (for undo/redo support)
        if (createCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Paste Objects', createCommands);
            commandManager.execute(batchCommand);
        }

        // If cut, clear clipboard after paste
        if (this.isCut) {
            this.clipboardData = null;
            this.isCut = false;
        }

        // Select pasted objects
        pastedObjects.forEach(newObjectData => {
            const elem = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${newObjectData.oid}"]`);
            if (elem) {
                elem.classList.add('clickable_selected');
                if (!sceneEditor.selectedObjects) {
                    sceneEditor.selectedObjects = [];
                }
                sceneEditor.selectedObjects.push({ element: elem, data: newObjectData });
            } else {
                console.warn('[CLIPBOARD] Could not find element for object:', newObjectData.oid);
            }
        });

        // Activate transform controls for pasted objects
        if (pastedObjects.length > 0) {
            const transformControls = window.transformControls || nw.require('./assets/js/objects/transformControls');
            if (transformControls) {
                if (pastedObjects.length > 1 && transformControls.activateMultiple) {
                    transformControls.activateMultiple(sceneEditor.selectedObjects);
                } else if (pastedObjects.length === 1) {
                    const elem = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${pastedObjects[0].oid}"]`);
                    if (elem) {
                        transformControls.activate(elem, pastedObjects[0]);
                    }
                }
            }
        }

        // Update status bar
        const footer = nw.require('./assets/js/objects/footer');
        if (footer) {
            const sceneBox = document.getElementById('scnSceneBox');
            const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
            const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;

            footer.updateSceneEditorStatus({
                selectedCount: pastedObjects.length,
                screenWidth: screenWidth,
                screenHeight: screenHeight
            });
        }

        // Update align toolbar state
        const alignTools = window.alignTools || nw.require('./assets/js/objects/alignTools');
        if (alignTools && alignTools.updateToolbarState) {
            alignTools.updateToolbarState();
        }

        notifications.success(`Pasted ${pastedObjects.length} object${pastedObjects.length > 1 ? 's' : ''}`);
    },

    /**
     * Exit placement mode and cleanup
     */
    exitPlacementMode() {
        if (!this.placementMode) return;

        this.placementMode = false;

        // Remove preview
        if (this.placementPreview && this.placementPreview.parentNode) {
            this.placementPreview.parentNode.removeChild(this.placementPreview);
        }
        this.placementPreview = null;

        // Reset cursor
        if (this.sceneEditorElement) {
            this.sceneEditorElement.style.cursor = 'default';
        }

        // Remove event listeners from sceneEditorElement
        if (this.sceneEditorElement && this.placementMouseHandler) {
            this.sceneEditorElement.removeEventListener('mousemove', this.placementMouseHandler);
            this.sceneEditorElement.removeEventListener('click', this.placementClickHandler);
        }

        if (this.placementEscHandler) {
            document.removeEventListener('keydown', this.placementEscHandler);
        }

        this.placementMouseHandler = null;
        this.placementClickHandler = null;
        this.placementEscHandler = null;
        this.sceneEditorElement = null;

    },

    /**
     * Check if clipboard has data
     */
    hasData() {
        return this.clipboardData && this.clipboardData.length > 0;
    },

    /**
     * Clear clipboard
     */
    clear() {
        this.clipboardData = null;
        this.isCut = false;
        this.cutObjectOIDs = null;
    }
};
