/**
 * RuntimeAPI
 * API exposée aux extensions runtime pour accéder aux fonctionnalités du moteur
 * Cette API est passée en paramètre aux méthodes onCreated, onUpdate, etc.
 *
 * NOUVELLE ARCHITECTURE:
 * RuntimeAPI délègue toutes les opérations aux extensions système internes
 */
class RuntimeAPI {
    constructor(player, runtimeManager) {
        this.player = player;
        this.runtimeManager = runtimeManager;
    }

    // ========== Input System ==========
    // Délègue aux extensions com.ajs.input.keyboard et com.ajs.input.mouse

    get input() {
        const keyboardExt = this.runtimeManager.getSystemInstance('com.ajs.input.keyboard');
        const mouseExt = this.runtimeManager.getSystemInstance('com.ajs.input.mouse');

        return {
            /**
             * Vérifier si une touche est pressée
             * @param {string} key - Nom de la touche (ex: 'a', 'ArrowUp', 'Space')
             * @returns {boolean} True si pressée
             */
            isKeyPressed: (key) => {
                if (!keyboardExt || !keyboardExt.runtime.isKeyPressed) return false;
                return keyboardExt.runtime.isKeyPressed(keyboardExt, key);
            },

            /**
             * Vérifier si une touche vient d'être pressée (frame actuelle uniquement)
             * @param {string} key - Nom de la touche
             * @returns {boolean} True si vient d'être pressée
             */
            isKeyJustPressed: (key) => {
                if (!keyboardExt || !keyboardExt.runtime.isKeyJustPressed) return false;
                return keyboardExt.runtime.isKeyJustPressed(keyboardExt, key);
            },

            /**
             * Obtenir un axe directionnel (-1, 0, 1)
             * @param {string} negativeKey - Touche pour -1
             * @param {string} positiveKey - Touche pour +1
             * @returns {number} -1, 0, ou 1
             */
            getAxis: (negativeKey, positiveKey) => {
                if (!keyboardExt || !keyboardExt.runtime.getAxis) return 0;
                return keyboardExt.runtime.getAxis(keyboardExt, negativeKey, positiveKey);
            },

            /**
             * Obtenir l'axe de mouvement WASD/Arrow
             * @returns {Object} {horizontal, vertical}
             */
            getMovementAxis: () => {
                if (!keyboardExt || !keyboardExt.runtime.getMovementAxis) {
                    return { horizontal: 0, vertical: 0 };
                }
                return keyboardExt.runtime.getMovementAxis(keyboardExt);
            },

            /**
             * Obtenir toutes les touches pressées
             * @returns {Array} Liste des touches
             */
            getPressedKeys: () => {
                if (!keyboardExt || !keyboardExt.internal.keys) return [];
                return Array.from(keyboardExt.internal.keys);
            },

            /**
             * Vérifier si un bouton de souris est pressé
             * @param {number} button - 0 = gauche, 1 = milieu, 2 = droit
             * @returns {boolean} True si pressé
             */
            isMouseButtonPressed: (button = 0) => {
                if (!mouseExt || !mouseExt.runtime.isMouseButtonPressed) return false;
                return mouseExt.runtime.isMouseButtonPressed(mouseExt, button);
            },

            /**
             * Vérifier si un bouton de souris vient d'être pressé
             * @param {number} button - 0 = gauche, 1 = milieu, 2 = droit
             * @returns {boolean} True si vient d'être pressé
             */
            isMouseButtonJustPressed: (button = 0) => {
                if (!mouseExt || !mouseExt.runtime.isMouseButtonJustPressed) return false;
                return mouseExt.runtime.isMouseButtonJustPressed(mouseExt, button);
            },

            /**
             * Obtenir la position de la souris dans le canvas
             * @returns {Object} {x, y}
             */
            getMousePosition: () => {
                if (!mouseExt || !mouseExt.runtime.getMousePosition) {
                    return { x: 0, y: 0 };
                }
                return mouseExt.runtime.getMousePosition(mouseExt);
            },

            /**
             * Obtenir la position de la souris dans le monde (avec caméra)
             * @returns {Object} {x, y}
             */
            getMouseWorldPosition: () => {
                if (!mouseExt || !mouseExt.runtime.getMousePosition) {
                    return { x: 0, y: 0 };
                }

                const mousePos = mouseExt.runtime.getMousePosition(mouseExt);
                const cameraExt = this.runtimeManager.getSystemInstance('com.ajs.camera');

                if (cameraExt && cameraExt.runtime.screenToWorld) {
                    return cameraExt.runtime.screenToWorld(cameraExt, mousePos.x, mousePos.y);
                }

                return mousePos;
            },

            /**
             * Obtenir le delta de la molette de souris
             * @returns {number} Delta Y de la molette
             */
            getMouseWheelDelta: () => {
                if (!mouseExt || !mouseExt.internal.mouse) return 0;
                return mouseExt.internal.mouse.wheelDelta;
            },

            /**
             * Obtenir les positions tactiles
             * @returns {Array} Liste des touches avec {id, x, y}
             */
            getTouches: () => {
                if (!mouseExt || !mouseExt.runtime.getTouches) return [];
                return mouseExt.runtime.getTouches(mouseExt);
            }
        };
    }

