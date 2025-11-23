const header = nw.require('./assets/js/objects/header');

$(document).ready(function () {
    //for all appMenuItemCheck
    let objs = $(".appMenuItemSubMenu div[check]");
    for (let i = 0; i < objs.length; i++) {
        if (objs[i].getAttribute("check") == "true") {
            objs[i].children[1].style.display = "block";
        }
    }

    //click event to toggle checking state
    $(".appMenuItemSubMenu div[check]").click(function () {
        if (this.getAttribute("check") == null) return;
        //
        let check = this.getAttribute("check") == "true" ? true : false;
        if (!check) {
            this.setAttribute("check", "true");
            this.children[1].style.display = "block";
        }
        else {
            this.setAttribute("check", "false");
            this.children[1].style.display = "none";
        }
    });

    //minimize event
    $("#appMinimizeBtn").click(function () {
        win.minimize();
    });
    //maximize event
    $("#appMaximizeBtn").click(function () {
        if (!globals.app.isMaximized) {
            win.maximize();
            globals.app.isMaximized = true;
        }
        else {
            win.unmaximize();
            globals.app.isMaximized = false;
        }
    });
    //close event
    $("#appCloseBtn").click(function () {
        console.log('[CLOSE] ====== CLOSE BUTTON CLICKED ======');
        console.log('[CLOSE] sceneEditor exists:', !!sceneEditor);
        console.log('[CLOSE] sceneData exists:', !!sceneEditor.sceneData);
        console.log('[CLOSE] hasUnsavedChanges:', sceneEditor.hasUnsavedChanges);
        console.log('[CLOSE] sceneData.objects count:', sceneEditor.sceneData?.objects?.length || 0);
        console.log('[CLOSE] sceneFilePath:', sceneEditor.cache?.sceneFilePath);

        // Check if there's an open scene WITH unsaved changes
        if (sceneEditor.sceneData && sceneEditor.cache.sceneFilePath && sceneEditor.hasUnsavedChanges) {
            console.log('[CLOSE] Scene has unsaved changes - showing save confirmation dialog');

            // Create custom dialog
            const dialog = document.createElement('div');
            dialog.id = 'closeConfirmDialog';
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
                z-index: 999999;
                backdrop-filter: blur(4px);
            `;

            const dialogBox = document.createElement('div');
            dialogBox.style.cssText = `
                background: var(--bg-secondary, #1e1e1e);
                border: 1px solid var(--border-color, #333);
                border-radius: 8px;
                padding: 24px;
                min-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            `;

            dialogBox.innerHTML = `
                <h3 style="margin: 0 0 16px 0; color: var(--text-primary, #fff); font-size: 18px;">
                    Save changes?
                </h3>
                <p style="margin: 0 0 24px 0; color: var(--text-secondary, #aaa); font-size: 14px;">
                    Do you want to save the current scene before closing?
                </p>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button id="closeNoSave" style="padding: 8px 16px; background: var(--bg-tertiary, #2a2a2a); border: 1px solid var(--border-color, #444); color: var(--text-primary, #fff); border-radius: 4px; cursor: pointer; font-size: 14px;">
                        Don't Save
                    </button>
                    <button id="closeCancel" style="padding: 8px 16px; background: var(--bg-tertiary, #2a2a2a); border: 1px solid var(--border-color, #444); color: var(--text-primary, #fff); border-radius: 4px; cursor: pointer; font-size: 14px;">
                        Cancel
                    </button>
                    <button id="closeSave" style="padding: 8px 16px; background: var(--primary, #5eccbb); border: none; color: #000; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        Save
                    </button>
                </div>
            `;

            dialog.appendChild(dialogBox);
            document.body.appendChild(dialog);
            console.log('[CLOSE] Dialog created and displayed');

            // Save and close
            document.getElementById('closeSave').addEventListener('click', function() {
                console.log('[CLOSE] Save button clicked - saving scene...');
                const result = sceneEditor.saveScene();
                console.log('[CLOSE] Save result:', result);

                if (result && notifications) {
                    notifications.success('Scene saved');
                }

                const dialogEl = document.getElementById('closeConfirmDialog');
                if (dialogEl) {
                    document.body.removeChild(dialogEl);
                }

                console.log('[CLOSE] Closing application');
                app.quit();
            });

            // Close without saving
            document.getElementById('closeNoSave').addEventListener('click', function() {
                console.log('[CLOSE] Don\'t Save button clicked - closing without saving');
                const dialogEl = document.getElementById('closeConfirmDialog');
                if (dialogEl) {
                    document.body.removeChild(dialogEl);
                }

                console.log('[CLOSE] Closing application');
                app.quit();
            });

            // Cancel close
            document.getElementById('closeCancel').addEventListener('click', function() {
                console.log('[CLOSE] Cancel button clicked - not closing');
                const dialogEl = document.getElementById('closeConfirmDialog');
                if (dialogEl) {
                    document.body.removeChild(dialogEl);
                }
            });
        } else {
            // No scene open OR no unsaved changes - just close
            console.log('[CLOSE] No unsaved changes - closing immediately');
            app.quit();
        }
    });



    /*-------------------
    appMenu
    -------------------*/
    $("#openProjectBtn").click(function () {
        globals.action = "load-project";
        //open file loader
        FolderInput.click();
    });

    $("#FolderInput").change(function () {
        if (globals.action === "load-project") {
            header.loadProject(this.value);
        }
    });

    // Save Scene menu item
    $("#saveSceneBtn").click(function () {
        console.log('[MENU] Save Scene clicked');

        if (!sceneEditor.sceneData) {
            console.warn('[MENU] No scene data to save');
            if (notifications) {
                notifications.warning('No scene is open');
            }
            return;
        }

        if (!sceneEditor.cache.sceneFilePath) {
            console.warn('[MENU] No scene file path');
            if (notifications) {
                notifications.warning('No scene file path');
            }
            return;
        }

        console.log('[MENU] Saving scene...');
        const result = sceneEditor.saveScene();
        console.log('[MENU] Save result:', result);

        if (result && notifications) {
            notifications.success('Scene saved successfully');
        } else if (notifications) {
            notifications.error('Failed to save scene');
        }
    });

    // Save Project menu item
    $("#saveProjectBtn").click(function () {
        console.log('[MENU] Save Project clicked');

        if (!globals.project.dir) {
            console.warn('[MENU] No project loaded');
            if (notifications) {
                notifications.warning('No project is open');
            }
            return;
        }

        console.log('[MENU] Saving project...');
        const result = header.saveProject();
        console.log('[MENU] Save project result:', result);

        if (result && notifications) {
            notifications.success('Project saved successfully');
        } else if (notifications) {
            notifications.error('Failed to save project');
        }
    });

    // Exit menu item - trigger the same logic as close button
    $("#exitAppBtn").click(function () {
        console.log('[MENU] Exit clicked - triggering close button logic');
        $("#appCloseBtn").trigger('click');
    });

    // Undo
    $("#undoBtn").click(function () {
        console.log('[MENU] Undo clicked');
        const commandManager = nw.require('./assets/js/objects/commandManager');
        if (commandManager) {
            commandManager.undo();
        }
    });

    // Redo
    $("#redoBtn").click(function () {
        console.log('[MENU] Redo clicked');
        const commandManager = nw.require('./assets/js/objects/commandManager');
        if (commandManager) {
            commandManager.redo();
        }
    });

    // Copy
    $("#copyBtn").click(function () {
        console.log('[MENU] Copy clicked');
        const clipboard = nw.require('./assets/js/objects/clipboard');
        if (clipboard) {
            clipboard.copy();
        }
    });

    // Cut
    $("#cutBtn").click(function () {
        console.log('[MENU] Cut clicked');
        const clipboard = nw.require('./assets/js/objects/clipboard');
        if (clipboard) {
            clipboard.cut();
        }
    });

    // Paste
    $("#pasteBtn").click(function () {
        console.log('[MENU] Paste clicked');
        const clipboard = nw.require('./assets/js/objects/clipboard');
        if (clipboard) {
            clipboard.paste();
        }
    });

    // Align & Distribute tools
    $("#alignToolsBtn").click(function () {
        console.log('[MENU] Align & Distribute clicked');
        const alignTools = nw.require('./assets/js/objects/alignTools');
        if (alignTools) {
            alignTools.showToolbar();
        }
    });

    // Group objects
    $("#groupObjectsBtn").click(function () {
        console.log('[MENU] Group Objects clicked');
        const groupManager = nw.require('./assets/js/objects/groupManager');
        if (groupManager) {
            groupManager.groupObjects();
        }
    });

    // Ungroup objects
    $("#ungroupObjectsBtn").click(function () {
        console.log('[MENU] Ungroup Objects clicked');
        const groupManager = nw.require('./assets/js/objects/groupManager');
        if (groupManager) {
            groupManager.ungroupObjects();
        }
    });

    // Zoom In
    $("#zoomInBtn").click(function () {
        console.log('[MENU] Zoom In clicked');
        const zoom = window.zoom || nw.require('./assets/js/objects/zoom');
        if (zoom) {
            zoom.zoomIn();
        }
    });

    // Zoom Out
    $("#zoomOutBtn").click(function () {
        console.log('[MENU] Zoom Out clicked');
        const zoom = window.zoom || nw.require('./assets/js/objects/zoom');
        if (zoom) {
            zoom.zoomOut();
        }
    });

    // Reset Zoom
    $("#zoomResetBtn").click(function () {
        console.log('[MENU] Reset Zoom clicked');
        const zoom = window.zoom || nw.require('./assets/js/objects/zoom');
        if (zoom) {
            zoom.resetZoom();
        }
    });

    // Show Grid
    $("#showGridBtn").click(function () {
        console.log('[MENU] Show Grid clicked');
        const grid = window.grid || nw.require('./assets/js/objects/grid');
        if (grid) {
            grid.toggle();
            // Toggle check mark
            const currentCheck = $(this).attr('check') === 'true';
            $(this).attr('check', !currentCheck);
        }
    });

    // Snap to Grid
    $("#snapToGridBtn").click(function () {
        console.log('[MENU] Snap to Grid clicked');
        const grid = window.grid || nw.require('./assets/js/objects/grid');
        if (grid) {
            grid.toggleSnap();
            // Toggle check mark
            const currentCheck = $(this).attr('check') === 'true';
            $(this).attr('check', !currentCheck);
        }
    });

    // Grid Lines
    $("#gridLinesBtn").click(function () {
        console.log('[MENU] Grid Lines clicked');
        const grid = window.grid || nw.require('./assets/js/objects/grid');
        if (grid) {
            grid.toggleShowLines();
            // Toggle check mark
            const currentCheck = $(this).attr('check') === 'true';
            $(this).attr('check', !currentCheck);
        }
    });

    // Grid Size
    $("#gridSizeBtn").click(function () {
        console.log('[MENU] Grid Size clicked');
        const grid = window.grid || nw.require('./assets/js/objects/grid');
        const notifications = nw.require('./assets/js/objects/notifications');

        if (grid && notifications) {
            // Prompt for new grid size
            const currentSize = grid.gridSize;
            const newSize = prompt(`Enter grid size (5-100):`, currentSize);

            if (newSize !== null) {
                const size = parseInt(newSize);
                if (!isNaN(size) && size >= 5 && size <= 100) {
                    grid.setGridSize(size);
                    // Update label
                    $(this).find('.appMenuItemLabel').text(`Grid Size (${size}px)`);
                } else {
                    notifications.warning('Invalid grid size. Please enter a value between 5 and 100.');
                }
            }
        }
    });
});
