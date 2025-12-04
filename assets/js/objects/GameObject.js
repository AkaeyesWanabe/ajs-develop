/**
 * GameObject
 * Représente un objet de jeu au runtime avec son cycle de vie et ses propriétés
 */
class GameObject {
    constructor(objectData, extensionRuntime, runtimeAPI) {
        // Données de l'objet (depuis la scène)
        this.data = objectData;
        this.id = objectData.oid;
        this.oid = objectData.oid; // Alias for compatibility
        this.name = objectData.properties?.name || objectData.name || 'Unnamed';
        this.extension = objectData.extension;

        // Runtime de l'extension
        this.runtime = extensionRuntime;

        // API Runtime (input, audio, scene, etc.)
        this.api = runtimeAPI;

        // Propriétés (copie modifiable)
        this.properties = this.deepCopy(objectData.properties || {});

        // État de l'objet
        this.isDestroyed = false;
        this.isActive = true;
        this.isVisible = this.properties.visible !== false && this.properties.visible !== 'false';

        // Cache pour les assets et données de runtime
        this._cache = {};

        // Variables internes pour les extensions
        this.internal = {};

        // Timestamp de création
        this.createdAt = performance.now();

        // Pour le debug
        this.debugColor = this.getRandomColor();
    }

    /**
     * Appelé à la création de l'objet (une seule fois)
     */
    onCreate() {
        if (this.runtime && typeof this.runtime.onCreated === 'function') {
            try {
                this.runtime.onCreated(this, this.api);
            } catch (err) {
                console.error(`[GameObject] Error in onCreate for ${this.name}:`, err);
            }
        }
    }

    /**
     * Appelé à chaque frame pour mettre à jour la logique
     * @param {number} deltaTime - Temps écoulé depuis la dernière frame (ms)
     */
    onUpdate(deltaTime) {
        if (!this.isActive || this.isDestroyed) {
            return;
        }

        if (this.runtime && typeof this.runtime.onUpdate === 'function') {
            try {
                this.runtime.onUpdate(this, deltaTime, this.api);
            } catch (err) {
                console.error(`[GameObject] Error in onUpdate for ${this.name}:`, err);
            }
        }
    }

    /**
     * Appelé pour le rendu de l'objet
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     */
    onRender(ctx) {
        if (!this.isActive || !this.isVisible || this.isDestroyed) {
            return;
        }

        // Si l'extension a une méthode de rendu personnalisée
        if (this.runtime && typeof this.runtime.onRender === 'function') {
            try {
                this.runtime.onRender(this, ctx, this.api);
            } catch (err) {
                console.error(`[GameObject] Error in onRender for ${this.name}:`, err);
                // Rendu par défaut en cas d'erreur
                this.renderDefault(ctx);
            }
        } else {
            // Rendu par défaut si pas de méthode personnalisée
            this.renderDefault(ctx);
        }
    }

    /**
     * Rendu par défaut (rectangle avec bordure)
     * @param {CanvasRenderingContext2D} ctx - Contexte canvas
     */
    renderDefault(ctx) {
        const { x, y, width, height, angle, opacity } = this.getTransform();

        ctx.save();

        // Opacité
        ctx.globalAlpha = opacity;

        // Transformation
        ctx.translate(x + width / 2, y + height / 2);
        if (angle) {
            ctx.rotate((angle * Math.PI) / 180);
        }

        // Rectangle par défaut
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-width / 2, -height / 2, width, height);

        // Croix pour indiquer "pas de rendu"
        ctx.beginPath();
        ctx.moveTo(-width / 2, -height / 2);
        ctx.lineTo(width / 2, height / 2);
        ctx.moveTo(width / 2, -height / 2);
        ctx.lineTo(-width / 2, height / 2);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Appelé lors de la destruction de l'objet
     */
    onDestroy() {
        if (this.isDestroyed) {
            return;
        }

        if (this.runtime && typeof this.runtime.onDestroyed === 'function') {
            try {
                this.runtime.onDestroyed(this, this.api);
            } catch (err) {
                console.error(`[GameObject] Error in onDestroy for ${this.name}:`, err);
            }
        }

        this.isDestroyed = true;
        this.isActive = false;
    }

    /**
     * Appelé lors d'une collision (si système de collision activé)
     * @param {GameObject} other - L'autre objet en collision
     */
    onCollision(other) {
        if (!this.isActive || this.isDestroyed) {
            return;
        }

        if (this.runtime && typeof this.runtime.onCollision === 'function') {
            try {
                this.runtime.onCollision(this, other, this.api);
            } catch (err) {
                console.error(`[GameObject] Error in onCollision for ${this.name}:`, err);
            }
        }
    }