    // ========== Time System ==========
    // Délègue à l'extension com.ajs.time

    get time() {
        const timeExt = this.runtimeManager.getSystemInstance('com.ajs.time');

        return {
            /**
             * Temps écoulé depuis le dernier frame (ms) - avec timeScale appliqué
             */
            get deltaTime() {
                if (!timeExt || !timeExt.runtime.getDeltaTime) return 0;
                return timeExt.runtime.getDeltaTime(timeExt);
            },

            /**
             * Temps écoulé depuis le dernier frame (ms) - SANS timeScale
             */
            get realDeltaTime() {
                if (!timeExt || !timeExt.runtime.getRealDeltaTime) return 0;
                return timeExt.runtime.getRealDeltaTime(timeExt);
            },

            /**
             * Temps total depuis le début du jeu (ms) - avec timeScale
             */
            get totalTime() {
                if (!timeExt || !timeExt.runtime.getTotalTime) return 0;
                return timeExt.runtime.getTotalTime(timeExt);
            },

            /**
             * Temps total depuis le début du jeu (ms) - SANS timeScale
             */
            get realTotalTime() {
                if (!timeExt || !timeExt.runtime.getRealTotalTime) return 0;
                return timeExt.runtime.getRealTotalTime(timeExt);
            },

            /**
             * FPS actuel
             */
            get fps() {
                if (!timeExt || !timeExt.runtime.getFPS) return 0;
                return timeExt.runtime.getFPS(timeExt);
            },

            /**
             * Échelle de temps (pour slow motion / fast forward)
             */
            get timeScale() {
                if (!timeExt || !timeExt.properties.timeScale) return 1;
                return timeExt.properties.timeScale;
            },

            set timeScale(value) {
                if (timeExt && timeExt.runtime.setTimeScale) {
                    timeExt.runtime.setTimeScale(timeExt, value);
                }
            },

            /**
             * Mettre en pause (timeScale = 0)
             */
            pause: () => {
                if (timeExt && timeExt.runtime.pause) {
                    timeExt.runtime.pause(timeExt);
                }
            },

            /**
             * Reprendre (timeScale = 1)
             */
            resume: () => {
                if (timeExt && timeExt.runtime.resume) {
                    timeExt.runtime.resume(timeExt);
                }
            }
        };
    }

    // ========== Camera System ==========
    // Délègue à l'extension com.ajs.camera

