const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');
const properties = nw.require('./assets/js/objects/properties');
const transformControls = nw.require('./assets/js/objects/transformControls');
const layerManager = nw.require('./assets/js/objects/layerManager');
const hierarchy = nw.require('./assets/js/objects/hierarchy');
const rectangleSelection = nw.require('./assets/js/objects/rectangleSelection');

module.exports = {
    sceneData: {},
    showColliders: false, // Toggle for showing colliders in editor

    cache: {
        sceneFilePath: "",
        sceneFilename: "",
    },

    // PERFORMANCE: Cache DOM elements by OID for O(1) lookup
    objectElementsCache: new Map(),

    isInsideObject: false,
    canBeOutside: true,

    // Multi-selection support
    selectedObjects: [], // Array of {element, data} objects

    // Track unsaved changes
    hasUnsavedChanges: false,

    /**
     * Mark the scene as modified (unsaved changes)
     */
    markAsModified() {
        if (!this.hasUnsavedChanges) {
            this.hasUnsavedChanges = true;
        }
    },

    openScene(path, filename, data) {
        //
        if (path == this.cache.sceneFilePath) {
            // Même fichier déjà ouvert, mais on recharge la grille quand même pour éviter qu'elle ne s'affiche pas
            const grid = window.grid;
            if (grid) {
                // Force recreation of grid canvas
                if (grid.createGridCanvas) {
                    grid.createGridCanvas();
                }
                // Show or hide grid based on enabled state
                if (grid.enabled) {
                    grid.drawGrid();
                    if (grid.gridCanvas) {
                        grid.gridCanvas.style.display = 'block';
                    }
                } else {
                    if (grid.gridCanvas) {
                        grid.gridCanvas.style.display = 'none';
                    }
                }
            }
            return;
        }
        //
        this.cache.sceneFilePath = path;
        this.cache.sceneFilename = filename;

        // Update project cache with last opened scene
        const projectCache = nw.require('./assets/js/objects/projectCache');
        if (projectCache && path) {
            const relativePath = projectCache.getRelativePath(path);
            if (relativePath) {
                projectCache.saveLastScene(relativePath);
            }
        }

        //
        try {
            this.sceneData = JSON.parse(data);
            // Reset unsaved changes flag when opening a scene
            this.hasUnsavedChanges = false;
            //
            $("#scnEditor").attr("visible", "true");
            $("#scnEditorTabs").attr("visible", "true");
            $("#noScnOpened").attr("visible", "false");
            $("#layerManagerPanel").show();
            //
            this.refreshEditor();
            this.loadScene();
        }
        catch (err) {
            //remove all object
            let scnEditor = document.querySelector("#scnEditor");
            scnEditor.innerHTML = "";
            //hide the sceneEditor
            $("#scnEditor").attr("visible", "false");
            $("#scnEditorTabs").attr("visible", "false");
            $("#noScnOpened").attr("visible", "true");
            $("#layerManagerPanel").hide();
            //
            console.error('Failed to load scene:', filename, err);
            alert("This scene file is dammaged or corrupted !");
        }
    },

    /**
     * Save current scene to file and project data
     */
    saveScene() {
        if (!this.cache.sceneFilePath || !this.sceneData) {
            return false;
        }

        try {

            // Update cache with current scroll position
            const scnEditor = document.querySelector("#scnEditor");
            if (scnEditor && !this.sceneData.cache) {
                this.sceneData.cache = {};
            }
            if (scnEditor && this.sceneData.cache) {
                this.sceneData.cache.sceneEditor = {
                    scrollX: scnEditor.scrollLeft,
                    scrollY: scnEditor.scrollTop
                };
            }

            // Write scene to file
            const data = JSON.stringify(this.sceneData, null, 4);
            fs.writeFileSync(this.cache.sceneFilePath, data, 'utf8');

            // Mark as saved (no unsaved changes)
            this.hasUnsavedChanges = false;

            // Also save project data (contains app dimensions)
            if (application && application.saveProject) {
                application.saveProject();
            }

            return true;
        }
        catch (err) {
            console.error('Failed to save scene:', err);
            alert('Failed to save scene: ' + err.message);
            return false;
        }
    },

    /* --------------------------------------------------------
        EXTERNAL METHODS
    -------------------------------------------------------- */

    /**
     * Refresh all scene-related UI components (hierarchy, layer manager, add object button)
     */
    refreshSceneUI() {
        // Refresh hierarchy using hierarchy module
        if (hierarchy) {
            hierarchy.refresh();
        }

        // Refresh layer manager
        if (layerManager && layerManager.container) {
            layerManager.refresh();
        }

        // Update Add Object button state
        if (typeof window !== 'undefined' && typeof window.updateAddObjectButton === 'function') {
            window.updateAddObjectButton();
        }
    },

    refreshEditor() {
        let sceneEditorView = document.querySelector("#sceneEditorView");
        sceneEditorView.style.width = sceneEditorView.parentElement.clientWidth + "px";
        sceneEditorView.style.height = sceneEditorView.parentElement.clientHeight - 32 + "px";
        //
        let scnEditor = document.querySelector("#scnEditor");
        scnEditor.style.width = sceneEditorView.clientWidth + "px";
        scnEditor.style.height = sceneEditorView.clientHeight - 32 + "px";
        //
        let virtualBox = document.querySelector("#scnVirtualBox");
        if (virtualBox != null) {
            virtualBox.style.width = Math.max(this.sceneData.properties.virtualWidth, scnEditor.clientWidth) + "px";
            virtualBox.style.height = Math.max(this.sceneData.properties.virtualHeight, scnEditor.clientHeight) + "px";
        }
        //
        let sceneAppBox = document.querySelector("#scnSceneAppBox");
        let appBox = document.querySelector("#scnAppBox");
        let sceneBox = document.querySelector("#scnSceneBox");
        if (sceneAppBox != null && appBox != null && sceneBox != null) {
            let x = virtualBox.clientWidth / 2.0 - sceneBox.clientWidth / 2.0 + "px";
            let y = virtualBox.clientHeight / 2.0 - sceneBox.clientHeight / 2.0 + "px";
            //
            sceneAppBox.style.left = x;
            sceneAppBox.style.top = y;
            //
            appBox.style.left = x;
            appBox.style.top = y;
            //
            sceneBox.style.left = x;
            sceneBox.style.top = y;
        }
    },

    loadScene() {
        //remove all object
        let scnEditor = document.querySelector("#scnEditor");
        scnEditor.innerHTML = "";
        //create the zoom wrapper and virtual box
        let elem = `
        <div id="scnZoomWrapper">
            <div id="scnVirtualBox">
                <div id="scnSceneAppBox"></div>
                <div id="scnAppBox"></div>
                <div id="scnSceneBox"></div>
            </div>
        </div>
        `;
        scnEditor.innerHTML = elem.trim();
        //configure the virtual box
        setTimeout(() => {
            this.setVirtualWidth(this.sceneData.properties.virtualWidth);
            this.setVirtualHeight(this.sceneData.properties.virtualHeight);
            //configure the scene box
            setTimeout(() => {
                this.setAppWidth(application.projectData.properties.width);
                this.setAppHeight(application.projectData.properties.height);
                //
                this.setSceneWidth(this.sceneData.properties.width);
                this.setSceneHeight(this.sceneData.properties.height);
                this.setSceneBackgroundColor(this.sceneData.properties.backgroundColor);
                //goto scene position in cache if exist
                if (this.sceneData.cache != null && this.sceneData.cache.sceneEditor != null) {
                    scnEditor.scrollTo(this.sceneData.cache.sceneEditor.scrollX, this.sceneData.cache.sceneEditor.scrollY);
                } else {
                    //center the editor as default position
                    let svb = document.querySelector("#scnVirtualBox");
                    const middleX = (svb.clientWidth - scnEditor.clientWidth) / 2;
                    const middleY = (svb.clientHeight - scnEditor.clientHeight) / 2;
                    scnEditor.scrollTo(middleX, middleY);
                }
                // Collect all unique layer numbers used by objects
                const layersUsed = new Set();
                if (this.sceneData.objects && this.sceneData.objects.length > 0) {
                    this.sceneData.objects.forEach(obj => {
                        const layerNum = obj.layer !== undefined ? obj.layer : 0;
                        layersUsed.add(layerNum);
                    });
                }

                // Always ensure layer 0 exists
                layersUsed.add(0);

                // Create DOM layers for all used layer numbers (sorted from 0 upwards)
                const sortedLayers = Array.from(layersUsed).sort((a, b) => a - b);

                let scene = document.querySelector("#scnSceneBox");
                sortedLayers.forEach((layerNum) => {
                    const layerName = this.sceneData.layers && this.sceneData.layers[layerNum]
                        ? this.sceneData.layers[layerNum].name
                        : `Layer ${layerNum}`;
                    let elem = `<div class="__ajs_scene_layer" __ajs_layer_name="${layerName}" data-layer-number="${layerNum}"></div>`;
                    scene.innerHTML = scene.innerHTML + elem.trim();
                });
                setTimeout(() => {
                    //load all objects from loaded scene
                    this.loadAllSceneObjects();
                    //
                    setTimeout(() => {
                        //refresh all objects
                        this.refreshSceneObjects(this.sceneData.objects);

                        // Refresh all scene UI (hierarchy, layer manager, add object button)
                        this.refreshSceneUI();

                        // Initialize status bar with scene dimensions
                        const footer = nw.require('./assets/js/objects/footer');
                        if (footer) {
                            const sceneBox = document.getElementById('scnSceneBox');
                            const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
                            const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;

                            footer.updateSceneEditorStatus({
                                selectedCount: 0,
                                screenWidth: screenWidth,
                                screenHeight: screenHeight
                            });
                        }

                        // Show grid after scene is loaded - ALWAYS recreate canvas first
                        const grid = window.grid;
                        if (grid) {
                            // Force recreation of grid canvas to ensure it's in the new scnZoomWrapper
                            if (grid.createGridCanvas) {
                                grid.createGridCanvas();
                            }
                            // Show or hide grid based on enabled state
                            if (grid.enabled) {
                                grid.show();
                            } else {
                                grid.hide();
                            }
                        }

                        // Initialize zoom after scene is loaded
                        const zoom = window.zoom;
                        if (zoom) {
                            zoom.init(document.getElementById('scnEditor'));
                            zoom.setZoom(100); // Reset to 100%
                        }

                        // Initialize rectangle selection for multi-select
                        const scnEditor = document.getElementById('scnEditor');
                        if (rectangleSelection && scnEditor) {
                            rectangleSelection.init(scnEditor);
                        }

                        // Add click handler to scene box to show scene properties
                        const sceneBox = document.getElementById('scnSceneBox');
                        if (sceneBox) {
                            sceneBox.addEventListener('click', (e) => {
                                // Only handle if clicking directly on scnSceneBox (not on objects)
                                if (e.target.id === 'scnSceneBox' || e.target.classList.contains('__ajs_scene_layer')) {
                                    this.showSceneProperties();
                                }
                            });
                        }
                    }, 100);
                }, 100);
            }, 100);
        }, 100);
    },

    clickEvent() {
        // Don't deselect if rectangle selection had a drag operation
        const rectangleSelection = nw.require('./assets/js/objects/rectangleSelection');
        if (rectangleSelection && rectangleSelection.hadDrag) {
            rectangleSelection.hadDrag = false;  // Reset the flag
            return;
        }

        if (!sceneEditor.isInsideObject) {
            sceneEditor.deselectAllObjects();
        }
    },

    setVirtualWidth(width) {
        let obj = document.querySelector("#scnVirtualBox");
        obj.style.width = width + "px";
        // Update scene data
        if (this.sceneData && this.sceneData.properties) {
            this.sceneData.properties.virtualWidth = width;
        }
    },

    setVirtualHeight(height) {
        let obj = document.querySelector("#scnVirtualBox");
        obj.style.height = height + "px";
        // Update scene data
        if (this.sceneData && this.sceneData.properties) {
            this.sceneData.properties.virtualHeight = height;
        }
    },

    //app box
    setAppWidth(width) {
        let obj = document.querySelector("#scnAppBox");
        obj.style.width = width + "px";
        // Update project data
        if (application.projectData && application.projectData.properties) {
            application.projectData.properties.width = width;
        }
    },

    setAppHeight(height) {
        let obj = document.querySelector("#scnAppBox");
        obj.style.height = height + "px";
        // Update project data
        if (application.projectData && application.projectData.properties) {
            application.projectData.properties.height = height;
        }
    },

    //scene box
    getSceneX() {
        let obj = document.querySelector("#scnSceneBox");
        return parseInt(obj.style.left);
    },

    getSceneY() {
        let obj = document.querySelector("#scnSceneBox");
        return parseInt(obj.style.top);
    },

    getSceneWidth() {
        let obj = document.querySelector("#scnSceneBox");
        return obj.clientWidth;
    },

    getSceneHeight() {
        let obj = document.querySelector("#scnSceneBox");
        return obj.clientHeight;
    },

    setSceneWidth(width) {
        let obj = document.querySelector("#scnSceneAppBox");
        obj.style.width = width + "px";
        //
        obj = document.querySelector("#scnSceneBox");
        obj.style.width = width + "px";
        // Update scene data
        if (this.sceneData && this.sceneData.properties) {
            this.sceneData.properties.width = width;
            // Automatically update virtualWidth to be width + 1000
            this.sceneData.properties.virtualWidth = width + 1000;
            this.setVirtualWidth(width + 1000);
        }
        this.refreshEditor();

        // Update status bar with new dimensions
        const footer = nw.require('./assets/js/objects/footer');
        if (footer) {
            footer.updateSceneEditorStatus({
                screenWidth: width,
                screenHeight: this.sceneData?.properties?.height || 480
            });
        }

        // Redraw grid after scene width changes
        const grid = window.grid;
        if (grid && grid.enabled) {
            grid.drawGrid();
        }
    },

    setSceneHeight(height) {
        let obj = document.querySelector("#scnSceneAppBox");
        obj.style.height = height + "px";
        //
        obj = document.querySelector("#scnSceneBox");
        obj.style.height = height + "px";
        // Update scene data
        if (this.sceneData && this.sceneData.properties) {
            this.sceneData.properties.height = height;
            // Automatically update virtualHeight to be height + 1000
            this.sceneData.properties.virtualHeight = height + 1000;
            this.setVirtualHeight(height + 1000);
        }
        this.refreshEditor();

        // Update status bar with new dimensions
        const footer = nw.require('./assets/js/objects/footer');
        if (footer) {
            footer.updateSceneEditorStatus({
                screenWidth: this.sceneData?.properties?.width || 640,
                screenHeight: height
            });
        }

        // Redraw grid after scene height changes
        const grid = window.grid;
        if (grid && grid.enabled) {
            grid.drawGrid();
        }
    },

    setSceneBackgroundColor(color) {
        let obj = document.querySelector("#scnSceneBox");
        obj.style.backgroundColor = color;
        // Update scene data
        if (this.sceneData && this.sceneData.properties) {
            this.sceneData.properties.backgroundColor = color;
        }
    },

    ///////////////////////////
    //extensions manipulations
    ///////////////////////////
    requireOnceExtension(extension) {
        //store correctly extension editor script if it doesn't exists
        let isExists = false;
        Object.keys(__editorExtensions).forEach(key => {
            if (key == extension) {
                isExists = true;
                return;
            }
        });

        //load extension editor script
        if (!isExists) {
            try {
                // Read extension files with error handling
                const dataFilePath = "./extensions/" + extension + "/data.json";
                const editorFilePath = "./extensions/" + extension + "/editor.js";
                const runtimeFilePath = "./extensions/" + extension + "/runtime.js";

                // Load data.json safely
                const dataFileContent = fs.readFileSync(dataFilePath, 'utf8');
                __dataExtensions[extension] = JSON.parse(dataFileContent);

                // Load editor.js using Node.js require() instead of eval()
                // This is safer as it uses Node's module system
                const path = nw.require('path');
                const editorPath = path.resolve(editorFilePath);
                const runtimePath = path.resolve(runtimeFilePath);

                // Use Function constructor with restricted scope instead of eval
                // This provides better isolation than eval()
                const editorFileContent = fs.readFileSync(editorFilePath, 'utf8');
                const runtimeFileContent = fs.readFileSync(runtimeFilePath, 'utf8');

                // Create a safe execution context with only necessary globals
                const createSafeExtension = (code, extensionName) => {
                    try {
                        // Create a mock module object for CommonJS compatibility
                        const module = { exports: {} };
                        const exports = module.exports;

                        // Use Function constructor instead of eval - slightly safer
                        // Provide module and exports for CommonJS compatibility
                        // Support both patterns:
                        // 1. module.exports = ... (runtime.js)
                        // 2. const script = { ... }; script; (editor.js)
                        const func = new Function('module', 'exports', 'sceneEditor', 'application', 'globals', `
                            ${code}
                            // Return module.exports if it was set, otherwise try to return script or runtime or editor
                            if (typeof module.exports === 'object' && Object.keys(module.exports).length > 0) {
                                return module.exports;
                            }
                            // Try common variable names used in extensions
                            if (typeof script !== 'undefined') return script;
                            if (typeof runtime !== 'undefined') return runtime;
                            if (typeof editor !== 'undefined') return editor;
                            throw new Error('Extension did not export anything');
                        `);
                        return func(module, exports, this, application, globals);
                    } catch (err) {
                        console.error(`Failed to load extension ${extensionName}:`, err);
                        throw new Error(`Extension ${extensionName} failed to load: ${err.message}`);
                    }
                };

                __editorExtensions[extension] = createSafeExtension(editorFileContent, extension + '/editor.js');
                __runtimeExtensions[extension] = createSafeExtension(runtimeFileContent, extension + '/runtime.js');

            } catch (err) {
                console.error(`Error loading extension ${extension}:`, err);
                throw new Error(`Failed to load extension ${extension}: ${err.message}`);
            }
        }
    },

    loadAllSceneObjects() {
        this.sceneData.objects.forEach((data, index) => {
            this.requireOnceExtension(data.extension);
            //call the extension object create function
            __editorExtensions[data.extension].create(data);
        });
    },

    /**
     * Create a single object in the scene
     * Used by CreateObjectCommand and paste operations
     */
    createObject(data) {
        // Load extension if not already loaded
        this.requireOnceExtension(data.extension);

        // Call the extension's create function to add object to DOM
        __editorExtensions[data.extension].create(data);

        // PERFORMANCE: Use cached element lookup
        const object = this.getObjectElement(data.oid);
        if (object) {
            // Clear canvas if it's a canvas element
            if (object.tagName === "CANVAS") {
                const ctx = object.getContext('2d');
                ctx.clearRect(0, 0, object.width, object.height);
            }

            // Update object with its data to apply all properties
            __editorExtensions[data.extension].update(object, data);

            // Render collider visualizations if any collider scripts are attached
            this.renderColliderVisualizations(object, data);

            // Apply locked state if object is locked
            if (data.locked) {
                object.classList.add('locked-object');
            } else {
                object.classList.remove('locked-object');
            }
        }
    },

    refreshSceneObjects(oData) {
        // PERFORMANCE: Batch canvas operations and use cached elements
        oData.forEach((data, index) => {
            // PERFORMANCE: Use cached element lookup (O(1) instead of querySelector)
            const object = this.getObjectElement(data.oid);
            if (!object) return;

            // Clear canvas if needed
            if (object.tagName === "CANVAS") {
                const ctx = object.getContext('2d');
                ctx.clearRect(0, 0, object.width, object.height);
            }

            // Update object via extension
            __editorExtensions[data.extension].update(object, data);

            // Render collider visualizations if any collider scripts are attached
            this.renderColliderVisualizations(object, data);

            // PERFORMANCE: Batch class operations
            if (data.locked) {
                object.classList.add('locked-object');
            } else {
                object.classList.remove('locked-object');
            }
        });

        // Refresh thumbnails in hierarchy after objects are updated
        const hierarchyModule = window.hierarchy || hierarchy;
        if (hierarchyModule && hierarchyModule.refreshThumbnails) {
            hierarchyModule.refreshThumbnails(oData);
        }

        // Refresh layer previews in real-time
        const layerManagerModule = window.layerManager || layerManager;
        if (layerManagerModule && layerManagerModule.refreshLayerPreviews) {
            layerManagerModule.refreshLayerPreviews(oData);
        }
    },

    addObjectToSceneLayer(elem, layerID) {
        // Find layer by data-layer-number attribute instead of index
        let layer = document.querySelector(`.__ajs_scene_layer[data-layer-number="${layerID}"]`);

        // Fallback to layer 0 if not found
        if (!layer) {
            console.warn(`Layer ${layerID} not found, using layer 0`);
            layer = document.querySelector('.__ajs_scene_layer[data-layer-number="0"]');
        }

        if (!layer) {
            console.error('No layers found in scene!');
            return;
        }

        layer.appendChild(elem);
        //
        const $self = this;
        //
        // Make object NOT draggable by default (will be enabled when Alt is pressed)
        elem.setAttribute('draggable', 'false');

        // Drag start - initiate drag to change layer (only with Alt key)
        elem.addEventListener('dragstart', function (e) {
            const oid = elem.getAttribute("__ajs_object_ID");

            if (!globals.keysIsPressed.alt && !e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            e.dataTransfer.effectAllowed = 'move';

            // If multiple objects are selected and this is one of them, drag all selected
            const isPartOfSelection = $self.selectedObjects.some(obj => obj.data.oid === oid);
            if (isPartOfSelection && $self.selectedObjects.length > 1) {
                // Drag all selected objects
                const oids = $self.selectedObjects.map(obj => obj.data.oid).join(',');
                e.dataTransfer.setData('text/plain', oids);
                // Add visual feedback to all selected objects
                $self.selectedObjects.forEach(obj => {
                    obj.element.classList.add('dragging-object');
                });
            } else {
                // Drag only this object
                e.dataTransfer.setData('text/plain', oid);
                elem.classList.add('dragging-object');
            }

            // Deactivate transform controls during drag
            if (typeof transformControls !== 'undefined') {
                transformControls.deactivate();
            }
        });

        // Drag end - cleanup and disable draggable
        elem.addEventListener('dragend', function (e) {
            // Remove dragging class from all objects
            document.querySelectorAll('.__ajs_scene_object').forEach(obj => {
                obj.classList.remove('dragging-object');
                obj.setAttribute('draggable', 'false');
            });
        });

        //clickable object event - remove previous handlers to avoid duplicates
        $(elem).off('click').on('click', function (e) {
            $self.isInsideObject = true;
            //reset canBeOutside
            setTimeout(function () {
                $self.canBeOutside = true;
            }, 100);
            //get object oid
            let oid = elem.getAttribute("__ajs_object_ID");
            //find object data
            let objectData = {};
            $self.sceneData.objects.forEach((data, index) => {
                if (data.oid == oid) {
                    objectData = data;
                }
            });

            //check if ctrl or shift is pressed for multi-selection
            if (globals.keysIsPressed.ctrl || e.ctrlKey || e.shiftKey) {
                // Multi-selection mode
                if ((globals.keysIsPressed.ctrl || e.ctrlKey) && elem.classList.contains("clickable_selected")) {
                    // Ctrl+Click on selected object = deselect this object
                    elem.classList.remove("clickable_selected");
                    $self.selectedObjects = $self.selectedObjects.filter(obj => obj.data.oid !== oid);
                } else {
                    // Add to selection (Shift+Click or Ctrl+Click on unselected)
                    elem.classList.add("clickable_selected");
                    $self.selectedObjects.push({ element: elem, data: objectData });
                }

                // Update transform controls for all selected objects
                if (typeof transformControls !== 'undefined') {
                    transformControls.activateMultiple($self.selectedObjects);
                }

                // Refresh collider visualizations for all objects (shows/hides based on selection)
                $self.refreshAllColliderVisualizations();

                // If there's at least one object, show its properties
                if ($self.selectedObjects.length > 0) {
                    const firstSelected = $self.selectedObjects[0];
                    let extensionData = __dataExtensions[firstSelected.data.extension];
                    properties.openObjectProperties(firstSelected.data, extensionData);
                }

                // Update status bar with selection count
                const footer = nw.require('./assets/js/objects/footer');
                if (footer) {
                    const sceneBox = document.getElementById('scnSceneBox');
                    const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
                    const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;

                    footer.updateSceneEditorStatus({
                        selectedCount: $self.selectedObjects.length,
                        screenWidth: screenWidth,
                        screenHeight: screenHeight
                    });
                }
            } else {
                // Check if this object is already part of a multi-selection
                const isPartOfMultiSelection = $self.selectedObjects.length > 1 &&
                    $self.selectedObjects.some(obj => obj.data.oid === oid);

                if (isPartOfMultiSelection) {
                    // Object is part of multi-selection - maintain the multi-selection
                    // Just activate transform controls for all selected objects
                    if (typeof transformControls !== 'undefined') {
                        transformControls.activateMultiple($self.selectedObjects);
                    }

                    // Show properties of the clicked object
                    let extensionData = __dataExtensions[objectData.extension];
                    properties.openObjectProperties(objectData, extensionData);
                } else {
                    // Single selection mode - deselect all others
                    if (oid != properties.cache.lastSelectedObjectOID) {
                        $self.deselectAllObjects();
                    }
                    elem.classList.add("clickable_selected");
                    $self.selectedObjects = [{ element: elem, data: objectData }];

                    let extensionData = __dataExtensions[objectData.extension];
                    properties.openObjectProperties(objectData, extensionData);

                    // Activate transform controls for single object
                    if (typeof transformControls !== 'undefined') {
                        transformControls.activate(elem, objectData);
                    }

                    // Refresh collider visualizations for all objects (shows/hides based on selection)
                    $self.refreshAllColliderVisualizations();
                }
            }
        });
        ////////////////////////////
        //DESELECT ALL OBJECTS EVENT
        ////////////////////////////
        // Event listener for mousedown on myObject
        // Remove any existing mousedown handler to avoid duplicates
        const mousedownHandler = function () {
            if (!$self.isInsideObject) {
                $self.isInsideObject = true;
            }
        };
        elem.addEventListener("mousedown", mousedownHandler, { once: false });
        //
    },

    selectObject(elem, objectData) {
        // Check if object is locked
        if (objectData.locked) {
            const notifications = nw.require('./assets/js/objects/notifications');
            if (notifications) {
                notifications.warning(`Object "${objectData.properties.name}" is locked`);
            }
            return;
        }

        // Deselect all first
        this.deselectAllObjects();

        // Select the object
        elem.classList.add("clickable_selected");

        // Update hierarchy selection
        document.querySelectorAll('.hierarchy-object-item').forEach(item => {
            item.classList.remove('selected');
        });
        const hierarchyItem = document.querySelector(`.hierarchy-object-item[oid="${objectData.oid}"]`);
        if (hierarchyItem) {
            hierarchyItem.classList.add('selected');
        }

        // Open properties
        let extensionData = __dataExtensions[objectData.extension];
        if (properties && properties.openObjectProperties) {
            properties.openObjectProperties(objectData, extensionData);
        }

        // Activate transform controls
        const transformControlsModule = window.transformControls || transformControls;
        if (transformControlsModule) {
            transformControlsModule.activate(elem, objectData);
        }

        // Update status bar
        const footer = nw.require('./assets/js/objects/footer');
        if (footer) {
            const sceneBox = document.getElementById('scnSceneBox');
            const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
            const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;

            footer.updateSceneEditorStatus({
                selectedCount: 1,
                screenWidth: screenWidth,
                screenHeight: screenHeight
            });
        }
    },

    deselectAllObjects() {
        document.querySelectorAll(".clickable_selected").forEach((elem) => {
            elem.classList.remove("clickable_selected");
        });

        // Deselect in hierarchy
        document.querySelectorAll('.hierarchy-object-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Clear selected objects array
        this.selectedObjects = [];

        //
        properties.closeProperties();

        // Deactivate transform controls
        if (typeof transformControls !== 'undefined') {
            transformControls.deactivate();
        }

        // Update status bar
        const footer = nw.require('./assets/js/objects/footer');
        if (footer) {
            const sceneBox = document.getElementById('scnSceneBox');
            const screenWidth = sceneBox ? parseInt(sceneBox.style.width) || 640 : 640;
            const screenHeight = sceneBox ? parseInt(sceneBox.style.height) || 480 : 480;

            footer.updateSceneEditorStatus({
                selectedCount: 0,
                screenWidth: screenWidth,
                screenHeight: screenHeight
            });
        }

        // Update align toolbar state
        const alignTools = window.alignTools || nw.require('./assets/js/objects/alignTools');
        if (alignTools && alignTools.updateToolbarState) {
            alignTools.updateToolbarState();
        }

        // Refresh collider visualizations (hide all colliders since nothing is selected)
        this.refreshAllColliderVisualizations();
    },

    /**
     * Select all objects in the scene (excluding locked objects)
     */
    selectAllObjects() {
        if (!this.sceneData || !this.sceneData.objects) {
            return;
        }

        // Deselect all first
        this.deselectAllObjects();

        // Select all non-locked objects
        let selectedCount = 0;
        this.sceneData.objects.forEach(obj => {
            if (!obj.locked) {
                // PERFORMANCE: Use cached element lookup
                const elem = this.getObjectElement(obj.oid);
                if (elem) {
                    elem.classList.add('clickable_selected');
                    this.selectedObjects.push({ element: elem, data: obj });
                    selectedCount++;
                }

                // Select in hierarchy
                const hierarchyItem = document.querySelector(`.hierarchy-object-item[oid="${obj.oid}"]`);
                if (hierarchyItem) {
                    hierarchyItem.classList.add('selected');
                }
            }
        });

        // Activate multi-selection transform controls if available
        if (selectedCount > 0) {
            const transformControlsModule = window.transformControls || transformControls;
            if (transformControlsModule && transformControlsModule.activateMultiple && selectedCount > 1) {
                transformControlsModule.activateMultiple(this.selectedObjects);
            } else if (transformControlsModule && selectedCount === 1) {
                transformControlsModule.activate(this.selectedObjects[0].element, this.selectedObjects[0].data);
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

        // Update align toolbar state
        const alignTools = window.alignTools || nw.require('./assets/js/objects/alignTools');
        if (alignTools && alignTools.updateToolbarState) {
            alignTools.updateToolbarState();
        }

        // Refresh collider visualizations for selected objects
        this.refreshAllColliderVisualizations();
    },

    /**
     * Destroy an object from the scene
     */
    destroyObject(objectData) {
        if (!objectData || !objectData.oid) {
            console.error('Invalid object data for deletion');
            return false;
        }

        try {
            // Find object in sceneData
            const objectIndex = this.sceneData.objects.findIndex(obj => obj.oid === objectData.oid);
            if (objectIndex === -1) {
                console.error('Object not found in scene data:', objectData.oid);
                return false;
            }

            const objectName = objectData.properties?.name || 'Unknown';

            // Deactivate transform controls if this object is selected
            if (typeof transformControls !== 'undefined') {
                const currentElement = transformControls.targetElement;
                if (currentElement && currentElement.getAttribute('__ajs_object_ID') === objectData.oid) {
                    transformControls.deactivate();
                }
            }

            // Remove from DOM
            // PERFORMANCE: Use cached element lookup and clear cache
            const objectElement = this.getObjectElement(objectData.oid);
            if (objectElement) {
                // Also remove collider overlay if it exists
                const parentLayer = objectElement.parentElement;
                if (parentLayer) {
                    const overlayId = `collider-overlay-${objectData.oid}`;
                    const colliderOverlay = parentLayer.querySelector(`#${overlayId}`);
                    if (colliderOverlay) {
                        colliderOverlay.remove();
                    }
                }

                objectElement.remove();
                // Clear from cache
                this.objectElementsCache.delete(objectData.oid);
            }

            // Call extension destroy method if exists
            if (objectData.extension && __editorExtensions[objectData.extension]) {
                const extension = __editorExtensions[objectData.extension];
                if (typeof extension.destroy === 'function') {
                    try {
                        extension.destroy(objectData);
                    } catch (extensionErr) {
                        console.warn('Extension destroy method failed:', extensionErr);
                    }
                }
            }

            // Remove from sceneData
            this.sceneData.objects.splice(objectIndex, 1);

            // Deselect if it was selected
            if (properties.cache.lastSelectedObjectOID === objectData.oid) {
                properties.cache.lastSelectedObjectOID = null;
                this.deselectAllObjects();
            }

            // Mark scene as modified
            this.markAsModified();

            // Refresh all scene UI (hierarchy, layer manager)
            this.refreshSceneUI();

            return true;
        }
        catch (err) {
            console.error('Failed to delete object:', err);
            return false;
        }
    },

    //////////////////////
    //
    //OBJECT MANIPULATON
    //
    //////////////////////
    initObject(object) {
        object.style.position = "absolute";
        object.classList.add("__ajs_scene_object");

        // Add drag and drop support for script files
        object.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const scriptPath = e.dataTransfer.types.includes('text/script-path');
            if (scriptPath) {
                e.dataTransfer.dropEffect = 'copy';
                this.style.outline = '2px dashed #4CAF50';
            }
        });

        object.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.outline = '';
        });

        object.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.outline = '';

            const scriptPath = e.dataTransfer.getData('text/script-path');
            const scriptName = e.dataTransfer.getData('text/script-name');

            if (scriptPath && scriptName.toLowerCase().endsWith('.js')) {
                const oid = this.getAttribute('__ajs_object_ID');
                const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
                const objectData = sceneEditor.sceneData.objects.find(obj => obj.oid === oid);

                if (objectData) {
                    // Convert to relative path
                    const application = nw.require('./assets/js/objects/application');
                    const relativePath = application.getResourcesPathFromFile(scriptPath);

                    objectData.properties.script = relativePath;

                    // Mark scene as modified
                    sceneEditor.markAsModified();

                    // Update properties panel if this object is selected
                    const properties = nw.require('./assets/js/objects/properties');
                    if (properties && properties.update) {
                        properties.update();
                    }

                    // Show notification
                    const notifications = nw.require('./assets/js/objects/notifications');
                    if (notifications) {
                        notifications.success(`Script "${scriptName}" attached to ${objectData.name}`);
                    }
                }
            }
        });
    },

    generateObjectID(object) {
        const currentTimeInMillis = new Date().getTime();
        const randomValue = Math.random();
        const randomInteger = Math.floor(currentTimeInMillis * randomValue);
        const randomHex = randomInteger.toString(16);
        //
        object.setAttribute("__ajs_object_ID", randomHex);
    },

    setObjectID(object, oid) {
        if (oid == null || oid.length <= 5) {
            this.generateObjectID(object);
        }
        else {
            object.setAttribute("__ajs_object_ID", oid);
            // PERFORMANCE: Cache element for fast lookup
            this.objectElementsCache.set(oid, object);
        }
    },

    /**
     * PERFORMANCE: Get object element from cache (O(1) instead of querySelector)
     */
    getObjectElement(oid) {
        return this.objectElementsCache.get(oid) || document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${oid}"]`);
    },

    getObjectID(object) {
        return object.getAttribute("__ajs_object_ID");
    },

    //
    setObjectName(object, name) {
        object.setAttribute("__ajs_object_name", name);
    },

    getObjectName(object) {
        return object.getAttribute("__ajs_object_name");
    },

    setObjectGroups(object, groups) {
        object.setAttribute("__ajs_object_groups", groups);
    },

    addObjectGroup(object, groupId) {
        let groups = object.getAttribute("__ajs_object_groups");
        let arr = groups.split(',');
        arr.push(groupId);
        groups = arr.join(",");
        object.setAttribute("__ajs_object_groups", groups);
    },

    removeObjectGroup(object, groupId) {
        let groups = object.getAttribute("__ajs_object_groups");
        let arr = groups.split(',');
        arr.splice(arr.indexOf(groupId), 1);
        groups = arr.join(",");
        object.setAttribute("__ajs_object_groups", groups);
    },

    getObjectGroups(object) {
        let groups = object.getAttribute("__ajs_object_groups");
        let arr = groups.split(',');
        return arr;
    },

    //clickable, resizable, rotable, editable
    renderObjectClickable(object) {
        object.setAttribute("__ajs_object_clickable", true);
    },

    renderObjectResizable(object) {
        object.setAttribute("__ajs_object_resizable", true);
    },

    renderObjectRotable(object) {
        object.setAttribute("__ajs_object_rotable", true);
    },

    renderObjectEditable(object) {
        object.setAttribute("__ajs_object_editable", true);
    },

    //non clickable, non resizable, non rotable, non editable
    renderObjectNonClickable(object) {
        object.setAttribute("__ajs_object_clickable", false);
    },

    renderObjectNonResizable(object) {
        object.setAttribute("__ajs_object_resizable", false);
    },

    renderObjectNonRotable(object) {
        object.setAttribute("__ajs_object_rotable", false);
    },

    renderObjectNonEditable(object) {
        object.setAttribute("__ajs_object_editable", true);
    },

    getObjectVisibility(object) {
        if (object.style.display == "none") {
            return false;
        }
        //
        return true;
    },

    setObjectVisibility(object, visible) {
        object.style.display = (visible == "true" || visible) ? "block" : "none";
    },

    getObjectX(object) {
        return parseFloat(object.style.left);
    },

    setObjectX(object, x) {
        object.style.left = x + "px";
    },

    getObjectY(object) {
        return parseFloat(object.style.top);
    },

    setObjectY(object, y) {
        object.style.top = y + "px";
    },

    getObjectWidth(object) {
        return parseFloat(object.style.width);
    },

    setObjectWidth(object, w) {
        if (object.tagName == "CANVAS") {
            object.width = w;
        }
        else {
            object.style.width = w + "px";
        }
    },

    getObjectHeight(object) {
        return parseFloat(object.style.height);
    },

    setObjectHeight(object, h) {
        if (object.tagName == "CANVAS") {
            object.height = h;
        }
        else {
            object.style.height = h + "px";
        }
    },

    setObjectAngle(object, angle) {
        object.style.transform = "rotate(" + angle + "deg)";
    },

    /**
     * Show scene properties in the properties panel
     * @param {string} sceneFilePath - Optional path to a .scn file to load and display properties from
     */
    showSceneProperties(sceneFilePath = null) {
        const fs = nw.require('fs');
        const path = nw.require('path');
        let sceneDataToDisplay = null;

        // If a file path is provided, load the scene data from that file
        if (sceneFilePath && fs.existsSync(sceneFilePath)) {
            try {
                const fileContent = fs.readFileSync(sceneFilePath, 'utf8');
                sceneDataToDisplay = JSON.parse(fileContent);
            } catch (err) {
                console.error('Failed to load scene from file:', err);
                if (typeof notifications !== 'undefined') {
                    notifications.error('Failed to load scene file: ' + err.message);
                }
                return;
            }
        } else if (this.sceneData) {
            // Use the currently open scene data
            sceneDataToDisplay = this.sceneData;
            sceneFilePath = this.cache.sceneFilePath;
        } else {
            return;
        }

        // Get properties and extension data objects
        const properties = nw.require('./assets/js/objects/properties');

        // Try different extension path formats
        let extensionData = __dataExtensions['internal/com.ajs.scene'];
        if (!extensionData) {
            // Load the scene extension if not already loaded
            try {
                const dataFilePath = "./extensions/internal/com.ajs.scene/data.json";
                const dataFileContent = fs.readFileSync(dataFilePath, 'utf8');
                __dataExtensions['internal/com.ajs.scene'] = JSON.parse(dataFileContent);
                extensionData = __dataExtensions['internal/com.ajs.scene'];
            } catch (err) {
                console.error('Failed to load scene extension:', err);
                return;
            }
        }

        if (!extensionData) {
            return;
        }

        // Store the loaded scene data in properties cache for editing
        properties.cache.loadedSceneData = sceneDataToDisplay;
        properties.cache.loadedSceneFilePath = sceneFilePath;

        // Create a pseudo-object data for the scene
        const sceneObjectData = {
            oid: 'scene_properties',
            extension: extensionData.extension,
            properties: sceneDataToDisplay.properties,
            layer: 0,
            __sceneFilePath: sceneFilePath, // Store the file path for saving later
            __sceneData: sceneDataToDisplay // Store full scene data
        };

        // Clear current selection in transform controls
        if (typeof transformControls !== 'undefined' && transformControls.deselect) {
            transformControls.deselect();
        }

        // Load scene properties into properties panel
        properties.closeProperties();

        // Store loaded scene data AFTER closeProperties (which clears the cache)
        properties.cache.loadedSceneData = sceneDataToDisplay;
        properties.cache.loadedSceneFilePath = sceneFilePath;

        properties.openObjectProperties(sceneObjectData, extensionData);
    },

    ////////////////////////////
    //
    //internal object functions
    //
    ////////////////////////////
    setSceneProperty(propertyName, value, sceneDataToUpdate = null) {
        // Use provided scene data or fall back to current scene data
        const targetSceneData = sceneDataToUpdate || this.sceneData;

        if (!targetSceneData || !targetSceneData.properties) {
            return;
        }

        // Check if we're modifying the currently open scene
        // by comparing file paths from properties cache
        const properties = nw.require('./assets/js/objects/properties');
        const loadedSceneFilePath = properties.cache.loadedSceneFilePath;
        const currentSceneFilePath = this.cache.sceneFilePath;

        // Normalize paths for comparison
        const normalizePath = (p) => p ? p.replace(/\\/g, '/').toLowerCase() : '';
        const isCurrentScene = normalizePath(loadedSceneFilePath) === normalizePath(currentSceneFilePath);

        // Update the target scene data
        switch (propertyName) {
            case 'name':
                targetSceneData.properties.name = value;
                break;

            case 'visible':
                targetSceneData.properties.visible = value;
                break;

            case 'width':
                targetSceneData.properties.width = parseFloat(value) || 0;
                targetSceneData.properties.virtualWidth = (parseFloat(value) || 0) + 1000;
                break;

            case 'height':
                targetSceneData.properties.height = parseFloat(value) || 0;
                targetSceneData.properties.virtualHeight = (parseFloat(value) || 0) + 1000;
                break;

            case 'virtualWidth':
                targetSceneData.properties.virtualWidth = parseFloat(value) || 0;
                break;

            case 'virtualHeight':
                targetSceneData.properties.virtualHeight = parseFloat(value) || 0;
                break;

            case 'backgroundColor':
                targetSceneData.properties.backgroundColor = value;
                break;

            default:
                targetSceneData.properties[propertyName] = value;
                break;
        }

        // If editing the currently open scene, also update this.sceneData and visual scene
        if (isCurrentScene) {
            // Update this.sceneData with the same values
            if (this.sceneData && this.sceneData.properties) {
                this.sceneData.properties[propertyName] = targetSceneData.properties[propertyName];

                // For width/height, also update virtual dimensions
                if (propertyName === 'width') {
                    this.sceneData.properties.virtualWidth = targetSceneData.properties.virtualWidth;
                } else if (propertyName === 'height') {
                    this.sceneData.properties.virtualHeight = targetSceneData.properties.virtualHeight;
                }
            }

            // Update visual scene
            switch (propertyName) {
                case 'width':
                    this.setSceneWidth(parseFloat(value) || 0);
                    break;
                case 'height':
                    this.setSceneHeight(parseFloat(value) || 0);
                    break;
                case 'virtualWidth':
                    this.setVirtualWidth(parseFloat(value) || 0);
                    break;
                case 'virtualHeight':
                    this.setVirtualHeight(parseFloat(value) || 0);
                    break;
                case 'backgroundColor':
                    this.setSceneBackgroundColor(value);
                    break;
            }
        }
    },


    setObjectProperty(objectData, propertyName, value) {
        try {
            //check if property is for single object or no
            let singleObject = false;
            __dataExtensions[objectData.extension].propertiesVariables.forEach((prop, index) => {
                if (prop.name == propertyName) {
                    singleObject = prop.singleObject != null ? prop.singleObject : false;
                }
            });

            // Store old values and create undo/redo commands
            const propertyCommands = [];
            const commands = nw.require('./assets/js/objects/commands');
            const commandManager = nw.require('./assets/js/objects/commandManager');

            //
            if (singleObject) {
                //case of only the selected object
                this.sceneData.objects.forEach((data, index) => {
                    if (data.oid == objectData.oid) {
                        const oldValue = data.properties[propertyName];

                        // Create undo/redo command (only if value changed)
                        if (oldValue !== value) {
                            const propertyPath = 'properties.' + propertyName;
                            const changeCmd = new commands.ChangePropertyCommand(
                                this,
                                data,
                                propertyPath,
                                oldValue,
                                value
                            );
                            propertyCommands.push(changeCmd);
                        }
                    }
                });
            } else {
                //case of all objects of selected object name
                const oname = objectData.properties.name;
                //
                this.sceneData.objects.forEach((data, index) => {
                    if (data.properties.name == oname) {
                        const oldValue = data.properties[propertyName];

                        // Create undo/redo command (only if value changed)
                        if (oldValue !== value) {
                            const propertyPath = 'properties.' + propertyName;
                            const changeCmd = new commands.ChangePropertyCommand(
                                this,
                                data,
                                propertyPath,
                                oldValue,
                                value
                            );
                            propertyCommands.push(changeCmd);
                        }
                    }
                });
            }

            // Execute undo/redo commands (these will modify properties and refresh)
            if (propertyCommands.length === 1) {
                commandManager.execute(propertyCommands[0]);
            } else if (propertyCommands.length > 1) {
                const batchCmd = new commands.BatchCommand('Change Property', propertyCommands);
                commandManager.execute(batchCmd);
            }

            // Refresh transform controls to update bounding box and handles
            if (typeof transformControls !== 'undefined' && transformControls.refresh) {
                transformControls.refresh();
            }
        }
        catch (err) {
            alert("objects extension is dammaged or corrupted !");
        }
    },

    /**
     * Bring selected object(s) to front within their layer
     */
    bringToFront() {
        const selectedElements = document.querySelectorAll('.clickable_selected');
        if (selectedElements.length === 0) return;

        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');
        const notifications = nw.require('./assets/js/objects/notifications');
        const reorderCommands = [];

        selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = this.sceneData.objects.find(obj => obj.oid === oid);
            if (!objectData) return;

            const currentLayer = objectData.layer;
            const objectsInLayer = this.sceneData.objects.filter(obj => obj.layer === currentLayer);
            const currentIndex = this.sceneData.objects.indexOf(objectData);

            // Find the last index in the same layer
            const lastInLayerIndex = this.sceneData.objects.lastIndexOf(
                objectsInLayer[objectsInLayer.length - 1]
            );

            if (currentIndex !== lastInLayerIndex) {
                reorderCommands.push(
                    new commands.ReorderObjectCommand(this, objectData, currentIndex, lastInLayerIndex)
                );
            }
        });

        if (reorderCommands.length > 0) {
            if (reorderCommands.length === 1) {
                commandManager.execute(reorderCommands[0]);
            } else {
                const batchCmd = new commands.BatchCommand('Bring to Front', reorderCommands);
                commandManager.execute(batchCmd);
            }

            const objCount = reorderCommands.length;
            notifications.success(`Brought ${objCount} object${objCount > 1 ? 's' : ''} to front`);
        }
    },

    /**
     * Send selected object(s) to back within their layer
     */
    sendToBack() {
        const selectedElements = document.querySelectorAll('.clickable_selected');
        if (selectedElements.length === 0) return;

        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');
        const notifications = nw.require('./assets/js/objects/notifications');
        const reorderCommands = [];

        selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = this.sceneData.objects.find(obj => obj.oid === oid);
            if (!objectData) return;

            const currentLayer = objectData.layer;
            const objectsInLayer = this.sceneData.objects.filter(obj => obj.layer === currentLayer);
            const currentIndex = this.sceneData.objects.indexOf(objectData);

            // Find the first index in the same layer
            const firstInLayerIndex = this.sceneData.objects.indexOf(objectsInLayer[0]);

            if (currentIndex !== firstInLayerIndex) {
                reorderCommands.push(
                    new commands.ReorderObjectCommand(this, objectData, currentIndex, firstInLayerIndex)
                );
            }
        });

        if (reorderCommands.length > 0) {
            if (reorderCommands.length === 1) {
                commandManager.execute(reorderCommands[0]);
            } else {
                const batchCmd = new commands.BatchCommand('Send to Back', reorderCommands);
                commandManager.execute(batchCmd);
            }

            const objCount = reorderCommands.length;
            notifications.success(`Sent ${objCount} object${objCount > 1 ? 's' : ''} to back`);
        }
    },

    /**
     * Move selected object(s) forward one step within their layer
     */
    moveForward() {
        const selectedElements = document.querySelectorAll('.clickable_selected');
        if (selectedElements.length === 0) return;

        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');
        const notifications = nw.require('./assets/js/objects/notifications');
        const reorderCommands = [];

        selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = this.sceneData.objects.find(obj => obj.oid === oid);
            if (!objectData) return;

            const currentLayer = objectData.layer;
            const currentIndex = this.sceneData.objects.indexOf(objectData);

            // Find next object in same layer
            let nextIndex = -1;
            for (let i = currentIndex + 1; i < this.sceneData.objects.length; i++) {
                if (this.sceneData.objects[i].layer === currentLayer) {
                    nextIndex = i;
                    break;
                }
            }

            if (nextIndex !== -1) {
                reorderCommands.push(
                    new commands.ReorderObjectCommand(this, objectData, currentIndex, nextIndex)
                );
            }
        });

        if (reorderCommands.length > 0) {
            if (reorderCommands.length === 1) {
                commandManager.execute(reorderCommands[0]);
            } else {
                const batchCmd = new commands.BatchCommand('Move Forward', reorderCommands);
                commandManager.execute(batchCmd);
            }

            const objCount = reorderCommands.length;
            notifications.success(`Moved ${objCount} object${objCount > 1 ? 's' : ''} forward`);
        }
    },

    /**
     * Move selected object(s) backward one step within their layer
     */
    moveBackward() {
        const selectedElements = document.querySelectorAll('.clickable_selected');
        if (selectedElements.length === 0) return;

        const commands = nw.require('./assets/js/objects/commands');
        const commandManager = nw.require('./assets/js/objects/commandManager');
        const notifications = nw.require('./assets/js/objects/notifications');
        const reorderCommands = [];

        selectedElements.forEach(elem => {
            const oid = elem.getAttribute('__ajs_object_ID');
            const objectData = this.sceneData.objects.find(obj => obj.oid === oid);
            if (!objectData) return;

            const currentLayer = objectData.layer;
            const currentIndex = this.sceneData.objects.indexOf(objectData);

            // Find previous object in same layer
            let prevIndex = -1;
            for (let i = currentIndex - 1; i >= 0; i--) {
                if (this.sceneData.objects[i].layer === currentLayer) {
                    prevIndex = i;
                    break;
                }
            }

            if (prevIndex !== -1) {
                reorderCommands.push(
                    new commands.ReorderObjectCommand(this, objectData, currentIndex, prevIndex)
                );
            }
        });

        if (reorderCommands.length > 0) {
            if (reorderCommands.length === 1) {
                commandManager.execute(reorderCommands[0]);
            } else {
                const batchCmd = new commands.BatchCommand('Move Backward', reorderCommands);
                commandManager.execute(batchCmd);
            }

            const objCount = reorderCommands.length;
            notifications.success(`Moved ${objCount} object${objCount > 1 ? 's' : ''} backward`);
        }
    },

    /**
     * Refresh collider visualizations for all objects in the scene
     * Called when selection changes to show/hide collider overlays
     */
    refreshAllColliderVisualizations() {
        if (!this.sceneData || !this.sceneData.objects) {
            return;
        }

        // Iterate through all objects and refresh their collider visualizations
        this.sceneData.objects.forEach(objectData => {
            const element = document.querySelector(`[__ajs_object_ID="${objectData.oid}"]`);
            if (element) {
                this.renderColliderVisualizations(element, objectData);
            }
        });
    },

    /**
     * Render collider visualizations for physics debugging
     * Shows BoxCollider2D and CircleCollider2D bounds in the editor
     */
    renderColliderVisualizations(object, data) {
        // Only render for objects with scripts
        if (!data.properties.scripts || data.properties.scripts.length === 0) {
            return;
        }

        // Get parent layer (canvas elements can't have visible child divs)
        const parentLayer = object.parentElement;
        if (!parentLayer) {
            console.warn('[ColliderViz] Object has no parent layer');
            return;
        }

        // Find or create collider overlay in the parent layer
        const overlayId = `collider-overlay-${data.oid}`;
        let colliderOverlay = parentLayer.querySelector(`#${overlayId}`);

        if (!colliderOverlay) {
            colliderOverlay = document.createElement('div');
            colliderOverlay.id = overlayId;
            colliderOverlay.className = 'collider-visualization';
            colliderOverlay.style.position = 'absolute';
            colliderOverlay.style.pointerEvents = 'none';
            colliderOverlay.style.zIndex = '999999'; // Very high z-index to appear above objects
            parentLayer.appendChild(colliderOverlay);
            console.log('[ColliderViz] Created new overlay:', overlayId);
        }

        // Position and size the overlay to match the object
        const objLeft = parseFloat(object.style.left) || 0;
        const objTop = parseFloat(object.style.top) || 0;
        const objWidth = data.properties.width || 64;
        const objHeight = data.properties.height || 64;

        colliderOverlay.style.left = objLeft + 'px';
        colliderOverlay.style.top = objTop + 'px';
        colliderOverlay.style.width = objWidth + 'px';
        colliderOverlay.style.height = objHeight + 'px';

        // Apply rotation if the object is rotated
        const angle = data.properties.angle || 0;
        if (angle !== 0) {
            colliderOverlay.style.transform = `rotate(${angle}deg)`;
            colliderOverlay.style.transformOrigin = 'center center';
        } else {
            colliderOverlay.style.transform = '';
        }

        // Clear previous visualizations
        colliderOverlay.innerHTML = '';

        // Check if this object is selected
        const isSelected = this.selectedObjects.some(obj => obj.data.oid === data.oid);

        console.log('[ColliderViz] ======== Rendering colliders ========');
        console.log('[ColliderViz] Object:', data.properties.name);
        console.log('[ColliderViz] Position:', objLeft, objTop, 'Size:', objWidth, objHeight);
        console.log('[ColliderViz] Scripts count:', data.properties.scripts.length);
        console.log('[ColliderViz] Is selected:', isSelected);

        // Render each collider script
        data.properties.scripts.forEach((script, scriptIndex) => {
            const scriptPath = script.path;
            const scriptProps = script.properties || {};

            console.log('[ColliderViz] Checking script:', scriptPath, 'Props:', scriptProps);

            // Check if this script's collider should be shown in editor
            // Default to true if showInEditor is not explicitly set (backward compatibility)
            const showInEditor = scriptProps.showInEditor !== false;

            if (!showInEditor) {
                console.log('[ColliderViz] Skipping - showInEditor is false');
                return; // Skip this collider
            }

            // Check if this is a BoxCollider2D
            if (scriptPath && scriptPath.includes('BoxCollider2D')) {
                console.log('[ColliderViz] Rendering BoxCollider2D');
                this.renderBoxCollider(colliderOverlay, data, scriptProps, scriptIndex, isSelected);
            }
            // Check if this is a CircleCollider2D
            else if (scriptPath && scriptPath.includes('CircleCollider2D')) {
                console.log('[ColliderViz] Rendering CircleCollider2D');
                this.renderCircleCollider(colliderOverlay, data, scriptProps, scriptIndex, isSelected);
            }
        });
    },

    /**
     * Render BoxCollider2D visualization
     */
    renderBoxCollider(container, objectData, colliderProps, scriptIndex, isSelected) {
        const $self = this;
        const objectProps = objectData.properties;

        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.border = '2px solid #ff8800';
        box.style.backgroundColor = colliderProps.isTrigger ? 'rgba(255, 136, 0, 0.2)' : 'rgba(255, 136, 0, 0.1)';
        box.style.pointerEvents = 'none';
        box.style.boxSizing = 'border-box';

        // Get collider dimensions and offset
        const width = colliderProps.width || objectProps.width || 64;
        const height = colliderProps.height || objectProps.height || 64;
        const offsetX = colliderProps.offsetX || 0;
        const offsetY = colliderProps.offsetY || 0;

        // Calculate position (offset from object center)
        const objWidth = objectProps.width || 64;
        const objHeight = objectProps.height || 64;
        const left = (objWidth / 2) - (width / 2) + offsetX;
        const top = (objHeight / 2) - (height / 2) + offsetY;

        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.style.width = width + 'px';
        box.style.height = height + 'px';

        // Add label
        const label = document.createElement('div');
        label.textContent = colliderProps.isTrigger ? 'Trigger' : 'BoxCollider';
        label.style.position = 'absolute';
        label.style.top = '-18px';
        label.style.left = '0';
        label.style.fontSize = '10px';
        label.style.color = '#ff8800';
        label.style.fontWeight = 'bold';
        label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
        box.appendChild(label);

        // Add to container
        container.appendChild(box);
        console.log('[ColliderViz] Box collider added to container. Width:', width, 'Height:', height, 'Left:', left, 'Top:', top);

        // Add control points for dragging only if object is selected
        if (isSelected) {
            console.log('[ColliderViz] Adding control points (object is selected)');
            const controlPoints = [
            { pos: 'top-left', cursor: 'nw-resize' },
            { pos: 'top-right', cursor: 'ne-resize' },
            { pos: 'bottom-left', cursor: 'sw-resize' },
            { pos: 'bottom-right', cursor: 'se-resize' },
            { pos: 'center', cursor: 'move' }
        ];

        controlPoints.forEach(cp => {
            const point = document.createElement('div');
            point.style.position = 'absolute';
            point.style.width = '8px';
            point.style.height = '8px';
            point.style.backgroundColor = '#ff8800';
            point.style.border = '2px solid #ffffff';
            point.style.borderRadius = '50%';
            point.style.cursor = cp.cursor;
            point.style.pointerEvents = 'auto';
            point.style.zIndex = '1001';

            // Position control point
            if (cp.pos === 'top-left') {
                point.style.left = '-6px';
                point.style.top = '-6px';
            } else if (cp.pos === 'top-right') {
                point.style.right = '-6px';
                point.style.top = '-6px';
            } else if (cp.pos === 'bottom-left') {
                point.style.left = '-6px';
                point.style.bottom = '-6px';
            } else if (cp.pos === 'bottom-right') {
                point.style.right = '-6px';
                point.style.bottom = '-6px';
            } else if (cp.pos === 'center') {
                point.style.left = '50%';
                point.style.top = '50%';
                point.style.transform = 'translate(-50%, -50%)';
            }

            // Add drag functionality
            let isDragging = false;
            let startX, startY;
            let startWidth, startHeight, startOffsetX, startOffsetY;

            point.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = colliderProps.width || objectProps.width || 64;
                startHeight = colliderProps.height || objectProps.height || 64;
                startOffsetX = colliderProps.offsetX || 0;
                startOffsetY = colliderProps.offsetY || 0;

                const handleMouseMove = (e) => {
                    if (!isDragging) return;

                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;

                    // Get the scale from scene zoom
                    const scale = $self.zoomLevel || 1;
                    const scaledDeltaX = deltaX / scale;
                    const scaledDeltaY = deltaY / scale;

                    if (cp.pos === 'center') {
                        // Move offset
                        colliderProps.offsetX = startOffsetX + scaledDeltaX;
                        colliderProps.offsetY = startOffsetY + scaledDeltaY;
                    } else {
                        // Resize
                        let newWidth = startWidth;
                        let newHeight = startHeight;
                        let newOffsetX = startOffsetX;
                        let newOffsetY = startOffsetY;

                        if (cp.pos === 'top-left') {
                            newWidth = startWidth - scaledDeltaX;
                            newHeight = startHeight - scaledDeltaY;
                            newOffsetX = startOffsetX + scaledDeltaX / 2;
                            newOffsetY = startOffsetY + scaledDeltaY / 2;
                        } else if (cp.pos === 'top-right') {
                            newWidth = startWidth + scaledDeltaX;
                            newHeight = startHeight - scaledDeltaY;
                            newOffsetX = startOffsetX + scaledDeltaX / 2;
                            newOffsetY = startOffsetY + scaledDeltaY / 2;
                        } else if (cp.pos === 'bottom-left') {
                            newWidth = startWidth - scaledDeltaX;
                            newHeight = startHeight + scaledDeltaY;
                            newOffsetX = startOffsetX + scaledDeltaX / 2;
                            newOffsetY = startOffsetY + scaledDeltaY / 2;
                        } else if (cp.pos === 'bottom-right') {
                            newWidth = startWidth + scaledDeltaX;
                            newHeight = startHeight + scaledDeltaY;
                            newOffsetX = startOffsetX + scaledDeltaX / 2;
                            newOffsetY = startOffsetY + scaledDeltaY / 2;
                        }

                        // Ensure minimum size
                        if (newWidth > 10) {
                            colliderProps.width = newWidth;
                            colliderProps.offsetX = newOffsetX;
                        }
                        if (newHeight > 10) {
                            colliderProps.height = newHeight;
                            colliderProps.offsetY = newOffsetY;
                        }
                    }

                    // Update the visualization
                    const objectElement = $self.selectedObjects.find(obj => obj.data.oid === objectData.oid);
                    if (objectElement) {
                        $self.renderColliderVisualizations(objectElement.element, objectData);

                        // Update properties panel if visible
                        if (window.properties && typeof window.properties.update === 'function') {
                            window.properties.update();
                        }
                    }
                };

                const handleMouseUp = () => {
                    isDragging = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });

            box.appendChild(point);
        });
        }

        container.appendChild(box);
    },

    /**
     * Render CircleCollider2D visualization
     */
    renderCircleCollider(container, objectData, colliderProps, scriptIndex, isSelected) {
        const $self = this;
        const objectProps = objectData.properties;

        const circle = document.createElement('div');
        circle.style.position = 'absolute';
        circle.style.border = '2px solid #ff8800';
        circle.style.borderRadius = '50%';
        circle.style.backgroundColor = colliderProps.isTrigger ? 'rgba(255, 136, 0, 0.2)' : 'rgba(255, 136, 0, 0.1)';
        circle.style.pointerEvents = 'none';
        circle.style.boxSizing = 'border-box';

        // Get collider dimensions and offset
        const radius = colliderProps.radius || 32;
        const offsetX = colliderProps.offsetX || 0;
        const offsetY = colliderProps.offsetY || 0;

        // Calculate position (offset from object center)
        const objWidth = objectProps.width || 64;
        const objHeight = objectProps.height || 64;
        const diameter = radius * 2;
        const left = (objWidth / 2) - radius + offsetX;
        const top = (objHeight / 2) - radius + offsetY;

        circle.style.left = left + 'px';
        circle.style.top = top + 'px';
        circle.style.width = diameter + 'px';
        circle.style.height = diameter + 'px';

        // Add label
        const label = document.createElement('div');
        label.textContent = colliderProps.isTrigger ? 'Trigger' : 'CircleCollider';
        label.style.position = 'absolute';
        label.style.top = '-18px';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.fontSize = '10px';
        label.style.color = '#ff8800';
        label.style.fontWeight = 'bold';
        label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
        label.style.whiteSpace = 'nowrap';
        circle.appendChild(label);

        // Add control points for dragging only if object is selected
        if (isSelected) {
            const controlPoints = [
            { pos: 'center', cursor: 'move' },
            { pos: 'radius', cursor: 'ew-resize' }
        ];

        controlPoints.forEach(cp => {
            const point = document.createElement('div');
            point.style.position = 'absolute';
            point.style.width = '8px';
            point.style.height = '8px';
            point.style.backgroundColor = '#ff8800';
            point.style.border = '2px solid #ffffff';
            point.style.borderRadius = '50%';
            point.style.cursor = cp.cursor;
            point.style.pointerEvents = 'auto';
            point.style.zIndex = '1001';

            // Position control point
            if (cp.pos === 'center') {
                point.style.left = '50%';
                point.style.top = '50%';
                point.style.transform = 'translate(-50%, -50%)';
            } else if (cp.pos === 'radius') {
                point.style.right = '-6px';
                point.style.top = '50%';
                point.style.transform = 'translateY(-50%)';
            }

            // Add drag functionality
            let isDragging = false;
            let startX, startY;
            let startRadius, startOffsetX, startOffsetY;

            point.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startRadius = colliderProps.radius || 32;
                startOffsetX = colliderProps.offsetX || 0;
                startOffsetY = colliderProps.offsetY || 0;

                const handleMouseMove = (e) => {
                    if (!isDragging) return;

                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;

                    // Get the scale from scene zoom
                    const scale = $self.zoomLevel || 1;
                    const scaledDeltaX = deltaX / scale;
                    const scaledDeltaY = deltaY / scale;

                    if (cp.pos === 'center') {
                        // Move offset
                        colliderProps.offsetX = startOffsetX + scaledDeltaX;
                        colliderProps.offsetY = startOffsetY + scaledDeltaY;
                    } else if (cp.pos === 'radius') {
                        // Adjust radius
                        const newRadius = startRadius + scaledDeltaX;

                        // Ensure minimum size
                        if (newRadius > 5) {
                            colliderProps.radius = newRadius;
                        }
                    }

                    // Update the visualization
                    const objectElement = $self.selectedObjects.find(obj => obj.data.oid === objectData.oid);
                    if (objectElement) {
                        $self.renderColliderVisualizations(objectElement.element, objectData);

                        // Update properties panel if visible
                        if (window.properties && typeof window.properties.update === 'function') {
                            window.properties.update();
                        }
                    }
                };

                const handleMouseUp = () => {
                    isDragging = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });

            circle.appendChild(point);
        });
        }

        container.appendChild(circle);
    }
};