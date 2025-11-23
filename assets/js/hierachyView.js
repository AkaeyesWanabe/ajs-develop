// Load modules as global variables (avoid redeclaration errors on hot reload)
window.objectFactory = window.objectFactory || nw.require('./assets/js/objects/objectFactory');
window.notifications = window.notifications || nw.require('./assets/js/objects/notifications');
window.functions = window.functions || nw.require('./assets/js/common/functions');
window.objectPlacer = window.objectPlacer || nw.require('./assets/js/objects/objectPlacer');
window.globals = window.globals || nw.require('./assets/js/common/globals');
window.hierarchy = window.hierarchy || nw.require('./assets/js/objects/hierarchy');
window.sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
window.objectCreator = window.objectCreator || nw.require('./assets/js/objects/objectCreator');

// Use short aliases for convenience (non-const to avoid redeclaration)
var objectFactory = window.objectFactory;
var notifications = window.notifications;
var functions = window.functions;
var objectPlacer = window.objectPlacer;
var globals = window.globals;
var hierarchy = window.hierarchy;
var sceneEditor = window.sceneEditor;
var objectCreator = window.objectCreator;

$(document).ready(function () {
    // Load available extensions
    objectFactory.loadAvailableExtensions();

    // Initialize hierarchy module
    hierarchy.init(sceneEditor, objectFactory);

    // Initially disable Add Object button
    updateAddObjectButton();

    // Add Object button click - use new object creator modal
    $("#addObjectBtn").click(function () {
        const editor = window.sceneEditor || sceneEditor;
        if (!editor.sceneData || !globals.projectPath) {
            notifications.warning('Please load a project and open a scene first');
            return;
        }
        // Open new object creator modal
        objectCreator.open();
    });

    // Close menu button
    $("#closeAddObjectMenu").click(function () {
        hideAddObjectMenu();
    });

    // Close menu on click outside
    $(document).click(function (e) {
        const menu = $("#addObjectMenu");
        const btn = $("#addObjectBtn");

        if (menu.is(":visible") &&
            !menu.is(e.target) &&
            menu.has(e.target).length === 0 &&
            !btn.is(e.target) &&
            btn.has(e.target).length === 0) {
            hideAddObjectMenu();
        }
    });
});

function showAddObjectMenu() {
    const menu = $("#addObjectMenu");

    // Populate with available extensions
    populateObjectsList();

    menu.fadeIn(200);
}

function hideAddObjectMenu() {
    $("#addObjectMenu").fadeOut(200);
}

function populateObjectsList() {
    const gameObjectsList = $("#gameObjectsList");
    const uiObjectsList = $("#uiObjectsList");

    gameObjectsList.empty();
    uiObjectsList.empty();

    objectFactory.availableExtensions.forEach(ext => {
        const item = createObjectItem(ext);

        if (ext.category === 'UI Elements') {
            uiObjectsList.append(item);
        } else {
            gameObjectsList.append(item);
        }
    });
}

function createObjectItem(extension) {
    const item = functions.createElement('div', { className: 'objectItem' });

    // Icon
    const iconContainer = functions.createElement('div', { className: 'objectItemIcon' });
    const iconPath = `./extensions/${extension.id}/icon.png`;
    const icon = functions.createElement('img', {
        src: iconPath,
        alt: extension.name
    });
    icon.onerror = function () {
        // Fallback to default icon
        this.src = './assets/images/default-object-icon.png';
    };
    iconContainer.appendChild(icon);

    // Info
    const info = functions.createElement('div', { className: 'objectItemInfo' });
    const name = functions.createElement('div', { className: 'objectItemName' }, extension.name);
    const desc = functions.createElement('div', { className: 'objectItemDesc' }, extension.description);
    info.appendChild(name);
    info.appendChild(desc);

    item.appendChild(iconContainer);
    item.appendChild(info);

    // Click handler
    item.addEventListener('click', () => {
        addObjectToScene(extension.id);
    });

    return item;
}

function addObjectToScene(extensionId) {
    try {
        // Hide menu
        hideAddObjectMenu();

        // Start placement mode (uses selected layer from layerManager)
        objectPlacer.startPlacing(extensionId);

    } catch (err) {
        console.error('Error adding object:', err);
        notifications.error(`Failed to add object: ${err.message}`);
    }
}

