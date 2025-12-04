const $ = nw.require('jquery');
const fs = nw.require('fs');
const globals = nw.require('./assets/js/common/globals');
const consoleModule = nw.require('./assets/js/objects/console');
const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    editor: null,
    monaco: null, // Monaco reference
    openFiles: new Map(), // Store open file sessions
    currentFile: null, // Currently active file
    autoSaveInterval: null,
    autoSaveDelay: 3000, // 3 seconds
    isReady: false, // Track if Monaco is initialized
    pendingFiles: [], // Queue files to open before Monaco is ready

    init() {

        // Wait for Monaco to be loaded
        if (typeof monaco === 'undefined') {
            console.warn('[SCRIPT EDITOR] Monaco Editor not loaded yet, retrying...');
            setTimeout(() => this.init(), 100);
            return;
        }

        this.monaco = monaco;

        // Configure Monaco theme (VS Dark similar to ACE dark theme)
        monaco.editor.defineTheme('ajs-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '608B4E', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editor.lineHighlightBackground': '#2a2a2a',
                'editorCursor.foreground': '#5ECDBB',
                'editor.selectionBackground': '#264F78',
            }
        });

        // Create Monaco editor instance
        const editorElement = document.getElementById('codeEditor');
        if (!editorElement) {
            console.error('[SCRIPT EDITOR] Cannot find codeEditor element!');
            return;
        }

        this.editor = monaco.editor.create(editorElement, {
            value: '',
            language: 'javascript',
            theme: 'ajs-dark',
            fontSize: 11,
            fontFamily: 'Consolas, "Courier New", monospace',
            automaticLayout: true,

            // Multi-cursor editing
            multiCursorModifier: 'ctrlCmd',

            // Code folding
            folding: true,
            showFoldingControls: 'always',

            // Minimap
            minimap: {
                enabled: true,
                showSlider: 'mouseover',
                renderCharacters: true,
                maxColumn: 120
            },

            // Bracket matching and colorization
            matchBrackets: 'always',
            bracketPairColorization: {
                enabled: true
            },

            // IntelliSense
            quickSuggestions: {
                other: true,
                comments: false,
                strings: true
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            wordBasedSuggestions: 'matchingDocuments',

            // Snippets
            snippetSuggestions: 'top',
            tabCompletion: 'on',

            // Other features
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            formatOnPaste: true,
            formatOnType: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'full',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            find: {
                seedSearchStringFromSelection: 'always',
                autoFindInSelection: 'never'
            }
        });


        // Register custom snippets
        this.registerCustomSnippets();

        // Register file path completion provider
        this.registerFilePathCompletion();

        // Track changes to mark file as modified
        this.editor.onDidChangeModelContent(() => {
            if (this.currentFile) {
                this.markFileModified(this.currentFile);
                // Auto-save disabled by user request
                // this.resetAutoSaveTimer();
            }
            this.updateStatusBar();
        });

        // Track cursor position changes
        this.editor.onDidChangeCursorPosition(() => {
            this.updateStatusBar();
        });

        // Add keyboard shortcuts
        this.registerKeyboardShortcuts();

        // Register context menu
        this.registerContextMenu();

        // Initialize tab events (event delegation)
        this.initTabEvents();

        // Mark as ready
        this.isReady = true;

        // Process any pending files
        if (this.pendingFiles.length > 0) {
            const fileCount = this.pendingFiles.length;

            // Use setTimeout to ensure Monaco is fully ready
            setTimeout(() => {
                this.pendingFiles.forEach((fileData, index) => {
                    try {
                        this.openFile(fileData.path, fileData.filename, fileData.extension, fileData.data);
                    } catch (err) {
                        console.error('[SCRIPT EDITOR] Error opening pending file:', err);
                        if (notifications) {
                            notifications.error(`Failed to open ${fileData.filename}: ${err.message}`);
                        }
                    }
                });
                this.pendingFiles = [];

                // Notify user that files were opened
                if (notifications && fileCount > 0) {
                    notifications.success(
                        `${fileCount} file${fileCount > 1 ? 's' : ''} opened`,
                        2000
                    );
                }
            }, 100);
        }
    },

    /**
     * Register keyboard shortcuts
     */
    registerKeyboardShortcuts() {
        const monaco = this.monaco;
        const KeyMod = monaco.KeyMod;
        const KeyCode = monaco.KeyCode;

        // Save: Ctrl+S
        this.editor.addAction({
            id: 'save-file',
            label: 'Save File',
            keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
            run: () => {
                this.saveCurrentFile();
            }
        });

        // Format Code: Alt+Shift+F (same as VS Code)
        this.editor.addAction({
            id: 'format-code',
            label: 'Format Code',
            keybindings: [KeyMod.Alt | KeyMod.Shift | KeyCode.KeyF],
            run: (editor) => {
                this.formatCode(editor);
            }
        });

        // Multi-cursor shortcuts are built-in to Monaco:
        // Ctrl+Alt+Up/Down - Add cursor above/below
        // Ctrl+D - Select next occurrence
        // Alt+Shift+Down/Up - Copy line down/up
        // Ctrl+Shift+L - Select all occurrences
    },

    /**
     * Register context menu for code editor
     */
    registerContextMenu() {
        // contextMenu is a global variable loaded via script tag in app.html
        // Don't use nw.require for it - use window.contextMenu directly
        const codeEditorElement = document.getElementById('codeEditor');
        if (!codeEditorElement) {
            console.warn('[SCRIPT EDITOR] Cannot register context menu - codeEditor element not found');
            return;
        }

        if (!window.contextMenu) {
            console.warn('[SCRIPT EDITOR] Global contextMenu not available yet');
            return;
        }


        window.contextMenu.register(codeEditorElement, (event) => {
            const menuItems = [];
            const editor = this.editor;
            const model = editor ? editor.getModel() : null;
            const selection = editor ? editor.getSelection() : null;
            const hasSelection = selection && !selection.isEmpty();

            // Undo/Redo
            menuItems.push({
                id: 'script-undo',
                label: 'Undo',
                icon: 'ri-arrow-go-back-line',
                shortcut: 'Ctrl+Z',
                disabled: !model || !model.canUndo()
            });

            menuItems.push({
                id: 'script-redo',
                label: 'Redo',
                icon: 'ri-arrow-go-forward-line',
                shortcut: 'Ctrl+Y',
                disabled: !model || !model.canRedo()
            });

            menuItems.push({ type: 'separator' });

            // Cut/Copy/Paste
            menuItems.push({
                id: 'script-cut',
                label: 'Cut',
                icon: 'ri-scissors-line',
                shortcut: 'Ctrl+X',
                disabled: !hasSelection
            });

            menuItems.push({
                id: 'script-copy',
                label: 'Copy',
                icon: 'ri-file-copy-line',
                shortcut: 'Ctrl+C',
                disabled: !hasSelection
            });

            menuItems.push({
                id: 'script-paste',
                label: 'Paste',
                icon: 'ri-clipboard-line',
                shortcut: 'Ctrl+V'
            });

            menuItems.push({ type: 'separator' });

            // Select All
            menuItems.push({
                id: 'script-select-all',
                label: 'Select All',
                icon: 'ri-check-double-line',
                shortcut: 'Ctrl+A'
            });

            menuItems.push({ type: 'separator' });

            // Find/Replace
            menuItems.push({
                id: 'script-find',
                label: 'Find',
                icon: 'ri-search-line',
                shortcut: 'Ctrl+F'
            });

            menuItems.push({
                id: 'script-replace',
                label: 'Replace',
                icon: 'ri-replace-line',
                shortcut: 'Ctrl+H'
            });

            menuItems.push({ type: 'separator' });

            // Format Code
            menuItems.push({
                id: 'script-format',
                label: 'Format Code',
                icon: 'ri-code-line',
                shortcut: 'Alt+Shift+F',
                disabled: !editor
            });

            menuItems.push({ type: 'separator' });

            // Save
            menuItems.push({
                id: 'script-save',
                label: 'Save',
                icon: 'ri-save-line',
                shortcut: 'Ctrl+S',
                disabled: !this.currentFile
            });

            menuItems.push({
                id: 'script-save-all',
                label: 'Save All',
                icon: 'ri-save-2-line',
                shortcut: 'Ctrl+Shift+S',
                disabled: this.openFiles.size === 0
            });

            return menuItems;
        });

        // Handle context menu clicks
        $(document).on('contextMenuClick', (e, data) => {
            const itemId = data.itemId;
            const editor = this.editor;

            if (!editor) return;

            switch (itemId) {
                case 'script-undo':
                    editor.trigger('keyboard', 'undo');
                    break;

                case 'script-redo':
                    editor.trigger('keyboard', 'redo');
                    break;

                case 'script-cut':
                    document.execCommand('cut');
                    break;

                case 'script-copy':
                    document.execCommand('copy');
                    break;

                case 'script-paste':
                    document.execCommand('paste');
                    break;

                case 'script-select-all':
                    editor.trigger('keyboard', 'editor.action.selectAll');
                    break;

                case 'script-find':
                    editor.trigger('keyboard', 'actions.find');
                    break;

                case 'script-replace':
                    editor.trigger('keyboard', 'editor.action.startFindReplaceAction');
                    break;

                case 'script-format':
                    this.formatCode(editor);
                    break;

                case 'script-save':
                    this.saveCurrentFile();
                    break;

                case 'script-save-all':
                    this.saveAll();
                    break;
            }
        });

    },

    /**
     * Initialize tab events using event delegation
     * This is more efficient than attaching events to each tab individually
     */
    initTabEvents() {
        const $this = this;
        const tabsContainer = document.getElementById('codeEditorTabs');

        if (!tabsContainer) {
            console.warn('[SCRIPT EDITOR] Cannot initialize tab events - tabs container not found');
            return;
        }

        // Tab click handler
        $(tabsContainer).on('click', '.codeEditorTab', function(e) {
            // Ignore if clicking close button
            if ($(e.target).hasClass('close')) {
                return;
            }

            const clickedPath = $(this).attr("path");
            if (clickedPath) {
                $this.switchToFile(clickedPath);

                // Update selection
                $(".codeEditorTab").attr("selected", "false");
                $(this).attr("selected", "true");
            }
        });

        // Close button handler - ULTRA ROBUST
        $(tabsContainer).on('click', '.close', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const $closeButton = $(this);
            const $tab = $closeButton.closest('.codeEditorTab');

            if ($tab.length === 0) {
                console.error('[SCRIPT EDITOR] Close button click: Could not find parent tab!');
                return;
            }

            const filePath = $tab.attr("path");

            if (filePath) {
                $this.closeFile(filePath);
            } else {
                console.error('[SCRIPT EDITOR] Tab has no path attribute!');
            }
        });

    },

    /**
     * Register custom code snippets
     */
    registerCustomSnippets() {
        const monaco = this.monaco;

        // JavaScript snippets
        const jsSnippets = [
            {
                label: 'log',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'console.log(${1:message});',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Log to console'
            },
            {
                label: 'fn',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Function declaration'
            },
            {
                label: 'af',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'const ${1:name} = (${2:params}) => {\n\t${3:// body}\n};',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Arrow function'
            },
            {
                label: 'for',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:// body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'For loop'
            },
            {
                label: 'foreach',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: '${1:array}.forEach((${2:item}) => {\n\t${3:// body}\n});',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'forEach loop'
            },
            {
                label: 'if',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'if (${1:condition}) {\n\t${2:// body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'If statement'
            },
            {
                label: 'ife',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'if (${1:condition}) {\n\t${2:// if body}\n} else {\n\t${3:// else body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'If-else statement'
            },
            {
                label: 'try',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'try {\n\t${1:// try body}\n} catch (${2:error}) {\n\t${3:// catch body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Try-catch block'
            },
            {
                label: 'class',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3:// constructor body}\n\t}\n\n\t${4:// methods}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Class declaration'
            },
            {
                label: 'exports',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'module.exports = {\n\t${1:// exports}\n};',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Module exports'
            },
            {
                label: 'req',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "const ${1:name} = require('${2:module}');",
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Require module'
            },
            {
                label: 'promise',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'new Promise((resolve, reject) => {\n\t${1:// body}\n});',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Promise'
            },
            {
                label: 'async',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'async function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Async function'
            },
            {
                label: 'timeout',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'setTimeout(() => {\n\t${1:// body}\n}, ${2:1000});',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'setTimeout'
            },
            {
                label: 'interval',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'setInterval(() => {\n\t${1:// body}\n}, ${2:1000});',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'setInterval'
            }
        ];

        // Register snippet provider for JavaScript
        monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: () => {
                return { suggestions: jsSnippets };
            }
        });

    },

    /**
     * Register file path completion provider for intelligent path suggestions
     */
    registerFilePathCompletion() {
        const monaco = this.monaco;
        const $this = this;

        monaco.languages.registerCompletionItemProvider('javascript', {
            triggerCharacters: ['/', '.', '"', "'"],

            provideCompletionItems: (model, position) => {
                const lineContent = model.getLineContent(position.lineNumber);
                const textUntilPosition = lineContent.substring(0, position.column - 1);

                // Check if we're inside a string that looks like a file path
                const pathMatch = textUntilPosition.match(/(['"])(\.{0,2}\/[^'"]*?)$/);
                if (!pathMatch) {
                    return { suggestions: [] };
                }

                const quote = pathMatch[1];
                const currentPath = pathMatch[2];

                // Determine if this is a require/import context
                const isRequireContext = /(?:require|nw\.require|import)\s*\(\s*['"]/.test(textUntilPosition);
                const isFsContext = /fs\.\w+\s*\(\s*['"]/.test(textUntilPosition);

                if (!isRequireContext && !isFsContext) {
                    return { suggestions: [] };
                }

                // Get suggestions based on current path
                const suggestions = $this.getFilePathSuggestions(currentPath, position, quote);

                return { suggestions };
            }
        });

    },

    /**
     * Get file path suggestions based on current path being typed
     */
    getFilePathSuggestions(currentPath, position, quote) {
        const monaco = this.monaco;
        const fs = nw.require('fs');
        const path = nw.require('path');
        const suggestions = [];

        try {
            // Determine the base directory for file search
            let baseDir = process.cwd();
            let searchPath = currentPath;

            // Handle relative paths
            if (currentPath.startsWith('./')) {
                searchPath = currentPath.substring(2);
            } else if (currentPath.startsWith('../')) {
                // For now, just use current directory for ../ paths
                baseDir = path.dirname(baseDir);
                searchPath = currentPath.replace(/^\.\.\//, '');
            }

            // Split path into directory and partial filename
            const lastSlash = searchPath.lastIndexOf('/');
            let dirPath = baseDir;
            let filePrefix = '';

            if (lastSlash !== -1) {
                const subPath = searchPath.substring(0, lastSlash);
                dirPath = path.join(baseDir, subPath);
                filePrefix = searchPath.substring(lastSlash + 1);
            } else {
                filePrefix = searchPath;
            }

            // Check if directory exists
            if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
                return suggestions;
            }

            // Read directory contents
            const files = fs.readdirSync(dirPath);

            // Filter and create suggestions
            files.forEach(file => {
                // Skip hidden files and node_modules
                if (file.startsWith('.') || file === 'node_modules') {
                    return;
                }

                // Check if file matches current prefix
                if (filePrefix && !file.toLowerCase().startsWith(filePrefix.toLowerCase())) {
                    return;
                }

                const fullPath = path.join(dirPath, file);
                const stat = fs.statSync(fullPath);
                const isDirectory = stat.isDirectory();

                // Determine icon and kind
                let kind = monaco.languages.CompletionItemKind.File;
                let detail = 'File';
                let insertText = file;

                if (isDirectory) {
                    kind = monaco.languages.CompletionItemKind.Folder;
                    detail = 'Folder';
                    insertText = file + '/';
                } else {
                    // Add file extension to detail
                    const ext = path.extname(file);
                    if (ext) {
                        detail = `${ext.substring(1).toUpperCase()} File`;
                    }

                    // For require context, suggest without extension for .js files
                    if (ext === '.js') {
                        insertText = file.replace(/\.js$/, '');
                    }
                }

                suggestions.push({
                    label: file,
                    kind: kind,
                    detail: detail,
                    insertText: insertText,
                    range: {
                        startLineNumber: position.lineNumber,
                        startColumn: position.column - filePrefix.length,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    },
                    sortText: isDirectory ? '0' + file : '1' + file // Directories first
                });
            });

            // Add common project directories as suggestions if at root level
            if (searchPath === '' || searchPath === '/') {
                const commonDirs = [
                    { label: 'assets/', detail: 'Assets folder' },
                    { label: 'scenes/', detail: 'Scenes folder' },
                    { label: 'scripts/', detail: 'Scripts folder' },
                    { label: 'extensions/', detail: 'Extensions folder' },
                    { label: 'examples/', detail: 'Examples folder' }
                ];

                commonDirs.forEach(dir => {
                    const dirPath = path.join(baseDir, dir.label);
                    if (fs.existsSync(dirPath)) {
                        suggestions.push({
                            label: dir.label,
                            kind: monaco.languages.CompletionItemKind.Folder,
                            detail: dir.detail,
                            insertText: dir.label,
                            range: {
                                startLineNumber: position.lineNumber,
                                startColumn: position.column - filePrefix.length,
                                endLineNumber: position.lineNumber,
                                endColumn: position.column
                            },
                            sortText: '0' + dir.label
                        });
                    }
                });
            }

        } catch (err) {
            console.warn('[SCRIPT EDITOR] Error getting file path suggestions:', err);
        }

        return suggestions;
    },

    /**
     * Open a file in the editor
     * Creates a new tab and Monaco model
     */
    openFile(path, filename, file_extension, data) {

        // If Monaco is not ready yet, queue this file
        if (!this.isReady) {
            this.pendingFiles.push({ path, filename, extension: file_extension, data });
            if (notifications) {
                notifications.info(`Opening ${filename}...`, 2000);
            }
            return;
        }

        // Check if file is already open
        if (this.openFiles.has(path)) {
            this.switchToFile(path);
            // Update tab selection
            $('.codeEditorTab').attr('selected', 'false');
            $(`.codeEditorTab[path="${path}"]`).attr('selected', 'true');
            return;
        }

        // Determine language and icon
        const languageMap = {
            '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
            '.json': 'json',
            '.html': 'html', '.htm': 'html',
            '.css': 'css',
            '.md': 'markdown'
        };
        const language = languageMap[file_extension] || 'plaintext';
        const ficon = language === 'javascript'
            ? globals.user.fileIconTheme.data.files.javascript
            : globals.user.fileIconTheme.data.files.default;

        // Create Monaco model
        const model = this.monaco.editor.createModel(data.toString(), language);

        // Store file info
        const fileInfo = {
            path,
            filename,
            extension: file_extension,
            model,
            modified: false,
            originalContent: data.toString()
        };

        this.openFiles.set(path, fileInfo);

        // Create tab
        this.createTab(path, filename, ficon);

        // Switch to the new file
        this.currentFile = path;
        this.editor.setModel(model);

        // Show editor UI if first file
        const tabCount = $('.codeEditorTab').length;
        if (tabCount === 1) {
            $('.codes').attr('visible', 'true');
            $('#codeEditorTabs').attr('visible', 'true');
            $('#noFileOpened').attr('visible', 'false');

            setTimeout(() => {
                if (this.editor) {
                    this.editor.layout();
                }
            }, 50);
        }

        // Update UI
        this.updateStatusBar();
        setTimeout(() => {
            if (this.editor) {
                this.editor.layout();
            }
        }, 100);

        consoleModule.info(`File opened: ${filename}`);
    },

    /**
     * Create a new tab element
     */
    createTab(path, filename, iconPath) {
        // Deselect all tabs
        $('.codeEditorTab').attr('selected', 'false');

        // Create tab using jQuery for better control
        const $tab = $('<div>')
            .addClass('codeEditorTab')
            .attr('path', path)
            .attr('selected', 'true');

        const $body = $('<div>').addClass('body');

        // Icon
        $('<img>')
            .addClass('icon')
            .attr('src', `./assets/files-icons-themes/${globals.user.fileIconTheme.theme}/${iconPath}`)
            .appendTo($body);

        // Title
        $('<a>')
            .addClass('title')
            .text(filename)
            .appendTo($body);

        // Close button
        $('<i>')
            .addClass('close ri-close-line')
            .appendTo($body);

        // Modified indicator (hidden by default)
        $('<i>')
            .addClass('save ri-circle-fill')
            .css('display', 'none')
            .appendTo($body);

        $body.appendTo($tab);
        $tab.appendTo('#codeEditorTabs');

    },

    /**
     * Switch to a different open file
     */
    switchToFile(path) {
        const fileInfo = this.openFiles.get(path);
        if (!fileInfo) {
            console.warn('[SCRIPT EDITOR] File not found in openFiles:', path);
            return;
        }

        this.currentFile = path;
        this.editor.setModel(fileInfo.model);

        // Update status bar
        this.updateStatusBar();

        // Force Monaco to recalculate layout after model change
        setTimeout(() => {
            if (this.editor) {
                this.editor.layout();
            }
        }, 50);
    },

    /**
     * Close a file and remove its tab
     * COMPLETELY REBUILT - Ultra simple and robust
     */
    closeFile(path) {

        // ============================================================
        // STEP 1: Validate file exists
        // ============================================================
        const fileInfo = this.openFiles.get(path);
        if (!fileInfo) {
            console.error('[SCRIPT EDITOR] ✗ File not found in openFiles Map');
            return;
        }

        // ============================================================
        // STEP 2: Find the tab in DOM
        // ============================================================
        let $tabToClose = null;
        $('.codeEditorTab').each(function() {
            if ($(this).attr('path') === path) {
                $tabToClose = $(this);
                return false; // break
            }
        });

        if (!$tabToClose || $tabToClose.length === 0) {
            console.error('[SCRIPT EDITOR] ✗ Tab not found in DOM');
            return;
        }

        // ============================================================
        // STEP 3: Check if this tab is selected
        // ============================================================
        const isSelected = $tabToClose.attr('selected') === 'true';

        // ============================================================
        // STEP 4: Get all tabs BEFORE removing
        // ============================================================
        const $allTabsBefore = $('.codeEditorTab');
        const tabIndex = $allTabsBefore.index($tabToClose);
        const totalTabsBefore = $allTabsBefore.length;

        // ============================================================
        // STEP 5: DESTROY TAB from DOM
        // ============================================================
        $tabToClose.remove();

        // ============================================================
        // STEP 6: DISPOSE Monaco model (free memory)
        // ============================================================
        if (fileInfo.model) {
            try {
                fileInfo.model.dispose();
            } catch (err) {
                console.error('[SCRIPT EDITOR] ✗ Error disposing model:', err);
            }
        }

        // ============================================================
        // STEP 7: DELETE from openFiles Map
        // ============================================================
        this.openFiles.delete(path);

        // ============================================================
        // STEP 8: Handle what to do next
        // ============================================================
        const $remainingTabs = $('.codeEditorTab');

        if ($remainingTabs.length === 0) {
            // NO MORE TABS - Show empty state

            this.currentFile = null;
            this.editor.setModel(null);

            $('.codes').attr('visible', 'false');
            $('#codeEditorTabs').attr('visible', 'false');
            $('#noFileOpened').attr('visible', 'true');

        }
        else if (isSelected) {
            // This tab WAS selected, select another

            let $nextTab;

            // Try next tab (same index)
            if (tabIndex < $remainingTabs.length) {
                $nextTab = $remainingTabs.eq(tabIndex);
            }
            // If was last, select new last
            else {
                $nextTab = $remainingTabs.last();
            }

            if ($nextTab && $nextTab.length > 0) {
                const nextPath = $nextTab.attr('path');

                // Deselect all
                $remainingTabs.attr('selected', 'false');
                // Select this one
                $nextTab.attr('selected', 'true');
                // Switch to it
                this.switchToFile(nextPath);

            }
        }
        else {
            // Closed tab was NOT selected, nothing to do
        }


        consoleModule.info(`File closed: ${fileInfo.filename}`);
    },

    /**
     * Save the currently active file
     */
    saveCurrentFile() {
        if (!this.currentFile) {
            consoleModule.warn('No file is currently open');
            return;
        }

        this.saveFile(this.currentFile);
    },

    /**
     * Save a specific file
     */
    saveFile(path) {
        const fileInfo = this.openFiles.get(path);
        if (!fileInfo) {
            consoleModule.error(`File not found: ${path}`);
            return;
        }

        try {
            const content = fileInfo.model.getValue();
            fs.writeFileSync(path, content, 'utf8');

            // Mark as saved
            fileInfo.modified = false;
            fileInfo.originalContent = content;

            this.markFileSaved(path);
            consoleModule.info(`File saved: ${fileInfo.filename}`);
            notifications.success(`Saved: ${fileInfo.filename}`);
        } catch (err) {
            consoleModule.error(`Failed to save file: ${err.message}`);
            notifications.error(`Failed to save: ${err.message}`);
        }
    },

    /**
     * Save all open files
     */
    saveAll() {
        this.openFiles.forEach((fileInfo, path) => {
            if (fileInfo.modified) {
                this.saveFile(path);
            }
        });
    },


    /**
     * Mark file as modified
     */
    markFileModified(path) {
        const fileInfo = this.openFiles.get(path);
        if (!fileInfo) return;

        if (!fileInfo.modified) {
            fileInfo.modified = true;

            // Show save indicator
            const tab = $(`.codeEditorTab[path="${path}"]`);
            tab.find('.save').show();
        }
    },

    /**
     * Mark file as saved
     */
    markFileSaved(path) {
        const fileInfo = this.openFiles.get(path);
        if (!fileInfo) return;

        fileInfo.modified = false;

        // Hide save indicator
        const tab = $(`.codeEditorTab[path="${path}"]`);
        tab.find('.save').hide();
    },

    /**
     * Auto-save functionality
     */
    resetAutoSaveTimer() {
        if (this.autoSaveInterval) {
            clearTimeout(this.autoSaveInterval);
        }

        this.autoSaveInterval = setTimeout(() => {
            if (this.currentFile) {
                const fileInfo = this.openFiles.get(this.currentFile);
                if (fileInfo && fileInfo.modified) {
                    this.saveFile(this.currentFile);
                    consoleModule.info(`Auto-saved: ${fileInfo.filename}`);
                }
            }
        }, this.autoSaveDelay);
    },

    /**
     * Enable/disable auto-save
     */
    setAutoSave(enabled) {
        if (!enabled && this.autoSaveInterval) {
            clearTimeout(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    },

    /**
     * Update status bar with editor information
     */
    updateStatusBar() {
        const footer = nw.require('./assets/js/objects/footer');
        const globals = nw.require('./assets/js/common/globals');

        // Only update if script editor tab is active
        if (globals.app.tabName !== 'scriptEditor') return;

        if (!this.editor) return;

        // Get cursor position
        const position = this.editor.getPosition();
        const line = position ? position.lineNumber : 1;
        const column = position ? position.column : 1;

        // Get total character count
        const model = this.editor.getModel();
        const charCount = model ? model.getValue().length : 0;

        // Get current language
        const language = model ? model.getLanguageId() : 'plaintext';

        // Get tab size
        const tabSize = this.editor.getModel() ? this.editor.getModel().getOptions().tabSize : 4;

        // Update status bar
        footer.updateScriptEditorStatus({
            line: line,
            column: column,
            charCount: charCount,
            language: language,
            tabSize: tabSize
        });
    },

    /**
     * Format/beautify code
     */
    formatCode(editor) {
        try {
            const model = editor.getModel();
            if (!model) return;

            const language = model.getLanguageId();

            // For JavaScript/JSON, use js-beautify if available
            if ((language === 'javascript' || language === 'json') && typeof js_beautify !== 'undefined') {
                const content = model.getValue();
                const beautifyOptions = {
                    indent_size: model.getOptions().tabSize,
                    indent_char: model.getOptions().insertSpaces ? ' ' : '\t',
                    max_preserve_newlines: 2,
                    preserve_newlines: true,
                    keep_array_indentation: false,
                    break_chained_methods: false,
                    brace_style: 'collapse',
                    space_before_conditional: true,
                    unescape_strings: false,
                    jslint_happy: false,
                    end_with_newline: false,
                    wrap_line_length: 0,
                    indent_inner_html: false,
                    comma_first: false,
                    e4x: false,
                    indent_empty_lines: false
                };

                const formatted = js_beautify(content, beautifyOptions);

                // Get current cursor position
                const position = editor.getPosition();

                // Replace content
                model.pushEditOperations(
                    [],
                    [{
                        range: model.getFullModelRange(),
                        text: formatted
                    }],
                    () => null
                );

                // Restore cursor position (approximately)
                editor.setPosition(position);

                notifications.success('Code formatted successfully');
                consoleModule.info('Code formatted with js-beautify');
            } else {
                // Use Monaco's built-in formatting
                editor.getAction('editor.action.formatDocument').run();
                notifications.success('Code formatted');
                consoleModule.info('Code formatted with Monaco formatter');
            }
        } catch (err) {
            consoleModule.error(`Failed to format code: ${err.message}`);
            notifications.error('Failed to format code');
        }
    }
};
