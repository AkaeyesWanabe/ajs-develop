/**
 * AnimationController - Contrôle les animations d'un sprite en fonction du mouvement
 *
 * Ce script change automatiquement l'animation d'un sprite en fonction de son état.
 * Nécessite que l'objet soit un sprite avec un fichier .anim chargé.
 */

class AnimationController {
    // Propriétés configurables
    properties = {
        idleAnimation: 'idle',      // Nom de l'animation idle
        walkAnimation: 'walk',      // Nom de l'animation de marche
        runAnimation: 'run',        // Nom de l'animation de course
        jumpAnimation: 'jump',      // Nom de l'animation de saut
        fallAnimation: 'fall',      // Nom de l'animation de chute
        useRunKey: false,           // Utiliser une touche pour courir (Shift)
        autoDetectMovement: true,   // Détecter automatiquement le mouvement
        movementThreshold: 0.1      // Seuil de vitesse pour détecter le mouvement
    };

    onStart(gameObject, api) {
        api.log(`AnimationController initialized for ${gameObject.name}`);

        // État interne
        this.currentState = 'idle';
        this.previousX = gameObject.properties.x;
        this.previousY = gameObject.properties.y;
        this.velocity = { x: 0, y: 0 };

        // Vérifier que l'objet est un sprite
        if (gameObject.extension !== 'com.ajs.sprite') {
            api.warn(`AnimationController: ${gameObject.name} is not a sprite!`);
            this.isValid = false;
            return;
        }

        // Vérifier que le sprite runtime est disponible
        this.spriteRuntime = api.getExtension('com.ajs.sprite');
        if (!this.spriteRuntime) {
            api.warn('AnimationController: Sprite runtime not available');
            this.isValid = false;
            return;
        }

        // Vérifier que setAnimation existe
        if (typeof this.spriteRuntime.setAnimation !== 'function') {
            api.warn('AnimationController: setAnimation method not available');
            this.isValid = false;
            return;
        }

        this.isValid = true;

        // Définir l'animation initiale
        this.setAnimation(gameObject, this.properties.idleAnimation);
    }

    onUpdate(gameObject, deltaTime, api) {
        if (!this.isValid) return;

        // Calculer la vélocité si auto-détection activée
        if (this.properties.autoDetectMovement) {
            const dt = deltaTime / 1000;
            if (dt > 0) {
                this.velocity.x = (gameObject.properties.x - this.previousX) / dt;
                this.velocity.y = (gameObject.properties.y - this.previousY) / dt;
            }

            this.previousX = gameObject.properties.x;
            this.previousY = gameObject.properties.y;
        }

        // Déterminer le nouvel état
        let newState = 'idle';

        // Vérifier le mouvement
        const isMoving = Math.abs(this.velocity.x) > this.properties.movementThreshold ||
                        Math.abs(this.velocity.y) > this.properties.movementThreshold;

        if (isMoving) {
            // Vérifier si la touche Shift est pressée pour courir
            if (this.properties.useRunKey && api.input && api.input.runtime) {
                const isRunning = api.input.runtime.isKeyPressed(api.input, 'Shift') ||
                                api.input.runtime.isKeyPressed(api.input, 'ShiftLeft') ||
                                api.input.runtime.isKeyPressed(api.input, 'ShiftRight');

                newState = isRunning ? 'run' : 'walk';
            } else {
                newState = 'walk';
            }
        }

        // Changer l'animation si l'état a changé
        if (newState !== this.currentState) {
            this.currentState = newState;

            let animationName = this.properties.idleAnimation;
            switch (newState) {
                case 'walk':
                    animationName = this.properties.walkAnimation;
                    break;
                case 'run':
                    animationName = this.properties.runAnimation;
                    break;
                case 'jump':
                    animationName = this.properties.jumpAnimation;
                    break;
                case 'fall':
                    animationName = this.properties.fallAnimation;
                    break;
            }

            this.setAnimation(gameObject, animationName);
        }
    }

    /**
     * Changer l'animation du sprite
     * @param {GameObject} gameObject - L'objet sprite
     * @param {string} animationName - Nom de l'animation
     */
    setAnimation(gameObject, animationName) {
        if (!this.spriteRuntime || !this.isValid) return;

        // Vérifier que l'animation existe
        const availableAnimations = this.spriteRuntime.getAnimationNames(gameObject);
        if (!availableAnimations.includes(animationName)) {
            // Animation non trouvée, essayer de jouer la première disponible
            if (availableAnimations.length > 0) {
                this.spriteRuntime.setAnimation(gameObject, availableAnimations[0], true);
            }
            return;
        }

        this.spriteRuntime.setAnimation(gameObject, animationName, true);
    }

    /**
     * Forcer un changement d'état (appelable depuis d'autres scripts)
     * @param {string} state - 'idle', 'walk', 'run', 'jump', 'fall'
     */
    setState(state) {
        this.currentState = state;
    }

    /**
     * Jouer une animation spécifique
     * @param {GameObject} gameObject - L'objet sprite
     * @param {string} animationName - Nom de l'animation
     */
    playAnimation(gameObject, animationName) {
        this.setAnimation(gameObject, animationName);
    }

    onDestroy(gameObject, api) {
        // Nettoyage si nécessaire
    }
}

module.exports = AnimationController;
