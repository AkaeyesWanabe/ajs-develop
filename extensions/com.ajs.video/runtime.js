const path = require('path');

const runtime = {
    name: "Video Runtime",
    version: "1.0.0",

    /**
     * Appelé à la création de la vidéo
     */
    onCreated(gameObject, api) {
        // Créer un élément vidéo HTML5
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';
        video.playsInline = true; // Important for mobile

        // Configurer les propriétés de base
        video.muted = gameObject.properties.muted || false;
        video.loop = gameObject.properties.loop || false;
        video.volume = (gameObject.properties.volume || 100) / 100;
        video.playbackRate = gameObject.properties.playbackRate || 1.0;

        // Stocker l'élément vidéo dans internal
        gameObject.internal.video = {
            element: video,
            loaded: false,
            error: false,
            playing: false
        };

        // Charger la vidéo
        const videoPath = gameObject.properties.videoPath;
        if (videoPath && videoPath !== "") {
            const fullPath = this.resolveVideoPath(videoPath, api);

            video.onloadeddata = () => {
                gameObject.internal.video.loaded = true;

                // Autoplay si configuré
                if (gameObject.properties.autoplay) {
                    video.play().then(() => {
                        gameObject.internal.video.playing = true;
                    }).catch(err => {
                        console.error('[Video] Autoplay failed:', err);
                    });
                }
            };

            video.onerror = (err) => {
                console.error('[Video] Failed to load:', videoPath);
                gameObject.internal.video.error = true;
            };

            video.onplay = () => {
                gameObject.internal.video.playing = true;
            };

            video.onpause = () => {
                gameObject.internal.video.playing = false;
            };

            video.onended = () => {
                gameObject.internal.video.playing = false;
            };

            video.src = fullPath;
            video.load();
        } else {
            gameObject.internal.video.loaded = true;
        }
    },

    /**
     * Mise à jour de la vidéo
     */
    onUpdate(gameObject, deltaTime, api) {
        // Update video properties dynamically
        const video = gameObject.internal.video?.element;
        if (!video) return;

        // Sync properties
        video.muted = gameObject.properties.muted || false;
        video.loop = gameObject.properties.loop || false;
        video.volume = Math.max(0, Math.min(1, (gameObject.properties.volume || 100) / 100));
        video.playbackRate = gameObject.properties.playbackRate || 1.0;
    },

    /**
     * Rendu de la vidéo sur le canvas
     */
    onRender(gameObject, ctx, api) {
        const { x, y, width, height, angle, opacity } = gameObject.getTransform();

        if (!gameObject.isVisible) {
            return;
        }

        const videoData = gameObject.internal.video;
        const video = videoData?.element;

        if (!video || !videoData.loaded) {
            // Afficher un placeholder en attendant le chargement
            this.drawLoadingPlaceholder(ctx, x, y, width, height);
            return;
        }

        if (videoData.error) {
            // Afficher un placeholder d'erreur
            this.drawErrorPlaceholder(ctx, x, y, width, height);
            return;
        }

        // Dessiner la vidéo
        ctx.save();
        ctx.globalAlpha = opacity !== undefined ? opacity : 1;

        if (angle && angle !== 0) {
            // Avec rotation
            ctx.translate(x + width / 2, y + height / 2);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.drawImage(video, -width / 2, -height / 2, width, height);
        } else {
            // Sans rotation
            ctx.drawImage(video, x, y, width, height);
        }

        ctx.restore();

        // Dessiner un indicateur de lecture si la vidéo est en pause
        if (!videoData.playing && videoData.loaded) {
            this.drawPlayIcon(ctx, x, y, width, height, opacity);
        }
    },

    /**
     * Destruction de la vidéo
     */
    onDestroyed(gameObject, api) {
        const video = gameObject.internal.video?.element;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.load();
            delete gameObject.internal.video.element;
        }
    },

    // ========== Helper Methods ==========

    /**
     * Résoudre le chemin de la vidéo
     */
    resolveVideoPath(videoPath, api) {
        if (!videoPath) return '';

        videoPath = videoPath.replace(/\\/g, '/');

        if (videoPath.startsWith('http://') || videoPath.startsWith('https://') ||
            videoPath.startsWith('file://') || path.isAbsolute(videoPath)) {
            return videoPath;
        }

        if (api && api.resolveAssetPath) {
            return api.resolveAssetPath(videoPath);
        }

        if (typeof application !== 'undefined' && application && application.getFilePathFromResources) {
            return application.getFilePathFromResources(videoPath);
        }

        const projectPath = (typeof application !== 'undefined' && application?.projectData?.path) || '';
        if (projectPath) {
            return path.join(projectPath, videoPath);
        }

        return videoPath;
    },

    /**
     * Dessiner un placeholder de chargement
     */
    drawLoadingPlaceholder(ctx, x, y, width, height) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading Video...', x + width / 2, y + height / 2);
    },

    /**
     * Dessiner un placeholder d'erreur
     */
    drawErrorPlaceholder(ctx, x, y, width, height) {
        ctx.fillStyle = '#2a1a1a';
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Croix rouge
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 20);
        ctx.lineTo(x + width - 20, y + height - 20);
        ctx.moveTo(x + width - 20, y + 20);
        ctx.lineTo(x + 20, y + height - 20);
        ctx.stroke();

        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Video Error', x + width / 2, y + height / 2);
    },

    /**
     * Dessiner l'icône play
     */
    drawPlayIcon(ctx, x, y, width, height, opacity) {
        ctx.save();
        ctx.globalAlpha = (opacity !== undefined ? opacity : 1) * 0.7;

        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const iconSize = Math.min(width, height) * 0.2;

        // Cercle semi-transparent
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2);
        ctx.fill();

        // Triangle play
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const triangleSize = iconSize * 0.5;
        ctx.moveTo(centerX - triangleSize / 2, centerY - triangleSize);
        ctx.lineTo(centerX - triangleSize / 2, centerY + triangleSize);
        ctx.lineTo(centerX + triangleSize, centerY);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    },

    // ========== API Methods ==========

    /**
     * Lire la vidéo
     */
    play(gameObject) {
        const video = gameObject.internal.video?.element;
        if (video && gameObject.internal.video.loaded) {
            video.play().catch(err => {
                console.error('[Video] Play failed:', err);
            });
        }
    },

    /**
     * Mettre en pause la vidéo
     */
    pause(gameObject) {
        const video = gameObject.internal.video?.element;
        if (video) {
            video.pause();
        }
    },

    /**
     * Arrêter la vidéo (pause + retour au début)
     */
    stop(gameObject) {
        const video = gameObject.internal.video?.element;
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
    },

    /**
     * Définir la position de lecture (en secondes)
     */
    setCurrentTime(gameObject, seconds) {
        const video = gameObject.internal.video?.element;
        if (video && gameObject.internal.video.loaded) {
            video.currentTime = Math.max(0, Math.min(seconds, video.duration || 0));
        }
    },

    /**
     * Obtenir la position de lecture actuelle (en secondes)
     */
    getCurrentTime(gameObject) {
        const video = gameObject.internal.video?.element;
        return video ? video.currentTime : 0;
    },

    /**
     * Obtenir la durée totale de la vidéo (en secondes)
     */
    getDuration(gameObject) {
        const video = gameObject.internal.video?.element;
        return video && video.duration ? video.duration : 0;
    },

    /**
     * Vérifier si la vidéo est en cours de lecture
     */
    isPlaying(gameObject) {
        return gameObject.internal.video?.playing || false;
    },

    /**
     * Définir le volume (0-100)
     */
    setVolume(gameObject, volume) {
        gameObject.properties.volume = Math.max(0, Math.min(100, volume));
        const video = gameObject.internal.video?.element;
        if (video) {
            video.volume = volume / 100;
        }
    },

    /**
     * Activer/désactiver le son
     */
    setMuted(gameObject, muted) {
        gameObject.properties.muted = muted;
        const video = gameObject.internal.video?.element;
        if (video) {
            video.muted = muted;
        }
    }
};

module.exports = runtime;
