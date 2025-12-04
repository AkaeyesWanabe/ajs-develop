/**
 * Rotator - Fait tourner un objet automatiquement
 *
 * Script simple qui fait tourner un objet à une vitesse configurable.
 */

class Rotator {
    // Propriétés configurables
    properties = {
        rotationSpeed: 90,  // Degrés par seconde
    };

    onStart(gameObject, api) {
        api.log(`Rotator started for ${gameObject.name}`);
    }

    onUpdate(gameObject, deltaTime, api) {
        // Convertir deltaTime en secondes
        const dt = deltaTime / 1000;

        // Appliquer la rotation
        gameObject.properties.angle += this.properties.rotationSpeed * dt;

        // Garder l'angle entre 0 et 360 degrés
        if (gameObject.properties.angle >= 360) {
            gameObject.properties.angle -= 360;
        } else if (gameObject.properties.angle < 0) {
            gameObject.properties.angle += 360;
        }
    }

    onDestroy(gameObject, api) {
        // Nettoyage si nécessaire
    }
}

module.exports = Rotator;