    /**
     * Appelé lors d'événements d'input (si l'objet est interactif)
     * @param {InputEvent} event - L'événement d'input
     */
    onInput(event) {
        if (!this.isActive || this.isDestroyed) {
            return;
        }

        if (this.runtime && typeof this.runtime.onInput === 'function') {
            try {
                this.runtime.onInput(this, event, this.api);
            } catch (err) {
                console.error(`[GameObject] Error in onInput for ${this.name}:`, err);
            }
        }
    }

    // ========== Méthodes Helper Transform ==========

    /**
     * Obtenir toutes les propriétés de transformation
     * @returns {Object} Transform properties
     */
    getTransform() {
        return {
            x: parseFloat(this.properties.x) || 0,
            y: parseFloat(this.properties.y) || 0,
            width: parseFloat(this.properties.width) || 100,
            height: parseFloat(this.properties.height) || 100,
            angle: parseFloat(this.properties.angle) || 0,
            scaleX: parseFloat(this.properties.scaleX) || 1,
            scaleY: parseFloat(this.properties.scaleY) || 1,
            opacity: parseFloat(this.properties.opacity) !== undefined ? parseFloat(this.properties.opacity) : 1
        };
    }

    /**
     * Obtenir la position
     * @returns {Object} {x, y}
     */
    getPosition() {
        return {
            x: parseFloat(this.properties.x) || 0,
            y: parseFloat(this.properties.y) || 0
        };
    }

    /**
     * Définir la position
     * @param {number} x - Position X
     * @param {number} y - Position Y
     */
    setPosition(x, y) {
        this.properties.x = x;
        this.properties.y = y;
    }

    /**
     * Obtenir la taille
     * @returns {Object} {width, height}
     */
    getSize() {
        return {
            width: parseFloat(this.properties.width) || 100,
            height: parseFloat(this.properties.height) || 100
        };
    }

    /**
     * Définir la taille
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     */
    setSize(width, height) {
        this.properties.width = width;
        this.properties.height = height;
    }

    /**
     * Obtenir la rotation (en degrés)
     * @returns {number} Angle en degrés
     */
    getRotation() {
        return parseFloat(this.properties.angle) || 0;
    }

    /**
     * Définir la rotation (en degrés)
     * @param {number} angle - Angle en degrés
     */
    setRotation(angle) {
        this.properties.angle = angle;
    }

    /**
     * Obtenir le rectangle de l'objet (bounding box)
     * @returns {Object} {x, y, width, height}
     */
    getRect() {
        const { x, y, width, height } = this.getTransform();
        return { x, y, width, height };
    }

    /**
     * Obtenir le centre de l'objet
     * @returns {Object} {x, y}
     */
    getCenter() {
        const { x, y, width, height } = this.getTransform();
        return {
            x: x + width / 2,
            y: y + height / 2
        };
    }

    // ========== Méthodes Helper Propriétés ==========

    /**
     * Obtenir une propriété
     * @param {string} key - Nom de la propriété
     * @param {*} defaultValue - Valeur par défaut
     * @returns {*} La valeur de la propriété
     */
    getProperty(key, defaultValue = null) {
        return this.properties[key] !== undefined ? this.properties[key] : defaultValue;
    }

    /**
     * Définir une propriété
     * @param {string} key - Nom de la propriété
     * @param {*} value - Valeur
     */
    setProperty(key, value) {
        this.properties[key] = value;
    }

    /**
     * Vérifier si une propriété existe
     * @param {string} key - Nom de la propriété
     * @returns {boolean} True si la propriété existe
     */
    hasProperty(key) {
        return this.properties[key] !== undefined;
    }

    // ========== Méthodes Helper État ==========

    /**
     * Activer l'objet
     */
    activate() {
        this.isActive = true;
    }

    /**
     * Désactiver l'objet (ne sera plus mis à jour ni rendu)
     */
    deactivate() {
        this.isActive = false;
    }

    /**
     * Afficher l'objet
     */
    show() {
        this.isVisible = true;
        this.properties.visible = true;
    }

    /**
     * Cacher l'objet
     */
    hide() {
        this.isVisible = false;
        this.properties.visible = false;
    }

    // ========== Utilitaires ==========

    /**
     * Copie profonde d'un objet
     * @param {Object} obj - Objet à copier
     * @returns {Object} Copie
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Générer une couleur aléatoire pour le debug
     * @returns {string} Couleur hex
     */
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * Obtenir une représentation string de l'objet
     * @returns {string} Description
     */
    toString() {
        return `GameObject(${this.name}, ${this.extension}, id:${this.id})`;
    }
}

module.exports = GameObject;
