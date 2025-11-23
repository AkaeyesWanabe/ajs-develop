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
                            icon: 'ri-file-copy-line'
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
                            id: 'refresh',
                            label: 'Refresh',
                            icon: 'ri-refresh-line'
                        }
                    ];
                }
            }

            if (menuItems.length > 0) {
                contextMenu.show(e.clientX, e.clientY, menuItems);
            }
        });
    }

    // Handle context menu clicks for Project Files
    $(document).on('contextMenuClick', function(e, data) {
        const itemId = data.itemId;

        // Get path from context menu target
        const path = contextMenuTarget ? contextMenuTarget.getAttribute('path') : null;

        switch (itemId) {
            case 'new-file':
                // TODO: Implement new file
                console.log('New file in:', path || globals.projectPath);
                if (typeof notifications !== 'undefined') {
                    notifications.info('New file feature coming soon');
                }
                break;

            case 'new-folder':
                // TODO: Implement new folder
                console.log('New folder in:', path || globals.projectPath);
                if (typeof notifications !== 'undefined') {
                    notifications.info('New folder feature coming soon');
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
                // TODO: Implement rename
                console.log('Rename:', path);
                if (typeof notifications !== 'undefined') {
                    notifications.info('Rename feature coming soon');
                }
                break;

            case 'duplicate-file':
                // TODO: Implement duplicate
                console.log('Duplicate:', path);
                if (typeof notifications !== 'undefined') {
                    notifications.info('Duplicate feature coming soon');
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
                    console.log('[ProjectFiles] Expanded folder');
                }
                break;

            case 'collapse':
                // Collapse only the clicked folder
                if (contextMenuTarget) {
                    contextMenuTarget.setAttribute('open', 'false');
                    console.log('[ProjectFiles] Collapsed folder');
                }
                break;

            case 'expand-all':
                // Expand all folders in the tree
                const allFolders = document.querySelectorAll('.projectFoldersListItem');
                allFolders.forEach(folder => {
                    folder.setAttribute('open', 'true');
                });
                console.log('[ProjectFiles] Expanded all folders');
                break;

            case 'collapse-all':
                // Collapse all folders in the tree
                const allFoldersToCollapse = document.querySelectorAll('.projectFoldersListItem');
                allFoldersToCollapse.forEach(folder => {
                    folder.setAttribute('open', 'false');
                });
                console.log('[ProjectFiles] Collapsed all folders');
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
});