/**
 * Update Add Object button state based on project/scene loaded
 */
function updateAddObjectButton() {
    const btn = document.getElementById('addObjectBtn');
    if (!btn) return;

    const editor = window.sceneEditor || sceneEditor;
    const hasProject = globals.projectPath && globals.projectPath !== '';
    const hasScene = editor.sceneData && Object.keys(editor.sceneData).length > 0;

    if (hasProject && hasScene) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
    }
}

// Export for external use immediately after definition
if (typeof window !== 'undefined') {
    window.updateAddObjectButton = updateAddObjectButton;
}

/**
 * Hierarchy Context Menu
 */
$(document).ready(function() {
    let contextMenuTargetObject = null;

    // Register context menu for hierarchy panel
    const sceneHierarchy = document.getElementById('sceneHierachy');
    if (sceneHierarchy) {
        contextMenu.register(sceneHierarchy, (event) => {
            // Find if clicked on an object item
            const objectItem = event.target.closest('[oid]');
            contextMenuTargetObject = objectItem;

            let menuItems = [];

            if (objectItem) {
                // Object context menu
                const oid = objectItem.getAttribute('oid');
                const editor = window.sceneEditor || sceneEditor;
                const objectData = editor.sceneData?.objects?.find(obj => obj.oid === oid);

                menuItems = [
                    {
                        id: 'focus-object',
                        label: 'Focus',
                        icon: 'ri-focus-line',
                        shortcut: 'F'
                    },
                    { type: 'separator' },
                    {
                        id: 'duplicate-hierarchy-object',
                        label: 'Duplicate',
                        icon: 'ri-file-copy-2-line',
                        shortcut: 'Ctrl+D'
                    },
                    {
                        id: 'copy-hierarchy-object',
                        label: 'Copy',
                        icon: 'ri-file-copy-line',
                        shortcut: 'Ctrl+C'
                    },
                    {
                        id: 'paste-hierarchy-object',
                        label: 'Paste',
                        icon: 'ri-clipboard-line',
                        shortcut: 'Ctrl+V',
                        disabled: true
                    },
                    { type: 'separator' },
                    {
                        id: 'rename-hierarchy-object',
                        label: 'Rename',
                        icon: 'ri-edit-line',
                        shortcut: 'F2'
                    },
                    { type: 'separator' },
                    {
                        type: 'submenu',
                        label: 'Layer',
                        icon: 'ri-stack-line',
                        items: [
                            {
                                id: 'move-to-layer-0',
                                label: 'Layer 0',
                                icon: objectData?.layer === 0 ? 'ri-check-line' : ''
                            },
                            {
                                id: 'move-to-layer-1',
                                label: 'Layer 1',
                                icon: objectData?.layer === 1 ? 'ri-check-line' : ''
                            },
                            {
                                id: 'move-to-layer-2',
                                label: 'Layer 2',
                                icon: objectData?.layer === 2 ? 'ri-check-line' : ''
                            },
                            {
                                id: 'move-to-layer-3',
                                label: 'Layer 3',
                                icon: objectData?.layer === 3 ? 'ri-check-line' : ''
                            }
                        ]
                    },
                    { type: 'separator' },
                    {
                        id: 'delete-hierarchy-object',
                        label: 'Delete',
                        icon: 'ri-delete-bin-line',
                        shortcut: 'Del',
                        danger: true
                    }
                ];
            } else {
                // Empty space - add object menu
                const editor = window.sceneEditor || sceneEditor;
                if (!editor.sceneData) {
                    return [];
                }

                // Build extension categories
                const categories = {};
                objectFactory.availableExtensions.forEach(ext => {
                    const category = ext.category || 'Game Objects';
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(ext);
                });

                const addObjectItems = [];
                Object.keys(categories).sort().forEach(category => {
                    addObjectItems.push({
                        type: 'category',
                        label: category
                    });

                    categories[category].forEach(ext => {
                        addObjectItems.push({
                            id: `hierarchy-add-object-${ext.id}`,
                            label: ext.name,
                            icon: 'ri-add-line',
                            extensionId: ext.id
                        });
                    });

                    if (Object.keys(categories).length > 1) {
                        addObjectItems.push({ type: 'separator' });
                    }
                });

                menuItems = [
                    {
                        type: 'submenu',
                        label: 'Add Object',
                        icon: 'ri-add-circle-line',
                        items: addObjectItems
                    },
                    { type: 'separator' },
                    {
                        id: 'expand-all-hierarchy',
                        label: 'Expand All',
                        icon: 'ri-arrow-down-s-line'
                    },
                    {
                        id: 'collapse-all-hierarchy',
                        label: 'Collapse All',
                        icon: 'ri-arrow-up-s-line'
                    }
                ];
            }

            return menuItems;
        });
    }

    // Handle context menu clicks for Hierarchy
    $(document).on('contextMenuClick', function(e, data) {
        const itemId = data.itemId;

        // Handle "Add Object" items
        if (itemId && itemId.startsWith('hierarchy-add-object-')) {
            const extensionId = itemId.replace('hierarchy-add-object-', '');
            addObjectToScene(extensionId);
            return;
        }

        // Handle layer changes
        if (itemId && itemId.startsWith('move-to-layer-')) {
            const layer = parseInt(itemId.replace('move-to-layer-', ''));
            if (contextMenuTargetObject) {
                const oid = contextMenuTargetObject.getAttribute('oid');
                const editor = window.sceneEditor || sceneEditor;
                const objectData = editor.sceneData?.objects?.find(obj => obj.oid === oid);
                if (objectData) {
                    const oldLayer = objectData.layer;
                    objectData.layer = layer;
                    sceneEditor.refreshSceneObjects([objectData]);

                    // Refresh all scene UI (hierarchy, layer manager, add object button)
                    sceneEditor.refreshSceneUI();

                    // Manual save with Ctrl+S required

                    console.log('Object layer changed via context menu:', objectData.properties.name, 'from Layer', oldLayer, 'to Layer', layer);
                    notifications.success(`Moved to Layer ${layer}`);
                }
            }
            return;
        }

        // Handle standard actions
        switch (itemId) {
            case 'focus-object':
                if (contextMenuTargetObject) {
                    const oid = contextMenuTargetObject.getAttribute('oid');
                    // TODO: Implement focus on object
                    console.log('Focus on object:', oid);
                    notifications.info('Focus feature coming soon');
                }
                break;

            case 'duplicate-hierarchy-object':
                if (contextMenuTargetObject) {
                    const oid = contextMenuTargetObject.getAttribute('oid');
                    // TODO: Implement duplicate
                    console.log('Duplicate object:', oid);
                    notifications.info('Duplicate feature coming soon');
                }
                break;

            case 'copy-hierarchy-object':
                if (contextMenuTargetObject) {
                    const oid = contextMenuTargetObject.getAttribute('oid');
                    // TODO: Implement copy
                    console.log('Copy object:', oid);
                    notifications.info('Copy feature coming soon');
                }
                break;

            case 'rename-hierarchy-object':
                if (contextMenuTargetObject) {
                    const oid = contextMenuTargetObject.getAttribute('oid');
                    const editor = window.sceneEditor || sceneEditor;
                    const objectData = editor.sceneData?.objects?.find(obj => obj.oid === oid);
                    if (objectData) {
                        // TODO: Implement rename dialog
                        console.log('Rename object:', objectData.properties.name);
                        notifications.info('Rename feature coming soon');
                    }
                }
                break;

            case 'delete-hierarchy-object':
                if (contextMenuTargetObject) {
                    const oid = contextMenuTargetObject.getAttribute('oid');
                    const editor = window.sceneEditor || sceneEditor;
                    const objectData = editor.sceneData?.objects?.find(obj => obj.oid === oid);
                    if (objectData) {
                        notifications.confirm(
                            'Delete Object',
                            `Are you sure you want to delete "${objectData.properties.name}"?`,
                            { confirmText: 'Delete', danger: true }
                        ).then(confirmed => {
                            if (confirmed) {
                                sceneEditor.destroyObject(objectData);
                                notifications.success('Object deleted');
                            }
                        });
                    }
                }
                break;

            case 'expand-all-hierarchy':
                // TODO: Implement expand all
                console.log('Expand all');
                break;

            case 'collapse-all-hierarchy':
                // TODO: Implement collapse all
                console.log('Collapse all');
                break;
        }

        contextMenuTargetObject = null;
    });
});
