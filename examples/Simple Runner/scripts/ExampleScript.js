/**
 * ExampleScript - Script d'exemple pour montrer comment utiliser le système de scripting
 *
 * Ce script fonctionne comme un composant Unity MonoBehaviour.
 * Il peut être attaché à n'importe quel GameObject via les propriétés de l'objet.
 *
 * Événements du cycle de vie:
 * - onStart(): Appelé une fois au démarrage de la scène
 * - onUpdate(gameObject, deltaTime, api): Appelé à chaque frame
 * - onDestroy(gameObject, api): Appelé quand l'objet est détruit
 *
 * Événements personnalisés:
 * - onClick(gameObject, api): Appelé quand l'objet est cliqué
 * - onCollision(gameObject, other, api): Appelé lors d'une collision (si implémenté)
 */

class ExampleScript {
    /**
     * Propriétés configurables depuis l'éditeur
     * Ces valeurs peuvent être modifiées pour chaque instance de script
     */
    properties = {
        speed: 100,           // Vitesse de déplacement en pixels/seconde
        rotationSpeed: 90,    // Vitesse de rotation en degrés/seconde
        jumpHeight: 200,      // Hauteur de saut
        color: "#ff0000"      // Couleur (pour référence)
    };

    /**
     * Variables internes du script
     * Utilisez 'this' pour stocker l'état entre les frames
     */
    velocity = { x: 0, y: 0 };
    isJumping = false;

    /**
     * onStart - Appelé une fois au démarrage de la scène
     * Utilisez cette méthode pour l'initialisation
     *
     * @param {GameObject} gameObject - L'objet de jeu auquel le script est attaché
     * @param {Object} api - L'API de scripting pour accéder aux systèmes du jeu
     */
    onStart(gameObject, api) {
        api.log(`ExampleScript started for ${gameObject.name}`);

        // Exemple: Initialiser la position
        // gameObject.properties.x = 100;
        // gameObject.properties.y = 100;

        // Exemple: Trouver un autre objet dans la scène
        // const player = api.findGameObject('Player');
        // if (player) {
        //     api.log('Found player at position:', player.properties.x, player.properties.y);
        // }
    }

    /**
     * onUpdate - Appelé à chaque frame
     * Utilisez cette méthode pour la logique de jeu et les animations
     *
     * @param {GameObject} gameObject - L'objet de jeu
     * @param {number} deltaTime - Temps écoulé depuis la dernière frame (en millisecondes)
     * @param {Object} api - L'API de scripting
     */
    onUpdate(gameObject, deltaTime, api) {
        // Convertir deltaTime en secondes pour faciliter les calculs
        const dt = deltaTime / 1000;

        // === EXEMPLE 1: Déplacement avec les touches du clavier ===
        if (api.input && api.input.runtime) {
            let moveX = 0;
            let moveY = 0;

            // Vérifier les touches directionnelles
            if (api.input.runtime.isKeyHeld(api.input, 'ArrowRight') ||
                api.input.runtime.isKeyHeld(api.input, 'KeyD')) {
                moveX = this.properties.speed * dt;
            }
            if (api.input.runtime.isKeyHeld(api.input, 'ArrowLeft') ||
                api.input.runtime.isKeyHeld(api.input, 'KeyA')) {
                moveX = -this.properties.speed * dt;
            }
            if (api.input.runtime.isKeyHeld(api.input, 'ArrowUp') ||
                api.input.runtime.isKeyHeld(api.input, 'KeyW')) {
                moveY = -this.properties.speed * dt;
            }
            if (api.input.runtime.isKeyHeld(api.input, 'ArrowDown') ||
                api.input.runtime.isKeyHeld(api.input, 'KeyS')) {
                moveY = this.properties.speed * dt;
            }

            // Appliquer le mouvement
            if (moveX !== 0 || moveY !== 0) {
                gameObject.properties.x += moveX;
                gameObject.properties.y += moveY;
            }

            // Saut avec la touche Espace
            if (api.input.runtime.isKeyPressed(api.input, 'Space') && !this.isJumping) {
                this.velocity.y = -this.properties.jumpHeight;
                this.isJumping = true;
            }
        }

        // === EXEMPLE 2: Rotation automatique ===
        // gameObject.properties.angle += this.properties.rotationSpeed * dt;

        // === EXEMPLE 3: Gravité simple ===
        if (this.isJumping) {
            const gravity = 500; // pixels/sec²
            this.velocity.y += gravity * dt;
            gameObject.properties.y += this.velocity.y * dt;

            // Atterrir au sol (y = 400 par exemple)
            if (gameObject.properties.y >= 400) {
                gameObject.properties.y = 400;
                this.velocity.y = 0;
                this.isJumping = false;
            }
        }

        // === EXEMPLE 4: Suivre la souris ===
        // if (api.mouse && api.mouse.runtime) {
        //     const mousePos = api.mouse.runtime.getMousePosition(api.mouse);
        //     const dx = mousePos.x - gameObject.properties.x;
        //     const dy = mousePos.y - gameObject.properties.y;
        //     const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        //     gameObject.properties.angle = angle;
        // }

        // === EXEMPLE 5: Changer de propriété selon une condition ===
        // if (api.time && api.time.runtime) {
        //     const totalTime = api.time.runtime.getTotalTime(api.time);
        //     // Faire clignoter l'objet toutes les secondes
        //     gameObject.isVisible = Math.floor(totalTime) % 2 === 0;
        // }
    }

    /**
     * onDestroy - Appelé quand l'objet est détruit
     * Utilisez cette méthode pour nettoyer les ressources
     *
     * @param {GameObject} gameObject - L'objet de jeu
     * @param {Object} api - L'API de scripting
     */
    onDestroy(gameObject, api) {
        api.log(`ExampleScript destroyed for ${gameObject.name}`);

        // Nettoyage si nécessaire
        // Par exemple: arrêter des sons, libérer des ressources, etc.
    }

    /**
     * onClick - Événement personnalisé appelé quand l'objet est cliqué
     * (Nécessite une extension qui supporte les clics, comme com.ajs.button)
     *
     * @param {GameObject} gameObject - L'objet de jeu
     * @param {Object} api - L'API de scripting
     */
    onClick(gameObject, api) {
        api.log(`${gameObject.name} was clicked!`);

        // Exemple: Changer une propriété au clic
        // gameObject.properties.bkgColor = this.properties.color;
    }
}

// IMPORTANT: Exporter la classe pour qu'elle soit utilisable par le ScriptManager
module.exports = ExampleScript;
