/**
 * Command Definitions - Individual commands for various operations
 */

/**
 * Command to create an object
 */
class CreateObjectCommand {
    constructor(sceneEditor, objectData) {
        this.name = 'Create Object';
        this.sceneEditor = sceneEditor;
        this.objectData = objectData;
        this.wasExecuted = false;
    }

    execute() {
        // Add object to scene data
        if (!this.sceneEditor.sceneData.objects) {
            this.sceneEditor.sceneData.objects = [];
        }

        this.sceneEditor.sceneData.objects.push(this.objectData);

        // Create object in DOM
        this.sceneEditor.createObject(this.objectData);

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
        this.wasExecuted = true;
    }

    undo() {
        if (!this.wasExecuted) return;

        // Remove object from scene data
        const index = this.sceneEditor.sceneData.objects.findIndex(
            obj => obj.oid === this.objectData.oid
        );

        if (index !== -1) {
            this.sceneEditor.sceneData.objects.splice(index, 1);
        }

        // Remove from DOM
        const element = document.querySelector(
            `.__ajs_scene_object[__ajs_object_ID="${this.objectData.oid}"]`
        );
        if (element) {
            element.remove();
        }

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }
}

/**
 * Command to delete an object
 */
class DeleteObjectCommand {
    constructor(sceneEditor, objectData) {
        this.name = `Delete ${objectData.properties?.name || 'Object'}`;
        this.sceneEditor = sceneEditor;
        this.objectData = JSON.parse(JSON.stringify(objectData)); // Deep copy
        this.objectIndex = -1;
    }

    execute() {
        // Store the original index
        this.objectIndex = this.sceneEditor.sceneData.objects.findIndex(
            obj => obj.oid === this.objectData.oid
        );

        if (this.objectIndex === -1) {
            throw new Error('Object not found');
        }

        // Remove object from sceneData
        this.sceneEditor.sceneData.objects.splice(this.objectIndex, 1);

        // Deactivate transform controls if this object was selected
        const transformControls = window.transformControls;
        if (transformControls && transformControls.targetElement) {
            const targetOid = transformControls.targetElement.getAttribute('__ajs_object_ID');
            if (targetOid === this.objectData.oid) {
                transformControls.deactivate();
            }
        }

        // Remove from selected objects array
        if (this.sceneEditor.selectedObjects) {
            this.sceneEditor.selectedObjects = this.sceneEditor.selectedObjects.filter(
                sel => sel.data.oid !== this.objectData.oid
            );
        }

        // Remove from DOM
        const element = document.querySelector(
            `.__ajs_scene_object[__ajs_object_ID="${this.objectData.oid}"]`
        );
        if (element) {
            element.remove();
        }

        // Call extension destroy method if exists
        if (this.objectData.extension && typeof __editorExtensions !== 'undefined' && __editorExtensions[this.objectData.extension]) {
            const extension = __editorExtensions[this.objectData.extension];
            if (typeof extension.destroy === 'function') {
                try {
                    extension.destroy(this.objectData);
                } catch (err) {
                    console.warn('[DeleteObjectCommand] Extension destroy failed:', err);
                }
            }
        }

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }

    undo() {
        // Re-insert object at original position
        this.sceneEditor.sceneData.objects.splice(this.objectIndex, 0, this.objectData);

        // Load extension if needed
        if (this.objectData.extension) {
            this.sceneEditor.requireOnceExtension(this.objectData.extension);
        }

        // Recreate in DOM
        if (typeof __editorExtensions !== 'undefined' && __editorExtensions[this.objectData.extension]) {
            __editorExtensions[this.objectData.extension].create(this.objectData);
        }

        // Refresh scene objects
        setTimeout(() => {
            this.sceneEditor.refreshSceneObjects([this.objectData]);

            // Refresh UI
            if (this.sceneEditor.refreshSceneUI) {
                this.sceneEditor.refreshSceneUI();
            }
        }, 50);

        this.sceneEditor.markAsModified();
    }
}

