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

    cache: {
        sceneFilePath: "",
        sceneFilename: "",
    },

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
            console.log('[SCENE] Scene marked as modified');
            this.hasUnsavedChanges = true;
        }
    },

    openScene(path, filename, data) {
        //
        if (path == this.cache.sceneFilePath) {
            // Même fichier déjà ouvert, mais on recharge la grille quand même pour éviter qu'elle ne s'affiche pas
            console.log('[SCENE EDITOR] Same scene already open, reloading grid...');
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
        //
        try {
            this.sceneData = JSON.parse(data);
            // Reset unsaved changes flag when opening a scene
            this.hasUnsavedChanges = false;
            console.log('Scene loaded:', filename, '- Objects:', this.sceneData.objects.length);
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
        console.log('=== SAVE SCENE START ===');
        console.log('sceneFilePath:', this.cache.sceneFilePath);
        console.log('sceneData exists:', !!this.sceneData);

        if (!this.cache.sceneFilePath || !this.sceneData) {
            console.warn('[SAVE] No scene to save - missing path or data');
            return false;
        }

        try {
            console.log('[SAVE] Scene has', this.sceneData.objects?.length || 0, 'objects');

            // Log sample of object data to verify it's current
            if (this.sceneData.objects && this.sceneData.objects.length > 0) {
                console.log('[SAVE] Sample object data:', {
                    name: this.sceneData.objects[0].properties?.name,
                    x: this.sceneData.objects[0].properties?.x,
                    y: this.sceneData.objects[0].properties?.y,
                    layer: this.sceneData.objects[0].layer
                });
            }

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
            console.log('[SAVE] Stringifying sceneData...');
            const data = JSON.stringify(this.sceneData, null, 4);
            console.log('[SAVE] Data size:', data.length, 'characters');

            console.log('[SAVE] Writing to file:', this.cache.sceneFilePath);
            fs.writeFileSync(this.cache.sceneFilePath, data, 'utf8');

            console.log('[SAVE] ✓ Scene saved successfully:', this.cache.sceneFilePath);

            // Mark as saved (no unsaved changes)
            this.hasUnsavedChanges = false;
            console.log('[SAVE] Scene marked as saved (no unsaved changes)');

            // Also save project data (contains app dimensions)
            if (application && application.saveProject) {
                console.log('[SAVE] Saving project data...');
                application.saveProject();
            }

            console.log('=== SAVE SCENE END (SUCCESS) ===');
            return true;
        }
        catch (err) {
            console.error('[SAVE] ✗ Failed to save scene:', err);
            console.error('[SAVE] Error stack:', err.stack);
            alert('Failed to save scene: ' + err.message);
            console.log('=== SAVE SCENE END (FAILED) ===');
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
        console.log('=== refreshSceneUI called ===');
        console.log('sceneEditor.sceneData exists?', !!this.sceneData);
        if (this.sceneData) {
            console.log('sceneData.objects exists?', !!this.sceneData.objects);
            console.log('sceneData.objects length:', this.sceneData.objects ? this.sceneData.objects.length : 'N/A');
        }

        // Refresh hierarchy using hierarchy module
        if (hierarchy) {
            console.log('Calling hierarchy.refresh()');
            hierarchy.refresh();
        } else {
            console.warn('hierarchy module not available');
        }

        // Refresh layer manager
        if (layerManager && layerManager.container) {
            console.log('Calling layerManager.refresh()');
            layerManager.refresh();
        } else {
            console.warn('layerManager not available');
        }

        // Update Add Object button state
        if (typeof window !== 'undefined' && typeof window.updateAddObjectButton === 'function') {
            window.updateAddObjectButton();
        } else {
            console.warn('updateAddObjectButton function not available');
        }
    },

    refreshEditor() {
        let sceneEditor = document.querySelector("#sceneEditor");
        sceneEditor.style.width = sceneEditor.parentElement.clientWidth + "px";
        sceneEditor.style.height = sceneEditor.parentElement.clientHeight - 32 + "px";
        //
        let scnEditor = document.querySelector("#scnEditor");
        scnEditor.style.width = sceneEditor.clientWidth + "px";
        scnEditor.style.height = sceneEditor.clientHeight - 32 + "px";
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
                console.log('Creating DOM layers for:', sortedLayers);

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
                            console.log('[SCENE EDITOR] Recreating and showing grid after scene load');
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
                            console.log('[SCENE EDITOR] Initializing zoom after scene load');
                            zoom.init(document.getElementById('scnEditor'));
                            zoom.setZoom(100); // Reset to 100%
                        }

                        // Initialize rectangle selection for multi-select
                        const scnEditor = document.getElementById('scnEditor');
                        if (rectangleSelection && scnEditor) {
                            console.log('[SCENE EDITOR] Initializing rectangle selection');
                            rectangleSelection.init(scnEditor);
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
                        // Use Function constructor instead of eval - slightly safer
                        // Wrap the code to ensure it returns the script object
                        // The original code ends with "script;" which is an expression, not a return
                        const func = new Function('sceneEditor', 'application', 'globals', `
                            'use strict';
                            ${code}
                            return script;
                        `);
                        return func(this, application, globals);
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
        console.log('[SCENE EDITOR] Creating object:', data.oid, data.properties.name);

        // Load extension if not already loaded
        this.requireOnceExtension(data.extension);

        // Call the extension's create function to add object to DOM
        __editorExtensions[data.extension].create(data);

        console.log('[SCENE EDITOR] Object created in DOM, now refreshing...');

        // Refresh the object to apply all properties (position, size, etc.)
        const object = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${data.oid}"]`);
        if (object) {
            // Clear canvas if it's a canvas element
            if (object.tagName === "CANVAS") {
                const ctx = object.getContext('2d');
                ctx.clearRect(0, 0, object.width, object.height);
            }

            // Update object with its data to apply all properties
            __editorExtensions[data.extension].update(object, data);

            // Apply locked state if object is locked
            if (data.locked) {
                object.classList.add('locked-object');
            } else {
                object.classList.remove('locked-object');
            }

            console.log('[SCENE EDITOR] ✓ Object refreshed with properties at position:', data.properties.x, data.properties.y);
        } else {
            console.warn('[SCENE EDITOR] Could not find created object in DOM:', data.oid);
        }
    },

    refreshSceneObjects(oData) {
        oData.forEach((data, index) => {
            //get corresponding object
            let object = document.querySelector(".__ajs_scene_object[__ajs_object_ID='" + data.oid + "']");
            //call the extension object create function
            if (object.tagName == "CANVAS") {
                const ctx = object.getContext('2d');
                // Clear the entire canvas
                ctx.clearRect(0, 0, object.width, object.height);
            }
            __editorExtensions[data.extension].update(object, data);

            // Apply locked state if object is locked
            if (object && data.locked) {
                object.classList.add('locked-object');
            } else if (object) {
                object.classList.remove('locked-object');
            }
        });

        // Refresh thumbnails in hierarchy after objects are updated
        console.log('refreshSceneObjects: refreshing hierarchy and layer previews...');

        const hierarchyModule = window.hierarchy || hierarchy;
        if (hierarchyModule && hierarchyModule.refreshThumbnails) {
            console.log('Calling hierarchy.refreshThumbnails with', oData.length, 'objects');
            hierarchyModule.refreshThumbnails(oData);
        } else {
            console.warn('Hierarchy module or refreshThumbnails method not found');
        }

        // Refresh layer previews in real-time
        const layerManagerModule = window.layerManager || layerManager;
        if (layerManagerModule && layerManagerModule.refreshLayerPreviews) {
            console.log('Calling layerManager.refreshLayerPreviews with', oData.length, 'objects');
            layerManagerModule.refreshLayerPreviews(oData);
        } else {
            console.warn('LayerManager module or refreshLayerPreviews method not found');
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
            console.log('Cannot select locked object:', objectData.properties.name);
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
        const propertiesModule = window.properties || properties;
        if (propertiesModule) {
            propertiesModule.openObjectProperties(objectData, extensionData);
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

        console.log('Object selected:', objectData.properties.name);
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
    },

    /**
     * Select all objects in the scene (excluding locked objects)
     */
    selectAllObjects() {
        if (!this.sceneData || !this.sceneData.objects) {
            console.warn('No scene data available');
            return;
        }

        // Deselect all first
        this.deselectAllObjects();

        // Select all non-locked objects
        let selectedCount = 0;
        this.sceneData.objects.forEach(obj => {
            if (!obj.locked) {
                const elem = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${obj.oid}"]`);
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

        console.log(`Selected ${selectedCount} objects`);
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
            const objectElement = document.querySelector(`.__ajs_scene_object[__ajs_object_ID="${objectData.oid}"]`);
            if (objectElement) {
                objectElement.remove();
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

            console.log('Object deleted:', objectName, '(OID:', objectData.oid + ')');
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
        }
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

    ////////////////////////////
    //
    //internal object functions
    //
    ////////////////////////////
    setObjectProperty(objectData, propertyName, value) {
        console.log('setObjectProperty called:', propertyName, '=', value);
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
    }
};