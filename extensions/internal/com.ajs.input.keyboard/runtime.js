/**
 * Keyboard Input System Extension
 * Gère tous les inputs clavier du jeu
 */
const runtime = {
    name: "Keyboard Input System",
    version: "1.0.0",
    type: "system",

    /**
     * Initialisation du système clavier
     */
    onCreated(gameObject, api) {

        // État des touches
        gameObject.internal.keys = {};
        gameObject.internal.keysPressed = {};
        gameObject.internal.keysReleased = {};
        gameObject.internal.frameInputs = {
            keysPressed: new Set(),
            keysReleased: new Set()
        };

        // Setup event listeners
        this.setupListeners(gameObject);
    },

    /**
     * Configuration des event listeners
     */
    setupListeners(gameObject) {
        const internal = gameObject.internal;

        window.addEventListener('keydown', (e) => {
            const key = e.key;
            const code = e.code;

            // Détecter nouvelle pression
            if (!internal.keys[key]) {
                internal.frameInputs.keysPressed.add(key);
                internal.frameInputs.keysPressed.add(code);
            }

            internal.keys[key] = true;
            internal.keys[code] = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key;
            const code = e.code;

            internal.frameInputs.keysReleased.add(key);
            internal.frameInputs.keysReleased.add(code);

            internal.keys[key] = false;
            internal.keys[code] = false;
        });
    },

    /**
     * Mise à jour chaque frame
     */
    onUpdate(gameObject, deltaTime, api) {
        const internal = gameObject.internal;

        // Copier les états pour cette frame
        internal.keysPressed = {};
        internal.keysReleased = {};

        internal.frameInputs.keysPressed.forEach(key => {
            internal.keysPressed[key] = true;
        });

        internal.frameInputs.keysReleased.forEach(key => {
            internal.keysReleased[key] = true;
        });

        // Réinitialiser pour la prochaine frame
        internal.frameInputs.keysPressed.clear();
        internal.frameInputs.keysReleased.clear();
    },

    // ========== API ==========

    /**
     * Vérifier si une touche est pressée
     */
    isKeyPressed(gameObject, key) {
        return !!gameObject.internal.keys[key];
    },

    /**
     * Vérifier si une touche vient d'être pressée
     */
    isKeyJustPressed(gameObject, key) {
        return !!gameObject.internal.keysPressed[key];
    },

    /**
     * Vérifier si une touche vient d'être relâchée
     */
    isKeyJustReleased(gameObject, key) {
        return !!gameObject.internal.keysReleased[key];
    },

    /**
     * Obtenir toutes les touches pressées
     */
    getPressedKeys(gameObject) {
        return Object.keys(gameObject.internal.keys).filter(key => gameObject.internal.keys[key]);
    },

    /**
     * Obtenir l'axe (-1, 0, 1)
     */
    getAxis(gameObject, left, right) {
        let axis = 0;
        if (this.isKeyPressed(gameObject, left)) axis -= 1;
        if (this.isKeyPressed(gameObject, right)) axis += 1;
        return axis;
    },

    /**
     * Obtenir l'axe de mouvement WASD/Flèches
     */
    getMovementAxis(gameObject) {
        const x = this.getAxis(gameObject, 'ArrowLeft', 'ArrowRight') ||
                  this.getAxis(gameObject, 'a', 'd');
        const y = this.getAxis(gameObject, 'ArrowUp', 'ArrowDown') ||
                  this.getAxis(gameObject, 'w', 's');
        return { x, y };
    },

    /**
     * Réinitialiser tous les inputs
     */
    reset(gameObject) {
        gameObject.internal.keys = {};
        gameObject.internal.keysPressed = {};
        gameObject.internal.keysReleased = {};
        gameObject.internal.frameInputs.keysPressed.clear();
        gameObject.internal.frameInputs.keysReleased.clear();
    }
};

module.exports = runtime;
