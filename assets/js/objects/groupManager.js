const $ = nw.require('jquery');
const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    /**
     * Generate unique group ID
     */
    generateGroupId() {
        return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Get all currently selected objects
     */
    getSelectedObjects() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const selectedElements = document.querySelectorAll('.__ajs_scene_object.clickable_selected');
        const selectedObjects = [];

        selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = sceneEditor.sceneData?.objects?.find(obj => obj.oid === oid);

            if (objectData && !objectData.locked) {
                selectedObjects.push(objectData);
            }
        });

        return selectedObjects;
    },

    /**
     * Group selected objects
     */
    groupObjects() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (!sceneEditor.sceneData || !sceneEditor.sceneData.objects) {
            notifications.warning('No scene is open');
            return;
        }

        const selected = this.getSelectedObjects();

        if (selected.length < 2) {
            notifications.warning('Select at least 2 objects to group');
            return;
        }

        // Check if any selected objects are already in a group
        const alreadyGrouped = selected.filter(obj => obj.groupId);
        if (alreadyGrouped.length > 0) {
            notifications.warning('Some objects are already grouped. Ungroup them first.');
            return;
        }

        // Generate unique group ID
        const groupId = this.generateGroupId();

        // Calculate group bounding box (for future use)
        const minX = Math.min(...selected.map(obj => obj.properties.x));
        const minY = Math.min(...selected.map(obj => obj.properties.y));
        const maxX = Math.max(...selected.map(obj => obj.properties.x + obj.properties.width));
        const maxY = Math.max(...selected.map(obj => obj.properties.y + obj.properties.height));

        // Initialize groups array if it doesn't exist
        if (!sceneEditor.sceneData.groups) {
            sceneEditor.sceneData.groups = [];
        }

        // Create group data
        const groupData = {
            id: groupId,
            name: `Group ${sceneEditor.sceneData.groups.length + 1}`,
            objects: selected.map(obj => obj.oid),
            bounds: {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            },
            collapsed: false
        };

        // Create and execute undo/redo command
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const groupCmd = new commands.GroupObjectsCommand(sceneEditor, selected, groupData);
        commandManager.execute(groupCmd);

        notifications.success(`Grouped ${selected.length} objects`);
        console.log('[GROUP] Created group:', groupData);
    },

    /**
     * Ungroup selected objects or group
     */
    ungroupObjects() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (!sceneEditor.sceneData || !sceneEditor.sceneData.objects) {
            notifications.warning('No scene is open');
            return;
        }

        const selected = this.getSelectedObjects();

        if (selected.length === 0) {
            notifications.warning('No objects selected');
            return;
        }

        // Find groups that contain any of the selected objects
        const groupIds = new Set();
        selected.forEach(obj => {
            if (obj.groupId) {
                groupIds.add(obj.groupId);
            }
        });

        if (groupIds.size === 0) {
            notifications.warning('Selected objects are not grouped');
            return;
        }

        // Create ungroup commands for each group
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const ungroupCommands = [];
        let totalUngrouped = 0;

        // Remove group ID from all objects in each group
        groupIds.forEach(groupId => {
            const groupObjects = sceneEditor.sceneData.objects.filter(obj => obj.groupId === groupId);
            const groupData = sceneEditor.sceneData.groups?.find(g => g.id === groupId);

            if (groupData && groupObjects.length > 0) {
                const ungroupCmd = new commands.UngroupObjectsCommand(sceneEditor, groupData, groupObjects);
                ungroupCommands.push(ungroupCmd);
                totalUngrouped += groupObjects.length;
            }

            console.log('[GROUP] Prepared ungroup for:', groupId);
        });

        // Execute all ungroup commands as batch
        if (ungroupCommands.length === 1) {
            commandManager.execute(ungroupCommands[0]);
        } else if (ungroupCommands.length > 1) {
            const batchCmd = new commands.BatchCommand('Ungroup Objects', ungroupCommands);
            commandManager.execute(batchCmd);
        }

        notifications.success(`Ungrouped ${totalUngrouped} objects from ${groupIds.size} group(s)`);
    },

    /**
     * Select all objects in a group
     */
    selectGroup(groupId) {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (!sceneEditor.sceneData || !sceneEditor.sceneData.objects) return;

        // Deselect all first
        if (sceneEditor.deselectAllObjects) {
            sceneEditor.deselectAllObjects();
        }

        // Select all objects in the group
        const groupObjects = sceneEditor.sceneData.objects.filter(obj => obj.groupId === groupId);

        sceneEditor.selectedObjects = [];
        let selectedCount = 0;

        groupObjects.forEach(obj => {
            const elem = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${obj.oid}"]`);
            if (elem && !obj.locked) {
                elem.classList.add('clickable_selected');
                sceneEditor.selectedObjects.push({ element: elem, data: obj });
                selectedCount++;

                // Select in hierarchy
                const hierarchyItem = document.querySelector(`.hierarchy-object-item[oid="${obj.oid}"]`);
                if (hierarchyItem) {
                    hierarchyItem.classList.add('selected');
                }
            }
        });

        // Activate multi-selection transform controls if available
        if (selectedCount > 0) {
            const transformControls = window.transformControls || nw.require('./assets/js/objects/transformControls');
            if (transformControls && transformControls.activateMultiple && selectedCount > 1) {
                transformControls.activateMultiple(sceneEditor.selectedObjects);
            } else if (transformControls && selectedCount === 1) {
                transformControls.activate(sceneEditor.selectedObjects[0].element, sceneEditor.selectedObjects[0].data);
            }
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

        console.log('[GROUP] Selected group:', groupId, 'with', selectedCount, 'objects');
    },

    /**
     * Get group data by ID
     */
    getGroupById(groupId) {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (!sceneEditor.sceneData || !sceneEditor.sceneData.groups) return null;

        return sceneEditor.sceneData.groups.find(g => g.id === groupId);
    },

    /**
     * Toggle group collapsed state
     */
    toggleGroupCollapse(groupId) {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        const group = this.getGroupById(groupId);
        if (!group) return;

        group.collapsed = !group.collapsed;

        // Refresh hierarchy
        if (sceneEditor.refreshSceneUI) {
            sceneEditor.refreshSceneUI();
        }

        console.log('[GROUP] Toggled collapse for group:', groupId, 'collapsed:', group.collapsed);
    },

    /**
     * Rename group
     */
    renameGroup(groupId, newName) {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        const group = this.getGroupById(groupId);
        if (!group) return;

        group.name = newName;

        // Mark scene as modified
        if (sceneEditor.markAsModified) {
            sceneEditor.markAsModified();
        }

        console.log('[GROUP] Renamed group:', groupId, 'to:', newName);
    }
};
