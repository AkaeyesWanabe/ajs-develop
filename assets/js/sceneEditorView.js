var __dataExtensions = {};
var __editorExtensions = {};
var __runtimeExtensions = {};


document.addEventListener("mouseup", function () {
    if (sceneEditor.canBeOutside) {
        sceneEditor.canBeOutside = false;
        //
        if (sceneEditor.isInsideObject) {
            sceneEditor.isInsideObject = false;
        }
        else {
            sceneEditor.deselectAllObjects();
        }
    }
});


/**
 * Track mouse position in scene editor for status bar
 */
document.addEventListener('DOMContentLoaded', function() {
    const footer = nw.require('./assets/js/objects/footer');
    const globals = nw.require('./assets/js/common/globals');

    // Update status bar when mouse moves over scene editor
    let lastMouseUpdate = 0;
    const updateInterval = 50; // Update every 50ms to avoid performance issues

    document.addEventListener('mousemove', function(e) {
        // Only update if scene editor tab is active
        if (globals.app.tabName !== 'sceneEditor') return;

        const now = Date.now();
        if (now - lastMouseUpdate < updateInterval) return;
        lastMouseUpdate = now;

        const scnEditor = document.getElementById('scnEditor');
        if (!scnEditor) return;

        // Get mouse position relative to scene editor
        const rect = scnEditor.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {

            const mouseX = e.clientX - rect.left + scnEditor.scrollLeft;
            const mouseY = e.clientY - rect.top + scnEditor.scrollTop;

            // Update status bar (only mouse position, not selection count)
            footer.updateSceneEditorStatus({
                mouseX: mouseX,
                mouseY: mouseY
            });
        }
    });
});


/**
 * Scene Editor Context Menu
 */
