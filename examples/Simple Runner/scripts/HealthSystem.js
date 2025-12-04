/**
 * HealthSystem - Gère la santé et la régénération d'un objet
 *
 * Ce script démontre les propriétés configurables dans l'éditeur.
 * Chaque objet peut avoir des valeurs différentes pour ces propriétés.
 */

class HealthSystem {
    // Propriétés configurables (visibles dans l'éditeur)
    properties = {
        maxHealth: 100,      // Santé maximale
        currentHealth: 100,  // Santé actuelle
        regeneration: 5,     // Points de régénération par seconde
        canRegenerate: true  // Peut régénérer automatiquement
    };

    onStart(gameObject, api) {
        api.log(`HealthSystem initialized for ${gameObject.name} with ${this.properties.maxHealth} HP`);

        // S'assurer que la santé actuelle ne dépasse pas le max
        if (this.properties.currentHealth > this.properties.maxHealth) {
            this.properties.currentHealth = this.properties.maxHealth;
        }
    }

    onUpdate(gameObject, deltaTime, api) {
        // Régénération automatique
        if (this.properties.canRegenerate && this.properties.currentHealth < this.properties.maxHealth) {
            const dt = deltaTime / 1000; // Convertir en secondes
            const regenAmount = this.properties.regeneration * dt;

            this.properties.currentHealth = Math.min(
                this.properties.currentHealth + regenAmount,
                this.properties.maxHealth
            );
        }

        // Afficher la santé dans la console pour debug (toutes les 2 secondes)
        if (!this.lastLogTime || (Date.now() - this.lastLogTime) > 2000) {
            this.lastLogTime = Date.now();
            const healthPercent = Math.round((this.properties.currentHealth / this.properties.maxHealth) * 100);
            api.log(`${gameObject.name} Health: ${Math.round(this.properties.currentHealth)}/${this.properties.maxHealth} (${healthPercent}%)`);
        }
    }

    /**
     * Infliger des dégâts à l'objet
     * @param {number} damage - Montant des dégâts
     */
    takeDamage(damage) {
        this.properties.currentHealth = Math.max(0, this.properties.currentHealth - damage);
    }

    /**
     * Soigner l'objet
     * @param {number} amount - Montant de soin
     */
    heal(amount) {
        this.properties.currentHealth = Math.min(
            this.properties.currentHealth + amount,
            this.properties.maxHealth
        );
    }

    /**
     * Vérifier si l'objet est vivant
     * @returns {boolean}
     */
    isAlive() {
        return this.properties.currentHealth > 0;
    }

    onDestroy(gameObject, api) {
        api.log(`HealthSystem destroyed for ${gameObject.name}`);
    }
}

module.exports = HealthSystem;
