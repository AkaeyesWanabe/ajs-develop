/**
 * RotateEffect - Fait tourner un objet automatiquement
 *
 * Script simple pour démontrer les propriétés configurables.
 */

class RotateEffect {
    // Propriétés configurables
    properties = {
        rotationSpeed: 45,  // Degrés par seconde
        clockwise: true     // Direction de rotation
    };

    onStart(gameObject, api) {
        api.log(`RotateEffect initialized for ${gameObject.name} at ${this.properties.rotationSpeed}°/s`);
        this.currentAngle = gameObject.properties.angle || 0;
    }

    onUpdate(gameObject, deltaTime, api) {
        // Convertir deltaTime en secondes
        const dt = deltaTime / 1000;

        // Calculer la rotation
        const rotationAmount = this.properties.rotationSpeed * dt;
        const direction = this.properties.clockwise ? 1 : -1;

        // Appliquer la rotation
        this.currentAngle += rotationAmount * direction;

        // Normaliser l'angle entre 0-360
        this.currentAngle = this.currentAngle % 360;
        if (this.currentAngle < 0) {
            this.currentAngle += 360;
        }

        // Mettre à jour la propriété de l'objet
        gameObject.properties.angle = this.currentAngle;
    }

    onDestroy(gameObject, api) {
        // Nettoyage si nécessaire
    }
}

module.exports = RotateEffect;