/**
 * Command to move an object
 */
class MoveObjectCommand {
    constructor(sceneEditor, objectData, oldX, oldY, newX, newY) {
        this.name = 'Move Object';
        this.sceneEditor = sceneEditor;
        this.objectData = objectData;
        this.oldX = oldX;
        this.oldY = oldY;
        this.newX = newX;
        this.newY = newY;
    }

    execute() {
        this.objectData.properties.x = this.newX;
        this.objectData.properties.y = this.newY;

        // Update DOM element position
        const element = document.querySelector(
            `.__ajs_scene_object[__ajs_object_ID="${this.objectData.oid}"]`
        );
        if (element) {
            element.style.left = this.newX + 'px';
            element.style.top = this.newY + 'px';
        }

        this.sceneEditor.markAsModified();
    }

    undo() {
        this.objectData.properties.x = this.oldX;
        this.objectData.properties.y = this.oldY;

        // Update DOM element position
        const element = document.querySelector(
            `.__ajs_scene_object[__ajs_object_ID="${this.objectData.oid}"]`
        );
        if (element) {
            element.style.left = this.oldX + 'px';
            element.style.top = this.oldY + 'px';
        }

        this.sceneEditor.markAsModified();
    }
}

/**
 * Command to resize an object
 */
class ResizeObjectCommand {
    constructor(sceneEditor, objectData, oldWidth, oldHeight, newWidth, newHeight) {
        this.name = 'Resize Object';
        this.sceneEditor = sceneEditor;
        this.objectData = objectData;
        this.oldWidth = oldWidth;
        this.oldHeight = oldHeight;
        this.newWidth = newWidth;
        this.newHeight = newHeight;
    }

    execute() {
        this.objectData.properties.width = this.newWidth;
        this.objectData.properties.height = this.newHeight;

        // Refresh the object
        this.sceneEditor.refreshSceneObjects([this.objectData]);
        this.sceneEditor.markAsModified();
    }

    undo() {
        this.objectData.properties.width = this.oldWidth;
        this.objectData.properties.height = this.oldHeight;

        // Refresh the object
        this.sceneEditor.refreshSceneObjects([this.objectData]);
        this.sceneEditor.markAsModified();
    }
}

/**
 * Command to rotate an object
 */
class RotateObjectCommand {
    constructor(sceneEditor, objectData, oldRotation, newRotation) {
        this.name = 'Rotate Object';
        this.sceneEditor = sceneEditor;
        this.objectData = objectData;
        this.oldRotation = oldRotation;
        this.newRotation = newRotation;
    }

    execute() {
        // Set rotation based on which property the object uses
        if (this.objectData.properties.hasOwnProperty('angle')) {
            this.objectData.properties.angle = this.newRotation;
        } else {
            this.objectData.properties.rotation = this.newRotation;
        }

        // Refresh the object
        this.sceneEditor.refreshSceneObjects([this.objectData]);
        this.sceneEditor.markAsModified();
    }

    undo() {
        // Set rotation based on which property the object uses
        if (this.objectData.properties.hasOwnProperty('angle')) {
            this.objectData.properties.angle = this.oldRotation;
        } else {
            this.objectData.properties.rotation = this.oldRotation;
        }

        // Refresh the object
        this.sceneEditor.refreshSceneObjects([this.objectData]);
        this.sceneEditor.markAsModified();
    }
}

/**
 * Command to change object property
 */
class ChangePropertyCommand {
    constructor(sceneEditor, objectData, propertyPath, oldValue, newValue) {
        this.name = 'Change Property';
        this.sceneEditor = sceneEditor;
        this.objectData = objectData;
        this.propertyPath = propertyPath; // e.g., 'properties.name' or 'properties.backgroundColor'
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    execute() {
        this.setPropertyValue(this.objectData, this.propertyPath, this.newValue);
        this.sceneEditor.refreshSceneObjects([this.objectData]);
        this.sceneEditor.markAsModified();
    }

    undo() {
        this.setPropertyValue(this.objectData, this.propertyPath, this.oldValue);
        this.sceneEditor.refreshSceneObjects([this.objectData]);
        this.sceneEditor.markAsModified();
    }

    setPropertyValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = value;
    }
}

