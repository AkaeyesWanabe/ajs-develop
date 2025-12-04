/**
 * Project Files Context Menu
 */

document.addEventListener('DOMContentLoaded', function() {
    const projectFiles = nw.require('./assets/js/objects/projectFiles');
    let contextMenuTarget = null;

    // Register context menu for project files tree
    const projectFilesContainer = document.getElementById('projectFiles');
    if (projectFilesContainer) {
        // Delegate context menu to individual items
        projectFilesContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Find the closest file or folder item
            const folderItem = e.target.closest('.projectFoldersListItem');
            const fileItem = e.target.closest('.projectFilesItem');

            contextMenuTarget = folderItem || fileItem;

            let menuItems = [];

            // If clicking on a file or folder
            if (contextMenuTarget) {
                const path = contextMenuTarget.getAttribute('path');
                const type = contextMenuTarget.getAttribute('type');
                const fileName = contextMenuTarget.querySelector('a, b, div')?.textContent?.trim() || '';

                // Distinguish between tree view folders and grid view items
                const isTreeFolder = !!folderItem;  // Tree items are always folders
                const isGridFolder = !folderItem && !!fileItem && type === 'dir';
                const isFile = !folderItem && !!fileItem && type !== 'dir';

                if (isTreeFolder) {
                    // Folder in tree view - show expand/collapse options
                    menuItems = [
                        {
                            id: 'new-file',
                            label: 'New File',
                            icon: 'ri-file-add-line'
                        },
                        {
                            id: 'new-folder',
                            label: 'New Folder',
                            icon: 'ri-folder-add-line'
                        },
                        { type: 'separator' },
                        {
                            id: 'expand',
                            label: 'Expand',
                            icon: 'ri-arrow-down-s-line'
                        },
                        {
                            id: 'collapse',
                            label: 'Collapse',
                            icon: 'ri-arrow-up-s-line'
                        },
                        { type: 'separator' },
                        {
                            id: 'expand-all',
                            label: 'Expand All',
                            icon: 'ri-arrow-down-circle-line'
                        },
                        {
                            id: 'collapse-all',
                            label: 'Collapse All',
                            icon: 'ri-arrow-up-circle-line'
                        },
                        { type: 'separator' },
                        {
                            id: 'rename-folder',
                            label: 'Rename',
                            icon: 'ri-edit-line',
                            shortcut: 'F2'
                        },
                        {
                            id: 'delete-folder',
                            label: 'Delete',
                            icon: 'ri-delete-bin-line',
                            shortcut: 'Del',
                            danger: true
                        },
                        { type: 'separator' },
                        {
                            id: 'reveal-in-explorer',
                            label: 'Reveal in File Explorer',
                            icon: 'ri-folder-open-line'
                        }
                    ];
                } else if (isGridFolder) {
                    // Folder in grid view - show open option
                    menuItems = [
                        {
                            id: 'open-folder',
                            label: 'Open',
                            icon: 'ri-folder-open-line',
                            shortcut: 'Enter'
                        },
                        { type: 'separator' },
                        {
                            id: 'rename-folder',
                            label: 'Rename',
                            icon: 'ri-edit-line',
                            shortcut: 'F2'
                        },
                        {
                            id: 'delete-folder',
                            label: 'Delete',
                            icon: 'ri-delete-bin-line',
                            shortcut: 'Del',
                            danger: true
                        },
                        { type: 'separator' },
                        {
                            id: 'reveal-in-explorer',
                            label: 'Reveal in File Explorer',
                            icon: 'ri-folder-open-line'
                        },
                        {
                            id: 'copy-path',
                            label: 'Copy Path',
                            icon: 'ri-file-copy-2-line'
                        }
                    ];
                } else if (isFile) {
                    // File context menu
                    const isScene = fileName.endsWith('.scn');
                    const isScript = fileName.endsWith('.js');

                    menuItems = [
                        {
                            id: 'open-file',
                            label: 'Open',
                            icon: 'ri-file-line',
                            shortcut: 'Enter'
                        }
                    ];

                    if (isScene) {
                        menuItems.push({
                            id: 'open-scene-editor',
                            label: 'Open in Scene Editor',
                            icon: 'ri-window-fill'
                        });
                    }

                    if (isScript) {
                        menuItems.push({
                            id: 'open-script-editor',
                            label: 'Open in Script Editor',
                            icon: 'ri-code-s-slash-fill'
                        });
                    }

                    menuItems.push(
                        { type: 'separator' },
                        {
                            id: 'rename-file',
                            label: 'Rename',
                            icon: 'ri-edit-line',
                            shortcut: 'F2'
                        },
                        {
                            id: 'duplicate-file',
                            label: 'Duplicate',
                            icon: 'ri-file-copy-line',
                            shortcut: 'Ctrl+D'
                        },
                        {
                            id: 'delete-file',
                            label: 'Delete',
                            icon: 'ri-delete-bin-line',
                            shortcut: 'Del',
                            danger: true
                        },
                        { type: 'separator' },
                        {
                            id: 'reveal-in-explorer',
                            label: 'Reveal in File Explorer',
                            icon: 'ri-folder-open-line'
                        },
                        {
                            id: 'copy-path',
                            label: 'Copy Path',
                            icon: 'ri-file-copy-2-line'
                        }
                    );
                }
            } else {
                // Empty space - show general menu
                if (!globals.projectPath) {
                    menuItems = [
                        {
                            id: 'open-project',
                            label: 'Open Project',
                            icon: 'ri-folder-open-line',
                            shortcut: 'Ctrl+O'
                        }
                    ];
                } else {
                    // Check if we're in a "scene" or "scenes" folder
                    const currentPath = globals.project?.current?.relativeFileParentPath || '';

                    // Check if path contains "scene" or "scenes" folder
                    const pathLower = currentPath.toLowerCase();
                    const isInSceneFolder = pathLower.includes('\\scene\\') ||
                                          pathLower.includes('\\scenes\\') ||
                                          pathLower.includes('/scene/') ||
                                          pathLower.includes('/scenes/') ||
                                          pathLower.startsWith('scene\\') ||
                                          pathLower.startsWith('scenes\\') ||
                                          pathLower.startsWith('scene/') ||
                                          pathLower.startsWith('scenes/') ||
                                          pathLower === 'scene' ||
                                          pathLower === 'scenes';

                    // Check if path contains "scripts" or "script" folder
                    const isInScriptsFolder = pathLower.includes('\\script\\') ||
                                            pathLower.includes('\\scripts\\') ||
                                            pathLower.includes('/script/') ||
                                            pathLower.includes('/scripts/') ||
                                            pathLower.startsWith('script\\') ||
                                            pathLower.startsWith('scripts\\') ||
                                            pathLower.startsWith('script/') ||
                                            pathLower.startsWith('scripts/') ||
                                            pathLower === 'script' ||
                                            pathLower === 'scripts' ||
                                            pathLower.endsWith('\\scripts') ||
                                            pathLower.endsWith('/scripts') ||
                                            pathLower.endsWith('\\script') ||
                                            pathLower.endsWith('/script');

                    menuItems = [];

                    // Add "New Scene" option only if in scene/scenes folder
                    if (isInSceneFolder) {
                        menuItems.push({
                            id: 'new-scene',
                            label: 'New Scene',
                            icon: 'ri-landscape-line'
                        });
                    }

                    // Add "New Script" option only if in script/scripts folder
                    if (isInScriptsFolder) {
                        menuItems.push({
                            id: 'new-script',
                            label: 'New Script',
                            icon: 'ri-code-s-slash-line'
                        });
                    }

                    // Always show refresh
                    if (menuItems.length > 0) {
                        menuItems.push({ type: 'separator' });
                    }

                    menuItems.push({
                        id: 'refresh',
                        label: 'Refresh',
                        icon: 'ri-refresh-line',
                        shortcut: 'F5'
                    });
                }
            }

            if (menuItems.length > 0) {
                contextMenu.show(e.clientX, e.clientY, menuItems);
            }
        });
    }

    // Register context menu for project files grid (empty space)
    const projectFilesBar = document.getElementById('projectFilesBar');
    if (projectFilesBar) {
        projectFilesBar.addEventListener('contextmenu', (e) => {
            // Only handle if clicking directly on projectFilesBar (empty space)
            if (e.target.id !== 'projectFilesBar') {
                return; // Let the other handler deal with file items
            }

            e.preventDefault();
            e.stopPropagation();

            let menuItems = [];

            // Check if we're in a "scene" or "scenes" folder
            const currentPath = globals.project?.current?.relativeFileParentPath || '';

            // Check if path contains "scene" or "scenes" folder
            const pathLower = currentPath.toLowerCase();
            const isInSceneFolder = pathLower.includes('\\scene\\') ||
                                  pathLower.includes('\\scenes\\') ||
                                  pathLower.includes('/scene/') ||
                                  pathLower.includes('/scenes/') ||
                                  pathLower.startsWith('scene\\') ||
                                  pathLower.startsWith('scenes\\') ||
                                  pathLower.startsWith('scene/') ||
                                  pathLower.startsWith('scenes/') ||
                                  pathLower === 'scene' ||
                                  pathLower === 'scenes' ||
                                  pathLower.endsWith('\\scenes') ||
                                  pathLower.endsWith('/scenes') ||
                                  pathLower.endsWith('\\scene') ||
                                  pathLower.endsWith('/scene');

            // Check if path contains "scripts" or "script" folder
            const isInScriptsFolder = pathLower.includes('\\script\\') ||
                                    pathLower.includes('\\scripts\\') ||
                                    pathLower.includes('/script/') ||
                                    pathLower.includes('/scripts/') ||
                                    pathLower.startsWith('script\\') ||
                                    pathLower.startsWith('scripts\\') ||
                                    pathLower.startsWith('script/') ||
                                    pathLower.startsWith('scripts/') ||
                                    pathLower === 'script' ||
                                    pathLower === 'scripts' ||
                                    pathLower.endsWith('\\scripts') ||
                                    pathLower.endsWith('/scripts') ||
                                    pathLower.endsWith('\\script') ||
                                    pathLower.endsWith('/script');

            // Add "New Scene" option only if in scene/scenes folder
            if (isInSceneFolder) {
                menuItems.push({
                    id: 'new-scene',
                    label: 'New Scene',
                    icon: 'ri-landscape-line'
                });
                menuItems.push({ type: 'separator' });
            }

            // Add "New Script" option only if in script/scripts folder
            if (isInScriptsFolder) {
                menuItems.push({
                    id: 'new-script',
                    label: 'New Script',
                    icon: 'ri-code-s-slash-line'
                });
                menuItems.push({ type: 'separator' });
            }

            // Always show refresh
            menuItems.push({
                id: 'refresh',
                label: 'Refresh',
                icon: 'ri-refresh-line',
                shortcut: 'F5'
            });

            if (menuItems.length > 0) {
                contextMenu.show(e.clientX, e.clientY, menuItems);
            }
        });
    }

    // Handle context menu clicks for Project Files
    $(document).on('contextMenuClick', async function(e, data) {
        const itemId = data.itemId;

        // Get path from context menu target
        const path = contextMenuTarget ? contextMenuTarget.getAttribute('path') : null;

        switch (itemId) {
            case 'new-file':
                // TODO: Implement new file
                if (typeof notifications !== 'undefined') {
                    notifications.info('New file feature coming soon');
                }
                break;

            case 'new-folder':
                // TODO: Implement new folder
                if (typeof notifications !== 'undefined') {
                    notifications.info('New folder feature coming soon');
                }
                break;

            case 'new-scene':
                // Create a new scene file
                if (typeof notifications !== 'undefined') {
                    notifications.prompt('New Scene', 'Enter scene name:', 'new_scene').then(async sceneName => {
                        if (sceneName) {
                            // Clean the scene name (remove spaces, special chars)
                            sceneName = sceneName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

                            if (sceneName) {
                                // Determine target path
                                let targetPath;
                                if (path) {
                                    // If clicking on a folder item
                                    targetPath = path;
                                } else {
                                    // If clicking on empty space, use current directory
                                    const relativePath = globals.project?.current?.relativeFileParentPath || '';
                                    if (relativePath) {
                                        targetPath = nw.require('path').join(globals.project.dir, relativePath);
                                    } else {
                                        targetPath = globals.project.dir;
                                    }
                                }

                                try {
                                    const success = await projectFiles.createNewScene(targetPath, sceneName);

                                    if (success) {
                                        notifications.success(`Scene "${sceneName}" created successfully`);
                                    } else {
                                        notifications.error('Failed to create scene');
                                    }
                                } catch (err) {
                                    console.error('[New Scene] Error:', err);
                                    notifications.error('Error creating scene: ' + err.message);
                                }
                            }
                        }
                    });
                }
                break;

            case 'new-script':
                // Create a new script file
                if (typeof notifications !== 'undefined') {
                    notifications.prompt('New Script', 'Enter script name:', 'NewScript').then(async scriptName => {
                        if (scriptName) {
                            // Clean the script name (CamelCase, no spaces)
                            scriptName = scriptName.trim();
                            // Remove special characters but keep alphanumeric and underscores
                            scriptName = scriptName.replace(/[^a-zA-Z0-9_]/g, '');
                            // Capitalize first letter if it isn't
                            if (scriptName && scriptName.length > 0) {
                                scriptName = scriptName.charAt(0).toUpperCase() + scriptName.slice(1);
                            }

                            if (scriptName) {
                                // Determine target path
                                let targetPath;
                                if (path) {
                                    // If clicking on a folder item
                                    targetPath = path;
                                } else {
                                    // If clicking on empty space, use current directory
                                    const relativePath = globals.project?.current?.relativeFileParentPath || '';
                                    if (relativePath) {
                                        targetPath = nw.require('path').join(globals.project.dir, relativePath);
                                    } else {
                                        targetPath = globals.project.dir;
                                    }
                                }

                                const fs = nw.require('fs');
                                const pathModule = nw.require('path');

                                const scriptFileName = scriptName.endsWith('.js') ? scriptName : `${scriptName}.js`;
                                const scriptPath = pathModule.join(targetPath, scriptFileName);

                                // Check if file already exists
                                if (fs.existsSync(scriptPath)) {
                                    console.error('[New Script] File already exists:', scriptPath);
                                    notifications.error(`Script "${scriptFileName}" already exists`);
                                } else {
                                    // Create script template
                                    const template = `/**
 * ${scriptName} - Script description
 */

class ${scriptName} {
    properties = {
        // Add your configurable properties here
    };

    onStart(gameObject, api) {
        api.log('${scriptName} started for', gameObject.name);
    }

    onUpdate(gameObject, deltaTime, api) {
        // Game logic here
        // deltaTime is in milliseconds
    }

    onDestroy(gameObject, api) {
        // Cleanup here
    }
}

module.exports = ${scriptName};
`;

                                    try {
                                        // Write the script file
                                        fs.writeFileSync(scriptPath, template, 'utf8');

                                        // Refresh file list
                                        projectFiles.refresh();

                                        notifications.success(`Script "${scriptFileName}" created successfully`);

                                        // Open the script in script editor
                                        setTimeout(() => {
                                            projectFiles.openFileByPath(scriptPath, scriptFileName);
                                        }, 500);
                                    } catch (err) {
                                        console.error('[New Script] Error:', err);
                                        notifications.error('Error creating script: ' + err.message);
                                    }
                                }
                            }
                        }
                    });
                }
                break;

            case 'open-file':
                if (path && contextMenuTarget) {
                    contextMenuTarget.dispatchEvent(new Event('dblclick', { bubbles: true }));
                }
                break;

            case 'open-folder':
                // Open folder in grid view (navigate into it)
                if (path && contextMenuTarget) {
                    contextMenuTarget.dispatchEvent(new Event('dblclick', { bubbles: true }));
                }
                break;

            case 'open-scene-editor':
                // Open in scene editor
                if (path && contextMenuTarget) {
                    const fileName = contextMenuTarget.getAttribute('filename');
                    if (fileName) {
                        projectFiles.openFileByPath(path, fileName);
                    }
                }
                break;

            case 'open-script-editor':
                // Open in script editor
                if (path && contextMenuTarget) {
                    const fileName = contextMenuTarget.getAttribute('filename');
                    if (fileName) {
                        projectFiles.openFileByPath(path, fileName);
                    }
                }
                break;

            case 'rename-file':
            case 'rename-folder':
                if (path && typeof notifications !== 'undefined') {
                    const currentName = contextMenuTarget.querySelector('a, b, div')?.textContent?.trim() || '';
                    const isFolder = itemId === 'rename-folder';

                    notifications.prompt(
                        `Rename ${isFolder ? 'Folder' : 'File'}`,
                        'Enter new name:',
                        currentName
                    ).then(async newName => {
                        if (newName && newName.trim() !== '') {
                            newName = newName.trim();

                            // Validate name (no special characters that could cause issues)
                            const invalidChars = /[<>:"|?*]/;
                            if (invalidChars.test(newName)) {
                                notifications.error('File name contains invalid characters');
                                return;
                            }

                            if (newName === currentName) {
                                return;
                            }

                            const success = await projectFiles.renameFile(path, newName);
                            if (success) {
                                notifications.success(`${isFolder ? 'Folder' : 'File'} renamed successfully`);
                            }
                        }
                    });
                }
                break;

            case 'duplicate-file':
                if (path) {
                    await projectFiles.duplicateFile(path);
                    // Success notification is handled in duplicateFile method
                }
                break;

            case 'delete-file':
            case 'delete-folder':
                if (path && typeof notifications !== 'undefined') {
                    const fileName = contextMenuTarget.querySelector('a, b, div')?.textContent?.trim() || 'this item';
                    const isFolder = itemId === 'delete-folder';
                    const itemType = isFolder ? 'folder' : 'file';

                    notifications.confirm(
                        `Delete ${isFolder ? 'Folder' : 'File'}`,
                        `Are you sure you want to delete "${fileName}"?${isFolder ? ' This will delete all contents.' : ''}`,
                        { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
                    ).then(async confirmed => {
                        if (confirmed) {
                            const success = await projectFiles.deleteFile(path);

                            if (success) {
                                notifications.success(`${isFolder ? 'Folder' : 'File'} deleted successfully`);
                            } else {
                                notifications.error(`Failed to delete ${itemType}`);
                            }
                        }
                    });
                }
                break;

            case 'expand':
                // Expand only the clicked folder
                if (contextMenuTarget) {
                    contextMenuTarget.setAttribute('open', 'true');
                }
                break;

            case 'collapse':
                // Collapse only the clicked folder
                if (contextMenuTarget) {
                    contextMenuTarget.setAttribute('open', 'false');
                }
                break;

            case 'expand-all':
                // Expand all folders in the tree
                const allFolders = document.querySelectorAll('.projectFoldersListItem');
                allFolders.forEach(folder => {
                    folder.setAttribute('open', 'true');
                });
                break;

            case 'collapse-all':
                // Collapse all folders in the tree
                const allFoldersToCollapse = document.querySelectorAll('.projectFoldersListItem');
                allFoldersToCollapse.forEach(folder => {
                    folder.setAttribute('open', 'false');
                });
                break;

            case 'reveal-in-explorer':
                if (path) {
                    nw.Shell.showItemInFolder(path);
                }
                break;

            case 'copy-path':
                if (path) {
                    nw.Clipboard.get().set(path, 'text');
                    if (typeof notifications !== 'undefined') {
                        notifications.success('Path copied to clipboard');
                    }
                }
                break;

            case 'refresh':
                if (globals.projectPath) {
                    projectFiles.refresh();
                    if (typeof notifications !== 'undefined') {
                        notifications.success('Project files refreshed');
                    }
                }
                break;

            case 'open-project':
                const header = nw.require('./assets/js/objects/header');
                if (header && header.openProject) {
                    header.openProject();
                }
                break;
        }

        contextMenuTarget = null;
    });

    // Keyboard shortcuts for project files
    document.addEventListener('keydown', (e) => {
        // Get selected file/folder
        const selectedItem = document.querySelector('.projectFilesItem.selected, .projectFoldersListItem.selected');
        if (!selectedItem) return;

        const path = selectedItem.getAttribute('path');
        const type = selectedItem.getAttribute('type');
        const isFolder = selectedItem.classList.contains('projectFoldersListItem') || type === 'dir';

        // F2 - Rename
        if (e.key === 'F2') {
            e.preventDefault();
            e.stopPropagation();

            if (path && typeof notifications !== 'undefined') {
                const currentName = selectedItem.querySelector('a, b, div')?.textContent?.trim() || '';

                notifications.prompt(
                    `Rename ${isFolder ? 'Folder' : 'File'}`,
                    'Enter new name:',
                    currentName
                ).then(async newName => {
                    if (newName && newName.trim() !== '') {
                        newName = newName.trim();

                        // Validate name
                        const invalidChars = /[<>:"|?*]/;
                        if (invalidChars.test(newName)) {
                            notifications.error('File name contains invalid characters');
                            return;
                        }

                        if (newName === currentName) {
                            return;
                        }

                        const success = await projectFiles.renameFile(path, newName);
                        if (success) {
                            notifications.success(`${isFolder ? 'Folder' : 'File'} renamed successfully`);
                        }
                    }
                });
            }
        }

        // Ctrl+D - Duplicate (files only)
        if (e.ctrlKey && e.key === 'd' && !isFolder) {
            e.preventDefault();
            e.stopPropagation();

            if (path) {
                projectFiles.duplicateFile(path);
            }
        }
    });
});
