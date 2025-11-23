const $ = nw.require('jquery');
const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    /**
     * Get all currently selected objects with their elements and data
     */
    getSelectedObjects() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const selectedElements = document.querySelectorAll('.__ajs_scene_object.clickable_selected');
        const selectedObjects = [];

        selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = sceneEditor.sceneData?.objects?.find(obj => obj.oid === oid);

            if (objectData && !objectData.locked) {
                selectedObjects.push({
                    element: elem,
                    data: objectData
                });
            }
        });

        return selectedObjects;
    },

    /**
     * Get scene dimensions and position
     */
    getSceneBounds() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        return {
            x: 0,
            y: 0,
            width: sceneEditor.sceneData?.properties?.width || 640,
            height: sceneEditor.sceneData?.properties?.height || 480
        };
    },

    /**
     * Align selected objects to the left
     * With 1 object: align to left edge of scene
     * With 2+ objects: align all to leftmost object
     */
    alignLeft() {
        const selected = this.getSelectedObjects();

        if (selected.length < 1) {
            notifications.warning('Select at least 1 object to align');
            return;
        }

        let targetX;
        if (selected.length === 1) {
            // Align single object to left edge of scene
            const scene = this.getSceneBounds();
            targetX = scene.x;
        } else {
            // Find leftmost position among selected objects
            targetX = Math.min(...selected.map(obj => obj.data.properties.x));
        }

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        selected.forEach(obj => {
            const oldX = obj.data.properties.x;
            const oldY = obj.data.properties.y;
            if (oldX !== targetX) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, obj.data, oldX, oldY, targetX, oldY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Align Left', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Aligned ${selected.length} object${selected.length > 1 ? 's' : ''} to left`);
        }
    },

    /**
     * Align selected objects to the right
     * With 1 object: align to right edge of scene
     * With 2+ objects: align all to rightmost object
     */
    alignRight() {
        const selected = this.getSelectedObjects();

        if (selected.length < 1) {
            notifications.warning('Select at least 1 object to align');
            return;
        }

        let targetRight;
        if (selected.length === 1) {
            // Align single object to right edge of scene
            const scene = this.getSceneBounds();
            targetRight = scene.width;
        } else {
            // Find rightmost position among selected objects
            targetRight = Math.max(...selected.map(obj => obj.data.properties.x + obj.data.properties.width));
        }

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        selected.forEach(obj => {
            const oldX = obj.data.properties.x;
            const oldY = obj.data.properties.y;
            const newX = targetRight - obj.data.properties.width;
            if (oldX !== newX) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, obj.data, oldX, oldY, newX, oldY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Align Right', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Aligned ${selected.length} object${selected.length > 1 ? 's' : ''} to right`);
        }
    },

    /**
     * Align selected objects to the top
     * With 1 object: align to top edge of scene
     * With 2+ objects: align all to topmost object
     */
    alignTop() {
        const selected = this.getSelectedObjects();

        if (selected.length < 1) {
            notifications.warning('Select at least 1 object to align');
            return;
        }

        let targetY;
        if (selected.length === 1) {
            // Align single object to top edge of scene
            const scene = this.getSceneBounds();
            targetY = scene.y;
        } else {
            // Find topmost position among selected objects
            targetY = Math.min(...selected.map(obj => obj.data.properties.y));
        }

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        selected.forEach(obj => {
            const oldX = obj.data.properties.x;
            const oldY = obj.data.properties.y;
            if (oldY !== targetY) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, obj.data, oldX, oldY, oldX, targetY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Align Top', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Aligned ${selected.length} object${selected.length > 1 ? 's' : ''} to top`);
        }
    },

    /**
     * Align selected objects to the bottom
     * With 1 object: align to bottom edge of scene
     * With 2+ objects: align all to bottommost object
     */
    alignBottom() {
        const selected = this.getSelectedObjects();

        if (selected.length < 1) {
            notifications.warning('Select at least 1 object to align');
            return;
        }

        let targetBottom;
        if (selected.length === 1) {
            // Align single object to bottom edge of scene
            const scene = this.getSceneBounds();
            targetBottom = scene.height;
        } else {
            // Find bottommost position among selected objects
            targetBottom = Math.max(...selected.map(obj => obj.data.properties.y + obj.data.properties.height));
        }

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        selected.forEach(obj => {
            const oldX = obj.data.properties.x;
            const oldY = obj.data.properties.y;
            const newY = targetBottom - obj.data.properties.height;
            if (oldY !== newY) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, obj.data, oldX, oldY, oldX, newY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Align Bottom', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Aligned ${selected.length} object${selected.length > 1 ? 's' : ''} to bottom`);
        }
    },

    /**
     * Align selected objects to horizontal center
     * With 1 object: center horizontally in scene
     * With 2+ objects: align all to average horizontal center
     */
    alignCenterHorizontal() {
        const selected = this.getSelectedObjects();

        if (selected.length < 1) {
            notifications.warning('Select at least 1 object to align');
            return;
        }

        let targetCenterX;
        if (selected.length === 1) {
            // Center single object horizontally in scene
            const scene = this.getSceneBounds();
            targetCenterX = scene.width / 2;
        } else {
            // Calculate average center position among selected objects
            const centers = selected.map(obj => obj.data.properties.x + obj.data.properties.width / 2);
            targetCenterX = centers.reduce((a, b) => a + b, 0) / centers.length;
        }

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        selected.forEach(obj => {
            const oldX = obj.data.properties.x;
            const oldY = obj.data.properties.y;
            const newX = targetCenterX - obj.data.properties.width / 2;
            if (oldX !== newX) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, obj.data, oldX, oldY, newX, oldY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Align Center Horizontal', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Aligned ${selected.length} object${selected.length > 1 ? 's' : ''} to horizontal center`);
        }
    },

    /**
     * Align selected objects to vertical center
     * With 1 object: center vertically in scene
     * With 2+ objects: align all to average vertical center
     */
    alignCenterVertical() {
        const selected = this.getSelectedObjects();

        if (selected.length < 1) {
            notifications.warning('Select at least 1 object to align');
            return;
        }

        let targetCenterY;
        if (selected.length === 1) {
            // Center single object vertically in scene
            const scene = this.getSceneBounds();
            targetCenterY = scene.height / 2;
        } else {
            // Calculate average center position among selected objects
            const centers = selected.map(obj => obj.data.properties.y + obj.data.properties.height / 2);
            targetCenterY = centers.reduce((a, b) => a + b, 0) / centers.length;
        }

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        selected.forEach(obj => {
            const oldX = obj.data.properties.x;
            const oldY = obj.data.properties.y;
            const newY = targetCenterY - obj.data.properties.height / 2;
            if (oldY !== newY) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, obj.data, oldX, oldY, oldX, newY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Align Center Vertical', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Aligned ${selected.length} object${selected.length > 1 ? 's' : ''} to vertical center`);
        }
    },

    /**
     * Distribute selected objects horizontally
     */
    distributeHorizontal() {
        const selected = this.getSelectedObjects();

        if (selected.length < 3) {
            notifications.warning('Select at least 3 objects to distribute');
            return;
        }

        // Sort by X position
        const sorted = selected.sort((a, b) => a.data.properties.x - b.data.properties.x);

        // Calculate total space between first and last object
        const firstX = sorted[0].data.properties.x;
        const lastX = sorted[sorted.length - 1].data.properties.x + sorted[sorted.length - 1].data.properties.width;
        const totalSpace = lastX - firstX;

        // Calculate total width of all objects
        const totalWidth = sorted.reduce((sum, obj) => sum + obj.data.properties.width, 0);

        // Calculate spacing between objects
        const spacing = (totalSpace - totalWidth) / (sorted.length - 1);

        // Calculate new positions for all objects
        const newPositions = [];
        let currentX = firstX;
        sorted.forEach((obj, index) => {
            newPositions.push({
                obj: obj,
                oldX: obj.data.properties.x,
                oldY: obj.data.properties.y,
                newX: (index > 0 && index < sorted.length - 1) ? currentX : obj.data.properties.x
            });
            currentX += obj.data.properties.width + spacing;
        });

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        newPositions.forEach(pos => {
            if (pos.oldX !== pos.newX) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, pos.obj.data, pos.oldX, pos.oldY, pos.newX, pos.oldY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Distribute Horizontal', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Distributed ${selected.length} objects horizontally`);
        }
    },

    /**
     * Distribute selected objects vertically
     */
    distributeVertical() {
        const selected = this.getSelectedObjects();

        if (selected.length < 3) {
            notifications.warning('Select at least 3 objects to distribute');
            return;
        }

        // Sort by Y position
        const sorted = selected.sort((a, b) => a.data.properties.y - b.data.properties.y);

        // Calculate total space between first and last object
        const firstY = sorted[0].data.properties.y;
        const lastY = sorted[sorted.length - 1].data.properties.y + sorted[sorted.length - 1].data.properties.height;
        const totalSpace = lastY - firstY;

        // Calculate total height of all objects
        const totalHeight = sorted.reduce((sum, obj) => sum + obj.data.properties.height, 0);

        // Calculate spacing between objects
        const spacing = (totalSpace - totalHeight) / (sorted.length - 1);

        // Calculate new positions for all objects
        const newPositions = [];
        let currentY = firstY;
        sorted.forEach((obj, index) => {
            newPositions.push({
                obj: obj,
                oldX: obj.data.properties.x,
                oldY: obj.data.properties.y,
                newY: (index > 0 && index < sorted.length - 1) ? currentY : obj.data.properties.y
            });
            currentY += obj.data.properties.height + spacing;
        });

        // Create commands for undo/redo
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');

        const moveCommands = [];
        newPositions.forEach(pos => {
            if (pos.oldY !== pos.newY) {
                moveCommands.push(new commands.MoveObjectCommand(
                    sceneEditor, pos.obj.data, pos.oldX, pos.oldY, pos.oldX, pos.newY
                ));
            }
        });

        if (moveCommands.length > 0) {
            const batchCommand = new commands.BatchCommand('Distribute Vertical', moveCommands);
            commandManager.execute(batchCommand);
            this.refreshScene();
            notifications.success(`Distributed ${selected.length} objects vertically`);
        }
    },

    /**
     * Refresh the scene to show changes
     */
    refreshScene() {
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

        if (sceneEditor && sceneEditor.sceneData) {
            sceneEditor.refreshSceneObjects(sceneEditor.sceneData.objects);

            // Mark scene as modified
            if (sceneEditor.markAsModified) {
                sceneEditor.markAsModified();
            }

            // Refresh transform controls
            const transformControls = window.transformControls || nw.require('./assets/js/objects/transformControls');
            if (transformControls && transformControls.refresh) {
                transformControls.refresh();
            }
        }
    },

    /**
     * Update toolbar button states based on selection
     */
    updateToolbarState() {
        const toolbar = document.getElementById('alignToolbar');
        if (!toolbar) return;

        const selected = this.getSelectedObjects();
        const selectedCount = selected.length;

        console.log('[AlignTools] Updating toolbar state, selected count:', selectedCount);

        // Update align buttons (require at least 1 object)
        const alignButtons = toolbar.querySelectorAll('.align-btn[data-action^="align"]');
        alignButtons.forEach(btn => {
            if (selectedCount < 1) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });

        // Update distribute buttons (require at least 3 objects)
        const distributeButtons = toolbar.querySelectorAll('.align-btn[data-action^="distribute"]');
        distributeButtons.forEach(btn => {
            if (selectedCount < 3) {
                btn.disabled = true;
                btn.style.opacity = '0.3';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    },

    /**
     * Show align/distribute toolbar
     */
    showToolbar() {
        // Check if toolbar already exists
        let toolbar = document.getElementById('alignToolbar');

        if (toolbar) {
            // Toggle visibility
            if (toolbar.style.display === 'none') {
                toolbar.style.display = 'flex';
                this.updateToolbarState();
            } else {
                toolbar.style.display = 'none';
            }
            return;
        }

        // Create toolbar
        toolbar = document.createElement('div');
        toolbar.id = 'alignToolbar';
        toolbar.className = 'align-toolbar';

        toolbar.innerHTML = `
            <div class="align-toolbar-header">
                <h4>Align & Distribute</h4>
                <button class="align-toolbar-close"><i class="ri-close-line"></i></button>
            </div>
            <div class="align-toolbar-section">
                <span class="align-toolbar-label">Align</span>
                <div class="align-toolbar-buttons">
                    <button class="align-btn" data-action="alignLeft" title="Align Left">
                        <i class="ri-align-left"></i>
                    </button>
                    <button class="align-btn" data-action="alignCenterHorizontal" title="Align Center (Horizontal)">
                        <i class="ri-align-center"></i>
                    </button>
                    <button class="align-btn" data-action="alignRight" title="Align Right">
                        <i class="ri-align-right"></i>
                    </button>
                    <button class="align-btn" data-action="alignTop" title="Align Top">
                        <i class="ri-align-top"></i>
                    </button>
                    <button class="align-btn" data-action="alignCenterVertical" title="Align Center (Vertical)">
                        <i class="ri-align-vertically"></i>
                    </button>
                    <button class="align-btn" data-action="alignBottom" title="Align Bottom">
                        <i class="ri-align-bottom"></i>
                    </button>
                </div>
            </div>
            <div class="align-toolbar-section">
                <span class="align-toolbar-label">Distribute</span>
                <div class="align-toolbar-buttons">
                    <button class="align-btn" data-action="distributeHorizontal" title="Distribute Horizontal (3+ objects)">
                        <i class="ri-expand-left-right-line"></i>
                    </button>
                    <button class="align-btn" data-action="distributeVertical" title="Distribute Vertical (3+ objects)">
                        <i class="ri-expand-up-down-line"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(toolbar);

        // Attach event handlers
        toolbar.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Don't execute if button is disabled
                if (btn.disabled) return;

                const action = btn.getAttribute('data-action');
                if (this[action]) {
                    this[action]();
                    // Update button states after action
                    this.updateToolbarState();
                }
            });
        });

        // Close button handler
        toolbar.querySelector('.align-toolbar-close').addEventListener('click', () => {
            toolbar.style.display = 'none';
        });

        console.log('Align toolbar created and displayed');

        // Update button states based on current selection
        this.updateToolbarState();
    }
};
