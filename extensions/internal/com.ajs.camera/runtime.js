/**
 * Camera System Extension
 * Gère la caméra du jeu (position, zoom, rotation, follow, shake)
 */
const runtime = {
    name: "Camera System",
    version: "1.0.0",
    type: "system",

    /**
     * Initialisation de la caméra
     */
    onCreated(gameObject, api) {

        // Position et transform de la caméra
        gameObject.internal.camera = {
            x: gameObject.properties.x || 0,
            y: gameObject.properties.y || 0,
            zoom: gameObject.properties.zoom || 1,
            rotation: gameObject.properties.rotation || 0,

            // Dimensions du viewport (sera défini par player)
            width: 0,
            height: 0,

            // Follow system
            followTarget: null,
            followSpeed: 0.1,
            followOffset: { x: 0, y: 0 },

            // Limites
            bounds: null, // {minX, maxX, minY, maxY}

            // Camera shake
            shake: {
                active: false,
                intensity: 0,
                duration: 0,
                elapsed: 0,
                offsetX: 0,
                offsetY: 0
            },

            // Smooth movement
            targetX: null,
            targetY: null,
            moveSpeed: 0.1
        };
    },

    /**
     * Mise à jour de la caméra
     */
    onUpdate(gameObject, deltaTime, api) {
        const cam = gameObject.internal.camera;

        // Follow target
        if (cam.followTarget) {
            const target = cam.followTarget;
            const targetX = target.properties.x + cam.followOffset.x;
            const targetY = target.properties.y + cam.followOffset.y;

            // Smooth lerp
            cam.x += (targetX - cam.x) * cam.followSpeed;
            cam.y += (targetY - cam.y) * cam.followSpeed;
        }

        // Smooth move to target
        if (cam.targetX !== null && cam.targetY !== null) {
            cam.x += (cam.targetX - cam.x) * cam.moveSpeed;
            cam.y += (cam.targetY - cam.y) * cam.moveSpeed;

            // Arrêter si proche de la cible
            const dist = Math.sqrt(
                Math.pow(cam.targetX - cam.x, 2) +
                Math.pow(cam.targetY - cam.y, 2)
            );

            if (dist < 1) {
                cam.x = cam.targetX;
                cam.y = cam.targetY;
                cam.targetX = null;
                cam.targetY = null;
            }
        }

        // Apply bounds
        if (cam.bounds) {
            cam.x = Math.max(cam.bounds.minX, Math.min(cam.bounds.maxX, cam.x));
            cam.y = Math.max(cam.bounds.minY, Math.min(cam.bounds.maxY, cam.y));
        }

        // Camera shake
        if (cam.shake.active) {
            cam.shake.elapsed += deltaTime;

            if (cam.shake.elapsed >= cam.shake.duration) {
                // Shake terminé
                cam.shake.active = false;
                cam.shake.offsetX = 0;
                cam.shake.offsetY = 0;
            } else {
                // Calculer le shake
                const progress = cam.shake.elapsed / cam.shake.duration;
                const intensity = cam.shake.intensity * (1 - progress);

                cam.shake.offsetX = (Math.random() - 0.5) * intensity;
                cam.shake.offsetY = (Math.random() - 0.5) * intensity;
            }
        }

        // Sync properties
        gameObject.properties.x = cam.x;
        gameObject.properties.y = cam.y;
        gameObject.properties.zoom = cam.zoom;
        gameObject.properties.rotation = cam.rotation;
    },

    /**
     * Appliquer la transformation de la caméra au contexte canvas
     */
    apply(gameObject, ctx) {
        const cam = gameObject.internal.camera;

        ctx.save();

        // Translate to center + camera position + shake
        ctx.translate(
            cam.width / 2 - (cam.x + cam.shake.offsetX),
            cam.height / 2 - (cam.y + cam.shake.offsetY)
        );

        // Apply zoom
        ctx.scale(cam.zoom, cam.zoom);

        // Apply rotation
        if (cam.rotation) {
            ctx.rotate(cam.rotation * Math.PI / 180);
        }
    },

    /**
     * Restaurer le contexte après application de la caméra
     */
    restore(gameObject, ctx) {
        ctx.restore();
    },

    // ========== API ==========

    /**
     * Suivre un objet
     */
    follow(gameObject, target, speed = 0.1, offsetX = 0, offsetY = 0) {
        const cam = gameObject.internal.camera;
        cam.followTarget = target;
        cam.followSpeed = speed;
        cam.followOffset = { x: offsetX, y: offsetY };
    },

    /**
     * Arrêter de suivre
     */
    stopFollow(gameObject) {
        gameObject.internal.camera.followTarget = null;
    },

    /**
     * Déplacer la caméra vers une position
     */
    moveTo(gameObject, x, y, speed = 0.1) {
        const cam = gameObject.internal.camera;
        cam.targetX = x;
        cam.targetY = y;
        cam.moveSpeed = speed;
    },

    /**
     * Téléporter la caméra instantanément
     */
    setPosition(gameObject, x, y) {
        const cam = gameObject.internal.camera;
        cam.x = x;
        cam.y = y;
        cam.targetX = null;
        cam.targetY = null;
    },

    /**
     * Définir le zoom
     */
    setZoom(gameObject, zoom) {
        gameObject.internal.camera.zoom = Math.max(0.1, zoom);
    },

    /**
     * Définir la rotation
     */
    setRotation(gameObject, rotation) {
        gameObject.internal.camera.rotation = rotation;
    },

    /**
     * Définir les limites de la caméra
     */
    setBounds(gameObject, minX, maxX, minY, maxY) {
        gameObject.internal.camera.bounds = { minX, maxX, minY, maxY };
    },

    /**
     * Retirer les limites
     */
    removeBounds(gameObject) {
        gameObject.internal.camera.bounds = null;
    },

    /**
     * Démarrer un shake de caméra
     */
    shake(gameObject, intensity = 10, duration = 500) {
        const shake = gameObject.internal.camera.shake;
        shake.active = true;
        shake.intensity = intensity;
        shake.duration = duration;
        shake.elapsed = 0;
    },

    /**
     * Arrêter le shake
     */
    stopShake(gameObject) {
        const shake = gameObject.internal.camera.shake;
        shake.active = false;
        shake.offsetX = 0;
        shake.offsetY = 0;
    },

    /**
     * Convertir coordonnées écran vers monde
     */
    screenToWorld(gameObject, screenX, screenY) {
        const cam = gameObject.internal.camera;
        const worldX = (screenX - cam.width / 2) / cam.zoom + cam.x;
        const worldY = (screenY - cam.height / 2) / cam.zoom + cam.y;
        return { x: worldX, y: worldY };
    },

    /**
     * Convertir coordonnées monde vers écran
     */
    worldToScreen(gameObject, worldX, worldY) {
        const cam = gameObject.internal.camera;
        const screenX = (worldX - cam.x) * cam.zoom + cam.width / 2;
        const screenY = (worldY - cam.y) * cam.zoom + cam.height / 2;
        return { x: screenX, y: screenY };
    },

    /**
     * Obtenir les limites visibles de la caméra
     */
    getVisibleBounds(gameObject) {
        const cam = gameObject.internal.camera;
        const halfWidth = (cam.width / 2) / cam.zoom;
        const halfHeight = (cam.height / 2) / cam.zoom;

        return {
            left: cam.x - halfWidth,
            right: cam.x + halfWidth,
            top: cam.y - halfHeight,
            bottom: cam.y + halfHeight
        };
    },

    /**
     * Vérifier si un point est visible
     */
    isPointVisible(gameObject, x, y) {
        const bounds = this.getVisibleBounds(gameObject);
        return x >= bounds.left && x <= bounds.right &&
               y >= bounds.top && y <= bounds.bottom;
    }
};

module.exports = runtime;
