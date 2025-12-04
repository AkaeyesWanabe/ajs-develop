const path = require('path');

const runtime = {
    name: "Image Runtime",
    version: "1.0.0",

    /**
     * Appelé à la création de l'objet
     * Précharge l'image pour un rendu fluide
     */
    onCreated(gameObject, api) {
        // Initialiser le cache d'image
        gameObject.internal.imageCache = {
            image: null,
            imageLoaded: false,
            imageError: false
        };

        const imagePath = gameObject.properties.imagePath;

        if (imagePath && imagePath !== "") {
            // Charger l'image et la mettre en cache
            const img = new Image();

            // Convertir le chemin relatif en chemin absolu
            const fullPath = this.resolveImagePath(imagePath, api);

            img.onload = () => {
                gameObject.internal.imageCache.image = img;
                gameObject.internal.imageCache.imageLoaded = true;
            };

            img.onerror = (err) => {
                console.error(`[Image] Failed to load: ${imagePath}`);
                gameObject.internal.imageCache.imageLoaded = true;
                gameObject.internal.imageCache.imageError = true;
            };

            img.src = fullPath;
        } else {
            gameObject.internal.imageCache.imageLoaded = true;
        }
    },

    /**
     * Appelé chaque frame pour la mise à jour
     * Les images sont généralement statiques, mais on peut ajouter des effets ici
     */
    onUpdate(gameObject, deltaTime, api) {
        // Pas de logique de mise à jour pour les images statiques
        // On pourrait ajouter des animations, rotations automatiques, etc. ici
    },

    /**
     * Rendu personnalisé de l'image
     */
    onRender(gameObject, ctx, api) {
        const { x, y, width, height, angle, opacity } = gameObject.getTransform();

        // Vérifier si l'image doit être rendue
        if (!gameObject.isVisible) {
            return;
        }

        const cache = gameObject.internal.imageCache;

        // Dessiner l'image ou un placeholder
        if (cache && cache.imageLoaded && cache.image) {
            // Image chargée avec succès
            if (angle && angle !== 0) {
                // Si rotation, utiliser les transformations
                ctx.save();
                ctx.globalAlpha = opacity !== undefined ? opacity : 1;
                ctx.translate(x + width / 2, y + height / 2);
                ctx.rotate((angle * Math.PI) / 180);
                ctx.drawImage(cache.image, -width / 2, -height / 2, width, height);
                ctx.restore();
            } else {
                // Pas de rotation, dessin simple
                ctx.save();
                ctx.globalAlpha = opacity !== undefined ? opacity : 1;
                ctx.drawImage(cache.image, x, y, width, height);
                ctx.restore();
            }
        } else if (cache && cache.imageError) {
            // Erreur de chargement - placeholder rouge avec X
            this.drawErrorPlaceholder(ctx, x, y, width, height);
        } else {
            // Chargement en cours - placeholder gris
            this.drawLoadingPlaceholder(ctx, x, y, width, height);
        }
    },

    /**
     * Appelé à la destruction de l'objet
     * Libérer les ressources
     */
    onDestroyed(gameObject, api) {
        // Libérer l'image du cache
        if (gameObject.internal.imageCache && gameObject.internal.imageCache.image) {
            gameObject.internal.imageCache.image.src = '';
            delete gameObject.internal.imageCache.image;
        }
    },

    // ========== Helper Methods ==========

    /**
     * Résoudre le chemin de l'image (relatif -> absolu)
     */
    resolveImagePath(imagePath, api) {
        if (!imagePath) return '';

        // Normaliser les backslashes en forward slashes
        imagePath = imagePath.replace(/\\/g, '/');

        // Si c'est déjà un chemin absolu ou une URL
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') ||
            imagePath.startsWith('file://') || path.isAbsolute(imagePath)) {
            return imagePath;
        }

        // PRIORITÉ 1: Utiliser la méthode API (fonctionne dans editor et player)
        if (api && api.resolveAssetPath) {
            return api.resolveAssetPath(imagePath);
        }

        // PRIORITÉ 2: Utiliser application global (seulement dans le contexte editor)
        if (typeof application !== 'undefined' && application && application.getFilePathFromResources) {
            return application.getFilePathFromResources(imagePath);
        }

        // PRIORITÉ 3: Fallback construction manuelle
        const projectPath = (typeof application !== 'undefined' && application?.projectData?.path) || '';
        if (projectPath) {
            return path.join(projectPath, imagePath);
        }

        return imagePath;
    },

    /**
     * Dessiner un placeholder pour une image en cours de chargement
     */
    drawLoadingPlaceholder(ctx, x, y, width, height) {
        // Fond gris
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(x, y, width, height);

        // Bordure
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Texte "Loading..."
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', x + width / 2, y + height / 2);
    },

    /**
     * Dessiner un placeholder pour une erreur de chargement
     */
    drawErrorPlaceholder(ctx, x, y, width, height) {
        // Fond rouge clair
        ctx.fillStyle = '#ffcccc';
        ctx.fillRect(x, y, width, height);

        // Bordure rouge
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Croix rouge
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 10);
        ctx.lineTo(x + width - 10, y + height - 10);
        ctx.moveTo(x + width - 10, y + 10);
        ctx.lineTo(x + 10, y + height - 10);
        ctx.stroke();

        // Texte "Error"
        ctx.fillStyle = '#cc0000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Error', x + width / 2, y + height / 2);
    }
};

module.exports = runtime;