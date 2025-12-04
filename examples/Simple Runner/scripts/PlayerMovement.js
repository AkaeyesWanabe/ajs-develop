/**
 * PlayerMovement - Script simple pour déplacer un objet avec les touches du clavier
 *
 * Ce script permet de contrôler un objet avec les touches WASD ou les flèches directionnelles.
 */

class PlayerMovement {
    // Propriétés configurables
    properties = {
        speed: 200,  // Vitesse de déplacement en pixels/seconde
    };

    onStart(gameObject, api) {
        api.log(`PlayerMovement initialized for ${gameObject.name}`);
    }

    onUpdate(gameObject, deltaTime, api) {
        // Convertir deltaTime en secondes
        const dt = deltaTime / 1000;

        // Vérifier si l'extension input est disponible
        if (!api.input || !api.input.runtime) {
            return;
        }

        let moveX = 0;
        let moveY = 0;

        // Déplacement horizontal
        if (api.input.runtime.isKeyPressed(api.input, 'ArrowRight') ||
            api.input.runtime.isKeyPressed(api.input, 'KeyD') ||
            api.input.runtime.isKeyPressed(api.input, 'd')) {
            moveX = this.properties.speed * dt;
        }
        if (api.input.runtime.isKeyPressed(api.input, 'ArrowLeft') ||
            api.input.runtime.isKeyPressed(api.input, 'KeyA') ||
            api.input.runtime.isKeyPressed(api.input, 'a')) {
            moveX = -this.properties.speed * dt;
        }

        // Déplacement vertical
        if (api.input.runtime.isKeyPressed(api.input, 'ArrowUp') ||
            api.input.runtime.isKeyPressed(api.input, 'KeyW') ||
            api.input.runtime.isKeyPressed(api.input, 'w')) {
            moveY = -this.properties.speed * dt;
        }
        if (api.input.runtime.isKeyPressed(api.input, 'ArrowDown') ||
            api.input.runtime.isKeyPressed(api.input, 'KeyS') ||
            api.input.runtime.isKeyPressed(api.input, 's')) {
            moveY = this.properties.speed * dt;
        }

        // Appliquer le mouvement
        gameObject.properties.x += moveX;
        gameObject.properties.y += moveY;
    }

    onDestroy(gameObject, api) {
        // Nettoyage si nécessaire
    }
}

module.exports = PlayerMovement;