document.addEventListener('DOMContentLoaded', function() {
    const objectFactory = nw.require('./assets/js/objects/objectFactory');
    const objectPlacer = nw.require('./assets/js/objects/objectPlacer');
    const transformControls = nw.require('./assets/js/objects/transformControls');
    const layerManager = nw.require('./assets/js/objects/layerManager');
    const rectangleSelection = nw.require('./assets/js/objects/rectangleSelection');
    const grid = nw.require('./assets/js/objects/grid');
    const zoom = nw.require('./assets/js/objects/zoom');
    const alignTools = nw.require('./assets/js/objects/alignTools');

    // Expose as global variables for sceneEditor.selectObject() and other parts
    window.transformControls = transformControls;
    window.objectPlacer = objectPlacer;
    window.layerManager = layerManager;
    window.rectangleSelection = rectangleSelection;
    window.grid = grid;
    window.zoom = zoom;
    window.alignTools = alignTools;

    // Initialize rectangle selection, grid and zoom once scene editor is ready
    setTimeout(() => {
        const scnEditor = document.getElementById('scnEditor');
        if (scnEditor) {
            rectangleSelection.init(scnEditor);
            grid.init(scnEditor);
            zoom.init(scnEditor);

            // Grid will be shown automatically when scene is loaded (in sceneEditor.loadScene)
            console.log('[SCENE EDITOR VIEW] Grid and zoom initialized');
        }
    }, 500);

    // Load available extensions
    objectFactory.loadAvailableExtensions();

    // Initialize layer manager
    const layerPanel = document.getElementById('layerManagerPanel');
    if (layerPanel) {
        // Load layer manager HTML
        const $ = nw.require('jquery');
        $(layerPanel).load('./views/layerManager.html', function(response, status, xhr) {
            if (status === 'error') {
                console.error('Failed to load layer manager HTML:', xhr.status, xhr.statusText);
                return;
            }

            // Initialize layer manager
            layerManager.init();

            // Wire up buttons
            $('#refreshLayersBtn').click(function() {
                layerManager.refresh();
            });

            $('#addLayerBtn').click(function() {
                layerManager.createNewLayer();
            });

            console.log('Layer manager initialized successfully');
        });
    }

    // Register context menu for Scene Editor
    const scnEditor = document.getElementById('scnEditor');
    if (scnEditor) {
        contextMenu.register(scnEditor, (event) => {
            // Only show menu if a scene is loaded
            if (!sceneEditor.sceneData) {
                return [];
            }

            // Build menu items
            const menuItems = [];
            const selectedElements = document.querySelectorAll('.clickable_selected');
            const hasSelection = selectedElements.length > 0;
            const commandManager = nw.require('./assets/js/objects/commandManager');
            const clipboard = nw.require('./assets/js/objects/clipboard');

            // Undo/Redo
            menuItems.push({
                id: 'undo',
                label: 'Undo',
                icon: 'ri-arrow-go-back-line',
                shortcut: 'Ctrl+Z',
                disabled: !commandManager.canUndo()
            });

            menuItems.push({
                id: 'redo',
                label: 'Redo',
                icon: 'ri-arrow-go-forward-line',
                shortcut: 'Ctrl+Y',
                disabled: !commandManager.canRedo()
            });

            menuItems.push({ type: 'separator' });

            // Add "Add Object" option to open the new modal
            menuItems.push({
                id: 'add-object',
                label: 'Add Object',
                icon: 'ri-add-circle-line',
                shortcut: 'A'
            });

            menuItems.push({ type: 'separator' });

            // Copy/Cut/Paste
            menuItems.push({
                id: 'copy-object',
                label: 'Copy',
                icon: 'ri-file-copy-line',
                shortcut: 'Ctrl+C',
                disabled: !hasSelection
            });

            menuItems.push({
                id: 'cut-object',
                label: 'Cut',
                icon: 'ri-scissors-line',
                shortcut: 'Ctrl+X',
                disabled: !hasSelection
            });

            menuItems.push({
                id: 'paste-object',
                label: 'Paste',
                icon: 'ri-clipboard-line',
                shortcut: 'Ctrl+V',
                disabled: !clipboard.hasData()
            });

            if (hasSelection) {
                menuItems.push({ type: 'separator' });

                menuItems.push({
                    id: 'duplicate-object',
                    label: 'Duplicate',
                    icon: 'ri-file-copy-2-line',
                    shortcut: 'Ctrl+D'
                });

                menuItems.push({ type: 'separator' });

                // Group/Ungroup
                menuItems.push({
                    id: 'group-objects',
                    label: 'Group',
                    icon: 'ri-group-line',
                    shortcut: 'Ctrl+G',
                    disabled: selectedElements.length < 2
                });

                menuItems.push({
                    id: 'ungroup-objects',
                    label: 'Ungroup',
                    icon: 'ri-link-unlink',
                    shortcut: 'Ctrl+Shift+G'
                });

                menuItems.push({ type: 'separator' });

                // Align & Distribute
                menuItems.push({
                    id: 'align-distribute',
                    label: 'Align & Distribute',
                    icon: 'ri-layout-grid-line',
                    shortcut: 'Ctrl+Shift+A',
                    disabled: selectedElements.length < 1
                });

                menuItems.push({ type: 'separator' });

                menuItems.push({
                    id: 'delete-object',
                    label: 'Delete',
                    icon: 'ri-delete-bin-line',
                    shortcut: 'Del',
                    danger: true
                });
            }

            menuItems.push({ type: 'separator' });

            menuItems.push({
                id: 'select-all',
                label: 'Select All',
                icon: 'ri-check-double-line',
                shortcut: 'Ctrl+A'
            });

            menuItems.push({
                id: 'deselect-all',
                label: 'Deselect All',
                icon: 'ri-close-circle-line',
                disabled: !hasSelection
            });

            menuItems.push({ type: 'separator' });

            // Grid options
            const grid = window.grid;
            menuItems.push({
                id: 'toggle-grid',
                label: grid && grid.enabled ? 'Hide Grid' : 'Show Grid',
                icon: 'ri-grid-line',
                checked: grid && grid.enabled
            });

            menuItems.push({
                id: 'toggle-snap',
                label: 'Snap to Grid',
                icon: 'ri-magnet-line',
                checked: grid && grid.snapEnabled
            });

            menuItems.push({
                id: 'toggle-grid-lines',
                label: 'Grid Lines',
                icon: 'ri-layout-grid-line',
                checked: grid && grid.showLines
            });

            // Zoom options
            const zoom = window.zoom;
            menuItems.push({ type: 'separator' });

            menuItems.push({
                id: 'zoom-in',
                label: 'Zoom In',
                icon: 'ri-zoom-in-line',
                shortcut: 'Ctrl++'
            });

            menuItems.push({
                id: 'zoom-out',
                label: 'Zoom Out',
                icon: 'ri-zoom-out-line',
                shortcut: 'Ctrl+-'
            });

            menuItems.push({
                id: 'zoom-reset',
                label: 'Reset Zoom (100%)',
                icon: 'ri-aspect-ratio-line',
                shortcut: 'Ctrl+0'
            });

            return menuItems;
        });
    }

    // Handle context menu clicks for Scene Editor
    $(document).on('contextMenuClick', function(e, data) {
        const itemId = data.itemId;

        // Handle standard actions
        switch (itemId) {
            case 'undo':
                const commandManager = nw.require('./assets/js/objects/commandManager');
                if (commandManager) {
                    commandManager.undo();
                }
                break;

            case 'redo':
                const commandManagerRedo = nw.require('./assets/js/objects/commandManager');
                if (commandManagerRedo) {
                    commandManagerRedo.redo();
                }
                break;

            case 'add-object':
                // Open the object creator modal
                if (typeof objectCreator !== 'undefined' && objectCreator.open) {
                    objectCreator.open();
                } else {
                    console.error('objectCreator not available');
                }
                return;

            case 'copy-object':
                const clipboardCopy = nw.require('./assets/js/objects/clipboard');
                if (clipboardCopy) {
                    clipboardCopy.copy();
                }
                break;

            case 'cut-object':
                const clipboardCut = nw.require('./assets/js/objects/clipboard');
                if (clipboardCut) {
                    clipboardCut.cut();
                }
                break;

            case 'paste-object':
                const clipboardPaste = nw.require('./assets/js/objects/clipboard');
                if (clipboardPaste) {
                    clipboardPaste.paste();
                }
                break;

            case 'duplicate-object':
                // Duplicate by copy and immediate paste
                const clipboardDup = nw.require('./assets/js/objects/clipboard');
                if (clipboardDup) {
                    clipboardDup.copy();
                    clipboardDup.paste();
                }
                break;

            case 'group-objects':
                const groupManager = nw.require('./assets/js/objects/groupManager');
                if (groupManager) {
                    groupManager.groupObjects();
                }
                break;

            case 'ungroup-objects':
                const ungroupManager = nw.require('./assets/js/objects/groupManager');
                if (ungroupManager) {
                    ungroupManager.ungroupObjects();
                }
                break;

            case 'align-distribute':
                const alignTools = nw.require('./assets/js/objects/alignTools');
                if (alignTools) {
                    alignTools.showToolbar();
                }
                break;

            case 'toggle-grid':
                const gridToggle = window.grid;
                if (gridToggle) {
                    gridToggle.toggle();
                }
                break;

            case 'toggle-snap':
                const gridSnap = window.grid;
                if (gridSnap) {
                    gridSnap.toggleSnap();
                }
                break;

            case 'toggle-grid-lines':
                const gridLines = window.grid;
                if (gridLines) {
                    gridLines.toggleShowLines();
                }
                break;

            case 'zoom-in':
                const zoomIn = window.zoom;
                if (zoomIn) {
                    zoomIn.zoomIn();
                }
                break;

            case 'zoom-out':
                const zoomOut = window.zoom;
                if (zoomOut) {
                    zoomOut.zoomOut();
                }
                break;

            case 'zoom-reset':
                const zoomReset = window.zoom;
                if (zoomReset) {
                    zoomReset.resetZoom();
                }
                break;

            case 'delete-object':
                const selectedElements = document.querySelectorAll('.clickable_selected');
                if (selectedElements.length > 0) {
                    // Get object data for each selected element
                    const objectsToDelete = [];
                    selectedElements.forEach(elem => {
                        const oid = elem.getAttribute('__ajs_object_ID');
                        const objectData = sceneEditor.sceneData?.objects?.find(obj => obj.oid === oid);
                        if (objectData) {
                            objectsToDelete.push(objectData);
                        }
                    });

                    // Confirm deletion
                    const notifications = nw.require('./assets/js/objects/notifications');
                    const message = objectsToDelete.length === 1
                        ? `Are you sure you want to delete "${objectsToDelete[0].properties.name}"?`
                        : `Are you sure you want to delete ${objectsToDelete.length} objects?`;

                    notifications.confirm('Delete Object' + (objectsToDelete.length > 1 ? 's' : ''), message, {
                        confirmText: 'Delete',
                        danger: true
                    }).then(confirmed => {
                        if (confirmed) {
                            const commands = nw.require('./assets/js/objects/commands');
                            const commandManager = nw.require('./assets/js/objects/commandManager');

                            if (objectsToDelete.length === 1) {
                                // Single delete
                                const deleteCmd = new commands.DeleteObjectCommand(sceneEditor, objectsToDelete[0]);
                                commandManager.execute(deleteCmd);
                            } else {
                                // Batch delete
                                const deleteCommands = objectsToDelete.map(obj =>
                                    new commands.DeleteObjectCommand(sceneEditor, obj)
                                );
                                const batchCmd = new commands.BatchCommand('Delete Objects', deleteCommands);
                                commandManager.execute(batchCmd);
                            }

                            notifications.success(`Deleted ${objectsToDelete.length} object${objectsToDelete.length > 1 ? 's' : ''}`);
                        }
                    });
                }
                break;

            case 'select-all':
                if (sceneEditor.sceneData && sceneEditor.sceneData.objects) {
                    sceneEditor.selectAllObjects();
                }
                break;

            case 'deselect-all':
                sceneEditor.deselectAllObjects();
                break;
        }
    });
});