    get camera() {
        const cameraExt = this.runtimeManager.getSystemInstance('com.ajs.camera');

        return {
            /**
             * Position de la caméra
             */
            get x() {
                return cameraExt?.properties.x || 0;
            },

            get y() {
                return cameraExt?.properties.y || 0;
            },

            /**
             * Zoom de la caméra
             */
            get zoom() {
                return cameraExt?.properties.zoom || 1;
            },

            /**
             * Rotation de la caméra
             */
            get rotation() {
                return cameraExt?.properties.rotation || 0;
            },

            /**
             * Suivre un objet
             * @param {GameObject} target - Objet à suivre
             * @param {number} speed - Vitesse de suivi (0-1)
             * @param {number} offsetX - Décalage X
             * @param {number} offsetY - Décalage Y
             */
            follow: (target, speed = 0.1, offsetX = 0, offsetY = 0) => {
                if (cameraExt && cameraExt.runtime.follow) {
                    cameraExt.runtime.follow(cameraExt, target, speed, offsetX, offsetY);
                }
            },

            /**
             * Arrêter de suivre
             */
            stopFollow: () => {
                if (cameraExt && cameraExt.runtime.stopFollow) {
                    cameraExt.runtime.stopFollow(cameraExt);
                }
            },

            /**
             * Déplacer la caméra vers une position (smooth)
             * @param {number} x - Position X
             * @param {number} y - Position Y
             * @param {number} speed - Vitesse (0-1)
             */
            moveTo: (x, y, speed = 0.1) => {
                if (cameraExt && cameraExt.runtime.moveTo) {
                    cameraExt.runtime.moveTo(cameraExt, x, y, speed);
                }
            },

            /**
             * Téléporter la caméra instantanément
             * @param {number} x - Position X
             * @param {number} y - Position Y
             */
            setPosition: (x, y) => {
                if (cameraExt && cameraExt.runtime.setPosition) {
                    cameraExt.runtime.setPosition(cameraExt, x, y);
                }
            },

            /**
             * Définir le zoom
             * @param {number} zoom - Niveau de zoom
             */
            setZoom: (zoom) => {
                if (cameraExt && cameraExt.runtime.setZoom) {
                    cameraExt.runtime.setZoom(cameraExt, zoom);
                }
            },

            /**
             * Définir la rotation
             * @param {number} rotation - Rotation en degrés
             */
            setRotation: (rotation) => {
                if (cameraExt && cameraExt.runtime.setRotation) {
                    cameraExt.runtime.setRotation(cameraExt, rotation);
                }
            },

            /**
             * Définir les limites de la caméra
             * @param {number} minX - Limite gauche
             * @param {number} maxX - Limite droite
             * @param {number} minY - Limite haut
             * @param {number} maxY - Limite bas
             */
            setBounds: (minX, maxX, minY, maxY) => {
                if (cameraExt && cameraExt.runtime.setBounds) {
                    cameraExt.runtime.setBounds(cameraExt, minX, maxX, minY, maxY);
                }
            },

            /**
             * Retirer les limites
             */
            removeBounds: () => {
                if (cameraExt && cameraExt.runtime.removeBounds) {
                    cameraExt.runtime.removeBounds(cameraExt);
                }
            },

            /**
             * Démarrer un shake de caméra
             * @param {number} intensity - Intensité du shake
             * @param {number} duration - Durée en ms
             */
            shake: (intensity = 10, duration = 500) => {
                if (cameraExt && cameraExt.runtime.shake) {
                    cameraExt.runtime.shake(cameraExt, intensity, duration);
                }
            },

            /**
             * Arrêter le shake
             */
            stopShake: () => {
                if (cameraExt && cameraExt.runtime.stopShake) {
                    cameraExt.runtime.stopShake(cameraExt);
                }
            },

            /**
             * Convertir coordonnées écran vers monde
             * @param {number} screenX - X écran
             * @param {number} screenY - Y écran
             * @returns {Object} {x, y} monde
             */
            screenToWorld: (screenX, screenY) => {
                if (cameraExt && cameraExt.runtime.screenToWorld) {
                    return cameraExt.runtime.screenToWorld(cameraExt, screenX, screenY);
                }
                return { x: screenX, y: screenY };
            },

            /**
             * Convertir coordonnées monde vers écran
             * @param {number} worldX - X monde
             * @param {number} worldY - Y monde
             * @returns {Object} {x, y} écran
             */
            worldToScreen: (worldX, worldY) => {
                if (cameraExt && cameraExt.runtime.worldToScreen) {
                    return cameraExt.runtime.worldToScreen(cameraExt, worldX, worldY);
                }
                return { x: worldX, y: worldY };
            },

            /**
             * Obtenir les limites visibles de la caméra
             * @returns {Object} {left, right, top, bottom}
             */
            getVisibleBounds: () => {
                if (cameraExt && cameraExt.runtime.getVisibleBounds) {
                    return cameraExt.runtime.getVisibleBounds(cameraExt);
                }
                return { left: 0, right: 0, top: 0, bottom: 0 };
            },

            /**
             * Vérifier si un point est visible
             * @param {number} x - X du point
             * @param {number} y - Y du point
             * @returns {boolean} True si visible
             */
            isPointVisible: (x, y) => {
                if (cameraExt && cameraExt.runtime.isPointVisible) {
                    return cameraExt.runtime.isPointVisible(cameraExt, x, y);
                }
                return true;
            }
        };
    }

