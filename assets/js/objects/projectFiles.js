const application = require("./application");
const sceneEditor = require("./sceneEditor");
const scriptEditor = require("./scriptEditor");
const functions = require("../common/functions");
//
const fs = nw.require('fs');
const path = nw.require('path');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const animator = nw.require('./assets/js/objects/animator');
const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    // Current filter and search state
    currentFilter: 'all',
    currentSearchQuery: '',
    allFiles: [], // Cache of all files for filtering
    refreshFolderIcon() {
        let icons = document.querySelectorAll(".projectFoldersListNode>img");
        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
        icons.forEach(function (icon) {
            icon.src = path + globals.user.fileIconTheme.data.directories.default_16;
        });
    },

    refreshFilesIcon() {
        let icons = document.querySelectorAll(".projectFilesItem>img");
        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
        icons.forEach(function (icon) {
            let parent = icon.parentElement;
            //
            if (parent.getAttribute("type") == "dir") {
                icon.src = path + globals.user.fileIconTheme.data.directories.default_256;
            }
            else {
                let label = parent.getAttribute("filename").toLowerCase();
                //
                if (label.endsWith(".jpeg") || label.endsWith(".jpg") || label.endsWith(".png") || label.endsWith(".webp") || label.endsWith(".bmp")) {
                    //
                    icon.classList.add("local-image");
                    const path = parent.getAttribute("path");
                    icon.src = path;
                    return;
                }
                if (label.endsWith(".obj") || label.endsWith(".blend") || label.endsWith(".fbx") || label.endsWith(".3ds")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.object3d;
                    return;
                }
                if (label.endsWith(".anim")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.animation;
                    return;
                }
                if (label.endsWith(".7z") || label.endsWith(".rar") || label.endsWith(".zip")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.archive;
                    return;
                }
                if (label.endsWith(".mp3") || label.endsWith(".ogg") || label.endsWith(".wav")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.audio;
                    return;
                }
                if (label.endsWith(".config")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.configuration;
                    return;
                }
                if (label.endsWith(".css") || label.endsWith(".scss")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.css;
                    return;
                }
                if (label.endsWith(".fx")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.effects;
                    return;
                }
                if (label.endsWith(".ttf") || label.endsWith(".otf") || label.endsWith(".fon")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.font;
                    return;
                }
                if (label.endsWith(".html") || label.endsWith(".htm") || label.endsWith(".xhtml") || label.endsWith(".xhtm")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.html;
                    return;
                }
                if (label.endsWith(".js") || label.endsWith(".jsx") || label.endsWith(".mjs") || label.endsWith(".cjs")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.javascript;
                    return;
                }
                if (label.endsWith(".json")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.json;
                    return;
                }
                if (label.endsWith(".mat")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.material;
                    return;
                }
                if (label.endsWith(".package") || label.endsWith(".pack")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.package;
                    return;
                }
                if (label.endsWith(".txt")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.text;
                    return;
                }
                if (label.endsWith(".tln")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.timeline;
                    return;
                }
                if (label.endsWith(".mp4") || label.endsWith(".mkv") || label.endsWith(".avi") || label.endsWith(".webm")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.video;
                    return;
                }
                if (label.endsWith(".xml")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.xml;
                    return;
                }
                if (label.endsWith(".scn")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.scene;
                    return;
                }
                //for others types of files
                icon.src = path + globals.user.fileIconTheme.data.files.default;
            }
        });
        //
        //
        //
        $("#projectFilesBar").click(function (e) {
            if (e.target.id == "projectFilesBar") {
                $(".projectFilesItem").removeClass("selected");
            }
        });
        //
        //click event for all file item
        $('.projectFilesItem').click(function () {
            if (!globals.keysIsPressed.ctrl) {
                $(".projectFilesItem").removeClass("selected");
            }
            //
            if (globals.keysIsPressed.ctrl) {
                if (!this.classList.contains("selected")) {
                    this.classList.add("selected");
                }
                else {
                    this.classList.remove("selected");
                }
            }
            else {
                this.classList.add("selected");
            }
        });

        //
        //open the file with correspound reader
        $(".projectFilesItem").dblclick(function () {
            let path = this.getAttribute('path');
            let type = this.getAttribute('type');
            if (type == "dir") {
                // Use CSS.escape() to safely escape the path for use in a selector
                const escapedPath = CSS.escape(path);
                // Alternative: Use data-path and querySelector for safer selection
                let nodes = document.querySelectorAll('.projectFoldersListItem');
                let node = null;
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].getAttribute('path') === path) {
                        node = nodes[i].querySelector('.projectFoldersListNode');
                        break;
                    }
                }
                if (node) {
                    node.click();
                }
                return;
            }

            // Open file using unified method
            module.exports.openFileByPath(path, this.getAttribute("filename"));
        });
    },

    /**
     * Unified method to open any file type
     * @param {string} filePath - Full path to the file
     * @param {string} fileName - Name of the file with extension
     */
    openFileByPath(filePath, fileName) {
        console.log('[PROJECT FILES] Opening file:', fileName, 'at path:', filePath);

        // Extract file extension
        const fname = fileName.toLowerCase();
        const fext = fname.substring(fname.lastIndexOf("."), fname.length);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('[PROJECT FILES] File not found:', filePath);
            if (notifications) {
                notifications.error(`File not found: ${fileName}`);
            }
            return;
        }

        try {
            // Read file content asynchronously for better UX
            const data = fs.readFileSync(filePath, 'utf8');
            console.log('[PROJECT FILES] File read successfully, length:', data.length);

            // Determine file type and open in appropriate editor
            const scriptExtensions = ['.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.htm', '.css', '.md', '.txt'];
            const isScriptFile = scriptExtensions.includes(fext);

            if (isScriptFile) {
                // Open in Script Editor
                console.log('[PROJECT FILES] Opening in Script Editor...');

                // Create file info for script editor
                const fitem = {
                    name: fname,
                    path: filePath,
                    extension: fext,
                    language: this.getLanguageName(fext),
                    cursor: { char: 0, line: 0, col: 0 }
                };

                // Add to script editor files if JavaScript
                if (fext === '.js' || fext === '.jsx' || fext === '.mjs' || fext === '.cjs') {
                    globals.project.scriptEditor.files.push(fitem);
                }

                // Open file in script editor
                scriptEditor.openFile(filePath, fileName, fext, data);

                // Switch to script editor tab
                const scriptEditorTab = document.querySelector("#scriptEditorTab");
                if (scriptEditorTab) {
                    scriptEditorTab.click();
                }
            }
            else if (fext === '.scn') {
                // Open in Scene Editor
                console.log('[PROJECT FILES] Opening in Scene Editor...');
                sceneEditor.openScene(filePath, fileName, data);

                const sceneEditorTab = document.querySelector("#sceneEditorTab");
                if (sceneEditorTab) {
                    sceneEditorTab.click();
                }
            }
            else if (fext === '.anim') {
                // Open in Animator
                console.log('[PROJECT FILES] Opening in Animator...');
                animator.openAnimator(filePath, fileName, data);
            }
            else {
                // Unsupported file type
                console.warn('[PROJECT FILES] Unsupported file type:', fext);
                if (notifications) {
                    notifications.warning(`Cannot open ${fext} files in editor yet`);
                }
            }
        } catch (err) {
            console.error('[PROJECT FILES] Failed to open file:', filePath, err);
            if (notifications) {
                notifications.error(`Failed to open ${fileName}: ${err.message}`);
            }
        }
    },

    /**
     * Get human-readable language name from file extension
     * @param {string} ext - File extension
     * @returns {string} Language name
     */
    getLanguageName(ext) {
        const languageMap = {
            '.js': 'JavaScript',
            '.jsx': 'JavaScript React',
            '.mjs': 'JavaScript Module',
            '.cjs': 'JavaScript CommonJS',
            '.json': 'JSON',
            '.html': 'HTML',
            '.htm': 'HTML',
            '.css': 'CSS',
            '.md': 'Markdown',
            '.txt': 'Plain Text'
        };
        return languageMap[ext] || 'Plain Text';
    },

    getFileList(dirPath) {
        let files = [];
        const children = fs.readdirSync(dirPath, { withFileTypes: true });
        let relative = ".";
        //
        for (const child of children) {
            files.push(this.pushFileList(dirPath, relative, child));
        }
        //
        globals.project.files = files;
    },

    pushFileList(dirName, relative, file) {
        const item = {
            relativeParentPath: relative,
            parentPath: dirName,
            path: dirName + "\\" + file.name,
            name: file.name,
            size: 0,
            type: file.isDirectory() ? "dir" : "file",
            children: []
        };
        //
        if (item.type == "dir") {
            const children = fs.readdirSync(item.path, { withFileTypes: true });
            relative = item.relativeParentPath + "\\" + item.name;
            for (const child of children) {
                item.children.push(this.pushFileList(item.path, relative, child));
            }
        }
        //
        return item;
    },

    /**
     * Create HTML for a folder tree item (recursive)
     * @param {Object} dir - Directory object
     * @returns {string} HTML string for the folder item
     */
    createFolderItemHTML(dir) {
        // Escape all user-controlled data to prevent XSS
        const escapedPath = functions.escapeAttr(dir.path);
        const escapedRelative = functions.escapeAttr(dir.relativeParentPath);
        const escapedFilename = functions.escapeAttr(dir.name);
        const escapedName = functions.escapeHtml(dir.name);

        // Build children HTML recursively
        let childrenHTML = '';
        if (dir.children && dir.children.length > 0) {
            const subfolders = dir.children.filter(child => child.type === "dir");
            childrenHTML = subfolders.map(child => this.createFolderItemHTML(child)).join('');
        }

        return `
            <li class='projectFoldersListItem' path='${escapedPath}' relative='${escapedRelative}' filename='${escapedFilename}' open='false'>
                <div class='projectFoldersListNode'>
                    <i class='ri-arrow-right-s-line'></i>
                    <i class='ri-arrow-down-s-line'></i>
                    <img />
                    <a>${escapedName}</a>
                </div>
                <ul class='projectFoldersListChildren'>
                    ${childrenHTML}
                </ul>
            </li>
        `;
    },

    /**
     * Load and display the folder tree
     */
    loadFolders() {
        const projectFoldersList = document.querySelector("#projectFoldersList");

        if (!projectFoldersList) {
            console.error('projectFoldersList element not found');
            return;
        }

        // Get all root-level directories
        const rootFolders = globals.project.files.filter(file => file.type === "dir");

        // Generate HTML for all folders
        const foldersHTML = rootFolders.map(dir => this.createFolderItemHTML(dir)).join('');

        // Update the DOM
        projectFoldersList.innerHTML = foldersHTML;

        const $this = this;

        // Attach event handlers after DOM update
        setTimeout(() => {
            $(".projectFoldersListNode").click(function () {
                $(".projectFoldersListNode").removeClass("folderTreeActive");
                this.classList.add("folderTreeActive");

                // Toggle open/close state
                let parent = this.parentElement;
                const isOpen = parent.getAttribute("open") === "true";
                parent.setAttribute("open", isOpen ? "false" : "true");

                // Update current directory path
                globals.project.current.relativeFileParentPath = parent.getAttribute('relative') + "\\" + parent.getAttribute('filename');
                globals.project.current.fileName = parent.getAttribute('filename');

                // Load files for this directory
                $this.loadFiles(globals.project.current.relativeFileParentPath);
            });

            // Refresh folder icons
            $this.refreshFolderIcon();
        }, 100);

        console.log(`Loaded ${rootFolders.length} root folders`);
    },

    /**
     * Create HTML for a single file item
     * @param {Object} file - File object with path, name, type, etc.
     * @returns {string} HTML string for the file item
     */
    createFileItemHTML(file) {
        // Escape all user-controlled data to prevent XSS
        const escapedType = functions.escapeAttr(file.type);
        const escapedPath = functions.escapeAttr(file.path);
        const escapedRelative = functions.escapeAttr(file.relativeFileParentPath || '');
        const escapedFilename = functions.escapeAttr(file.name);
        const escapedName = functions.escapeHtml(file.name);

        return `
            <div class='projectFilesItem' type='${escapedType}' path='${escapedPath}' relative='${escapedRelative}' filename='${escapedFilename}'>
                <img />
                <center><div>${escapedName}</div></center>
            </div>
        `;
    },

    /**
     * Get all files in a specific directory path
     * @param {Array} fileTree - The file tree to search
     * @param {string} targetPath - The directory path to match
     * @returns {Array} Array of files in the target directory
     */
    getFilesInDirectory(fileTree, targetPath) {
        const matchingFiles = [];

        const searchRecursive = (items) => {
            if (!items || items.length === 0) {
                return;
            }

            items.forEach((item) => {
                // Add file metadata for proper matching
                if (!item.relativeFileParentPath && item.relativeParentPath) {
                    item.relativeFileParentPath = item.relativeParentPath;
                }

                // Check if this item belongs to the target directory
                if (item.relativeFileParentPath === targetPath) {
                    // Filter out data.json at root level
                    if (item.name === "data.json" && item.relativeFileParentPath === ".") {
                        return;
                    }
                    matchingFiles.push(item);
                }

                // Search in children directories
                if (item.type === "dir" && item.children && item.children.length > 0) {
                    // Set relativeFileParentPath for children
                    item.children.forEach(child => {
                        if (!child.relativeFileParentPath) {
                            child.relativeFileParentPath = item.relativeParentPath + "\\" + item.name;
                        }
                    });
                    searchRecursive(item.children);
                }
            });
        };

        searchRecursive(fileTree);
        return matchingFiles;
    },

    /**
     * Load and display files for a given directory path
     * @param {string} dirPath - The directory path to display files from
     */
    loadFiles(dirPath) {
        const projectFilesBar = document.querySelector("#projectFilesBar");

        if (!projectFilesBar) {
            console.error('projectFilesBar element not found');
            return;
        }

        // Get files in the target directory
        const files = this.getFilesInDirectory(globals.project.files, dirPath);

        // Store files for filtering
        this.allFiles = files;

        // Generate HTML for all files
        const filesHTML = files.map(file => this.createFileItemHTML(file)).join('');

        // Get drop overlay HTML
        const dropOverlayHTML = `
            <div id="projectFilesDropOverlay" class="project-files-drop-overlay" style="display: none;">
                <div class="drop-overlay-content">
                    <i class="ri-upload-cloud-line"></i>
                    <h3>Drop Files Here</h3>
                    <p>Release to upload files to this folder</p>
                </div>
            </div>
        `;

        // Update the DOM
        projectFilesBar.innerHTML = dropOverlayHTML + filesHTML;

        // Refresh icons after DOM update
        setTimeout(() => {
            this.refreshFilesIcon();

            // Reapply current filter and search
            if (this.currentFilter !== 'all' || this.currentSearchQuery.trim() !== '') {
                this.applyFilterAndSearch();
            }
        }, 1);

        console.log(`Loaded ${files.length} files from: ${dirPath}`);
    },

    /**
     * Get file type category for filtering
     * @param {string} filename - The filename to categorize
     * @returns {string} Category: 'image', 'audio', 'video', 'scene', 'script', or 'other'
     */
    getFileCategory(filename) {
        const ext = filename.toLowerCase();

        if (ext.endsWith('.jpeg') || ext.endsWith('.jpg') || ext.endsWith('.png') ||
            ext.endsWith('.webp') || ext.endsWith('.bmp') || ext.endsWith('.gif')) {
            return 'image';
        }
        if (ext.endsWith('.mp3') || ext.endsWith('.ogg') || ext.endsWith('.wav') ||
            ext.endsWith('.m4a') || ext.endsWith('.flac')) {
            return 'audio';
        }
        if (ext.endsWith('.mp4') || ext.endsWith('.mkv') || ext.endsWith('.avi') ||
            ext.endsWith('.webm') || ext.endsWith('.mov')) {
            return 'video';
        }
        if (ext.endsWith('.scn')) {
            return 'scene';
        }
        if (ext.endsWith('.js') || ext.endsWith('.jsx') || ext.endsWith('.ts') ||
            ext.endsWith('.tsx') || ext.endsWith('.json')) {
            return 'script';
        }
        return 'other';
    },

    /**
     * Apply current filter and search to file items
     */
    applyFilterAndSearch() {
        const fileItems = document.querySelectorAll('.projectFilesItem');

        fileItems.forEach(item => {
            const filename = item.getAttribute('filename') || '';
            const category = this.getFileCategory(filename);
            const isDir = item.getAttribute('type') === 'dir';

            // Apply filter
            let matchesFilter = this.currentFilter === 'all' || category === this.currentFilter || isDir;

            // Apply search
            let matchesSearch = true;
            if (this.currentSearchQuery.trim() !== '') {
                const query = this.currentSearchQuery.toLowerCase();
                matchesSearch = filename.toLowerCase().includes(query);
            }

            // Show/hide based on both filter and search
            if (matchesFilter && matchesSearch) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    },

    /**
     * Initialize search functionality
     */
    initSearch() {
        const searchInput = document.getElementById('projectFilesSearchInput');
        const clearBtn = document.getElementById('clearSearchBtn');

        if (!searchInput) return;

        // Search input handler
        searchInput.addEventListener('input', (e) => {
            this.currentSearchQuery = e.target.value;
            this.applyFilterAndSearch();

            // Show/hide clear button
            if (clearBtn) {
                clearBtn.style.display = this.currentSearchQuery.trim() !== '' ? 'block' : 'none';
            }
        });

        // Clear button handler
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.currentSearchQuery = '';
                this.applyFilterAndSearch();
                clearBtn.style.display = 'none';
            });
        }

        console.log('[ProjectFiles] Search initialized');
    },

    /**
     * Initialize filter buttons
     */
    initFilters() {
        const filterButtons = document.querySelectorAll('.projectFiles-filter-btn');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update current filter
                this.currentFilter = btn.getAttribute('data-filter');

                // Apply filter
                this.applyFilterAndSearch();

                console.log('[ProjectFiles] Filter changed to:', this.currentFilter);
            });
        });

        console.log('[ProjectFiles] Filters initialized');
    },

    /**
     * Copy files to current directory
     * @param {FileList} files - Files to import
     */
    async importFiles(files) {
        if (!files || files.length === 0) return;

        const currentDir = globals.project.dir + globals.project.current.relativeFileParentPath.replace(/\./g, '');

        console.log('[ProjectFiles] Importing', files.length, 'files to:', currentDir);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const sourcePath = file.path;
            const destPath = path.join(currentDir, file.name);

            try {
                // Check if file already exists
                if (fs.existsSync(destPath)) {
                    console.warn('[ProjectFiles] File already exists:', file.name);
                    errorCount++;
                    continue;
                }

                // Copy file
                fs.copyFileSync(sourcePath, destPath);
                successCount++;
                console.log('[ProjectFiles] Copied:', file.name);

            } catch (err) {
                console.error('[ProjectFiles] Error copying file:', file.name, err);
                errorCount++;
            }
        }

        // Refresh file list
        this.getFileList(globals.project.dir);
        this.loadFiles(globals.project.current.relativeFileParentPath);

        // Show notification
        if (successCount > 0) {
            notifications.success(`Imported ${successCount} file${successCount > 1 ? 's' : ''}`);
        }
        if (errorCount > 0) {
            notifications.warning(`Failed to import ${errorCount} file${errorCount > 1 ? 's' : ''}`);
        }

        console.log('[ProjectFiles] Import complete:', successCount, 'success,', errorCount, 'errors');
    },

    /**
     * Initialize bulk import functionality
     */
    initBulkImport() {
        const importBtn = document.getElementById('bulkImportFilesBtn');
        const fileInput = document.getElementById('projectFilesBulkInput');

        if (!importBtn || !fileInput) return;

        // Import button handler
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input handler
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                this.importFiles(files);
            }
            // Reset input
            fileInput.value = '';
        });

        console.log('[ProjectFiles] Bulk import initialized');
    },

    /**
     * Initialize drag & drop functionality
     */
    initDragAndDrop() {
        const dropZone = document.getElementById('projectFilesBar');
        const dropOverlay = document.getElementById('projectFilesDropOverlay');

        if (!dropZone || !dropOverlay) return;

        let dragCounter = 0;

        // Prevent default drag behaviors on the entire window
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Show overlay when dragging over
        dropZone.addEventListener('dragenter', (e) => {
            dragCounter++;
            if (e.dataTransfer.types.includes('Files')) {
                dropOverlay.classList.add('active');
                dropOverlay.style.display = 'flex';
            }
        });

        dropZone.addEventListener('dragleave', (e) => {
            dragCounter--;
            if (dragCounter === 0) {
                dropOverlay.classList.remove('active');
                dropOverlay.style.display = 'none';
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.dataTransfer.dropEffect = 'copy';
        });

        // Handle file drop
        dropZone.addEventListener('drop', (e) => {
            dragCounter = 0;
            dropOverlay.classList.remove('active');
            dropOverlay.style.display = 'none';

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                this.importFiles(files);
            }
        });

        console.log('[ProjectFiles] Drag & drop initialized');
    },

    /**
     * Initialize all toolbar features
     */
    initToolbar() {
        this.initSearch();
        this.initFilters();
        this.initBulkImport();
        this.initDragAndDrop();
        console.log('[ProjectFiles] Toolbar initialized');
    },

    /**
     * Delete a file
     * @param {string} filePath - Path to the file to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteFile(filePath) {
        if (!filePath || !fs.existsSync(filePath)) {
            console.error('[ProjectFiles] File does not exist:', filePath);
            return false;
        }

        try {
            // Check if it's a file or directory
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                // Delete directory recursively
                fs.rmSync(filePath, { recursive: true, force: true });
                console.log('[ProjectFiles] Deleted directory:', filePath);
            } else {
                // Delete file
                fs.unlinkSync(filePath);
                console.log('[ProjectFiles] Deleted file:', filePath);
            }

            // Refresh file list
            this.getFileList(globals.project.dir);
            this.loadFiles(globals.project.current.relativeFileParentPath);

            return true;
        } catch (err) {
            console.error('[ProjectFiles] Error deleting file/folder:', err);
            return false;
        }
    },

    /**
     * Delete multiple files
     * @param {string[]} filePaths - Array of file paths to delete
     * @returns {Promise<{success: number, failed: number}>} Deletion results
     */
    async deleteMultipleFiles(filePaths) {
        let successCount = 0;
        let failedCount = 0;

        for (const filePath of filePaths) {
            const success = await this.deleteFile(filePath);
            if (success) {
                successCount++;
            } else {
                failedCount++;
            }
        }

        return { success: successCount, failed: failedCount };
    },

    /**
     * Refresh project files
     */
    refresh() {
        if (globals.project && globals.project.dir) {
            this.getFileList(globals.project.dir);
            this.loadFolders();
            this.loadFiles(globals.project.current.relativeFileParentPath);
            console.log('[ProjectFiles] Refreshed');
        }
    },

    loadProjectFiles() {
        this.getFileList(globals.project.dir);
        this.loadFolders();
        this.loadFiles(globals.project.current.relativeFileParentPath);

        // Initialize toolbar features
        setTimeout(() => {
            this.initToolbar();
        }, 200);

        //load last scene on opened project
        let lastSceneFPath = application.getFilePathFromResources(globals.project.data.cache.lastScene);
        let lastSceneFName = application.getFileNameFromResources(globals.project.data.cache.lastScene);
        let lastSceneData = fs.readFileSync(lastSceneFPath);
        sceneEditor.openScene(lastSceneFPath, lastSceneFName, lastSceneData);
        document.querySelector("#sceneEditorTab").click();
    }
}