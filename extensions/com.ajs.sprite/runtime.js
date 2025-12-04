const path = require('path');
const fs = require('fs');

const runtime = {
    name: "Sprite Runtime",
    version: "1.0.0",

    /**
     * Appelé à la création du sprite
     * Initialise l'animation et charge le fichier .anim
     */
    onCreated(gameObject, api) {
        const animatorPath = gameObject.properties.animator;

        // Initialiser les données d'animation
        gameObject.internal.animation = {
            currentAnimationName: null,
            currentAnimationIndex: 0,
            currentFrame: 0,
            elapsedTime: 0,
            isPlaying: true,
            loop: true,
            animationData: null, // Données du fichier .anim
            animations: {}, // Map des animations par nom
            loadedImages: new Map(), // Cache des images chargées
            loadingComplete: false,
            loadingError: false,
            // Cache pour les performances
            referenceOriginX: 0,
            referenceOriginY: 0
        };

        // Charger le fichier .anim si spécifié
        if (animatorPath && animatorPath !== "") {
            this.loadAnimationFile(gameObject, animatorPath);
        } else {
            gameObject.internal.animation.loadingComplete = true;
        }
    },

    /**
     * Mise à jour de l'animation
     */
    onUpdate(gameObject, deltaTime, api) {
        const anim = gameObject.internal.animation;

        if (!anim || !anim.loadingComplete || !anim.isPlaying) {
            return;
        }

        const currentAnim = this.getCurrentAnimation(gameObject);
        if (!currentAnim || !currentAnim.frames || currentAnim.frames.length === 0) {
            return;
        }

        // Incrémenter le temps écoulé
        anim.elapsedTime += deltaTime;

        // Calculer le temps par frame (en ms)
        const timePerFrame = 1000 / (currentAnim.frameRate || 10);

        // Changer de frame si nécessaire
        if (anim.elapsedTime >= timePerFrame) {
            anim.currentFrame++;

            // Boucler ou arrêter à la fin
            if (anim.currentFrame >= currentAnim.frames.length) {
                if (currentAnim.loop !== false && anim.loop) {
                    // Revenir à startLoopFrame
                    anim.currentFrame = currentAnim.startLoopFrame || 0;
                } else {
                    // Arrêter à la dernière frame
                    anim.currentFrame = currentAnim.frames.length - 1;
                    anim.isPlaying = false;
                }
            }

            anim.elapsedTime = 0;
        }
    },

    /**
     * Rendu du sprite animé
     */
    onRender(gameObject, ctx, api) {
        const { x, y, width, height, angle, opacity } = gameObject.getTransform();

        if (!gameObject.isVisible) {
            return;
        }

        const anim = gameObject.internal.animation;

        // Afficher un placeholder si chargement en cours ou erreur
        if (!anim || !anim.loadingComplete) {
            this.drawLoadingPlaceholder(ctx, x, y, width, height);
            return;
        }

        if (anim.loadingError) {
            this.drawErrorPlaceholder(ctx, x, y, width, height);
            return;
        }

        const currentAnim = this.getCurrentAnimation(gameObject);
        if (!currentAnim || !currentAnim.frames || currentAnim.frames.length === 0) {
            this.drawErrorPlaceholder(ctx, x, y, width, height);
            return;
        }

        // Récupérer la frame actuelle
        const frameData = currentAnim.frames[anim.currentFrame];
        if (!frameData) {
            return;
        }

        // Récupérer l'image de la frame
        const image = anim.loadedImages.get(frameData.path);
        if (!image || !image.complete) {
            this.drawLoadingPlaceholder(ctx, x, y, width, height);
            return;
        }

        // PERFORMANCE: Utiliser l'origin de référence cachée
        const referenceOriginX = anim.referenceOriginX;
        const referenceOriginY = anim.referenceOriginY;

        // Récupérer l'origin de la frame actuelle
        const currentOriginPoint = frameData.points?.find(p => p.name === 'origin');
        const currentOriginX = currentOriginPoint ? currentOriginPoint.x : frameData.width / 2;
        const currentOriginY = currentOriginPoint ? currentOriginPoint.y : frameData.height / 2;

        // Calculer l'échelle entre l'image originale et la taille de rendu
        const scaleX = width / frameData.width;
        const scaleY = height / frameData.height;

        // Position de dessin relative à la première frame
        // La première frame se dessine à (x, y)
        // Les autres frames se dessinent avec un offset relatif à l'origin de la première frame
        const offsetX = (currentOriginX - referenceOriginX) * scaleX;
        const offsetY = (currentOriginY - referenceOriginY) * scaleY;
        const drawX = x + offsetX;
        const drawY = y + offsetY;

        // Dessiner la frame
        if (angle && angle !== 0) {
            // Si rotation, utiliser les transformations
            ctx.save();
            ctx.globalAlpha = opacity !== undefined ? opacity : 1;
            ctx.translate(x, y);
            ctx.rotate((angle * Math.PI) / 180);
            // Utiliser le même offset relatif
            ctx.drawImage(image, offsetX, offsetY, width, height);
            ctx.restore();
        } else {
            // Pas de rotation, dessin simple
            ctx.save();
            ctx.globalAlpha = opacity !== undefined ? opacity : 1;
            ctx.drawImage(image, drawX, drawY, width, height);
            ctx.restore();
        }
    },

    /**
     * Destruction du sprite
     */
    onDestroyed(gameObject, api) {
        // Libérer les images du cache
        const anim = gameObject.internal.animation;
        if (anim && anim.loadedImages) {
            anim.loadedImages.forEach(img => {
                img.src = '';
            });
            anim.loadedImages.clear();
        }
    },

    // ========== Helper Methods ==========

    /**
     * Charger le fichier .anim
     */
    loadAnimationFile(gameObject, animFilePath) {
        const anim = gameObject.internal.animation;

        try {
            // Résoudre le chemin du fichier .anim
            const fullPath = this.resolveFilePath(animFilePath, gameObject.api);

            // Lire le fichier .anim
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            anim.animationData = JSON.parse(fileContent);

            // Organiser les animations par nom
            if (anim.animationData.animations) {
                anim.animationData.animations.forEach((animation) => {
                    anim.animations[animation.name] = animation;
                });

                // Si aucune animation courante n'est définie, utiliser la première
                if (!anim.currentAnimationName && anim.animationData.animations.length > 0) {
                    anim.currentAnimationName = anim.animationData.animations[0].name;
                }

                // PERFORMANCE: Cacher l'origin de référence (première frame)
                if (anim.animationData.animations.length > 0 && anim.animationData.animations[0].frames.length > 0) {
                    const firstFrame = anim.animationData.animations[0].frames[0];
                    const refOrigin = firstFrame.points?.find(p => p.name === 'origin');
                    anim.referenceOriginX = refOrigin ? refOrigin.x : firstFrame.width / 2;
                    anim.referenceOriginY = refOrigin ? refOrigin.y : firstFrame.height / 2;
                }
            }

            // Précharger toutes les images
            this.preloadImages(gameObject);

        } catch (err) {
            console.error(`[Sprite Runtime] Failed to load animation file: ${animFilePath}`, err);
            anim.loadingError = true;
            anim.loadingComplete = true;
        }
    },

    /**
     * Précharger toutes les images des animations
     */
    preloadImages(gameObject) {
        const anim = gameObject.internal.animation;

        if (!anim.animationData || !anim.animationData.animations) {
            anim.loadingComplete = true;
            return;
        }

        // Collecter tous les chemins d'images uniques
        const imagePaths = new Set();
        anim.animationData.animations.forEach(animation => {
            if (animation.frames) {
                animation.frames.forEach(frame => {
                    imagePaths.add(frame.path);
                });
            }
        });

        // Charger chaque image
        let loadedCount = 0;
        let totalImages = imagePaths.size;

        if (totalImages === 0) {
            anim.loadingComplete = true;
            return;
        }

        imagePaths.forEach(imagePath => {
            const img = new Image();
            const fullPath = this.resolveFilePath(imagePath, gameObject.api);

            img.onload = () => {
                loadedCount++;
                if (loadedCount >= totalImages) {
                    anim.loadingComplete = true;
                }
            };

            img.onerror = (err) => {
                loadedCount++;
                console.error(`[Sprite Runtime] Failed to load image: ${imagePath}`, err);

                if (loadedCount >= totalImages) {
                    anim.loadingComplete = true;
                }
            };

            img.src = fullPath;
            anim.loadedImages.set(imagePath, img);
        });
    },

    /**
     * Résoudre le chemin d'un fichier (relatif -> absolu)
     */
    resolveFilePath(filePath, api) {
        if (!filePath) return '';

        // Nettoyer les backslashes Windows
        filePath = filePath.replace(/\\/g, '/');

        // Si c'est déjà un chemin absolu ou une URL
        if (filePath.startsWith('http://') || filePath.startsWith('https://') ||
            filePath.startsWith('file://') || path.isAbsolute(filePath)) {
            return filePath;
        }

        // Utiliser la méthode de l'API si disponible
        if (api && api.resolveAssetPath) {
            return api.resolveAssetPath(filePath);
        }

        // Utiliser la variable globale application si disponible (dans l'editor)
        if (typeof application !== 'undefined' && application && application.getFilePathFromResources) {
            return application.getFilePathFromResources(filePath);
        }

        // Fallback: construire le chemin à partir du dossier du projet
        const projectPath = (typeof application !== 'undefined' && application?.projectData?.path) || '';
        if (projectPath) {
            return path.join(projectPath, filePath);
        }

        return filePath;
    },

    /**
     * Obtenir l'animation courante
     */
    getCurrentAnimation(gameObject) {
        const anim = gameObject.internal.animation;
        if (!anim || !anim.currentAnimationName) {
            return null;
        }
        return anim.animations[anim.currentAnimationName];
    },

    /**
     * Obtenir la frame courante
     */
    getCurrentFrame(gameObject) {
        const anim = gameObject.internal.animation;
        const currentAnim = this.getCurrentAnimation(gameObject);

        if (!currentAnim || !currentAnim.frames) {
            return null;
        }

        return currentAnim.frames[anim.currentFrame];
    },

    /**
     * Placeholder de chargement
     */
    drawLoadingPlaceholder(ctx, x, y, width, height) {
        ctx.save();

        ctx.fillStyle = '#cccccc';
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading Animation...', x + width / 2, y + height / 2);

        ctx.restore();
    },

    /**
     * Placeholder d'erreur
     */
    drawErrorPlaceholder(ctx, x, y, width, height) {
        ctx.save();

        ctx.fillStyle = '#ffcccc';
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 10);
        ctx.lineTo(x + width - 10, y + height - 10);
        ctx.moveTo(x + width - 10, y + 10);
        ctx.lineTo(x + 10, y + height - 10);
        ctx.stroke();

        ctx.fillStyle = '#cc0000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Animation Error', x + width / 2, y + height / 2);

        ctx.restore();
    },

    // ========== API Methods (appelables depuis les scripts) ==========

    /**
     * Jouer l'animation
     */
    play(gameObject) {
        if (gameObject.internal.animation) {
            gameObject.internal.animation.isPlaying = true;
        }
    },

    /**
     * Mettre en pause l'animation
     */
    pause(gameObject) {
        if (gameObject.internal.animation) {
            gameObject.internal.animation.isPlaying = false;
        }
    },

    /**
     * Arrêter et réinitialiser l'animation
     */
    stop(gameObject) {
        if (gameObject.internal.animation) {
            gameObject.internal.animation.isPlaying = false;
            gameObject.internal.animation.currentFrame = 0;
            gameObject.internal.animation.elapsedTime = 0;
        }
    },

    /**
     * Changer d'animation
     * @param {GameObject} gameObject - L'objet animé
     * @param {string} animationName - Nom de l'animation à jouer
     * @param {boolean} restart - Recommencer à la première frame (défaut: true)
     */
    setAnimation(gameObject, animationName, restart = true) {
        const anim = gameObject.internal.animation;

        if (!anim || !anim.animations[animationName]) {
            console.warn(`[Sprite Runtime] Animation "${animationName}" not found`);
            return false;
        }

        anim.currentAnimationName = animationName;

        if (restart) {
            anim.currentFrame = 0;
            anim.elapsedTime = 0;
        }

        return true;
    },

    /**
     * Aller à une frame spécifique
     * @param {GameObject} gameObject - L'objet animé
     * @param {number} frameIndex - Index de la frame
     */
    gotoFrame(gameObject, frameIndex) {
        const anim = gameObject.internal.animation;
        const currentAnim = this.getCurrentAnimation(gameObject);

        if (!currentAnim || !currentAnim.frames) {
            return false;
        }

        anim.currentFrame = Math.max(0, Math.min(frameIndex, currentAnim.frames.length - 1));
        anim.elapsedTime = 0;
        return true;
    },

    /**
     * Obtenir un point de la frame courante
     * @param {GameObject} gameObject - L'objet animé
     * @param {string} pointName - Nom du point ('origin', 'action', etc.)
     * @returns {Object|null} {x, y} ou null si non trouvé
     */
    getPoint(gameObject, pointName) {
        const frameData = this.getCurrentFrame(gameObject);

        if (!frameData || !frameData.points) {
            return null;
        }

        const point = frameData.points.find(p => p.name === pointName);
        if (!point) {
            return null;
        }

        // Récupérer la transformation du GameObject
        const { x, y, width, height } = gameObject.getTransform();

        // PERFORMANCE: Utiliser l'origin de référence cachée
        const anim = gameObject.internal.animation;
        const referenceOriginX = anim.referenceOriginX;
        const referenceOriginY = anim.referenceOriginY;

        // Récupérer l'origin de la frame actuelle
        const currentOriginPoint = frameData.points.find(p => p.name === 'origin');
        const currentOriginX = currentOriginPoint ? currentOriginPoint.x : frameData.width / 2;
        const currentOriginY = currentOriginPoint ? currentOriginPoint.y : frameData.height / 2;

        // Calculer l'échelle
        const scaleX = width / frameData.width;
        const scaleY = height / frameData.height;

        // Position de dessin relative à la première frame
        const offsetX = (currentOriginX - referenceOriginX) * scaleX;
        const offsetY = (currentOriginY - referenceOriginY) * scaleY;
        const drawX = x + offsetX;
        const drawY = y + offsetY;

        // Position du point dans l'espace monde
        const worldX = drawX + (point.x * scaleX);
        const worldY = drawY + (point.y * scaleY);

        return { x: worldX, y: worldY };
    },

    /**
     * Obtenir le collider de la frame courante
     * @param {GameObject} gameObject - L'objet animé
     * @returns {Array|null} Array de points [{x, y}, ...] ou null
     */
    getCollider(gameObject) {
        const frameData = this.getCurrentFrame(gameObject);

        if (!frameData || !frameData.collider) {
            return null;
        }

        // Récupérer la transformation du GameObject
        const { x, y, width, height } = gameObject.getTransform();

        // PERFORMANCE: Utiliser l'origin de référence cachée
        const anim = gameObject.internal.animation;
        const referenceOriginX = anim.referenceOriginX;
        const referenceOriginY = anim.referenceOriginY;

        // Récupérer l'origin de la frame actuelle
        const currentOriginPoint = frameData.points?.find(p => p.name === 'origin');
        const currentOriginX = currentOriginPoint ? currentOriginPoint.x : frameData.width / 2;
        const currentOriginY = currentOriginPoint ? currentOriginPoint.y : frameData.height / 2;

        // Calculer l'échelle
        const scaleX = width / frameData.width;
        const scaleY = height / frameData.height;

        // Position de dessin relative à la première frame
        const offsetX = (currentOriginX - referenceOriginX) * scaleX;
        const offsetY = (currentOriginY - referenceOriginY) * scaleY;
        const drawX = x + offsetX;
        const drawY = y + offsetY;

        // Transformer les points du collider dans l'espace monde
        return frameData.collider.map(point => ({
            x: drawX + (point.x * scaleX),
            y: drawY + (point.y * scaleY)
        }));
    },

    /**
     * Obtenir la liste des noms d'animations disponibles
     * @param {GameObject} gameObject - L'objet animé
     * @returns {Array} Liste des noms d'animations
     */
    getAnimationNames(gameObject) {
        const anim = gameObject.internal.animation;
        if (!anim || !anim.animations) {
            return [];
        }
        return Object.keys(anim.animations);
    },

    /**
     * Vérifier si une animation est en cours de lecture
     * @param {GameObject} gameObject - L'objet animé
     * @returns {boolean} True si l'animation joue
     */
    isPlaying(gameObject) {
        const anim = gameObject.internal.animation;
        return anim ? anim.isPlaying : false;
    }
};

module.exports = runtime;
