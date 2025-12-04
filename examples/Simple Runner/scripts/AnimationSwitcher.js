/**
 * AnimationSwitcher - Change l'animation d'un sprite avec les touches du clavier
 *
 * Ce script permet de changer manuellement l'animation d'un sprite
 * en appuyant sur des touches configurables.
 */

class AnimationSwitcher {
    // Propriétés configurables
    properties = {
        animation1: 'idle',         // Animation pour la touche 1
        animation2: 'walk',         // Animation pour la touche 2
        animation3: 'run',          // Animation pour la touche 3
        animation4: 'jump',         // Animation pour la touche 4
        animation5: '',             // Animation pour la touche 5 (optionnel)
        animation6: '',             // Animation pour la touche 6 (optionnel)
        useNumKeys: true,           // Utiliser les touches 1-6 du clavier
        currentAnimation: 'idle'    // Animation par défaut au démarrage
    };

    onStart(gameObject, api) {
        api.log(`AnimationSwitcher initialized for ${gameObject.name}`);

        // Vérifier que l'objet est un sprite
        if (gameObject.extension !== 'com.ajs.sprite') {
            api.error(`AnimationSwitcher: ${gameObject.name} is not a sprite!`);
            this.isValid = false;
            return;
        }

        // Obtenir l'extension sprite
        this.spriteRuntime = api.getExtension('com.ajs.sprite');
        if (!this.spriteRuntime || typeof this.spriteRuntime.setAnimation !== 'function') {
            api.error('AnimationSwitcher: Sprite runtime not available or setAnimation not found');
            this.isValid = false;
            return;
        }

        this.isValid = true;

        // Obtenir la liste des animations disponibles
        this.availableAnimations = this.spriteRuntime.getAnimationNames(gameObject);
        api.log(`Available animations: ${this.availableAnimations.join(', ')}`);

        // Définir l'animation initiale
        if (this.properties.currentAnimation &&
            this.availableAnimations.includes(this.properties.currentAnimation)) {
            this.spriteRuntime.setAnimation(gameObject, this.properties.currentAnimation, true);
        } else if (this.availableAnimations.length > 0) {
            // Fallback: utiliser la première animation disponible
            this.spriteRuntime.setAnimation(gameObject, this.availableAnimations[0], true);
            api.warn(`Animation "${this.properties.currentAnimation}" not found, using "${this.availableAnimations[0]}"`);
        }
    }

    onUpdate(gameObject, deltaTime, api) {
        if (!this.isValid) return;

        // Vérifier les inputs si le système clavier est disponible
        if (!api.input || !api.input.runtime) {
            return;
        }

        const input = api.input;

        // Touches numériques pour changer d'animation
        if (this.properties.useNumKeys) {
            if (input.runtime.isKeyJustPressed(input, 'Digit1') ||
                input.runtime.isKeyJustPressed(input, '1')) {
                this.switchToAnimation(gameObject, this.properties.animation1, api);
            }
            if (input.runtime.isKeyJustPressed(input, 'Digit2') ||
                input.runtime.isKeyJustPressed(input, '2')) {
                this.switchToAnimation(gameObject, this.properties.animation2, api);
            }
            if (input.runtime.isKeyJustPressed(input, 'Digit3') ||
                input.runtime.isKeyJustPressed(input, '3')) {
                this.switchToAnimation(gameObject, this.properties.animation3, api);
            }
            if (input.runtime.isKeyJustPressed(input, 'Digit4') ||
                input.runtime.isKeyJustPressed(input, '4')) {
                this.switchToAnimation(gameObject, this.properties.animation4, api);
            }
            if (this.properties.animation5 &&
                (input.runtime.isKeyJustPressed(input, 'Digit5') ||
                 input.runtime.isKeyJustPressed(input, '5'))) {
                this.switchToAnimation(gameObject, this.properties.animation5, api);
            }
            if (this.properties.animation6 &&
                (input.runtime.isKeyJustPressed(input, 'Digit6') ||
                 input.runtime.isKeyJustPressed(input, '6'))) {
                this.switchToAnimation(gameObject, this.properties.animation6, api);
            }
        }
    }

    /**
     * Changer vers une animation spécifique
     * @param {GameObject} gameObject - L'objet sprite
     * @param {string} animationName - Nom de l'animation
     * @param {Object} api - API du script
     */
    switchToAnimation(gameObject, animationName, api) {
        if (!animationName || animationName === '') {
            return;
        }

        // Vérifier que l'animation existe
        if (!this.availableAnimations.includes(animationName)) {
            api.warn(`Animation "${animationName}" not found in sprite`);
            return;
        }

        // Changer l'animation
        this.spriteRuntime.setAnimation(gameObject, animationName, true);
        api.log(`Switched to animation: ${animationName}`);

        // Mettre à jour la propriété courante
        this.properties.currentAnimation = animationName;
    }

    /**
     * Obtenir l'animation courante
     * @returns {string} Nom de l'animation courante
     */
    getCurrentAnimation() {
        return this.properties.currentAnimation;
    }

    /**
     * Lister toutes les animations disponibles
     * @param {Object} api - API du script
     */
    listAnimations(api) {
        api.log('Available animations:');
        this.availableAnimations.forEach((anim, index) => {
            api.log(`  ${index + 1}. ${anim}`);
        });
    }

    onDestroy(gameObject, api) {
        // Nettoyage si nécessaire
    }
}

module.exports = AnimationSwitcher;
