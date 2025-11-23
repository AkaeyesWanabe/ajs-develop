/**
 * Object Placer - Click-to-place object system
 * Allows users to click in scene editor to position objects before creation
 */

const sceneEditor = nw.require('./assets/js/objects/sceneEditor');
const objectFactory = nw.require('./assets/js/objects/objectFactory');
const notifications = nw.require('./assets/js/objects/notifications');
const layerManager = nw.require('./assets/js/objects/layerManager');

module.exports = {
    isPlacing: false,
    placingExtensionId: null,
    placingLayer: 0,
    ghostObject: null,
    sceneEditorElement: null,

    // Bound event handlers
    _boundOnMouseMove: null,
    _boundOnMouseClick: null,
    _boundOnKeyDown: null,

    /**
     * Start placing an object - shows ghost preview
     */
    startPlacing(extensionId, layer = null) {
        console.log('[ObjectPlacer] ====== Starting placement ======');
        console.log('[ObjectPlacer] Extension ID:', extensionId);
        console.log('[ObjectPlacer] Layer:', layer);

        if (!sceneEditor.sceneData) {
            console.error('[ObjectPlacer] No scene loaded!');
            notifications.error('No scene loaded');
            return;
        }

        this.isPlacing = true;
        this.placingExtensionId = extensionId;
        // Use selected layer from layerManager if no layer specified
        this.placingLayer = layer !== null ? layer : layerManager.selectedLayer;
        this.sceneEditorElement = document.getElementById('scnEditor');

        console.log('[ObjectPlacer] scnEditor element found:', !!this.sceneEditorElement);

        if (!this.sceneEditorElement) {
            console.error('[ObjectPlacer] scnEditor element not found!');
            notifications.error('Scene editor not initialized');
            return;
        }

        // Bind event handlers once
        this._boundOnMouseMove = this.onMouseMove.bind(this);
        this._boundOnMouseClick = this.onMouseClick.bind(this);
        this._boundOnKeyDown = this.onKeyDown.bind(this);

        // Change cursor
        this.sceneEditorElement.style.cursor = 'crosshair';
        console.log('[ObjectPlacer] Cursor changed to crosshair');

        // Create ghost preview
        this.createGhostPreview(extensionId);

        // Show instruction notification
        notifications.info('Click in the scene to place the object');

        // Add mouse move listener for ghost preview
        this.sceneEditorElement.addEventListener('mousemove', this._boundOnMouseMove);
        this.sceneEditorElement.addEventListener('click', this._boundOnMouseClick);
        console.log('[ObjectPlacer] Event listeners added');

        // ESC to cancel
        document.addEventListener('keydown', this._boundOnKeyDown);

        console.log('[ObjectPlacer] Placement mode active. isPlacing:', this.isPlacing);
    },

    /**
     * Create ghost preview of the object
     */
    createGhostPreview(extensionId) {
        console.log('[ObjectPlacer] Creating ghost preview for:', extensionId);

        const extension = objectFactory.availableExtensions.find(ext => ext.id === extensionId);
        if (!extension) {
            console.error('[ObjectPlacer] Extension not found:', extensionId);
            return;
        }

        console.log('[ObjectPlacer] Extension found:', extension.name);

        // Create ghost element
        this.ghostObject = document.createElement('div');
        this.ghostObject.id = '__ghost_object_preview';
        this.ghostObject.style.position = 'absolute';
        this.ghostObject.style.pointerEvents = 'none';
        this.ghostObject.style.opacity = '0.6';
        this.ghostObject.style.border = '2px dashed var(--secondary)';
        this.ghostObject.style.borderRadius = '4px';
        this.ghostObject.style.backgroundColor = 'rgba(94, 205, 187, 0.1)';
        this.ghostObject.style.zIndex = '9999';
        this.ghostObject.style.display = 'none';

        // Set default size based on extension
        const defaultWidth = extension.data.properties.width || 64;
        const defaultHeight = extension.data.properties.height || 64;
        this.ghostObject.style.width = defaultWidth + 'px';
        this.ghostObject.style.height = defaultHeight + 'px';

        console.log('[ObjectPlacer] Ghost size:', defaultWidth, 'x', defaultHeight);

        // Add icon or label
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.top = '50%';
        label.style.left = '50%';
        label.style.transform = 'translate(-50%, -50%)';
        label.style.color = 'var(--secondary)';
        label.style.fontSize = '12px';
        label.style.fontWeight = 'bold';
        label.style.textAlign = 'center';
        label.textContent = extension.name;
        this.ghostObject.appendChild(label);

        // Add to scene
        const scnVirtualBox = document.getElementById('scnVirtualBox');
        console.log('[ObjectPlacer] scnVirtualBox found:', !!scnVirtualBox);

        if (scnVirtualBox) {
            scnVirtualBox.appendChild(this.ghostObject);
            console.log('[ObjectPlacer] Ghost added to scnVirtualBox');
        } else {
            console.error('[ObjectPlacer] scnVirtualBox not found!');
        }
    },

    /**
     * Mouse move handler - update ghost position
     */
    onMouseMove(e) {
        if (!this.isPlacing || !this.ghostObject) return;

        // Get scnEditor position
        const editorRect = this.sceneEditorElement.getBoundingClientRect();
        const scrollX = this.sceneEditorElement.scrollLeft;
        const scrollY = this.sceneEditorElement.scrollTop;

        // Calculate position relative to scnEditor + scroll (= relative to scnVirtualBox)
        const x = e.clientX - editorRect.left + scrollX;
        const y = e.clientY - editorRect.top + scrollY;

        // Ghost is in scnVirtualBox, so position it relative to scnVirtualBox
        // Center ghost on cursor
        const ghostWidth = parseInt(this.ghostObject.style.width);
        const ghostHeight = parseInt(this.ghostObject.style.height);

        this.ghostObject.style.left = (x - ghostWidth / 2) + 'px';
        this.ghostObject.style.top = (y - ghostHeight / 2) + 'px';
        this.ghostObject.style.display = 'block';
    },

    /**
     * Mouse click handler - place object
     */
    onMouseClick(e) {
        console.log('[ObjectPlacer] ====== Mouse click detected ======');
        console.log('[ObjectPlacer] isPlacing:', this.isPlacing);

        if (!this.isPlacing) {
            console.warn('[ObjectPlacer] Click ignored - not in placing mode');
            return;
        }

        e.stopPropagation();

        // Get scnEditor position
        const editorRect = this.sceneEditorElement.getBoundingClientRect();
        const scrollX = this.sceneEditorElement.scrollLeft;
        const scrollY = this.sceneEditorElement.scrollTop;

        // Calculate position relative to scnEditor + scroll
        let x = e.clientX - editorRect.left + scrollX;
        let y = e.clientY - editorRect.top + scrollY;

        console.log('[ObjectPlacer] Raw click position (relative to scnEditor):', x, y);

        // Get scnSceneBox to calculate offset (objects are positioned relative to scnSceneBox)
        const sceneBox = document.getElementById('scnSceneBox');
        if (sceneBox) {
            const sceneBoxRect = sceneBox.getBoundingClientRect();
            const virtualBoxRect = document.getElementById('scnVirtualBox').getBoundingClientRect();

            // Calculate sceneBox offset within virtualBox
            const offsetX = sceneBoxRect.left - virtualBoxRect.left;
            const offsetY = sceneBoxRect.top - virtualBoxRect.top;

            console.log('[ObjectPlacer] scnSceneBox offset:', offsetX, offsetY);

            // Adjust position to be relative to scnSceneBox
            x = x - offsetX;
            y = y - offsetY;

            console.log('[ObjectPlacer] Adjusted position (relative to scnSceneBox):', x, y);
        } else {
            console.warn('[ObjectPlacer] scnSceneBox not found - using raw position');
        }

        // Create object at click position
        this.placeObjectAt(x, y);
    },

    /**
     * Place object at specific coordinates
     */
    placeObjectAt(x, y) {
        console.log('[ObjectPlacer] ====== Placing object ======');
        console.log('[ObjectPlacer] Position:', x, y);
        console.log('[ObjectPlacer] Extension ID:', this.placingExtensionId);

        if (!this.placingExtensionId) {
            console.error('[ObjectPlacer] No extension ID!');
            return;
        }

        try {
            // Create object data
            console.log('[ObjectPlacer] Creating object data...');
            const objectData = objectFactory.createObject(this.placingExtensionId, this.placingLayer);

            if (!objectData) {
                console.error('[ObjectPlacer] Failed to create object data');
                notifications.error('Failed to create object');
                this.cancelPlacing();
                return;
            }

            console.log('[ObjectPlacer] Object data created:', objectData);

            // Set position
            const ghostWidth = parseInt(this.ghostObject.style.width);
            const ghostHeight = parseInt(this.ghostObject.style.height);
            objectData.properties.x = x - ghostWidth / 2;
            objectData.properties.y = y - ghostHeight / 2;

            console.log('[ObjectPlacer] Final position:', objectData.properties.x, objectData.properties.y);

            // Create command for undo/redo support
            console.log('[ObjectPlacer] Creating command for undo/redo...');
            const commands = nw.require('./assets/js/objects/commands');
            const commandManager = nw.require('./assets/js/objects/commandManager');

            // Store object data for the command
            const createCommand = new commands.CreateObjectCommand(sceneEditor, objectData);

            // Execute the command (this will add the object to the scene)
            commandManager.execute(createCommand);

            console.log('[ObjectPlacer] Object created with undo/redo support');

            console.log('[ObjectPlacer] Object created:', objectData.properties.name, 'on Layer', this.placingLayer);
            notifications.success(`${objectData.properties.name} placed in scene`);

            // Clean up
            this.cancelPlacing();

        } catch (err) {
            console.error('[ObjectPlacer] Error placing object:', err);
            console.error('[ObjectPlacer] Stack trace:', err.stack);
            notifications.error(`Failed to place object: ${err.message}`);
            this.cancelPlacing();
        }
    },

    /**
     * Keyboard handler - ESC to cancel
     */
    onKeyDown(e) {
        if (e.key === 'Escape' && this.isPlacing) {
            this.cancelPlacing();
            notifications.info('Placement cancelled');
        }
    },

    /**
     * Cancel placement mode
     */
    cancelPlacing() {
        this.isPlacing = false;
        this.placingExtensionId = null;
        this.placingLayer = 0;

        // Remove ghost
        if (this.ghostObject && this.ghostObject.parentNode) {
            this.ghostObject.parentNode.removeChild(this.ghostObject);
        }
        this.ghostObject = null;

        // Reset cursor
        if (this.sceneEditorElement) {
            this.sceneEditorElement.style.cursor = 'default';
        }

        // Remove event listeners using bound functions
        if (this.sceneEditorElement && this._boundOnMouseMove) {
            this.sceneEditorElement.removeEventListener('mousemove', this._boundOnMouseMove);
            this.sceneEditorElement.removeEventListener('click', this._boundOnMouseClick);
        }
        if (this._boundOnKeyDown) {
            document.removeEventListener('keydown', this._boundOnKeyDown);
        }

        // Clear bound functions
        this._boundOnMouseMove = null;
        this._boundOnMouseClick = null;
        this._boundOnKeyDown = null;
    }
};