    // ========== Audio System ==========
    // Délègue à l'extension com.ajs.sound

    get audio() {
        const soundExt = this.runtimeManager.getSystemInstance('com.ajs.sound');

        return {
            /**
             * Jouer un son
             * @param {string} soundPath - Chemin du son
             * @param {number} volume - Volume (0-1)
             * @param {boolean} loop - Boucler le son
             * @returns {number|null} ID du son
             */
            playSound: (soundPath, volume = 1, loop = false) => {
                if (!soundExt || !soundExt.runtime.playSound) {
                    console.warn('[RuntimeAPI] Sound system not available');
                    return null;
                }
                return soundExt.runtime.playSound(soundExt, soundPath, volume, loop);
            },

            /**
             * Arrêter un son
             * @param {number} soundId - ID du son
             */
            stopSound: (soundId) => {
                if (soundExt && soundExt.runtime.stopSound) {
                    soundExt.runtime.stopSound(soundExt, soundId);
                }
            },

            /**
             * Arrêter tous les sons
             */
            stopAllSounds: () => {
                if (soundExt && soundExt.runtime.stopAllSounds) {
                    soundExt.runtime.stopAllSounds(soundExt);
                }
            },

            /**
             * Jouer une musique de fond
             * @param {string} musicPath - Chemin de la musique
             * @param {number} volume - Volume (0-1)
             * @param {boolean} loop - Boucler la musique
             */
            playMusic: (musicPath, volume = 1, loop = true) => {
                if (soundExt && soundExt.runtime.playMusic) {
                    soundExt.runtime.playMusic(soundExt, musicPath, volume, loop);
                }
            },

            /**
             * Arrêter la musique
             */
            stopMusic: () => {
                if (soundExt && soundExt.runtime.stopMusic) {
                    soundExt.runtime.stopMusic(soundExt);
                }
            },

            /**
             * Mettre en pause la musique
             */
            pauseMusic: () => {
                if (soundExt && soundExt.runtime.pauseMusic) {
                    soundExt.runtime.pauseMusic(soundExt);
                }
            },

            /**
             * Reprendre la musique
             */
            resumeMusic: () => {
                if (soundExt && soundExt.runtime.resumeMusic) {
                    soundExt.runtime.resumeMusic(soundExt);
                }
            },

            /**
             * Définir le volume master
             * @param {number} volume - Volume (0-1)
             */
            setMasterVolume: (volume) => {
                if (soundExt && soundExt.runtime.setMasterVolume) {
                    soundExt.runtime.setMasterVolume(soundExt, volume);
                }
            },

            /**
             * Définir le volume des effets sonores
             * @param {number} volume - Volume (0-1)
             */
            setSoundVolume: (volume) => {
                if (soundExt && soundExt.runtime.setSoundVolume) {
                    soundExt.runtime.setSoundVolume(soundExt, volume);
                }
            },

            /**
             * Définir le volume de la musique
             * @param {number} volume - Volume (0-1)
             */
            setMusicVolume: (volume) => {
                if (soundExt && soundExt.runtime.setMusicVolume) {
                    soundExt.runtime.setMusicVolume(soundExt, volume);
                }
            },

            /**
             * Obtenir les volumes actuels
             * @returns {Object} {master, sound, music}
             */
            getVolumes: () => {
                if (soundExt && soundExt.runtime.getVolumes) {
                    return soundExt.runtime.getVolumes(soundExt);
                }
                return { master: 1, sound: 1, music: 1 };
            },

            /**
             * Vérifier si une musique est en cours
             * @returns {boolean} True si musique en cours
             */
            isMusicPlaying: () => {
                if (soundExt && soundExt.runtime.isMusicPlaying) {
                    return soundExt.runtime.isMusicPlaying(soundExt);
                }
                return false;
            }
        };
    }

    // ========== Scene Management ==========

