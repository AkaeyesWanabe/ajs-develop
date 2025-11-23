/**
 * Hierarchy Module - Manages the scene hierarchy tree display
 */

const functions = nw.require('./assets/js/common/functions');
const $ = nw.require('jquery');
const fs = nw.require('fs');
const path = nw.require('path');

module.exports = {
    container: null,
    sceneEditor: null,
    objectFactory: null,
    _initialized: false,
    appPath: process.cwd(), // Application base directory

    /**
     * Initialize hierarchy module (called automatically on first refresh)
     */
    init(sceneEditorRef, objectFactoryRef) {
        if (this._initialized) return;

        console.log('Initializing hierarchy module...');
        this.sceneEditor = sceneEditorRef;
        this.objectFactory = objectFactoryRef;
        this.container = document.getElementById('hierarchyTree');

        if (!this.container) {
            console.error('Hierarchy tree container #hierarchyTree not found!');
            return;
        }

        this._initialized = true;
        console.log('Hierarchy module initialized');
    },

    /**
     * Ensure the module is initialized
     */
    ensureInitialized() {
        if (!this._initialized) {
            // Try to get container
            this.container = document.getElementById('hierarchyTree');
            if (this.container) {
                // Try to load objectFactory if not set
                if (!this.objectFactory) {
                    try {
                        this.objectFactory = nw.require('./assets/js/objects/objectFactory');
                    } catch (e) {
                        console.warn('Could not load objectFactory:', e);
                    }
                }
                this._initialized = true;
                console.log('Hierarchy auto-initialized');
            }
        }
    },

    /**
     * Refresh the hierarchy tree to display layers and objects
     */
    refresh() {
        // Ensure initialized
        this.ensureInitialized();

        if (!this.container) {
            console.warn('Hierarchy container not found');
            return;
        }

        // Use global sceneEditor reference
        const editor = window.sceneEditor || this.sceneEditor;
        console.log('Hierarchy refresh called - sceneEditor.sceneData:', editor?.sceneData);

        if (!editor || !editor.sceneData) {
            this.container.innerHTML = '<div class="hierarchy-empty">No scene loaded</div>';
            console.log('Hierarchy: sceneData is null or undefined');
            return;
        }

        if (!editor.sceneData.objects) {
            this.container.innerHTML = '<div class="hierarchy-empty">No objects in scene</div>';
            console.log('Hierarchy: sceneData.objects is null or undefined');
            return;
        }

        console.log('Refreshing hierarchy with', editor.sceneData.objects.length, 'objects');

        // Save current selection before refresh
        const selectedOIDs = [];
        this.container.querySelectorAll('.hierarchy-object-item.selected').forEach(item => {
            const oid = item.getAttribute('oid');
            if (oid) selectedOIDs.push(oid);
        });

        // Group objects by layer
        const layerGroups = {};
        editor.sceneData.objects.forEach(obj => {
            const layer = obj.layer !== undefined ? obj.layer : 0;
            if (!layerGroups[layer]) {
                layerGroups[layer] = [];
            }
            layerGroups[layer].push(obj);
        });

        // Build hierarchy HTML
        this.container.innerHTML = '';

        // Sort layers in descending order (higher layers on top)
        const sortedLayers = Object.keys(layerGroups).map(Number).sort((a, b) => b - a);

        sortedLayers.forEach(layerNum => {
            const layerDiv = this.createLayerGroupElement(layerNum, layerGroups[layerNum]);
            this.container.appendChild(layerDiv);
        });

        // Restore selection after refresh
        if (selectedOIDs.length > 0) {
            selectedOIDs.forEach(oid => {
                const item = this.container.querySelector(`.hierarchy-object-item[oid="${oid}"]`);
                if (item) {
                    item.classList.add('selected');
                }
            });
        }

        console.log('Hierarchy refreshed with', sortedLayers.length, 'layers');
    },

    /**
     * Create a layer group element with objects
     */
    createLayerGroupElement(layerNum, objects) {
        const layerDiv = functions.createElement('div', { className: 'hierarchy-layer' });
        layerDiv.setAttribute('data-layer', layerNum);

        // Get layer name from sceneData.layers
        const editor = window.sceneEditor || this.sceneEditor;
        let layerName = `Layer ${layerNum}`; // Default fallback

        if (editor?.sceneData?.layers && editor.sceneData.layers[layerNum]) {
            layerName = editor.sceneData.layers[layerNum].name || layerName;
        }

        // Layer header
        const header = functions.createElement('div', { className: 'hierarchy-layer-header' });
        header.innerHTML = `
            <i class="ri-arrow-down-s-line hierarchy-layer-icon"></i>
            <i class="ri-stack-line"></i>
            <span>${layerName}</span>
            <span class="hierarchy-layer-count">${objects.length}</span>
        `;

        // Toggle expand/collapse on header click
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            const objectsList = layerDiv.querySelector('.hierarchy-objects-list');
            const icon = header.querySelector('.hierarchy-layer-icon');

            if (layerDiv.classList.contains('collapsed')) {
                layerDiv.classList.remove('collapsed');
                icon.classList.remove('ri-arrow-right-s-line');
                icon.classList.add('ri-arrow-down-s-line');
            } else {
                layerDiv.classList.add('collapsed');
                icon.classList.remove('ri-arrow-down-s-line');
                icon.classList.add('ri-arrow-right-s-line');
            }
        });

        layerDiv.appendChild(header);

        // Objects list
        const objectsList = functions.createElement('div', { className: 'hierarchy-objects-list' });

        // Separate grouped and non-grouped objects
        const groupedObjects = {};
        const nonGroupedObjects = [];

        objects.forEach(obj => {
            if (obj.groupId) {
                if (!groupedObjects[obj.groupId]) {
                    groupedObjects[obj.groupId] = [];
                }
                groupedObjects[obj.groupId].push(obj);
            } else {
                nonGroupedObjects.push(obj);
            }
        });

        // Get group data from sceneData
        const groups = editor?.sceneData?.groups || [];

        // Add groups first
        Object.keys(groupedObjects).forEach(groupId => {
            const groupData = groups.find(g => g.id === groupId);
            const groupObjects = groupedObjects[groupId];

            const groupContainer = this.createGroupElement(groupId, groupData, groupObjects);
            objectsList.appendChild(groupContainer);
        });

        // Add non-grouped objects
        nonGroupedObjects.forEach(obj => {
            const objectItem = this.createHierarchyObjectItem(obj);
            objectsList.appendChild(objectItem);
        });

        layerDiv.appendChild(objectsList);

        return layerDiv;
    },

    /**
     * Create a group element with its objects
     */
    createGroupElement(groupId, groupData, objects) {
        const groupDiv = functions.createElement('div', { className: 'hierarchy-group' });
        groupDiv.setAttribute('data-group-id', groupId);

        // Group header
        const header = functions.createElement('div', { className: 'hierarchy-group-header' });

        const isCollapsed = groupData?.collapsed || false;
        const groupName = groupData?.name || `Group ${groupId.slice(-4)}`;

        // Build header content
        const arrowIcon = document.createElement('i');
        arrowIcon.className = isCollapsed ? 'ri-arrow-right-s-line hierarchy-group-icon' : 'ri-arrow-down-s-line hierarchy-group-icon';

        const groupIcon = document.createElement('i');
        groupIcon.className = 'ri-group-line';

        const groupNameSpan = document.createElement('span');
        groupNameSpan.className = 'hierarchy-group-name';
        groupNameSpan.textContent = groupName;
        groupNameSpan.title = 'Double-click to rename';

        const groupCount = document.createElement('span');
        groupCount.className = 'hierarchy-group-count';
        groupCount.textContent = objects.length;

        header.appendChild(arrowIcon);
        header.appendChild(groupIcon);
        header.appendChild(groupNameSpan);
        header.appendChild(groupCount);

        // Ungroup button
        const ungroupBtn = document.createElement('button');
        ungroupBtn.className = 'hierarchy-group-ungroup-btn';
        ungroupBtn.innerHTML = '<i class="ri-link-unlink"></i>';
        ungroupBtn.title = 'Ungroup';
        ungroupBtn.onclick = (e) => {
            e.stopPropagation();
            const groupManager = nw.require('./assets/js/objects/groupManager');
            if (groupManager) {
                // Select all objects in group first
                groupManager.selectGroup(groupId);
                // Then ungroup
                groupManager.ungroupObjects();
            }
        };

        header.appendChild(ungroupBtn);

        // Double-click on group name to rename
        groupNameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startRenamingGroup(groupId, groupData, groupNameSpan);
        });

        // Toggle expand/collapse on header click (but not on name span)
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            // Don't toggle if clicking on the name span
            if (e.target === groupNameSpan) return;

            const groupManager = nw.require('./assets/js/objects/groupManager');
            if (groupManager) {
                groupManager.toggleGroupCollapse(groupId);
            }
        });

        groupDiv.appendChild(header);

        // Objects list
        const groupObjectsList = functions.createElement('div', { className: 'hierarchy-group-objects' });

        if (isCollapsed) {
            groupDiv.classList.add('collapsed');
        }

        objects.forEach(obj => {
            const objectItem = this.createHierarchyObjectItem(obj);
            groupObjectsList.appendChild(objectItem);
        });

        groupDiv.appendChild(groupObjectsList);

        return groupDiv;
    },

    /**
     * Load extension metadata directly from filesystem
     */
    getExtensionMetadata(extensionId) {
        try {
            const extensionPath = path.join(this.appPath, 'extensions', extensionId, 'data.json');
            console.log('Attempting to load extension from:', extensionPath);

            if (fs.existsSync(extensionPath)) {
                const data = fs.readFileSync(extensionPath, 'utf8');
                const parsed = JSON.parse(data);
                console.log('Successfully loaded extension data:', extensionId, parsed);
                return parsed;
            } else {
                console.warn('Extension file does not exist:', extensionPath);
            }
        } catch (e) {
            console.warn('Failed to load extension metadata:', extensionId, e);
        }
        return null;
    },

    /**
     * Create a thumbnail preview for an object by capturing its render from the scene
     */
    createThumbnail(objectData) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'hierarchy-object-thumbnail';

        // Get extension metadata - try objectFactory first, then direct load
        let extensionData = this.objectFactory?.availableExtensions?.find(ext => ext.id === objectData.extension);

        // If found in objectFactory, extract the actual data
        if (extensionData) {
            // objectFactory stores extension data in the 'data' property
            extensionData = extensionData.data;
        } else {
            // Load directly from filesystem if not in objectFactory
            extensionData = this.getExtensionMetadata(objectData.extension);
        }

        const previewMode = extensionData?.hierarchyPreview || 'icon'; // Default to 'icon' if not specified
        const extensionIcon = extensionData?.extensionIcon; // PNG icon path

        console.log('Creating thumbnail for:', objectData.properties.name);
        console.log('  Preview mode:', previewMode);
        console.log('  Extension icon:', extensionIcon);

        // Try to find the object in the scene
        const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${objectData.oid}"]`);
        console.log('  Object element found in scene:', !!objectElement);

        if (previewMode === 'preview') {
            // Create a mini canvas and render directly via extension
            const canvas = document.createElement('canvas');
            canvas.width = 24;
            canvas.height = 24;
            canvas.style.width = '24px';
            canvas.style.height = '24px';
            canvas.style.display = 'block';
            canvas.style.imageRendering = 'pixelated';

            // Store OID for refresh functionality
            canvas.dataset.oid = objectData.oid;

            // Function to render thumbnail directly via extension
            const renderThumbnail = () => {
                // Get fresh object data from sceneEditor
                const editor = window.sceneEditor || sceneEditor;
                const freshObjectData = editor.sceneData?.objects?.find(obj => obj.oid === objectData.oid);

                if (!freshObjectData) {
                    console.warn('Object not found in scene data:', objectData.oid);
                    return false;
                }

                console.log('Rendering thumbnail for:', freshObjectData.properties.name);

                // Get the extension
                const extension = window.__editorExtensions?.[freshObjectData.extension];
                if (!extension || !extension.update) {
                    console.warn('Extension not found or has no update method:', freshObjectData.extension);
                    return false;
                }

                // Clear canvas
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 24, 24);

                // Save original dimensions
                const originalWidth = freshObjectData.properties.width;
                const originalHeight = freshObjectData.properties.height;

                // Calculate scale to fit in 24x24 while maintaining aspect ratio
                const maxSize = 24;
                const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight);
                const scaledWidth = originalWidth * scale;
                const scaledHeight = originalHeight * scale;

                // Create temporary scaled data for rendering
                const thumbnailData = {
                    ...freshObjectData,
                    properties: {
                        ...freshObjectData.properties,
                        width: scaledWidth,
                        height: scaledHeight,
                        x: 0,
                        y: 0
                    }
                };

                // Set canvas size to scaled dimensions
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;

                try {
                    // Call extension's update method to draw on our mini canvas
                    extension.update(canvas, thumbnailData);
                    console.log('✓ Thumbnail rendered successfully for:', freshObjectData.properties.name);
                    return true;
                } catch (e) {
                    console.error('Failed to render thumbnail:', e);
                    return false;
                }
            };

            // Store render function for refresh
            canvas._updateThumbnail = renderThumbnail;

            // Add canvas to DOM
            thumbnail.appendChild(canvas);

            // Render immediately and retry if needed (for async image loading in extensions)
            renderThumbnail();
            setTimeout(() => renderThumbnail(), 100);
            setTimeout(() => renderThumbnail(), 300);
            setTimeout(() => renderThumbnail(), 600);
        } else if (previewMode === 'icon') {
            // Icon mode: show extension icon
            if (extensionIcon) {
                // Use the extension's PNG icon with absolute path
                const img = document.createElement('img');
                const iconPath = path.join(this.appPath, 'extensions', objectData.extension, extensionIcon).replace(/\\/g, '/');
                console.log('Loading icon from:', iconPath);
                img.src = iconPath;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.onload = () => {
                    console.log('✓ Icon loaded successfully:', extensionIcon);
                };
                img.onerror = (e) => {
                    // Fallback if icon fails to load
                    console.warn('✗ Failed to load icon:', iconPath);
                    thumbnail.style.background = this.getObjectColor(objectData);
                };
                thumbnail.appendChild(img);
            } else {
                // Fallback: colored box
                console.log('No extensionIcon defined, using colored box');
                thumbnail.style.background = this.getObjectColor(objectData);
            }
        } else {
            // Fallback: object not found in scene or invalid mode
            thumbnail.style.background = this.getObjectColor(objectData);
            thumbnail.style.opacity = '0.5';
        }

        return thumbnail;
    },

    /**
     * Draw a checkered background pattern for transparency indication
     */
    drawCheckeredBackground(ctx, width, height) {
        const squareSize = 4;
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#cccccc';
        for (let y = 0; y < height; y += squareSize) {
            for (let x = 0; x < width; x += squareSize) {
                if ((x / squareSize + y / squareSize) % 2 === 0) {
                    ctx.fillRect(x, y, squareSize, squareSize);
                }
            }
        }
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
    },

    /**
     * Create a hierarchy object item element
     */
    createHierarchyObjectItem(objectData) {
        const item = document.createElement('div');
        item.className = 'hierarchy-object-item';
        item.setAttribute('oid', objectData.oid);

        // Create thumbnail
        const thumbnail = this.createThumbnail(objectData);

        // Create info container
        const info = document.createElement('div');
        info.className = 'hierarchy-object-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'hierarchy-object-name';
        nameSpan.textContent = objectData.properties.name || 'Unnamed';

        info.appendChild(nameSpan);

        // Add visibility icon if hidden
        if (!objectData.properties.visible) {
            const hiddenIcon = document.createElement('i');
            hiddenIcon.className = 'ri-eye-off-line hierarchy-object-hidden';
            info.appendChild(hiddenIcon);
        }

        // Add lock button
        const lockBtn = document.createElement('button');
        lockBtn.className = 'hierarchy-object-lock-btn';
        lockBtn.innerHTML = objectData.locked ? '<i class="ri-lock-line"></i>' : '<i class="ri-lock-unlock-line"></i>';
        lockBtn.title = objectData.locked ? 'Unlock object' : 'Lock object';
        lockBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleObjectLock(objectData, lockBtn);
        };

        // Assemble item
        item.appendChild(thumbnail);
        item.appendChild(info);
        item.appendChild(lockBtn);

        // Add locked class to item if object is locked
        if (objectData.locked) {
            item.classList.add('locked');
        }

        // Click handler - select object in scene editor
        item.addEventListener('click', (e) => {
            e.stopPropagation();

            // Don't allow selecting locked objects
            if (objectData.locked) {
                const notifications = nw.require('./assets/js/objects/notifications');
                if (notifications) {
                    notifications.warning(`Object "${objectData.properties.name}" is locked`);
                }
                return;
            }

            // Deselect all other items
            document.querySelectorAll('.hierarchy-object-item').forEach(el => {
                el.classList.remove('selected');
            });

            // Select this item
            item.classList.add('selected');

            // Select in scene editor - use __ajs_object_ID attribute
            const editor = window.sceneEditor || this.sceneEditor;
            const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${objectData.oid}"]`);
            if (objectElement && editor?.selectObject) {
                editor.selectObject(objectElement, objectData);
            }

            console.log('Selected object from hierarchy:', objectData.properties.name);
        });

        // Double-click handler - rename object
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            // Don't allow renaming locked objects
            if (objectData.locked) {
                const notifications = nw.require('./assets/js/objects/notifications');
                if (notifications) {
                    notifications.warning(`Object "${objectData.properties.name}" is locked`);
                }
                return;
            }
            this.startRenaming(item, objectData);
        });

        return item;
    },

    /**
     * Highlight object in hierarchy
     */
    highlightObject(oid) {
        if (!this.container) return;

        // Remove previous highlights
        this.container.querySelectorAll('.hierarchy-object-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add highlight to selected object
        const objItem = this.container.querySelector(`[oid="${oid}"]`);
        if (objItem) {
            objItem.classList.add('selected');

            // Expand parent layer if collapsed
            const layerDiv = objItem.closest('.hierarchy-layer');
            if (layerDiv && layerDiv.classList.contains('collapsed')) {
                const header = layerDiv.querySelector('.hierarchy-layer-header');
                if (header) {
                    header.click();
                }
            }
        }
    },

    /**
     * Start renaming an object
     */
    startRenaming(item, objectData) {
        const nameSpan = item.querySelector('.hierarchy-object-name');
        if (!nameSpan) return;

        const currentName = objectData.properties.name || 'Unnamed';

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'hierarchy-rename-input';
        input.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--accent);
            border-radius: 3px;
            padding: 2px 6px;
            color: var(--text-primary);
            font-size: 12px;
            width: 100%;
            outline: none;
        `;

        // Replace name with input
        nameSpan.textContent = '';
        nameSpan.appendChild(input);
        input.focus();
        input.select();

        // Handle blur and enter key
        const finishRename = () => {
            const newName = input.value.trim() || 'Unnamed';
            objectData.properties.name = newName;
            nameSpan.textContent = newName;

            // Update in scene editor
            const editor = window.sceneEditor || this.sceneEditor;
            if (editor) {
                // Refresh all UI (hierarchy, layer manager, etc.)
                if (editor.refreshSceneUI) {
                    editor.refreshSceneUI();
                }

                // Mark scene as modified
                if (editor.markAsModified) {
                    editor.markAsModified();
                }
                console.log('Object renamed to:', newName);
            }
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                nameSpan.textContent = currentName;
            }
        });
    },

    /**
     * Start renaming a group
     */
    startRenamingGroup(groupId, groupData, nameSpan) {
        if (!nameSpan) return;

        const currentName = groupData?.name || `Group ${groupId.slice(-4)}`;

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'hierarchy-rename-input';
        input.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--accent);
            border-radius: 3px;
            padding: 2px 6px;
            color: var(--text-primary);
            font-size: 12px;
            width: 100%;
            outline: none;
        `;

        // Replace name with input
        nameSpan.textContent = '';
        nameSpan.appendChild(input);
        input.focus();
        input.select();

        // Handle blur and enter key
        const finishRename = () => {
            const newName = input.value.trim() || currentName;

            // Update group name via groupManager
            const groupManager = nw.require('./assets/js/objects/groupManager');
            if (groupManager) {
                groupManager.renameGroup(groupId, newName);
            }

            nameSpan.textContent = newName;

            // Update in scene editor
            const editor = window.sceneEditor || this.sceneEditor;
            if (editor) {
                // Refresh all UI (hierarchy, layer manager, etc.)
                if (editor.refreshSceneUI) {
                    editor.refreshSceneUI();
                }

                console.log('Group renamed to:', newName);
            }
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                nameSpan.textContent = currentName;
            }
        });
    },

    /**
     * Toggle lock state of an object
     */
    toggleObjectLock(objectData, lockBtn) {
        const editor = window.sceneEditor || this.sceneEditor;

        // Toggle locked state
        objectData.locked = !objectData.locked;

        // Update button appearance
        lockBtn.innerHTML = objectData.locked ? '<i class="ri-lock-line"></i>' : '<i class="ri-lock-unlock-line"></i>';
        lockBtn.title = objectData.locked ? 'Unlock object' : 'Lock object';

        // Update item appearance
        const item = this.container.querySelector(`[oid="${objectData.oid}"]`);
        if (item) {
            if (objectData.locked) {
                item.classList.add('locked');
            } else {
                item.classList.remove('locked');
            }
        }

        // Update visual state of object in scene
        const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${objectData.oid}"]`);
        if (objectElement) {
            if (objectData.locked) {
                objectElement.classList.add('locked-object');
                // If object is selected, deselect it
                if (objectElement.classList.contains('clickable_selected')) {
                    if (editor && editor.deselectObject) {
                        editor.deselectObject(objectElement);
                    }
                }
            } else {
                objectElement.classList.remove('locked-object');
            }
        }

        // Mark scene as modified
        if (editor && editor.markAsModified) {
            editor.markAsModified();
        }

        // Show notification
        const notifications = nw.require('./assets/js/objects/notifications');
        if (notifications) {
            notifications.info(`Object "${objectData.properties.name}" ${objectData.locked ? 'locked' : 'unlocked'}`);
        }

        console.log(`Object ${objectData.properties.name} ${objectData.locked ? 'locked' : 'unlocked'}`);
    },

    /**
     * Refresh thumbnails for specific objects
     */
    refreshThumbnails(objectsData) {
        if (!objectsData || !Array.isArray(objectsData)) {
            return;
        }

        // Ensure hierarchy is initialized
        this.ensureInitialized();

        if (!this.container) {
            console.warn('Hierarchy container not available, cannot refresh thumbnails');
            return;
        }

        console.log('Refreshing thumbnails for', objectsData.length, 'objects');

        objectsData.forEach(objData => {
            // Find the thumbnail canvas by OID (could be canvas or img depending on preview mode)
            const thumbnailElement = this.container.querySelector(`canvas[data-oid="${objData.oid}"], img[data-oid="${objData.oid}"]`);

            if (thumbnailElement && thumbnailElement._updateThumbnail) {
                console.log('Refreshing thumbnail for:', objData.properties.name);

                // Call the render function immediately and with delays for async image loading
                thumbnailElement._updateThumbnail();
                setTimeout(() => thumbnailElement._updateThumbnail(), 100);
                setTimeout(() => thumbnailElement._updateThumbnail(), 300);
                setTimeout(() => thumbnailElement._updateThumbnail(), 600);
            }
        });
    },

    /**
     * Delete an object
     */
    deleteObject(objectData) {
        const editor = window.sceneEditor || this.sceneEditor;
        if (!editor || !editor.destroyObject) {
            console.error('Cannot delete object: sceneEditor not available');
            return;
        }

        editor.destroyObject(objectData);
        console.log('Object deleted from hierarchy:', objectData.properties.name);
    }
};
