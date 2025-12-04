/**
 * Keyboard Input System Extension
 * Gère tous les inputs clavier du jeu
 * API simplifiée type Unity
 */

// KeyCode constants pour faciliter l'utilisation
const KeyCode = {
    // Letters
    A: 'KeyA', B: 'KeyB', C: 'KeyC', D: 'KeyD', E: 'KeyE', F: 'KeyF',
    G: 'KeyG', H: 'KeyH', I: 'KeyI', J: 'KeyJ', K: 'KeyK', L: 'KeyL',
    M: 'KeyM', N: 'KeyN', O: 'KeyO', P: 'KeyP', Q: 'KeyQ', R: 'KeyR',
    S: 'KeyS', T: 'KeyT', U: 'KeyU', V: 'KeyV', W: 'KeyW', X: 'KeyX',
    Y: 'KeyY', Z: 'KeyZ',

    // Numbers
    Alpha0: 'Digit0', Alpha1: 'Digit1', Alpha2: 'Digit2', Alpha3: 'Digit3',
    Alpha4: 'Digit4', Alpha5: 'Digit5', Alpha6: 'Digit6', Alpha7: 'Digit7',
    Alpha8: 'Digit8', Alpha9: 'Digit9',

    // Arrow keys
    LeftArrow: 'ArrowLeft',
    RightArrow: 'ArrowRight',
    UpArrow: 'ArrowUp',
    DownArrow: 'ArrowDown',

    // Special keys
    Space: 'Space',
    Enter: 'Enter',
    Escape: 'Escape',
    Tab: 'Tab',
    Shift: 'ShiftLeft',
    Control: 'ControlLeft',
    Alt: 'AltLeft',

    // Function keys
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4',
    F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8',
    F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12'
};

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

        // Exposer KeyCode globalement pour faciliter l'accès
        if (typeof window !== 'undefined') {
            window.KeyCode = KeyCode;
        }

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
    },

    // ========== API SIMPLIFIÉE TYPE UNITY ==========

    /**
     * Vérifie si une touche est actuellement pressée (maintenue)
     * Usage: Input.GetKey(KeyCode.A) ou Input.GetKey('a')
     * @param {Object} gameObject - L'objet système clavier
     * @param {string} key - La touche à vérifier (KeyCode ou string)
     * @returns {boolean}
     */
    GetKey(gameObject, key) {
        return !!gameObject.internal.keys[key];
    },

    /**
     * Vérifie si une touche a été pressée cette frame
     * Usage: Input.GetKeyDown(KeyCode.Space)
     * @param {Object} gameObject - L'objet système clavier
     * @param {string} key - La touche à vérifier
     * @returns {boolean}
     */
    GetKeyDown(gameObject, key) {
        return !!gameObject.internal.keysPressed[key];
    },

    /**
     * Vérifie si une touche a été relâchée cette frame
     * Usage: Input.GetKeyUp(KeyCode.Escape)
     * @param {Object} gameObject - L'objet système clavier
     * @param {string} key - La touche à vérifier
     * @returns {boolean}
     */
    GetKeyUp(gameObject, key) {
        return !!gameObject.internal.keysReleased[key];
    },

    /**
     * Obtient l'axe horizontal (-1, 0, 1)
     * Usage: Input.GetAxisHorizontal()
     * Utilise les flèches gauche/droite ou A/D
     */
    GetAxisHorizontal(gameObject) {
        let axis = 0;
        if (this.GetKey(gameObject, 'ArrowLeft') || this.GetKey(gameObject, 'a') || this.GetKey(gameObject, 'KeyA')) axis -= 1;
        if (this.GetKey(gameObject, 'ArrowRight') || this.GetKey(gameObject, 'd') || this.GetKey(gameObject, 'KeyD')) axis += 1;
        return axis;
    },

    /**
     * Obtient l'axe vertical (-1, 0, 1)
     * Usage: Input.GetAxisVertical()
     * Utilise les flèches haut/bas ou W/S
     */
    GetAxisVertical(gameObject) {
        let axis = 0;
        if (this.GetKey(gameObject, 'ArrowUp') || this.GetKey(gameObject, 'w') || this.GetKey(gameObject, 'KeyW')) axis -= 1;
        if (this.GetKey(gameObject, 'ArrowDown') || this.GetKey(gameObject, 's') || this.GetKey(gameObject, 'KeyS')) axis += 1;
        return axis;
    },

    /**
     * Réinitialiser les inputs de frame (appelé par le player)
     */
    resetFrameInputs(gameObject) {
        // Cette méthode est déjà appelée par le player dans la game loop
        // mais on la garde ici pour compatibilité
    }
};

module.exports = runtime;
