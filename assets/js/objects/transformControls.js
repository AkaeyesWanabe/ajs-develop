/**
 * Transform Controls - Move, Resize, Rotate objects with mouse
 */

const sceneEditor = nw.require('./assets/js/objects/sceneEditor');
const properties = nw.require('./assets/js/objects/properties');
const hierarchy = nw.require('./assets/js/objects/hierarchy');
const layerManager = nw.require('./assets/js/objects/layerManager');
const globals = nw.require('./assets/js/common/globals');

module.exports = {
    activeObject: null,
    activeObjects: [], // For multi-selection: array of {element, data}
    transformMode: 'move', // 'move', 'resize', 'rotate'
    isTransforming: false,
    startPos: { x: 0, y: 0 },
    startSize: { width: 0, height: 0 },
    startRotation: 0,
    currentHandle: null,
    handles: [],
    boundingBox: null,

    // Multi-selection initial positions
    multiSelectionStartPositions: [],

    // Bound functions for proper event listener removal
    _boundHandleMove: null,
    _boundHandleResize: null,
    _boundHandleRotate: null,
    _boundEndTransform: null,
    _boundStartMove: null,

    /**
     * Activate transform controls on an object
     */
    activate(objectElement, objectData) {
        this.deactivate();

        this.activeObject = {
            element: objectElement,
            data: objectData
        };

        // Bind event handler functions once
        this._boundHandleMove = this.handleMove.bind(this);
        this._boundHandleResize = this.handleResize.bind(this);
        this._boundHandleRotate = this.handleRotate.bind(this);
        this._boundEndTransform = this.endTransform.bind(this);
        this._boundStartMove = this.startMove.bind(this);

        this.createBoundingBox();
        this.createHandles();
        this.attachEventListeners();
    },

    /**
     * Activate transform controls on multiple objects
     */
    activateMultiple(selectedObjects) {
        this.deactivate();

        if (!selectedObjects || selectedObjects.length === 0) {
            return;
        }

        // If only one object, use regular activate
        if (selectedObjects.length === 1) {
            this.activate(selectedObjects[0].element, selectedObjects[0].data);
            return;
        }

        // Store all active objects
        this.activeObjects = selectedObjects;
        this.activeObject = null; // Clear single object

        // Calculate bounding box that encompasses all objects
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        selectedObjects.forEach(obj => {
            const x = obj.data.properties.x || 0;
            const y = obj.data.properties.y || 0;
            const width = obj.data.properties.width || 100;
            const height = obj.data.properties.height || 100;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        // Create a virtual active object representing the group
        this.activeObject = {
            element: selectedObjects[0].element, // Use first element for event attachment
            data: {
                oid: 'multi-selection',
                properties: {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                }
            },
            isMultiSelection: true
        };

        // Bind event handler functions once
        this._boundHandleMove = this.handleMove.bind(this);
        this._boundHandleResize = this.handleResize.bind(this);
        this._boundHandleRotate = this.handleRotate.bind(this);
        this._boundEndTransform = this.endTransform.bind(this);
        this._boundStartMove = this.startMove.bind(this);

        this.createBoundingBox();
        this.createHandles();
        this.attachEventListenersMultiple();
    },

    /**
     * Deactivate transform controls
     */
    deactivate() {
        // Remove event listeners first
        this.removeEventListeners();

        // Remove DOM elements
        if (this.boundingBox && this.boundingBox.parentNode) {
            this.boundingBox.parentNode.removeChild(this.boundingBox);
        }

        // Clean up object reference
        if (this.activeObject && this.activeObject.element) {
            this.activeObject.element.removeEventListener('mousedown', this._boundStartMove);
            this.activeObject.element.style.cursor = '';
        }

        // Clean up multiple objects
        if (this.activeObjects && this.activeObjects.length > 0) {
            this.activeObjects.forEach(obj => {
                if (obj.element) {
                    obj.element.removeEventListener('mousedown', this._boundStartMove);
                    obj.element.style.cursor = '';
                }
            });
        }

        this.handles = [];
        this.boundingBox = null;
        this.activeObject = null;
        this.activeObjects = [];
        this.multiSelectionStartPositions = [];
        this.isTransforming = false;
    },

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        if (this._boundHandleMove) {
            document.removeEventListener('mousemove', this._boundHandleMove);
        }
        if (this._boundHandleResize) {
            document.removeEventListener('mousemove', this._boundHandleResize);
        }
        if (this._boundHandleRotate) {
            document.removeEventListener('mousemove', this._boundHandleRotate);
        }
        if (this._boundEndTransform) {
            document.removeEventListener('mouseup', this._boundEndTransform);
        }
    },

    /**
     * Create bounding box around object
     */
    createBoundingBox() {
        if (!this.activeObject) return;

        const obj = this.activeObject.element;

        // Find the correct container - use sceneBox if available, otherwise parent
        const sceneBox = document.getElementById('scnSceneBox');
        const container = sceneBox || obj.parentElement;

        this.boundingBox = document.createElement('div');
        this.boundingBox.className = 'transform-bounding-box';
        this.boundingBox.style.position = 'absolute';

        // Always use the data properties for consistency across all object types
        // This works for both canvas (sprite, image) and HTML elements (button)
        if (this.activeObject.data && this.activeObject.data.properties) {
            this.boundingBox.style.left = this.activeObject.data.properties.x + 'px';
            this.boundingBox.style.top = this.activeObject.data.properties.y + 'px';
            this.boundingBox.style.width = this.activeObject.data.properties.width + 'px';
            this.boundingBox.style.height = this.activeObject.data.properties.height + 'px';
        } else {
            // Fallback to inline styles if data is not available
            this.boundingBox.style.left = obj.style.left;
            this.boundingBox.style.top = obj.style.top;
            this.boundingBox.style.width = obj.style.width;
            this.boundingBox.style.height = obj.style.height;
        }

        container.appendChild(this.boundingBox);
    },

    /**
     * Create resize and rotate handles
     */
    createHandles() {
        if (!this.boundingBox) return;

        // Check if object is resizable
        const isResizable = this.isObjectResizable();

        // Only create resize handles if object is resizable
        if (isResizable) {
            const positions = [
                { name: 'nw', cursor: 'nw-resize', x: 0, y: 0 },
                { name: 'n', cursor: 'n-resize', x: 0.5, y: 0 },
                { name: 'ne', cursor: 'ne-resize', x: 1, y: 0 },
                { name: 'e', cursor: 'e-resize', x: 1, y: 0.5 },
                { name: 'se', cursor: 'se-resize', x: 1, y: 1 },
                { name: 's', cursor: 's-resize', x: 0.5, y: 1 },
                { name: 'sw', cursor: 'sw-resize', x: 0, y: 1 },
                { name: 'w', cursor: 'w-resize', x: 0, y: 0.5 }
            ];

            positions.forEach(pos => {
                const handle = document.createElement('div');
                handle.className = 'transform-handle transform-handle-' + pos.name;
                handle.style.position = 'absolute';
                handle.dataset.position = pos.name;

                this.updateHandlePosition(handle, pos.x, pos.y);

                handle.addEventListener('mousedown', (e) => this.startResize(e, pos.name));
                this.boundingBox.appendChild(handle);
                this.handles.push(handle);
            });
        }

        // Check if object is rotatable
        const isRotatable = this.isObjectRotatable();

        // Only create rotation handle if object is rotatable
        if (isRotatable) {
            const rotateHandle = document.createElement('div');
            rotateHandle.className = 'transform-handle transform-handle-rotate';
            rotateHandle.style.position = 'absolute';
            rotateHandle.style.top = '-30px';
            rotateHandle.style.left = '50%';
            rotateHandle.style.transform = 'translateX(-50%)';
            rotateHandle.innerHTML = '<i class="ri-refresh-line"></i>';

            rotateHandle.addEventListener('mousedown', (e) => this.startRotate(e));
            this.boundingBox.appendChild(rotateHandle);
            this.handles.push(rotateHandle);
        }
    },

    /**
     * Update handle position based on bounding box
     */
    updateHandlePosition(handle, xPercent, yPercent) {
        const width = parseFloat(this.boundingBox.style.width);
        const height = parseFloat(this.boundingBox.style.height);
        handle.style.left = (width * xPercent) + 'px';
        handle.style.top = (height * yPercent) + 'px';
    },

    /**
     * Attach event listeners for moving
     */
    attachEventListeners() {
        if (!this.activeObject) return;

        const obj = this.activeObject.element;
        obj.style.cursor = 'move';

        obj.addEventListener('mousedown', this._boundStartMove);
    },

    /**
     * Attach event listeners for multiple objects
     */
    attachEventListenersMultiple() {
        if (!this.activeObjects || this.activeObjects.length === 0) return;

        // Attach mousedown to all selected objects
        this.activeObjects.forEach(obj => {
            if (obj.element) {
                obj.element.style.cursor = 'move';
                obj.element.addEventListener('mousedown', this._boundStartMove);
            }
        });
    },

    /**
     * Start moving object
     */
    startMove(e) {
        if (e.target.classList.contains('transform-handle')) return;

        // Disable move when Alt is pressed (used for drag to layer)
        if (globals.keysIsPressed.alt || e.altKey) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.isTransforming = true;
        this.transformMode = 'move';

        this.startPos = {
            x: e.clientX,
            y: e.clientY,
            objX: parseFloat(this.activeObject.element.style.left) || 0,
            objY: parseFloat(this.activeObject.element.style.top) || 0
        };

        // Store initial values for undo/redo
        this.initialTransformState = {
            mode: 'move',
            x: this.activeObject.data.properties.x,
            y: this.activeObject.data.properties.y
        };

        // For multi-selection, store initial positions of all objects
        if (this.activeObjects && this.activeObjects.length > 1) {
            this.multiSelectionStartPositions = this.activeObjects.map(obj => ({
                element: obj.element,
                data: obj.data,
                x: obj.data.properties.x || 0,
                y: obj.data.properties.y || 0
            }));
        }

        document.addEventListener('mousemove', this._boundHandleMove);
        document.addEventListener('mouseup', this._boundEndTransform);
    },

    /**
     * Handle moving
     */
    handleMove(e) {
        if (!this.isTransforming || this.transformMode !== 'move') return;

        const deltaX = e.clientX - this.startPos.x;
        const deltaY = e.clientY - this.startPos.y;

        // Get grid system
        const grid = window.grid;

        // Handle multi-selection
        if (this.activeObjects && this.activeObjects.length > 1 && this.multiSelectionStartPositions.length > 0) {
            // Move all selected objects
            this.multiSelectionStartPositions.forEach(startPos => {
                let newX = startPos.x + deltaX;
                let newY = startPos.y + deltaY;

                // Apply snap to grid if enabled
                if (grid && grid.snapEnabled) {
                    newX = grid.snap(newX);
                    newY = grid.snap(newY);
                }

                // Update visual position
                startPos.element.style.left = newX + 'px';
                startPos.element.style.top = newY + 'px';

                // Update data
                startPos.data.properties.x = newX;
                startPos.data.properties.y = newY;

                // Update in sceneEditor.sceneData.objects
                if (sceneEditor && sceneEditor.sceneData && sceneEditor.sceneData.objects) {
                    const objInScene = sceneEditor.sceneData.objects.find(obj => obj.oid === startPos.data.oid);
                    if (objInScene) {
                        objInScene.properties.x = newX;
                        objInScene.properties.y = newY;
                    }
                }
            });

            // Update bounding box position (use first object's snapped position)
            const firstNewX = this.multiSelectionStartPositions[0].data.properties.x;
            const firstNewY = this.multiSelectionStartPositions[0].data.properties.y;
            const boundingDeltaX = firstNewX - this.multiSelectionStartPositions[0].x;
            const boundingDeltaY = firstNewY - this.multiSelectionStartPositions[0].y;

            this.boundingBox.style.left = (this.startPos.objX + boundingDeltaX) + 'px';
            this.boundingBox.style.top = (this.startPos.objY + boundingDeltaY) + 'px';
        } else {
            // Single object move
            let newX = this.startPos.objX + deltaX;
            let newY = this.startPos.objY + deltaY;

            // Apply snap to grid if enabled
            if (grid && grid.snapEnabled) {
                newX = grid.snap(newX);
                newY = grid.snap(newY);
            }

            // Update position
            this.activeObject.element.style.left = newX + 'px';
            this.activeObject.element.style.top = newY + 'px';
            this.boundingBox.style.left = newX + 'px';
            this.boundingBox.style.top = newY + 'px';

            // Update data in activeObject
            this.activeObject.data.properties.x = newX;
            this.activeObject.data.properties.y = newY;

            // Also update in sceneEditor.sceneData.objects to ensure sync
            if (sceneEditor && sceneEditor.sceneData && sceneEditor.sceneData.objects) {
                const objInScene = sceneEditor.sceneData.objects.find(obj => obj.oid === this.activeObject.data.oid);
                if (objInScene) {
                    objInScene.properties.x = newX;
                    objInScene.properties.y = newY;
                }
            }

            // Update properties panel if available
            if (properties && typeof properties.refresh === 'function') {
                properties.refresh(this.activeObject.data);
            }
        }

        // Update handles
        this.updateHandles();
    },

    /**
     * Start resizing
     */
    startResize(e, handlePosition) {
        // Check if object is resizable
        if (!this.isObjectResizable()) {
            console.log('[TRANSFORM CONTROLS] Object is not resizable');
            return;
        }

        // Disable resize when Alt is pressed (used for drag to layer)
        if (globals.keysIsPressed.alt || e.altKey) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.isTransforming = true;
        this.transformMode = 'resize';
        this.currentHandle = handlePosition;

        this.startPos = {
            x: e.clientX,
            y: e.clientY,
            left: parseFloat(this.activeObject.element.style.left) || 0,
            top: parseFloat(this.activeObject.element.style.top) || 0
        };

        this.startSize = {
            width: parseFloat(this.activeObject.element.style.width) || 100,
            height: parseFloat(this.activeObject.element.style.height) || 100
        };

        // Store initial values for undo/redo
        this.initialTransformState = {
            mode: 'resize',
            x: this.activeObject.data.properties.x,
            y: this.activeObject.data.properties.y,
            width: this.activeObject.data.properties.width,
            height: this.activeObject.data.properties.height
        };

        document.addEventListener('mousemove', this._boundHandleResize);
        document.addEventListener('mouseup', this._boundEndTransform);
    },

    /**
     * Handle resizing
     */
    handleResize(e) {
        if (!this.isTransforming || this.transformMode !== 'resize') return;

        const deltaX = e.clientX - this.startPos.x;
        const deltaY = e.clientY - this.startPos.y;

        let newWidth = this.startSize.width;
        let newHeight = this.startSize.height;
        let newLeft = this.startPos.left;
        let newTop = this.startPos.top;

        const handle = this.currentHandle;

        // Calculate new dimensions based on handle
        if (handle.includes('e')) {
            newWidth = this.startSize.width + deltaX;
        }
        if (handle.includes('w')) {
            newWidth = this.startSize.width - deltaX;
            newLeft = this.startPos.left + deltaX;
        }
        if (handle.includes('s')) {
            newHeight = this.startSize.height + deltaY;
        }
        if (handle.includes('n')) {
            newHeight = this.startSize.height - deltaY;
            newTop = this.startPos.top + deltaY;
        }

        // Maintain aspect ratio with Shift
        if (e.shiftKey && (handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se')) {
            const ratio = this.startSize.width / this.startSize.height;
            newHeight = newWidth / ratio;

            if (handle.includes('n')) {
                newTop = this.startPos.top + (this.startSize.height - newHeight);
            }
        }

        // Minimum size
        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);

        // Apply snap to grid if enabled
        const grid = window.grid;
        if (grid && grid.snapEnabled) {
            newWidth = grid.snap(newWidth);
            newHeight = grid.snap(newHeight);
            newLeft = grid.snap(newLeft);
            newTop = grid.snap(newTop);
        }

        // Update element
        this.activeObject.element.style.width = newWidth + 'px';
        this.activeObject.element.style.height = newHeight + 'px';
        this.activeObject.element.style.left = newLeft + 'px';
        this.activeObject.element.style.top = newTop + 'px';

        // Update bounding box
        this.boundingBox.style.width = newWidth + 'px';
        this.boundingBox.style.height = newHeight + 'px';
        this.boundingBox.style.left = newLeft + 'px';
        this.boundingBox.style.top = newTop + 'px';

        // Update handles
        this.updateHandles();

        // Update data in activeObject
        this.activeObject.data.properties.width = newWidth;
        this.activeObject.data.properties.height = newHeight;
        this.activeObject.data.properties.x = newLeft;
        this.activeObject.data.properties.y = newTop;

        // Also update in sceneEditor.sceneData.objects to ensure sync
        if (sceneEditor && sceneEditor.sceneData && sceneEditor.sceneData.objects) {
            const objInScene = sceneEditor.sceneData.objects.find(obj => obj.oid === this.activeObject.data.oid);
            if (objInScene) {
                objInScene.properties.width = newWidth;
                objInScene.properties.height = newHeight;
                objInScene.properties.x = newLeft;
                objInScene.properties.y = newTop;
            }
        }

        // Update properties panel if available
        if (properties && typeof properties.refresh === 'function') {
            properties.refresh(this.activeObject.data);
        }
    },

    /**
     * Start rotating
     */
    startRotate(e) {
        // Check if object is rotatable
        if (!this.isObjectRotatable()) {
            console.log('[TRANSFORM CONTROLS] Object is not rotatable');
            return;
        }

        // Disable rotate when Alt is pressed (used for drag to layer)
        if (globals.keysIsPressed.alt || e.altKey) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.isTransforming = true;
        this.transformMode = 'rotate';

        const rect = this.activeObject.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Use 'angle' property for AJS compatibility
        this.startRotation = this.activeObject.data.properties.angle || this.activeObject.data.properties.rotation || 0;
        this.rotationCenter = { x: centerX, y: centerY };
        this.startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

        // Store initial values for undo/redo
        this.initialTransformState = {
            mode: 'rotate',
            angle: this.activeObject.data.properties.angle,
            rotation: this.activeObject.data.properties.rotation
        };

        document.addEventListener('mousemove', this._boundHandleRotate);
        document.addEventListener('mouseup', this._boundEndTransform);
    },

    /**
     * Handle rotating
     */
    handleRotate(e) {
        if (!this.isTransforming || this.transformMode !== 'rotate') return;

        const currentAngle = Math.atan2(
            e.clientY - this.rotationCenter.y,
            e.clientX - this.rotationCenter.x
        );

        let rotation = this.startRotation + (currentAngle - this.startAngle) * (180 / Math.PI);

        // Snap to 15° with Shift
        if (e.shiftKey) {
            rotation = Math.round(rotation / 15) * 15;
        }

        // Normalize to 0-360
        rotation = ((rotation % 360) + 360) % 360;

        // Update element
        this.activeObject.element.style.transform = `rotate(${rotation}deg)`;
        this.boundingBox.style.transform = `rotate(${rotation}deg)`;

        // Update handles
        this.updateHandles();

        // Update data - use 'angle' property for AJS compatibility
        if (this.activeObject.data.properties.hasOwnProperty('angle')) {
            this.activeObject.data.properties.angle = rotation;
        } else {
            this.activeObject.data.properties.rotation = rotation;
        }

        // Also update in sceneEditor.sceneData.objects to ensure sync
        if (sceneEditor && sceneEditor.sceneData && sceneEditor.sceneData.objects) {
            const objInScene = sceneEditor.sceneData.objects.find(obj => obj.oid === this.activeObject.data.oid);
            if (objInScene) {
                if (objInScene.properties.hasOwnProperty('angle')) {
                    objInScene.properties.angle = rotation;
                } else {
                    objInScene.properties.rotation = rotation;
                }
            }
        }

        // Update properties panel if available
        if (properties && typeof properties.refresh === 'function') {
            properties.refresh(this.activeObject.data);
        }
    },

    /**
     * End transformation
     */
    endTransform() {
        this.isTransforming = false;
        this.removeEventListeners();

        const editor = window.sceneEditor || sceneEditor;

        // Create undo/redo command if state changed
        if (this.initialTransformState && this.transformMode) {
            const commands = nw.require('./assets/js/objects/commands');
            const commandManager = nw.require('./assets/js/objects/commandManager');

            // Handle multi-selection
            if (this.activeObjects && this.activeObjects.length > 1 && this.multiSelectionStartPositions.length > 0) {
                const moveCommands = [];

                this.multiSelectionStartPositions.forEach(startPos => {
                    const currentData = editor.sceneData.objects.find(obj => obj.oid === startPos.data.oid);
                    if (currentData) {
                        // Check if position changed
                        if (startPos.x !== currentData.properties.x || startPos.y !== currentData.properties.y) {
                            const moveCmd = new commands.MoveObjectCommand(
                                editor,
                                currentData,
                                startPos.x,
                                startPos.y,
                                currentData.properties.x,
                                currentData.properties.y
                            );
                            moveCommands.push(moveCmd);
                        }
                    }
                });

                // Execute batch command if any objects moved
                if (moveCommands.length > 0) {
                    const batchCmd = new commands.BatchCommand('Move Objects', moveCommands);
                    commandManager.execute(batchCmd);
                }
            }
            // Handle single object
            else if (this.activeObject && this.activeObject.data && this.activeObject.data.oid !== 'multi-selection') {
                const currentData = editor.sceneData.objects.find(obj => obj.oid === this.activeObject.data.oid);

                if (currentData) {
                    if (this.initialTransformState.mode === 'move') {
                        // Check if position changed
                        if (this.initialTransformState.x !== currentData.properties.x ||
                            this.initialTransformState.y !== currentData.properties.y) {
                            const moveCmd = new commands.MoveObjectCommand(
                                editor,
                                currentData,
                                this.initialTransformState.x,
                                this.initialTransformState.y,
                                currentData.properties.x,
                                currentData.properties.y
                            );
                            commandManager.execute(moveCmd);
                        }
                    }
                    else if (this.initialTransformState.mode === 'resize') {
                        // Check if size or position changed (resize can change both)
                        if (this.initialTransformState.width !== currentData.properties.width ||
                            this.initialTransformState.height !== currentData.properties.height ||
                            this.initialTransformState.x !== currentData.properties.x ||
                            this.initialTransformState.y !== currentData.properties.y) {
                            const resizeCmd = new commands.ResizeObjectCommand(
                                editor,
                                currentData,
                                this.initialTransformState.width,
                                this.initialTransformState.height,
                                currentData.properties.width,
                                currentData.properties.height
                            );
                            commandManager.execute(resizeCmd);

                            // If position also changed (happens with nw, n, w handles), create move command
                            if (this.initialTransformState.x !== currentData.properties.x ||
                                this.initialTransformState.y !== currentData.properties.y) {
                                const moveCmd = new commands.MoveObjectCommand(
                                    editor,
                                    currentData,
                                    this.initialTransformState.x,
                                    this.initialTransformState.y,
                                    currentData.properties.x,
                                    currentData.properties.y
                                );
                                commandManager.execute(moveCmd);
                            }
                        }
                    }
                    else if (this.initialTransformState.mode === 'rotate') {
                        // Get current rotation value
                        const currentRotation = currentData.properties.angle !== undefined ?
                            currentData.properties.angle : currentData.properties.rotation;
                        const initialRotation = this.initialTransformState.angle !== undefined ?
                            this.initialTransformState.angle : this.initialTransformState.rotation;

                        // Check if rotation changed
                        if (initialRotation !== currentRotation) {
                            const rotateCmd = new commands.RotateObjectCommand(
                                editor,
                                currentData,
                                initialRotation || 0,
                                currentRotation || 0
                            );
                            commandManager.execute(rotateCmd);
                        }
                    }
                }
            }

            // Clear initial state
            this.initialTransformState = null;
        }

        // Handle multi-selection transform end
        if (this.activeObjects && this.activeObjects.length > 1 && this.multiSelectionStartPositions.length > 0) {
            console.log('=== MULTI-SELECTION TRANSFORM ENDED ===');
            console.log('Objects count:', this.activeObjects.length);

            if (editor && editor.sceneData && editor.sceneData.objects) {
                const freshObjects = [];
                this.activeObjects.forEach(obj => {
                    const freshObjectData = editor.sceneData.objects.find(o => o.oid === obj.data.oid);
                    if (freshObjectData) {
                        freshObjects.push(freshObjectData);
                    }
                });

                if (freshObjects.length > 0) {
                    // Refresh scene objects (updates canvas rendering)
                    editor.refreshSceneObjects(freshObjects);

                    // Refresh all UI (hierarchy, layer manager, etc.)
                    if (editor.refreshSceneUI) {
                        editor.refreshSceneUI();
                    }
                }

                // Mark scene as modified
                if (editor && editor.markAsModified) {
                    editor.markAsModified();
                }
            }

            // Update selectedObjects with fresh elements and data, and ensure selection classes
            if (editor.selectedObjects && editor.selectedObjects.length > 0) {
                editor.selectedObjects.forEach(selectedObj => {
                    // Get fresh element
                    const freshElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${selectedObj.data.oid}"]`);
                    if (freshElement) {
                        selectedObj.element = freshElement;
                        // Ensure clickable_selected class is present
                        if (!freshElement.classList.contains('clickable_selected')) {
                            freshElement.classList.add('clickable_selected');
                        }
                    }
                    // Update with fresh data
                    const freshData = editor.sceneData.objects.find(o => o.oid === selectedObj.data.oid);
                    if (freshData) {
                        selectedObj.data = freshData;
                    }
                });
            }

            // Reactivate transform controls for multi-selection
            if (editor.selectedObjects && editor.selectedObjects.length > 1) {
                console.log('Reactivating transform controls for', editor.selectedObjects.length, 'objects');
                this.activateMultiple(editor.selectedObjects);
            }

            console.log('=== MULTI-SELECTION TRANSFORM END COMPLETE ===');
            return;
        }

        // Handle single object transform end
        if (this.activeObject && this.activeObject.data && this.activeObject.data.oid !== 'multi-selection') {
            const props = this.activeObject.data.properties;
            const oid = this.activeObject.data.oid;

            console.log('=== TRANSFORM ENDED ===');
            console.log('Object:', props.name, 'OID:', oid);
            console.log('Position:', { x: props.x, y: props.y });
            console.log('Size:', { width: props.width, height: props.height });
            console.log('Rotation:', props.angle || props.rotation || 0);

            // Get fresh object data from sceneEditor.sceneData.objects
            if (editor && editor.sceneData && editor.sceneData.objects) {
                const freshObjectData = editor.sceneData.objects.find(obj => obj.oid === oid);

                if (freshObjectData) {
                    console.log('Fresh object found in sceneData, refreshing scene objects...');

                    // Refresh scene objects (updates canvas rendering)
                    editor.refreshSceneObjects([freshObjectData]);

                    // Refresh all UI (hierarchy, layer manager, etc.)
                    if (editor.refreshSceneUI) {
                        editor.refreshSceneUI();
                    }

                    // Update property values displayed in the properties panel
                    const propertiesModule = window.properties || properties;
                    if (propertiesModule && propertiesModule.updatePropertyValues) {
                        console.log('Calling properties.updatePropertyValues');
                        propertiesModule.updatePropertyValues(freshObjectData);
                    }
                } else {
                    console.warn('Fresh object not found in sceneData for OID:', oid);
                }
            }

            // Mark scene as modified
            if (editor && editor.markAsModified) {
                editor.markAsModified();
            }

            // Reactivate transform controls for single object
            const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${oid}"]`);
            if (objectElement && editor.sceneData) {
                const freshObjectData = editor.sceneData.objects.find(obj => obj.oid === oid);
                if (freshObjectData) {
                    console.log('Reactivating transform controls for single object');
                    this.activate(objectElement, freshObjectData);
                }
            }
        }

        // Keep object selected - no deselection
        console.log('=== TRANSFORM END COMPLETE ===');
    },

    /**
     * Update all handle positions
     */
    updateHandles() {
        const positions = [
            { x: 0, y: 0 },
            { x: 0.5, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 0.5 },
            { x: 1, y: 1 },
            { x: 0.5, y: 1 },
            { x: 0, y: 1 },
            { x: 0, y: 0.5 }
        ];

        this.handles.forEach((handle, index) => {
            if (index < positions.length) {
                this.updateHandlePosition(handle, positions[index].x, positions[index].y);
            }
        });
    },

    /**
     * Check if the active object is resizable
     */
    isObjectResizable() {
        if (!this.activeObject || !this.activeObject.element) {
            return true; // Default to true
        }

        // For multi-selection, check if ALL objects are resizable
        if (this.activeObjects && this.activeObjects.length > 1) {
            return this.activeObjects.every(obj => {
                const attr = obj.element.getAttribute('__ajs_object_resizable');
                return attr === 'true' || attr === true;
            });
        }

        // Single object
        const attr = this.activeObject.element.getAttribute('__ajs_object_resizable');
        return attr === 'true' || attr === true;
    },

    /**
     * Check if the active object is rotatable
     */
    isObjectRotatable() {
        if (!this.activeObject || !this.activeObject.element) {
            return true; // Default to true
        }

        // For multi-selection, check if ALL objects are rotatable
        if (this.activeObjects && this.activeObjects.length > 1) {
            return this.activeObjects.every(obj => {
                const attr = obj.element.getAttribute('__ajs_object_rotable');
                return attr === 'true' || attr === true;
            });
        }

        // Single object
        const attr = this.activeObject.element.getAttribute('__ajs_object_rotable');
        return attr === 'true' || attr === true;
    },

    /**
     * Refresh transform controls to reflect current object properties
     * Called when properties are changed externally (from properties panel)
     */
    refresh() {
        if (!this.activeObject || !this.boundingBox) {
            return;
        }

        // Handle multi-selection
        if (this.activeObjects && this.activeObjects.length > 1) {
            // Recalculate bounding box for all selected objects
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            this.activeObjects.forEach(obj => {
                const x = obj.data.properties.x || 0;
                const y = obj.data.properties.y || 0;
                const width = obj.data.properties.width || 100;
                const height = obj.data.properties.height || 100;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
            });

            // Update bounding box position and size
            this.boundingBox.style.left = minX + 'px';
            this.boundingBox.style.top = minY + 'px';
            this.boundingBox.style.width = (maxX - minX) + 'px';
            this.boundingBox.style.height = (maxY - minY) + 'px';

            // Update activeObject virtual data
            this.activeObject.data.properties.x = minX;
            this.activeObject.data.properties.y = minY;
            this.activeObject.data.properties.width = maxX - minX;
            this.activeObject.data.properties.height = maxY - minY;
        } else {
            // Single object - update bounding box from object data
            const props = this.activeObject.data.properties;

            if (props) {
                this.boundingBox.style.left = (props.x || 0) + 'px';
                this.boundingBox.style.top = (props.y || 0) + 'px';
                this.boundingBox.style.width = (props.width || 100) + 'px';
                this.boundingBox.style.height = (props.height || 100) + 'px';

                // Update rotation if present
                const rotation = props.angle !== undefined ? props.angle : (props.rotation || 0);
                if (rotation) {
                    this.boundingBox.style.transform = `rotate(${rotation}deg)`;
                } else {
                    this.boundingBox.style.transform = '';
                }
            }
        }

        // Update all handle positions
        this.updateHandles();

        console.log('[TRANSFORM CONTROLS] Refreshed transform controls');
    }
};
