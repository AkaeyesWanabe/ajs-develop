const fs = nw.require('fs');
const path = nw.require('path');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');

// Runtime System
const runtimeManager = nw.require('./assets/js/objects/runtimeManager');
const GameObject = nw.require('./assets/js/objects/GameObject');
const RuntimeAPI = nw.require('./assets/js/runtime/RuntimeAPI');
const AssetManager = nw.require('./assets/js/runtime/AssetManager');
const ScriptManager = nw.require('./assets/js/runtime/ScriptManager');

// Physics System
const physicsManager = nw.require('./scripts/physics/PhysicsManager');

module.exports = {
    isPlaying: false,
    isPaused: false,
    canvas: null,
    ctx: null,
    sceneData: null,
    gameObjects: [],

    // Runtime System
    runtimeManager: runtimeManager,
    runtimeAPI: null,
    assetManager: null,
    scriptManager: null,
    systemExtensions: null, // Map of system extension instances

    // Animation frame ID for stopping
    animationId: null,

    /**
     * Initialize the player
     */
    init() {
        this.canvas = document.getElementById('playerCanvas');
        if (!this.canvas) {
            console.error('Player canvas not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        // Initialize Runtime System
        this.runtimeManager.init();

        // Create RuntimeAPI (now takes runtimeManager as parameter)
        this.runtimeAPI = new RuntimeAPI(this, this.runtimeManager);

        // Initialize system extensions (time, input, camera, sound, etc.)
        this.systemExtensions = this.runtimeManager.initializeSystemExtensions(this.runtimeAPI);

        // Initialize mouse extension with canvas reference
        const mouseExt = this.runtimeManager.getSystemInstance('com.ajs.input.mouse');
        if (mouseExt && mouseExt.runtime.initWithCanvas) {
            mouseExt.runtime.initWithCanvas(mouseExt, this.canvas);
        }

        // Initialize camera extension with canvas dimensions and position
        const cameraExt = this.runtimeManager.getSystemInstance('com.ajs.camera');
        if (cameraExt && cameraExt.internal.camera) {
            cameraExt.internal.camera.width = this.canvas.width;
            cameraExt.internal.camera.height = this.canvas.height;

            // Initialize camera position to show top-left of scene at top-left of viewport
            cameraExt.internal.camera.x = this.canvas.width / 2;
            cameraExt.internal.camera.y = this.canvas.height / 2;
        }

        // Initialize Asset Manager
        this.assetManager = new AssetManager();

        // Initialize Script Manager
        this.scriptManager = new ScriptManager(this.runtimeManager);
        this.scriptManager.runtimeAPI = this.runtimeAPI;
        this.scriptManager.sceneData = null; // Will be set when scene is loaded

        // Initialize Physics Manager
        physicsManager.init();
        window.physicsManager = physicsManager; // Make globally accessible
    },

    /**
     * Load a scene into the player
     * @param {Object} sceneData - Scene data object
     */
    async loadScene(sceneData) {
        try {
            this.sceneData = sceneData;

            // Setup canvas dimensions
            if (application.projectData && application.projectData.properties) {
                const width = application.projectData.properties.width || 640;
                const height = application.projectData.properties.height || 480;
                this.canvas.width = width;
                this.canvas.height = height;
            } else {
                this.canvas.width = sceneData.properties.width || 640;
                this.canvas.height = sceneData.properties.height || 480;
            }

            // Update camera dimensions and position
            const cameraExt = this.runtimeManager.getSystemInstance('com.ajs.camera');
            if (cameraExt && cameraExt.internal.camera) {
                cameraExt.internal.camera.width = this.canvas.width;
                cameraExt.internal.camera.height = this.canvas.height;

                // Initialize camera position to show top-left of scene at top-left of viewport
                // This ensures objects positioned at (0,0) in the scene appear at (0,0) on screen
                cameraExt.internal.camera.x = this.canvas.width / 2;
                cameraExt.internal.camera.y = this.canvas.height / 2;
            }

            // Hide no scene message
            const noSceneMsg = document.getElementById('noScenePlayer');
            if (noSceneMsg) {
                noSceneMsg.style.display = 'none';
            }

            // Preload assets before creating game objects
            await this.assetManager.preloadSceneAssets(sceneData, (loaded, total) => {
                // TODO: Update loading UI
            });

            // Create game objects from scene
            this.createGameObjects();

            // Set sceneData in scriptManager
            if (this.scriptManager) {
                this.scriptManager.sceneData = this.sceneData;
            }
        } catch (err) {
            console.error('[Player] Failed to load scene:', err);
            alert('Failed to load scene: ' + err.message);
        }
    },

    /**
     * Create game objects from scene data
     */
    createGameObjects() {
        this.gameObjects = [];

        if (!this.sceneData || !this.sceneData.objects) {
            console.warn('[Player] No objects in scene data');
            return;
        }

        // Create GameObject instances for all objects
        this.sceneData.objects.forEach((objData) => {
            try {
                // Get runtime for this extension
                const extensionRuntime = this.runtimeManager.getRuntimeForExtension(objData.extension);

                if (!extensionRuntime) {
                    console.warn(`[Player] No runtime found for extension: ${objData.extension}`);
                }

                // Create GameObject instance
                const gameObj = new GameObject(objData, extensionRuntime, this.runtimeAPI);

                this.gameObjects.push(gameObj);
            } catch (err) {
                console.error('[Player] Failed to create game object:', err);
            }
        });

        // Call onCreate for all objects
        this.gameObjects.forEach(obj => {
            try {
                obj.onCreate();
            } catch (err) {
                console.error(`[Player] Error in onCreate for ${obj.name}:`, err);
            }
        });

        // Initialize scripts for all objects
        if (this.scriptManager) {
            this.gameObjects.forEach(obj => {
                try {
                    this.scriptManager.initializeScriptsForGameObject(obj);
                } catch (err) {
                    console.error(`[Player] Error initializing scripts for ${obj.name}:`, err);
                }
            });
        }

        this.updateObjectCounter();
    },

    /**
     * Start playing the game (or resume from pause)
     */
    play() {
        if (!this.sceneData) {
            alert('No scene loaded. Please open a scene first.');
            return;
        }

        // If already playing (not paused), do nothing
        if (this.isPlaying && !this.isPaused) {
            return;
        }

        // Resume from pause
        if (this.isPlaying && this.isPaused) {
            this.isPaused = false;

            // Update UI
            document.getElementById('playBtn').style.display = 'none';
            document.getElementById('pauseBtn').style.display = 'flex';

            // Resume time system
            const timeExt = this.runtimeManager.getSystemInstance('com.ajs.time');
            if (timeExt && timeExt.internal.time) {
                timeExt.internal.time.lastFrameTime = performance.now();
            }

            // Resume game loop
            this.gameLoop();
            return;
        }

        // Start fresh
        this.isPlaying = true;
        this.isPaused = false;

        // Reset time system
        const timeExt = this.runtimeManager.getSystemInstance('com.ajs.time');
        if (timeExt && timeExt.internal.time) {
            timeExt.internal.time.lastFrameTime = performance.now();
            timeExt.internal.time.realTotalTime = 0;
            timeExt.internal.time.scaledTotalTime = 0;
            timeExt.internal.time.frameCount = 0;
            timeExt.internal.time.fpsFrameCount = 0;
            timeExt.internal.time.fpsUpdateTime = 0;
        }

        // Update UI
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'flex';

        // Start game loop
        this.gameLoop();
    },

    /**
     * Start playing from the main scene (project entry point)
     */
    async playFromMainScene() {
        // Get main scene from application settings
        const appExt = this.runtimeManager.getSystemInstance('com.ajs.application');
        if (!appExt) {
            alert('Application system not initialized');
            return;
        }

        const mainScenePath = appExt.runtime.getMainScene(appExt);

        if (!mainScenePath || mainScenePath.trim() === '') {
            alert('Aucune scène principale définie.\n\nVeuillez définir une scène principale dans:\nProject → Paramètres → Runtime → Scène Principale');
            return;
        }

        // Get project path
        if (!application.currentProjectPath) {
            alert('No project loaded');
            return;
        }

        // Build full path to main scene
        const fs = nw.require('fs');
        const path = nw.require('path');
        const mainSceneFullPath = path.join(application.currentProjectPath, mainScenePath);

        // Check if main scene exists
        if (!fs.existsSync(mainSceneFullPath)) {
            alert(`Scène principale introuvable:\n${mainScenePath}\n\nVérifiez le chemin dans les paramètres du projet.`);
            return;
        }

        // Load and parse main scene
        try {
            const sceneContent = fs.readFileSync(mainSceneFullPath, 'utf8');
            const mainSceneData = JSON.parse(sceneContent);

            // Set play mode to 'application'
            appExt.runtime.setPlayMode(appExt, 'application');

            // Load the main scene
            await this.loadScene(mainSceneData);

            // Start playing
            this.play();

        } catch (err) {
            console.error('[Player] Failed to load main scene:', err);
            alert('Erreur lors du chargement de la scène principale:\n' + err.message);
        }
    },

    /**
     * Pause the game
     */
    pause() {
        if (!this.isPlaying || this.isPaused) {
            return;
        }

        this.isPaused = true;

        // Update UI
        document.getElementById('playBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';

        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },

    /**
     * Stop the game
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;

        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Update UI
        document.getElementById('playBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';

        // Destroy all scripts first
        if (this.scriptManager) {
            this.gameObjects.forEach(obj => {
                if (!obj.isDestroyed) {
                    this.scriptManager.destroyScriptsForGameObject(obj);
                }
            });
        }

        // Destroy all game objects
        this.gameObjects.forEach(obj => {
            if (!obj.isDestroyed) {
                obj.onDestroy();
            }
        });

        // Clear physics system
        if (physicsManager) {
            physicsManager.clear();
        }

        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Reset game objects (scripts will be reinitialized in createGameObjects)
        this.createGameObjects();
    },

    /**
     * Restart the game
     */
    restart() {
        this.stop();
        setTimeout(() => {
            this.play();
        }, 100);
    },

    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isPlaying || this.isPaused) {
            return;
        }

        // Update time system FIRST (calculates deltaTime)
        const timeExt = this.runtimeManager.getSystemInstance('com.ajs.time');
        if (timeExt) {
            timeExt.onUpdate(0); // deltaTime will be calculated internally
        }

        // Get the calculated deltaTime from time system
        const deltaTime = timeExt ? timeExt.runtime.getDeltaTime(timeExt) : 16.67;

        // Update debug info display with real-time values
        if (timeExt) {
            this.updateDebugInfo();
        }

        // Update all system extensions (except time, already done)
        this.systemExtensions.forEach((ext, extId) => {
            if (extId !== 'com.ajs.time' && ext.runtime.onUpdate) {
                try {
                    ext.onUpdate(deltaTime);
                } catch (err) {
                    console.error(`[Player] Error in system extension ${extId} onUpdate:`, err);
                }
            }
        });

        // Update input extensions - reset frame-specific states
        const keyboardExt = this.runtimeManager.getSystemInstance('com.ajs.input.keyboard');
        if (keyboardExt && keyboardExt.runtime.resetFrameInputs) {
            keyboardExt.runtime.resetFrameInputs(keyboardExt);
        }

        const mouseExt = this.runtimeManager.getSystemInstance('com.ajs.input.mouse');
        if (mouseExt && mouseExt.runtime.resetFrameInputs) {
            mouseExt.runtime.resetFrameInputs(mouseExt);
        }

        // Update game
        this.update(deltaTime);

        // Render game
        this.render();

        // Continue loop
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    },

    /**
     * Update game logic
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime) {
        // Update all game objects
        this.gameObjects.forEach((gameObj) => {
            if (!gameObj.isDestroyed && gameObj.isActive) {
                gameObj.onUpdate(deltaTime);
            }
        });

        // Update all scripts
        if (this.scriptManager) {
            this.scriptManager.updateAllScripts(deltaTime);
        }

        // Update physics system (collision detection)
        if (physicsManager) {
            physicsManager.update(deltaTime);
        }

        // Remove destroyed objects
        this.gameObjects = this.gameObjects.filter(obj => !obj.isDestroyed);
    },

    /**
     * Render the game
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background color
        if (this.sceneData && this.sceneData.properties.backgroundColor) {
            this.ctx.fillStyle = this.sceneData.properties.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Get camera extension
        const cameraExt = this.runtimeManager.getSystemInstance('com.ajs.camera');

        // Apply camera transform if available
        if (cameraExt && cameraExt.runtime.apply) {
            cameraExt.runtime.apply(cameraExt, this.ctx);
        }

        // Render with layer system
        this.renderByLayers();

        // Restore camera transform
        if (cameraExt && cameraExt.runtime.restore) {
            cameraExt.runtime.restore(cameraExt, this.ctx);
        }
    },

    /**
     * Render objects grouped by layers with proper z-ordering
     */
    renderByLayers() {
        // Group objects by layer
        const objectsByLayer = new Map();

        this.gameObjects.forEach(obj => {
            if (obj.isDestroyed) return;

            const layerId = obj.data.layer || 'default';
            if (!objectsByLayer.has(layerId)) {
                objectsByLayer.set(layerId, []);
            }
            objectsByLayer.get(layerId).push(obj);
        });

        // Get layers from scene data, sorted by z-index
        const layers = this.sceneData?.layers || [];
        const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        // If no layers defined, render all objects in default layer
        if (sortedLayers.length === 0) {
            const defaultObjects = objectsByLayer.get('default') || this.gameObjects;
            this.renderLayerObjects(defaultObjects, { visible: true, opacity: 1 });
            return;
        }

        // Render each layer in order
        sortedLayers.forEach((layer, layerIndex) => {
            // Skip invisible layers
            if (layer.visible === false) return;

            // Objects store layer as index (0, 1, 2...), not layer.id
            const layerObjects = objectsByLayer.get(layerIndex) || [];

            // Sort objects within layer by their individual z-index
            layerObjects.sort((a, b) => {
                const zA = a.properties.zIndex || 0;
                const zB = b.properties.zIndex || 0;
                return zA - zB;
            });

            // Render layer with opacity
            this.renderLayerObjects(layerObjects, layer);
        });

        // Render objects without a specific layer (default layer)
        const defaultObjects = objectsByLayer.get('default') || [];
        if (defaultObjects.length > 0) {
            this.renderLayerObjects(defaultObjects, { visible: true, opacity: 1 });
        }
    },

    /**
     * Render objects in a layer with layer properties applied
     * @param {Array} objects - Objects to render
     * @param {Object} layer - Layer properties
     */
    renderLayerObjects(objects, layer) {
        if (!layer.visible && layer.visible !== undefined) return;

        this.ctx.save();

        // Apply layer opacity
        const layerOpacity = layer.opacity !== undefined ? layer.opacity : 1;
        this.ctx.globalAlpha = layerOpacity;

        // Render each object
        objects.forEach(obj => {
            if (!obj.isDestroyed) {
                obj.onRender(this.ctx);
            }
        });

        this.ctx.restore();
    },

    /**
     * Render a single game object (legacy method - objects now use runtime.onRender)
     * @param {Object} gameObj - Game object to render
     */
    renderObject(gameObj) {
        const props = gameObj.properties;

        // Skip if not visible
        if (props.visible === false || props.visible === "false") {
            return;
        }

        this.ctx.save();

        // Apply transformations
        const x = parseFloat(props.x) || 0;
        const y = parseFloat(props.y) || 0;
        const width = parseFloat(props.width) || 100;
        const height = parseFloat(props.height) || 100;
        const angle = parseFloat(props.angle) || 0;

        // Translate to object position
        this.ctx.translate(x + width / 2, y + height / 2);

        // Apply rotation
        if (angle !== 0) {
            this.ctx.rotate((angle * Math.PI) / 180);
        }

        // Draw based on extension type
        if (gameObj.extension === 'com.ajs.image') {
            this.renderImage(gameObj, -width / 2, -height / 2, width, height);
        } else if (gameObj.extension === 'com.ajs.text') {
            this.renderText(gameObj, -width / 2, -height / 2, width, height);
        } else {
            // Default: draw placeholder rectangle
            this.ctx.strokeStyle = '#fff';
            this.ctx.strokeRect(-width / 2, -height / 2, width, height);
        }

        this.ctx.restore();
    },

    /**
     * Render an image object (legacy method)
     */
    renderImage(gameObj, x, y, width, height) {
        const imagePath = gameObj.properties.imagePath;
        if (!imagePath) {
            // Draw "no image" placeholder
            this.ctx.fillStyle = 'gray';
            this.ctx.fillRect(x, y, width, height);
            this.ctx.strokeStyle = 'black';
            this.ctx.strokeRect(x, y, width, height);
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + width, y + height);
            this.ctx.moveTo(x + width, y);
            this.ctx.lineTo(x, y + height);
            this.ctx.stroke();
            return;
        }

        // Load and draw image
        const fullPath = application.getFilePathFromResources(imagePath);
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, x, y, width, height);
        };
        img.onerror = () => {
            // Draw error placeholder
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(x, y, width, height);
        };
        img.src = fullPath;
    },

    /**
     * Render a text object (legacy method)
     */
    renderText(gameObj, x, y, width, height) {
        const text = gameObj.properties.text || '';
        const fontSize = gameObj.properties.fontSize || 16;
        const fontFamily = gameObj.properties.fontFamily || 'Arial';
        const color = gameObj.properties.color || '#000';
        const textAlign = gameObj.properties.textAlign || 'left';

        this.ctx.fillStyle = color;
        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.textAlign = textAlign;
        this.ctx.fillText(text, x, y + fontSize);
    },

    /**
     * Toggle debug overlay
     */
    toggleDebug() {
        const overlay = document.getElementById('debugOverlay');
        if (overlay) {
            overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
        }
    },

    /**
     * Update FPS counter display
     * @param {number} fps - FPS value from time system
     */
    updateFpsCounter(fps) {
        const fpsElem = document.getElementById('fpsCounter');
        if (fpsElem) {
            fpsElem.textContent = `FPS: ${fps}`;
        }
    },

    /**
     * Update debug overlay with real-time values
     */
    updateDebugInfo() {
        const timeExt = this.runtimeManager.getSystemInstance('com.ajs.time');
        if (!timeExt || !timeExt.internal.time) return;

        // Get target FPS from project settings
        const targetFPS = application.projectData?.properties?.targetFPS || 60;
        const actualFPS = timeExt.runtime.getFPS(timeExt);
        const fpsPercent = targetFPS > 0 ? Math.round((actualFPS / targetFPS) * 100) : 0;
        const frameTime = actualFPS > 0 ? (1000 / actualFPS).toFixed(2) : 0;
        const deltaTime = timeExt.runtime.getDeltaTime(timeExt).toFixed(2);
        const frameCount = timeExt.runtime.getFrameCount(timeExt);
        const timeScale = timeExt.runtime.getTimeScale(timeExt).toFixed(2);
        const totalTime = timeExt.runtime.getTimeInSeconds(timeExt).toFixed(2);

        // Update top bar FPS counter
        const fpsElem = document.getElementById('fpsCounter');
        if (fpsElem) {
            fpsElem.textContent = `FPS: ${actualFPS}`;
        }

        // Update debug overlay - Performance section
        const debugTargetFPS = document.getElementById('debugTargetFPS');
        if (debugTargetFPS) {
            debugTargetFPS.textContent = `Target FPS: ${targetFPS}`;
        }

        const debugActualFPS = document.getElementById('debugActualFPS');
        if (debugActualFPS) {
            debugActualFPS.textContent = `Actual FPS: ${actualFPS}`;
        }

        const debugFPSPercent = document.getElementById('debugFPSPercent');
        if (debugFPSPercent) {
            // Color code based on performance
            let color = '#0f0'; // Green
            if (fpsPercent < 50) color = '#f00'; // Red
            else if (fpsPercent < 80) color = '#ff0'; // Yellow
            debugFPSPercent.style.color = color;
            debugFPSPercent.textContent = `FPS: ${fpsPercent}%`;
        }

        const debugFrameTime = document.getElementById('debugFrameTime');
        if (debugFrameTime) {
            debugFrameTime.textContent = `Frame Time: ${frameTime}ms`;
        }

        const debugDeltaTime = document.getElementById('debugDeltaTime');
        if (debugDeltaTime) {
            debugDeltaTime.textContent = `Delta Time: ${deltaTime}ms`;
        }

        // Update debug overlay - Scene section
        const debugObjects = document.getElementById('debugObjects');
        if (debugObjects) {
            debugObjects.textContent = `Objects: ${this.gameObjects.length}`;
        }

        const debugFrameCount = document.getElementById('debugFrameCount');
        if (debugFrameCount) {
            debugFrameCount.textContent = `Frame: ${frameCount}`;
        }

        // Update debug overlay - Time section
        const debugTimeScale = document.getElementById('debugTimeScale');
        if (debugTimeScale) {
            debugTimeScale.textContent = `Time Scale: ${timeScale}`;
        }

        const debugTotalTime = document.getElementById('debugTotalTime');
        if (debugTotalTime) {
            debugTotalTime.textContent = `Total Time: ${totalTime}s`;
        }
    },

    /**
     * Update object counter display
     */
    updateObjectCounter() {
        const objElem = document.getElementById('objectCounter');
        if (objElem) {
            objElem.textContent = `Objects: ${this.gameObjects.length}`;
        }

        const debugObjects = document.getElementById('debugObjects');
        if (debugObjects) {
            debugObjects.textContent = `Objects: ${this.gameObjects.length}`;
        }
    }
};