    get scene() {
        return {
            /**
             * Trouver un objet par son nom
             * @param {string} name - Nom de l'objet
             * @returns {GameObject|null} L'objet ou null
             */
            findObjectByName: (name) => {
                if (!this.player.gameObjects) return null;
                return this.player.gameObjects.find(obj => obj.name === name) || null;
            },

            /**
             * Trouver tous les objets par tag
             * @param {string} tag - Tag à rechercher
             * @returns {Array} Liste des objets
             */
            findObjectsByTag: (tag) => {
                if (!this.player.gameObjects) return [];
                return this.player.gameObjects.filter(obj =>
                    obj.data.tags && obj.data.tags.includes(tag)
                );
            },

            /**
             * Trouver tous les objets par extension
             * @param {string} extensionId - ID de l'extension
             * @returns {Array} Liste des objets
             */
            findObjectsByExtension: (extensionId) => {
                if (!this.player.gameObjects) return [];
                return this.player.gameObjects.filter(obj => obj.extension === extensionId);
            },

            /**
             * Obtenir tous les objets de la scène
             * @returns {Array} Liste de tous les objets
             */
            getAllObjects: () => {
                return this.player.gameObjects || [];
            },

            /**
             * Instancier un nouvel objet dans la scène
             * @param {Object} objectData - Données de l'objet
             * @param {number} x - Position X
             * @param {number} y - Position Y
             * @returns {GameObject|null} L'objet créé
             */
            instantiate: (objectData, x, y) => {
                // TODO: Implémenter l'instanciation dynamique
                console.warn('[RuntimeAPI] scene.instantiate not yet implemented');
                return null;
            },

            /**
             * Détruire un objet
             * @param {GameObject} gameObject - L'objet à détruire
             */
            destroy: (gameObject) => {
                if (!gameObject || !this.player.gameObjects) return;

                gameObject.onDestroy();

                const index = this.player.gameObjects.indexOf(gameObject);
                if (index > -1) {
                    this.player.gameObjects.splice(index, 1);
                }
            },

            /**
             * Obtenir les propriétés de la scène
             * @returns {Object} Propriétés de la scène
             */
            getSceneProperties: () => {
                return this.player.sceneData?.properties || {};
            },

            /**
             * Obtenir la taille du canvas
             * @returns {Object} {width, height}
             */
            getCanvasSize: () => {
                return {
                    width: this.player.canvas?.width || 0,
                    height: this.player.canvas?.height || 0
                };
            }
        };
    }

    // ========== Resources ==========

    /**
     * Résoudre un chemin de ressource relatif en chemin absolu
     * @param {string} relativePath - Chemin relatif (ex: "assets/images/player.png")
     * @returns {string} Chemin absolu
     */
    resolveAssetPath(relativePath) {
        if (!relativePath) return '';

        const path = nw.require('path');
        const application = nw.require('./assets/js/objects/application');

        // Normaliser les backslashes en forward slashes
        relativePath = relativePath.replace(/\\/g, '/');

        // Si c'est déjà un chemin absolu ou une URL, le retourner tel quel
        if (relativePath.startsWith('http://') ||
            relativePath.startsWith('https://') ||
            relativePath.startsWith('file://') ||
            path.isAbsolute(relativePath)) {
            return relativePath;
        }

        // Obtenir le dossier du projet (projectDir, pas projectData.path)
        const projectPath = application?.projectDir || '';
        if (!projectPath) {
            console.warn('[RuntimeAPI] No project directory available, returning relative path');
            return relativePath;
        }

        // Joindre le chemin du projet avec le chemin relatif
        const absolutePath = path.join(projectPath, relativePath);
        return absolutePath;
    }

