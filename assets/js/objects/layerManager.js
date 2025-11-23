/**
 * Layer Manager - Visual layer hierarchy with preview
 */

const sceneEditor = nw.require('./assets/js/objects/sceneEditor');
const $ = nw.require('jquery');
const fs = nw.require('fs');
const path = nw.require('path');

module.exports = {
    layers: [],
    maxLayers: 20,
    container: null,
    selectedLayer: 0, // Default layer for new objects
    appPath: process.cwd(), // Application base directory

    /**
     * Initialize layer manager
     */
    init() {
        console.log('Initializing layer manager...');
        this.container = document.getElementById('layerManagerContainer');

        if (!this.container) {
            console.error('Layer manager container #layerManagerContainer not found!');
            return;
        }

        console.log('Layer manager container found:', this.container);

        // Connect Add Layer button
        const addLayerBtn = document.getElementById('addLayerBtn');
        if (addLayerBtn) {
            addLayerBtn.onclick = () => this.addLayer();
            console.log('Add Layer button connected');
        } else {
            console.warn('Add Layer button #addLayerBtn not found');
        }

        // Connect Refresh Layers button
        const refreshLayersBtn = document.getElementById('refreshLayersBtn');
        if (refreshLayersBtn) {
            refreshLayersBtn.onclick = () => this.refresh();
            console.log('Refresh Layers button connected');
        }

        // Set initial selected layer
        this.selectedLayer = 0;
        console.log('Initial selected layer:', this.selectedLayer);

        this.refresh();
    },

    /**
     * Refresh layer list based on scene data
     */
    refresh() {
        if (!this.container) {
            console.warn('Layer manager container not found');
            return;
        }

        // Use global sceneEditor reference
        const editor = window.sceneEditor || sceneEditor;
        console.log('Layer manager refresh called - sceneEditor.sceneData:', editor.sceneData);

        if (!editor.sceneData) {
            console.warn('No scene data available for layer manager');
            this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No scene loaded</div>';
            return;
        }

        // Ensure layers array exists
        if (!editor.sceneData.layers || !Array.isArray(editor.sceneData.layers)) {
            console.warn('No layers array in scene data, creating default layer');
            editor.sceneData.layers = [{
                name: 'default',
                isRemovable: false,
                isRenomable: false
            }];
        }

        // Clear container
        this.container.innerHTML = '';

        // Display all layers from sceneData.layers (in reverse order for visual hierarchy)
        const layers = [...editor.sceneData.layers];
        layers.reverse(); // Show highest layers on top

        layers.forEach((layerData, reverseIndex) => {
            const layerIndex = editor.sceneData.layers.length - 1 - reverseIndex; // Get original index
            this.createLayerItem(layerIndex, layerData);
        });

        console.log('Layer manager refreshed. Total layers:', editor.sceneData.layers.length);
    },

    /**
     * Get objects in a specific layer
     */
    getObjectsInLayer(layerIndex) {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !editor.sceneData.objects) return [];

        return editor.sceneData.objects.filter(obj => (obj.layer || 0) === layerIndex);
    },

    /**
     * Select a layer as active
     */
    selectLayer(layerIndex) {
        this.selectedLayer = layerIndex;

        // Update visual selection
        this.container.querySelectorAll('.layer-item').forEach(item => {
            item.classList.remove('selected-layer');
        });

        const layerItem = this.container.querySelector(`[data-layer="${layerIndex}"]`);
        if (layerItem) {
            layerItem.classList.add('selected-layer');
        }

        console.log(`Layer ${layerIndex} selected`);
    },

    /**
     * Create a layer item UI element
     */
    createLayerItem(layerIndex, layerData) {
        const objects = this.getObjectsInLayer(layerIndex);
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer-item';
        if (layerIndex === this.selectedLayer) {
            layerDiv.classList.add('selected-layer');
        }
        layerDiv.dataset.layer = layerIndex;

        // Layer header
        const header = document.createElement('div');
        header.className = 'layer-header';

        // Visibility toggle
        const visibilityBtn = document.createElement('button');
        visibilityBtn.className = 'layer-visibility-btn';
        visibilityBtn.innerHTML = '<i class="ri-eye-line"></i>';
        visibilityBtn.title = 'Toggle visibility';
        visibilityBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleLayerVisibility(layerIndex);
        };

        // Lock toggle
        const lockBtn = document.createElement('button');
        lockBtn.className = 'layer-lock-btn';
        lockBtn.innerHTML = layerData.isLocked ? '<i class="ri-lock-line"></i>' : '<i class="ri-lock-unlock-line"></i>';
        lockBtn.title = layerData.isLocked ? 'Unlock layer' : 'Lock layer';
        lockBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleLayerLock(layerIndex, lockBtn, layerDiv);
        };

        // Layer name and info (with rename support)
        const layerInfo = document.createElement('div');
        layerInfo.className = 'layer-info';

        const layerName = document.createElement('span');
        layerName.className = 'layer-number';
        layerName.textContent = layerData.name || `Layer ${layerIndex}`;
        layerName.title = layerData.isRenomable !== false ? 'Double-click to rename' : '';

        // Make sure the span can be selected for double-click
        layerName.style.userSelect = 'text';
        layerName.style.cursor = 'text';

        const layerCount = document.createElement('span');
        layerCount.className = 'layer-count';
        layerCount.textContent = `${objects.length} object${objects.length !== 1 ? 's' : ''}`;

        layerInfo.appendChild(layerName);
        layerInfo.appendChild(layerCount);

        // Real double-click to rename (if allowed)
        if (layerData.isRenomable !== false) {
            console.log('[LayerManager] Setting up double-click handler for layer:', layerIndex, 'name:', layerData.name);

            layerName.addEventListener('dblclick', (e) => {
                console.log('[LayerManager] ====== DOUBLE CLICK EVENT ======');
                e.stopPropagation();
                e.preventDefault();
                this.startRenameLayer(layerIndex, layerName);
            });
        }

        // Click on layerInfo to select layer
        layerInfo.onclick = (e) => {
            console.log('[LayerManager] Selecting layer from layerInfo:', layerIndex);
            this.selectLayer(layerIndex);
        };

        // Layer actions container
        const layerActions = document.createElement('div');
        layerActions.className = 'layer-actions';

        // Rename button (only if renamable)
        if (layerData.isRenomable !== false) {
            console.log('[LayerManager] Creating rename button for layer:', layerIndex);
            const renameBtn = document.createElement('button');
            renameBtn.className = 'layer-rename-btn';
            renameBtn.innerHTML = '<i class="ri-edit-line"></i>';
            renameBtn.title = 'Rename layer';
            renameBtn.style.fontSize = '14px'; // Make icon larger
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                console.log('[LayerManager] Rename button clicked for layer:', layerIndex);
                this.startRenameLayer(layerIndex, layerName);
            };
            layerActions.appendChild(renameBtn);
            console.log('[LayerManager] Rename button created and added');
        } else {
            console.log('[LayerManager] Layer is NOT renamable, no rename button created for layer:', layerIndex);
        }

        if (layerData.isRemovable !== false) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'layer-delete-btn';
            deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
            deleteBtn.title = 'Delete layer';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteLayer(layerIndex);
            };
            layerActions.appendChild(deleteBtn);
        }

        // Expand/collapse button
        const expandBtn = document.createElement('button');
        expandBtn.className = 'layer-expand-btn';
        expandBtn.innerHTML = '<i class="ri-arrow-down-s-line"></i>';
        expandBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleLayerExpand(layerDiv);
        };
        layerActions.appendChild(expandBtn);

        header.appendChild(visibilityBtn);
        header.appendChild(lockBtn);
        header.appendChild(layerInfo);
        header.appendChild(layerActions);

        // Add locked class if layer is locked
        if (layerData.isLocked) {
            layerDiv.classList.add('locked-layer');
        }

        // Make layer draggable for reordering
        header.setAttribute('draggable', 'true');
        header.style.cursor = 'grab';

        let draggedLayerIndex = null;

        header.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            draggedLayerIndex = layerIndex;
            layerDiv.classList.add('dragging');
            header.style.cursor = 'grabbing';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/layer-index', layerIndex.toString());
        });

        header.addEventListener('dragend', (e) => {
            e.stopPropagation();
            layerDiv.classList.remove('dragging');
            header.style.cursor = 'grab';
            draggedLayerIndex = null;
            // Remove all drag-over classes
            this.container.querySelectorAll('.layer-item').forEach(item => {
                item.classList.remove('drag-over-layer');
            });
        });

        // Handle drag over for layer reordering
        layerDiv.addEventListener('dragenter', (e) => {
            const layerIndexData = e.dataTransfer.types.includes('text/layer-index');
            if (layerIndexData && draggedLayerIndex !== null && draggedLayerIndex !== layerIndex) {
                e.preventDefault();
                layerDiv.classList.add('drag-over-layer');
            }
        });

        layerDiv.addEventListener('dragleave', (e) => {
            if (!layerDiv.contains(e.relatedTarget)) {
                layerDiv.classList.remove('drag-over-layer');
            }
        });

        // Layer preview (thumbnail)
        const preview = document.createElement('div');
        preview.className = 'layer-preview';
        preview.style.backgroundImage = 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%, transparent 75%, #2a2a2a 75%), linear-gradient(45deg, #2a2a2a 25%, transparent 25%, transparent 75%, #2a2a2a 75%)';
        preview.style.backgroundSize = '10px 10px';
        preview.style.backgroundPosition = '0 0, 5px 5px';
        preview.style.cursor = 'pointer';

        // Click on preview to select layer
        preview.onclick = (e) => {
            e.stopPropagation();
            console.log('[LayerManager] Selecting layer from preview:', layerIndex);
            this.selectLayer(layerIndex);
        };

        // Render objects in preview
        this.renderLayerPreview(preview, objects);

        // Objects list
        const objectsList = document.createElement('div');
        objectsList.className = 'layer-objects-list';
        objectsList.style.display = 'none';

        objects.forEach(obj => {
            const objItem = document.createElement('div');
            objItem.className = 'layer-object-item';
            objItem.dataset.oid = obj.oid;

            const extensionName = obj.extension.split('.').pop();
            objItem.innerHTML = `
                <i class="ri-checkbox-blank-circle-fill layer-object-indicator"></i>
                <span class="layer-object-name">${obj.properties.name || extensionName}</span>
                <span class="layer-object-type">${extensionName}</span>
            `;

            objItem.onclick = () => this.selectObject(obj.oid);
            objItem.oncontextmenu = (e) => {
                e.preventDefault();
                this.showObjectContextMenu(e, obj);
            };

            objectsList.appendChild(objItem);
        });

        // Drag and drop handlers for accepting objects from scene
        layerDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            layerDiv.classList.add('drag-over');
        });

        layerDiv.addEventListener('dragleave', (e) => {
            e.stopPropagation();
            // Only remove if we're actually leaving the layer
            if (!layerDiv.contains(e.relatedTarget)) {
                layerDiv.classList.remove('drag-over');
            }
        });

        layerDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            layerDiv.classList.remove('drag-over');
            layerDiv.classList.remove('drag-over-layer');

            // Check if it's a layer being dropped (for reordering)
            const droppedLayerIndex = e.dataTransfer.getData('text/layer-index');

            if (droppedLayerIndex !== '' && droppedLayerIndex !== null) {
                // Layer reordering
                const fromIndex = parseInt(droppedLayerIndex);
                const toIndex = layerIndex;

                if (fromIndex !== toIndex) {
                    this.reorderLayers(fromIndex, toIndex);
                }
                return;
            }

            // Get the dragged object ID(s)
            const oidsString = e.dataTransfer.getData('text/plain');

            if (!oidsString) {
                console.error('No OID in drop data');
                return;
            }

            // Handle multiple OIDs (comma-separated) or single OID
            const oids = oidsString.split(',');
            if (oids.length > 1) {
                // Move multiple objects
                this.moveMultipleObjectsToLayer(oids, layerIndex);
            } else {
                // Move single object
                this.moveObjectToLayer(oids[0], layerIndex);
            }
        });

        // Assemble layer item
        layerDiv.appendChild(header);
        layerDiv.appendChild(preview);
        layerDiv.appendChild(objectsList);

        this.container.appendChild(layerDiv);
    },

    /**
     * Toggle layer visibility
     */
    toggleLayerVisibility(layerIndex) {
        const layer = document.querySelector(`[id*="layer_${layerIndex}"]`);
        if (!layer) return;

        const isVisible = layer.style.display !== 'none';
        layer.style.display = isVisible ? 'none' : 'block';

        // Update button icon
        const btn = this.container.querySelector(`[data-layer="${layerIndex}"] .layer-visibility-btn i`);
        if (btn) {
            btn.className = isVisible ? 'ri-eye-off-line' : 'ri-eye-line';
        }
    },

    /**
     * Toggle layer lock state
     */
    toggleLayerLock(layerIndex, lockBtn, layerDiv) {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !editor.sceneData.layers) return;

        const layerData = editor.sceneData.layers[layerIndex];
        if (!layerData) return;

        // Toggle locked state
        layerData.isLocked = !layerData.isLocked;

        // Update button appearance
        lockBtn.innerHTML = layerData.isLocked ? '<i class="ri-lock-line"></i>' : '<i class="ri-lock-unlock-line"></i>';
        lockBtn.title = layerData.isLocked ? 'Unlock layer' : 'Lock layer';

        // Update layer item appearance
        if (layerData.isLocked) {
            layerDiv.classList.add('locked-layer');

            // Lock all objects on this layer
            const objects = this.getObjectsInLayer(layerIndex);
            objects.forEach(obj => {
                obj.locked = true;
                const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${obj.oid}"]`);
                if (objectElement) {
                    objectElement.classList.add('locked-object');
                }
            });
        } else {
            layerDiv.classList.remove('locked-layer');

            // Unlock all objects on this layer (but only those locked by layer lock, not individually locked)
            const objects = this.getObjectsInLayer(layerIndex);
            objects.forEach(obj => {
                // Only unlock if object doesn't have an explicit individual lock
                if (!obj.wasIndividuallyLocked) {
                    obj.locked = false;
                    const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${obj.oid}"]`);
                    if (objectElement) {
                        objectElement.classList.remove('locked-object');
                    }
                }
            });
        }

        // Refresh hierarchy to show updated lock states
        if (editor.refreshSceneUI) {
            editor.refreshSceneUI();
        }

        // Mark scene as modified
        if (editor.markAsModified) {
            editor.markAsModified();
        }

        // Show notification
        const notifications = nw.require('./assets/js/objects/notifications');
        if (notifications) {
            notifications.info(`Layer "${layerData.name}" ${layerData.isLocked ? 'locked' : 'unlocked'}`);
        }

        console.log(`Layer ${layerData.name} ${layerData.isLocked ? 'locked' : 'unlocked'}`);
    },

    /**
     * Toggle layer expand/collapse
     */
    toggleLayerExpand(layerDiv) {
        const objectsList = layerDiv.querySelector('.layer-objects-list');
        const expandBtn = layerDiv.querySelector('.layer-expand-btn i');

        if (objectsList.style.display === 'none') {
            objectsList.style.display = 'block';
            expandBtn.className = 'ri-arrow-up-s-line';
            layerDiv.classList.add('expanded');
        } else {
            objectsList.style.display = 'none';
            expandBtn.className = 'ri-arrow-down-s-line';
            layerDiv.classList.remove('expanded');
        }
    },

    /**
     * Select object in scene
     */
    selectObject(oid) {
        // Find object in scene
        const objectElement = document.querySelector(`[oid="${oid}"]`);
        if (objectElement) {
            // Trigger click on object
            objectElement.click();

            // Highlight in hierarchy
            this.highlightObject(oid);
        }
    },

    /**
     * Highlight object in layer manager
     */
    highlightObject(oid) {
        // Remove previous highlights
        this.container.querySelectorAll('.layer-object-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add highlight to selected object
        const objItem = this.container.querySelector(`[data-oid="${oid}"]`);
        if (objItem) {
            objItem.classList.add('selected');
        }
    },

    /**
     * Show context menu for object
     */
    showObjectContextMenu(e, objectData) {
        // This will be integrated with the existing context menu system
        console.log('Object context menu', objectData);
    },

    /**
     * Move object to different layer
     */
    moveObjectToLayer(oid, newLayer) {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !editor.sceneData.objects) {
            console.error('Cannot move object: no scene data');
            return false;
        }

        const obj = editor.sceneData.objects.find(o => o.oid === oid);
        if (!obj) {
            console.error('Object not found:', oid);
            return false;
        }

        const oldLayer = obj.layer !== undefined ? obj.layer : 0;
        const objectName = obj.properties?.name || 'Unknown';

        // Check if already on target layer
        if (oldLayer === newLayer) {
            console.log('Object already on Layer', newLayer);
            return false;
        }

        // Create and execute undo/redo command
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const changeLayerCmd = new commands.ChangeLayerCommand(editor, obj, oldLayer, newLayer);
        commandManager.execute(changeLayerCmd);

        console.log(`Moved "${objectName}" from Layer ${oldLayer} to Layer ${newLayer}`);

        // Update selectedObjects if this object is selected
        if (editor.selectedObjects && editor.selectedObjects.length > 0) {
            const selectedObj = editor.selectedObjects.find(s => s.data.oid === oid);
            if (selectedObj) {
                selectedObj.data = obj; // Update with fresh data
                const freshElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${oid}"]`);
                if (freshElement) {
                    selectedObj.element = freshElement;
                    // Ensure clickable_selected class is present
                    if (!freshElement.classList.contains('clickable_selected')) {
                        freshElement.classList.add('clickable_selected');
                    }
                }
            }
        }

        // Reactivate transform controls if object was selected
        const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${oid}"]`);
        if (objectElement && objectElement.classList.contains('clickable_selected')) {
            const transformControls = nw.require('./assets/js/objects/transformControls');
            // Check if part of multi-selection
            if (editor.selectedObjects && editor.selectedObjects.length > 1) {
                transformControls.activateMultiple(editor.selectedObjects);
            } else {
                transformControls.activate(objectElement, obj);
            }
        }

        // Show notification
        const notifications = nw.require('./assets/js/objects/notifications');
        notifications.success(`Moved to Layer ${newLayer}`);

        return true;
    },

    /**
     * Move multiple objects to different layer
     */
    moveMultipleObjectsToLayer(oids, newLayer) {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !editor.sceneData.objects) {
            console.error('Cannot move objects: no scene data');
            return false;
        }

        const changeLayerCommands = [];

        oids.forEach(oid => {
            const obj = editor.sceneData.objects.find(o => o.oid === oid);
            if (obj) {
                const oldLayer = obj.layer !== undefined ? obj.layer : 0;
                if (oldLayer !== newLayer) {
                    const commands = nw.require('./assets/js/objects/commands');
                    const changeLayerCmd = new commands.ChangeLayerCommand(editor, obj, oldLayer, newLayer);
                    changeLayerCommands.push(changeLayerCmd);
                }
            }
        });

        if (changeLayerCommands.length === 0) {
            console.log('No objects needed to be moved');
            return false;
        }

        // Execute all layer changes as a batch command
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const batchCmd = new commands.BatchCommand('Move Objects to Layer', changeLayerCommands);
        commandManager.execute(batchCmd);

        console.log(`Moved ${changeLayerCommands.length} object(s) to Layer ${newLayer}`);

        // Update selectedObjects with fresh data and elements after move
        if (editor.selectedObjects && editor.selectedObjects.length > 0) {
            editor.selectedObjects.forEach(selectedObj => {
                const freshData = editor.sceneData.objects.find(o => o.oid === selectedObj.data.oid);
                const freshElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${selectedObj.data.oid}"]`);

                if (freshData) {
                    selectedObj.data = freshData;
                }
                if (freshElement) {
                    selectedObj.element = freshElement;
                    // Ensure clickable_selected class is present
                    if (!freshElement.classList.contains('clickable_selected')) {
                        freshElement.classList.add('clickable_selected');
                    }
                }
            });

            // Reactivate transform controls
            const transformControls = nw.require('./assets/js/objects/transformControls');
            if (editor.selectedObjects.length > 1) {
                transformControls.activateMultiple(editor.selectedObjects);
            } else if (editor.selectedObjects.length === 1) {
                transformControls.activate(editor.selectedObjects[0].element, editor.selectedObjects[0].data);
            }
        }

        // Show notification
        const notifications = nw.require('./assets/js/objects/notifications');
        notifications.success(`Moved ${movedCount} object${movedCount > 1 ? 's' : ''} to Layer ${newLayer}`);

        return true;
    },

    /**
     * Reorder layers by moving a layer from one index to another
     */
    reorderLayers(fromIndex, toIndex) {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !editor.sceneData.layers) {
            console.error('Cannot reorder layers: no scene data or layers');
            return false;
        }

        const layers = editor.sceneData.layers;

        if (fromIndex < 0 || fromIndex >= layers.length || toIndex < 0 || toIndex >= layers.length) {
            console.error('Invalid layer indices:', fromIndex, toIndex);
            return false;
        }

        console.log(`Reordering layer from index ${fromIndex} to ${toIndex}`);

        // Remove the layer from its original position
        const [movedLayer] = layers.splice(fromIndex, 1);

        // Insert it at the new position
        layers.splice(toIndex, 0, movedLayer);

        // Update all objects' layer indices
        editor.sceneData.objects.forEach(obj => {
            const currentLayer = obj.layer !== undefined ? obj.layer : 0;

            if (currentLayer === fromIndex) {
                // Object was on the moved layer
                obj.layer = toIndex;
            } else if (fromIndex < toIndex) {
                // Layer moved down, shift layers in between up
                if (currentLayer > fromIndex && currentLayer <= toIndex) {
                    obj.layer--;
                }
            } else {
                // Layer moved up, shift layers in between down
                if (currentLayer >= toIndex && currentLayer < fromIndex) {
                    obj.layer++;
                }
            }
        });

        // Refresh all UI
        if (editor.refreshSceneUI) {
            editor.refreshSceneUI();
        }

        // Refresh scene to update z-indices
        if (editor.sceneData.objects) {
            editor.refreshSceneObjects(editor.sceneData.objects);
        }

        // Mark scene as modified
        if (editor.markAsModified) {
            editor.markAsModified();
        }

        // Show notification
        const notifications = nw.require('./assets/js/objects/notifications');
        notifications.success(`Layer "${movedLayer.name}" reordered`);

        console.log('Layers reordered successfully');
        return true;
    },

    /**
     * Start renaming a layer
     */
    startRenameLayer(layerIndex, layerNameElement) {
        console.log('[LayerManager] startRenameLayer called for layer:', layerIndex);

        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !editor.sceneData.layers) {
            console.error('[LayerManager] No sceneData or layers array');
            return;
        }

        const layerData = editor.sceneData.layers[layerIndex];
        console.log('[LayerManager] Layer data:', layerData);

        if (!layerData) {
            console.error('[LayerManager] Layer data not found for index:', layerIndex);
            return;
        }

        if (layerData.isRenomable === false) {
            console.warn('[LayerManager] Layer cannot be renamed (isRenomable = false)');
            const notifications = nw.require('./assets/js/objects/notifications');
            notifications.warning('This layer cannot be renamed');
            return;
        }

        const currentName = layerData.name;
        console.log('[LayerManager] Current layer name:', currentName);

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'layer-rename-input';
        input.style.cssText = `
            background: var(--primary-800);
            border: 1px solid var(--secondary);
            color: var(--text-primary);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: var(--text-sm);
            width: 100%;
            outline: none;
        `;

        // Replace name element with input
        const parent = layerNameElement.parentNode;
        parent.replaceChild(input, layerNameElement);
        input.focus();
        input.select();

        const finishRename = () => {
            const newName = input.value.trim() || currentName;
            console.log('[LayerManager] Finishing rename. New name:', newName);

            if (newName !== currentName) {
                layerData.name = newName;
                console.log(`[LayerManager] Layer ${layerIndex} renamed from "${currentName}" to "${newName}"`);

                // Refresh hierarchy to show new layer name
                if (editor.refreshSceneUI) {
                    editor.refreshSceneUI();
                }

                // Mark scene as modified
                if (editor.markAsModified) {
                    editor.markAsModified();
                }
            }

            // Restore name element
            parent.replaceChild(layerNameElement, input);
            layerNameElement.textContent = layerData.name;
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishRename();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.value = currentName;
                finishRename();
            }
        });
    },

    /**
     * Delete a layer
     */
    deleteLayer(layerIndex) {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !editor.sceneData.layers) return;

        const layerData = editor.sceneData.layers[layerIndex];
        if (!layerData || layerData.isRemovable === false) {
            const notifications = nw.require('./assets/js/objects/notifications');
            notifications.error('This layer cannot be deleted');
            return;
        }

        // Count objects on this layer
        const objectsOnLayer = this.getObjectsInLayer(layerIndex);
        const objectCount = objectsOnLayer.length;

        // Create confirmation dialog
        const confirmDelete = () => {
            // Remove all objects on this layer (both from DOM and data)
            if (objectCount > 0) {
                console.log('[LayerManager] Removing', objectCount, 'objects from layer', layerIndex);

                // First, remove visual elements from DOM
                objectsOnLayer.forEach(obj => {
                    const element = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${obj.oid}"]`);
                    if (element) {
                        console.log('[LayerManager] Removing visual element for object:', obj.oid);
                        element.remove();
                    } else {
                        console.warn('[LayerManager] Could not find visual element for object:', obj.oid);
                    }
                });

                // Then, remove from scene data
                editor.sceneData.objects = editor.sceneData.objects.filter(obj => (obj.layer || 0) !== layerIndex);
                console.log('[LayerManager] ✓ Removed', objectCount, 'objects from data');
            }

            // Remove layer from array
            editor.sceneData.layers.splice(layerIndex, 1);

            // Adjust layer indices for objects on higher layers
            editor.sceneData.objects.forEach(obj => {
                if ((obj.layer || 0) > layerIndex) {
                    obj.layer--;
                }
            });

            // Adjust selected layer if necessary
            if (this.selectedLayer === layerIndex) {
                this.selectedLayer = 0;
            } else if (this.selectedLayer > layerIndex) {
                this.selectedLayer--;
            }

            console.log(`Layer ${layerIndex} deleted (${objectCount} objects removed)`);

            // Refresh scene and UI
            if (editor.refreshSceneUI) {
                editor.refreshSceneUI();
            }

            // Mark scene as modified
            if (editor.markAsModified) {
                editor.markAsModified();
            }

            // Show notification
            const notifications = nw.require('./assets/js/objects/notifications');
            notifications.success(`Layer "${layerData.name}" deleted`);

            // Remove dialog
            dialog.remove();
        };

        // Create custom confirmation dialog
        const dialog = document.createElement('div');
        dialog.id = 'deleteLayerDialog';
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
        `;

        const dialogBox = document.createElement('div');
        dialogBox.style.cssText = `
            background: var(--primary-700);
            border: 1px solid var(--border-default);
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        dialogBox.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: var(--text-primary); font-size: 18px;">
                <i class="ri-error-warning-line" style="color: var(--warning);"></i>
                Delete Layer
            </h3>
            <p style="margin: 0 0 20px 0; color: var(--text-secondary); line-height: 1.5;">
                Are you sure you want to delete layer <strong>"${layerData.name}"</strong>?
                ${objectCount > 0 ? `<br><br><span style="color: var(--warning);">This will also delete ${objectCount} object${objectCount !== 1 ? 's' : ''} on this layer.</span>` : ''}
            </p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="deleteLayerCancel" style="
                    background: var(--primary-600);
                    border: 1px solid var(--border-default);
                    color: var(--text-primary);
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancel</button>
                <button id="deleteLayerConfirm" style="
                    background: var(--error);
                    border: none;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                ">Delete Layer</button>
            </div>
        `;

        dialog.appendChild(dialogBox);
        document.body.appendChild(dialog);

        // Event listeners
        document.getElementById('deleteLayerConfirm').onclick = confirmDelete;
        document.getElementById('deleteLayerCancel').onclick = () => dialog.remove();
        dialog.onclick = (e) => {
            if (e.target === dialog) dialog.remove();
        };
    },

    /**
     * Add a new layer
     */
    addLayer() {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData) {
            const notifications = nw.require('./assets/js/objects/notifications');
            notifications.error('No scene loaded');
            return;
        }

        // Ensure layers array exists
        if (!editor.sceneData.layers) {
            editor.sceneData.layers = [];
        }

        if (editor.sceneData.layers.length >= this.maxLayers) {
            const notifications = nw.require('./assets/js/objects/notifications');
            notifications.error(`Maximum ${this.maxLayers} layers allowed`);
            return;
        }

        // Create new layer
        const newLayerIndex = editor.sceneData.layers.length;
        const newLayer = {
            name: `Layer ${newLayerIndex}`,
            isRemovable: true,
            isRenomable: true
        };

        editor.sceneData.layers.push(newLayer);

        console.log(`New layer added: ${newLayer.name}`);

        // Refresh UI
        this.refresh();

        // Select the new layer
        this.selectLayer(newLayerIndex);

        // Mark scene as modified
        if (editor.markAsModified) {
            editor.markAsModified();
        }

        // Show notification
        const notifications = nw.require('./assets/js/objects/notifications');
        notifications.success(`Layer "${newLayer.name}" added`);
    },

    /**
     * Load extension metadata directly from filesystem
     */
    getExtensionMetadata(extensionId) {
        try {
            const extensionPath = path.join(this.appPath, 'extensions', extensionId, 'data.json');
            console.log('LayerManager: Attempting to load extension from:', extensionPath);

            if (fs.existsSync(extensionPath)) {
                const data = fs.readFileSync(extensionPath, 'utf8');
                const parsed = JSON.parse(data);
                console.log('LayerManager: Successfully loaded extension data:', extensionId, parsed);
                return parsed;
            } else {
                console.warn('LayerManager: Extension file does not exist:', extensionPath);
            }
        } catch (e) {
            console.warn('LayerManager: Failed to load extension metadata:', extensionId, e);
        }
        return null;
    },

    /**
     * Render visual preview of objects in layer - drawing each object individually with viewport positioning
     */
    renderLayerPreview(previewElement, objects) {
        if (objects.length === 0) {
            previewElement.innerHTML = '<span class="layer-preview-label">Empty Layer</span>';
            return;
        }

        // Get app dimensions from project data
        const editor = window.sceneEditor || sceneEditor;
        const projectData = window.globals?.projectData;
        const appWidth = projectData?.properties?.width || 640;
        const appHeight = projectData?.properties?.height || 480;

        // Get scene background color
        const sceneData = editor?.sceneData;
        const backgroundColor = sceneData?.properties?.backgroundColor || '#000000';

        // Layer viewport dimensions (16:9 ratio like a computer screen)
        const viewportWidth = 128;
        const viewportHeight = 96;

        // Calculate scale to fit app dimensions in viewport
        const scale = Math.min(viewportWidth / appWidth, viewportHeight / appHeight);

        // Clear and prepare preview element
        previewElement.innerHTML = '';
        previewElement.style.position = 'relative';
        previewElement.style.width = viewportWidth + 'px';
        previewElement.style.height = viewportHeight + 'px';
        previewElement.style.backgroundColor = backgroundColor;
        previewElement.style.backgroundImage = 'none'; // Remove any grid/pattern
        previewElement.style.margin = '0 auto';

        // Sort objects by layer order
        const sortedObjects = [...objects].sort((a, b) => {
            const layerA = a.layer || 0;
            const layerB = b.layer || 0;
            return layerA - layerB;
        });

        // Create individual canvas for each object
        sortedObjects.forEach(obj => {
            // Get extension metadata for preview mode
            const extensionData = this.getExtensionMetadata(obj.extension);
            const previewMode = extensionData?.hierarchyPreview || 'icon';
            const extensionIcon = extensionData?.extensionIcon;

            // Calculate scaled position and dimensions for viewport
            const scaledX = (obj.properties.x || 0) * scale;
            const scaledY = (obj.properties.y || 0) * scale;
            const scaledWidth = (obj.properties.width || 50) * scale;
            const scaledHeight = (obj.properties.height || 50) * scale;

            // Create container for this object
            const objContainer = document.createElement('div');
            objContainer.className = 'layer-preview-object';
            objContainer.style.position = 'absolute';
            objContainer.style.left = scaledX + 'px';
            objContainer.style.top = scaledY + 'px';
            objContainer.style.width = scaledWidth + 'px';
            objContainer.style.height = scaledHeight + 'px';
            objContainer.title = obj.properties.name || obj.extension;

            if (previewMode === 'preview') {
                // Create a mini canvas and render directly via extension
                const canvas = document.createElement('canvas');
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.display = 'block';
                canvas.style.imageRendering = 'pixelated';

                // Function to render object
                const renderObject = () => {
                    // Get the extension
                    const extension = window.__editorExtensions?.[obj.extension];
                    if (!extension || !extension.update) {
                        return false;
                    }

                    // Clear canvas
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, scaledWidth, scaledHeight);

                    // Create object data with scaled dimensions
                    const objectData = {
                        ...obj,
                        properties: {
                            ...obj.properties,
                            x: 0,
                            y: 0,
                            width: scaledWidth,
                            height: scaledHeight
                        }
                    };

                    try {
                        // Call extension's update method to draw
                        extension.update(canvas, objectData);
                        return true;
                    } catch (e) {
                        console.error('LayerManager: Failed to render object:', e);
                        return false;
                    }
                };

                // Render immediately and retry for async image loading
                renderObject();
                setTimeout(() => renderObject(), 100);
                setTimeout(() => renderObject(), 300);
                setTimeout(() => renderObject(), 600);

                objContainer.appendChild(canvas);
            } else if (previewMode === 'icon' && extensionIcon) {
                // Show extension icon
                const img = document.createElement('img');
                const iconPath = path.join(this.appPath, 'extensions', obj.extension, extensionIcon).replace(/\\/g, '/');
                img.src = iconPath;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                objContainer.appendChild(img);
            } else {
                // Fallback: colored box
                objContainer.style.backgroundColor = this.getObjectColor(obj);
                objContainer.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            }

            previewElement.appendChild(objContainer);
        });
    },

    /**
     * Refresh layer previews for specific objects (real-time updates)
     */
    refreshLayerPreviews(objectsData) {
        if (!objectsData || !Array.isArray(objectsData)) {
            return;
        }

        if (!this.container) {
            console.warn('Layer manager container not available, cannot refresh previews');
            return;
        }

        console.log('Refreshing layer previews for', objectsData.length, 'objects');

        // Get unique layers affected by these objects
        const affectedLayers = new Set();
        objectsData.forEach(obj => {
            affectedLayers.add(obj.layer || 0);
        });

        // Refresh preview for each affected layer
        affectedLayers.forEach(layerNum => {
            const layerItem = this.container.querySelector(`[data-layer="${layerNum}"]`);
            if (layerItem) {
                const previewElement = layerItem.querySelector('.layer-preview');
                if (previewElement) {
                    // Get all objects in this layer
                    const objects = this.getObjectsInLayer(layerNum);

                    console.log(`Refreshing preview for layer ${layerNum} with ${objects.length} objects`);

                    // Re-render the preview
                    this.renderLayerPreview(previewElement, objects);
                }
            }
        });
    },

    /**
     * Get a color for object based on its type
     */
    getObjectColor(obj) {
        const extensionColors = {
            'com.ajs.sprite': '#ff6b6b',
            'com.ajs.image': '#4ecdc4',
            'com.ajs.button': '#45b7d1',
            'com.ajs.text': '#96ceb4',
            'com.ajs.shape': '#ffeaa7',
        };

        return extensionColors[obj.extension] || '#a29bfe';
    }
};