/**
 * Command to change object's layer
 */
class ChangeLayerCommand {
    constructor(sceneEditor, objectData, oldLayer, newLayer) {
        this.name = 'Change Layer';
        this.sceneEditor = sceneEditor;
        this.objectData = objectData;
        this.oldLayer = oldLayer;
        this.newLayer = newLayer;
    }

    execute() {
        this.objectData.layer = this.newLayer;

        // Refresh the object to update z-index
        this.sceneEditor.refreshSceneObjects([this.objectData]);

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }

    undo() {
        this.objectData.layer = this.oldLayer;

        // Refresh the object to update z-index
        this.sceneEditor.refreshSceneObjects([this.objectData]);

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }
}

/**
 * Command to group objects
 */
class GroupObjectsCommand {
    constructor(sceneEditor, objectsData, groupData) {
        this.name = 'Group Objects';
        this.sceneEditor = sceneEditor;
        this.objectsData = objectsData; // Array of objects being grouped
        this.groupData = groupData; // Group metadata
    }

    execute() {
        // Assign group ID to all objects
        this.objectsData.forEach(obj => {
            obj.groupId = this.groupData.id;
        });

        // Add group to scene data
        if (!this.sceneEditor.sceneData.groups) {
            this.sceneEditor.sceneData.groups = [];
        }

        this.sceneEditor.sceneData.groups.push(this.groupData);

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }

    undo() {
        // Remove group ID from all objects
        this.objectsData.forEach(obj => {
            delete obj.groupId;
        });

        // Remove group from scene data
        if (this.sceneEditor.sceneData.groups) {
            this.sceneEditor.sceneData.groups = this.sceneEditor.sceneData.groups.filter(
                g => g.id !== this.groupData.id
            );
        }

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }
}

/**
 * Command to ungroup objects
 */
class UngroupObjectsCommand {
    constructor(sceneEditor, groupData, objectsData) {
        this.name = 'Ungroup Objects';
        this.sceneEditor = sceneEditor;
        this.groupData = groupData; // Group metadata
        this.objectsData = objectsData; // Array of objects in the group
    }

    execute() {
        // Remove group ID from all objects
        this.objectsData.forEach(obj => {
            delete obj.groupId;
        });

        // Remove group from scene data
        if (this.sceneEditor.sceneData.groups) {
            this.sceneEditor.sceneData.groups = this.sceneEditor.sceneData.groups.filter(
                g => g.id !== this.groupData.id
            );
        }

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }

    undo() {
        // Re-assign group ID to all objects
        this.objectsData.forEach(obj => {
            obj.groupId = this.groupData.id;
        });

        // Re-add group to scene data
        if (!this.sceneEditor.sceneData.groups) {
            this.sceneEditor.sceneData.groups = [];
        }

        this.sceneEditor.sceneData.groups.push(this.groupData);

        // Refresh UI
        if (this.sceneEditor.refreshSceneUI) {
            this.sceneEditor.refreshSceneUI();
        }

        this.sceneEditor.markAsModified();
    }
}

/**
 * Command for batch operations (multiple commands at once)
 */
class BatchCommand {
    constructor(name, commands) {
        this.name = name || 'Batch Operation';
        this.commands = commands || [];
    }

    execute() {
        for (const command of this.commands) {
            command.execute();
        }
    }

    undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}

module.exports = {
    CreateObjectCommand,
    DeleteObjectCommand,
    MoveObjectCommand,
    ResizeObjectCommand,
    RotateObjectCommand,
    ChangePropertyCommand,
    ChangeLayerCommand,
    GroupObjectsCommand,
    UngroupObjectsCommand,
    BatchCommand
};
