const fs = nw.require('fs');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');

module.exports = {
    isPlaying: false,
    isPaused: false,
    canvas: null,
    ctx: null,
    sceneData: null,
    gameObjects: [],

    // Performance metrics
    fps: 0,
    frameCount: 0,
    lastFrameTime: 0,
    lastFpsUpdate: 0,

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
    },

    /**
     * Load a scene into the player
     * @param {Object} sceneData - Scene data object
     */
    loadScene(sceneData) {
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

            // Hide no scene message
            const noSceneMsg = document.getElementById('noScenePlayer');
            if (noSceneMsg) {
                noSceneMsg.style.display = 'none';
            }

            // Create game objects from scene
            this.createGameObjects();

            console.log('Scene loaded in player:', sceneData.properties.name);
        } catch (err) {
            console.error('Failed to load scene in player:', err);
            alert('Failed to load scene: ' + err.message);
        }
    },

    /**
     * Create game objects from scene data
     */
    createGameObjects() {
        this.gameObjects = [];

        if (!this.sceneData || !this.sceneData.objects) {
            return;
        }

        // Create runtime instances of all objects
        this.sceneData.objects.forEach((objData) => {
            try {
                const gameObj = {
                    data: objData,
                    extension: objData.extension,
                    properties: { ...objData.properties }
                };
                this.gameObjects.push(gameObj);
            } catch (err) {
                console.error('Failed to create game object:', err);
            }
        });

        this.updateObjectCounter();
    },

    /**
     * Start playing the game
     */
    play() {
        if (!this.sceneData) {
            alert('No scene loaded. Please open a scene first.');
            return;
        }

        if (this.isPlaying) {
            return; // Already playing
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;

        // Update UI
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'flex';

        // Start game loop
        this.gameLoop();

        console.log('Game started');
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

        console.log('Game paused');
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

        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Reset game objects
        this.createGameObjects();

        console.log('Game stopped');
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

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Update FPS counter
        this.frameCount++;
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            this.updateFpsCounter();
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
            // Call runtime update if extension has it
            // TODO: Call extension runtime methods when implemented
        });
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

        // Render all game objects
        this.gameObjects.forEach((gameObj) => {
            this.renderObject(gameObj);
        });
    },

    /**
     * Render a single game object
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
     * Render an image object
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
     * Render a text object
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
     */
    updateFpsCounter() {
        const fpsElem = document.getElementById('fpsCounter');
        if (fpsElem) {
            fpsElem.textContent = `FPS: ${this.fps}`;
        }

        const debugFps = document.getElementById('debugFPS');
        if (debugFps) {
            debugFps.textContent = `FPS: ${this.fps}`;
        }

        const debugFrameTime = document.getElementById('debugFrameTime');
        if (debugFrameTime) {
            const frameTime = this.fps > 0 ? (1000 / this.fps).toFixed(2) : 0;
            debugFrameTime.textContent = `Frame Time: ${frameTime}ms`;
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