    get resources() {
        return {
            /**
             * Charger une image
             * @param {string} path - Chemin de l'image
             * @returns {Promise<Image>} Promesse de l'image
             */
            loadImage: async (path) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = path;
                });
            },

            /**
             * Charger un son
             * @param {string} path - Chemin du son
             * @returns {Promise<Audio>} Promesse de l'audio
             */
            loadSound: async (path) => {
                return new Promise((resolve, reject) => {
                    const audio = new Audio(path);
                    audio.oncanplaythrough = () => resolve(audio);
                    audio.onerror = reject;
                    audio.src = path;
                });
            },

            /**
             * Charger un fichier JSON
             * @param {string} path - Chemin du JSON
             * @returns {Promise<Object>} Promesse du JSON parsé
             */
            loadJSON: async (path) => {
                const response = await fetch(path);
                return response.json();
            }
        };
    }

    // ========== Physics (Future) ==========

    get physics() {
        return {
            /**
             * Vérifier la collision AABB entre deux objets
             * @param {GameObject} obj1 - Premier objet
             * @param {GameObject} obj2 - Deuxième objet
             * @returns {boolean} True si collision
             */
            checkCollision: (obj1, obj2) => {
                const r1 = obj1.getRect();
                const r2 = obj2.getRect();

                return r1.x < r2.x + r2.width &&
                       r1.x + r1.width > r2.x &&
                       r1.y < r2.y + r2.height &&
                       r1.y + r1.height > r2.y;
            },

            /**
             * Vérifier si un point est dans un rectangle
             * @param {number} x - X du point
             * @param {number} y - Y du point
             * @param {GameObject} obj - Objet à tester
             * @returns {boolean} True si le point est dans l'objet
             */
            pointInRect: (x, y, obj) => {
                const rect = obj.getRect();
                return x >= rect.x && x <= rect.x + rect.width &&
                       y >= rect.y && y <= rect.y + rect.height;
            },

            /**
             * Calculer la distance entre deux objets
             * @param {GameObject} obj1 - Premier objet
             * @param {GameObject} obj2 - Deuxième objet
             * @returns {number} Distance
             */
            distance: (obj1, obj2) => {
                const c1 = obj1.getCenter();
                const c2 = obj2.getCenter();
                const dx = c2.x - c1.x;
                const dy = c2.y - c1.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        };
    }

    // ========== Math Helpers ==========

    get math() {
        return {
            /**
             * Interpolation linéaire
             * @param {number} a - Valeur de départ
             * @param {number} b - Valeur d'arrivée
             * @param {number} t - Facteur (0-1)
             * @returns {number} Valeur interpolée
             */
            lerp: (a, b, t) => {
                return a + (b - a) * t;
            },

            /**
             * Limiter une valeur entre min et max
             * @param {number} value - Valeur
             * @param {number} min - Minimum
             * @param {number} max - Maximum
             * @returns {number} Valeur limitée
             */
            clamp: (value, min, max) => {
                return Math.max(min, Math.min(max, value));
            },

            /**
             * Convertir degrés en radians
             * @param {number} degrees - Angle en degrés
             * @returns {number} Angle en radians
             */
            degToRad: (degrees) => {
                return degrees * Math.PI / 180;
            },

            /**
             * Convertir radians en degrés
             * @param {number} radians - Angle en radians
             * @returns {number} Angle en degrés
             */
            radToDeg: (radians) => {
                return radians * 180 / Math.PI;
            },

            /**
             * Nombre aléatoire entre min et max
             * @param {number} min - Minimum
             * @param {number} max - Maximum
             * @returns {number} Nombre aléatoire
             */
            random: (min, max) => {
                return Math.random() * (max - min) + min;
            },

            /**
             * Entier aléatoire entre min et max (inclus)
             * @param {number} min - Minimum
             * @param {number} max - Maximum
             * @returns {number} Entier aléatoire
             */
            randomInt: (min, max) => {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
        };
    }

    // ========== Debug ==========

    get debug() {
        return {
            /**
             * Logger un message dans la console
             * @param {string} message - Message
             * @param {string} type - Type (log, warn, error)
             */
            log: (message, type = 'log') => {
                console[type](`[Runtime] ${message}`);
            },

            /**
             * Dessiner un rectangle de debug
             * @param {CanvasRenderingContext2D} ctx - Contexte
             * @param {number} x - X
             * @param {number} y - Y
             * @param {number} width - Largeur
             * @param {number} height - Hauteur
             * @param {string} color - Couleur
             */
            drawRect: (ctx, x, y, width, height, color = '#ff0000') => {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                ctx.restore();
            },

            /**
             * Dessiner un point de debug
             * @param {CanvasRenderingContext2D} ctx - Contexte
             * @param {number} x - X
             * @param {number} y - Y
             * @param {string} color - Couleur
             * @param {number} radius - Rayon
             */
            drawPoint: (ctx, x, y, color = '#ff0000', radius = 5) => {
                ctx.save();
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };
    }
}

module.exports = RuntimeAPI;
