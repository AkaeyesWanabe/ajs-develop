/**
 * InputManager
 * Gère tous les inputs du jeu (clavier, souris, touch)
 */
class InputManager {
    constructor(canvas) {
        this.canvas = canvas;

        // État des touches du clavier
        this.keys = {};
        this.keysPressed = {}; // Pour détecter les touches juste pressées
        this.keysReleased = {}; // Pour détecter les touches juste relâchées

        // État de la souris
        this.mouse = {
            x: 0,
            y: 0,
            buttons: {},
            buttonsPressed: {},
            buttonsReleased: {},
            wheelDelta: 0,
            isOverCanvas: false
        };

        // État des touches tactiles
        this.touches = [];

        // Pour gérer les états "just pressed/released"
        this.frameInputs = {
            keysPressed: new Set(),
            keysReleased: new Set(),
            buttonsPressed: new Set(),
            buttonsReleased: new Set()
        };

        this.setupListeners();
    }

    /**
     * Configurer tous les event listeners
     */
    setupListeners() {
        // ========== Clavier ==========
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            const code = e.code;

            // Détecter si c'est une nouvelle pression
            if (!this.keys[key]) {
                this.frameInputs.keysPressed.add(key);
                this.frameInputs.keysPressed.add(code);
            }

            this.keys[key] = true;
            this.keys[code] = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key;
            const code = e.code;

            this.frameInputs.keysReleased.add(key);
            this.frameInputs.keysReleased.add(code);

            this.keys[key] = false;
            this.keys[code] = false;
        });

        // ========== Souris ==========
        this.canvas.addEventListener('mouseenter', () => {
            this.mouse.isOverCanvas = true;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.isOverCanvas = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const button = e.button;

            if (!this.mouse.buttons[button]) {
                this.frameInputs.buttonsPressed.add(button);
            }

            this.mouse.buttons[button] = true;

            // Empêcher le menu contextuel sur clic droit
            if (button === 2) {
                e.preventDefault();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            const button = e.button;

            this.frameInputs.buttonsReleased.add(button);
            this.mouse.buttons[button] = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            this.mouse.wheelDelta = e.deltaY;
            e.preventDefault();
        }, { passive: false });

        // Empêcher le menu contextuel
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // ========== Touch ==========
        this.canvas.addEventListener('touchstart', (e) => {
            this.updateTouches(e.touches);
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            this.updateTouches(e.touches);
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            this.updateTouches(e.touches);
        });

        this.canvas.addEventListener('touchcancel', (e) => {
            this.updateTouches(e.touches);
        });
    }

    /**
     * Mettre à jour l'état des touches tactiles
     * @param {TouchList} touchList - Liste des touches
     */
    updateTouches(touchList) {
        const rect = this.canvas.getBoundingClientRect();

        this.touches = Array.from(touchList).map(touch => ({
            id: touch.identifier,
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
            force: touch.force || 1
        }));
    }

    /**
     * Mettre à jour l'InputManager (appelé chaque frame)
     * Réinitialise les états "just pressed/released"
     */
    update() {
        // Copier les états pour cette frame
        this.keysPressed = {};
        this.keysReleased = {};
        this.mouse.buttonsPressed = {};
        this.mouse.buttonsReleased = {};

        this.frameInputs.keysPressed.forEach(key => {
            this.keysPressed[key] = true;
        });

        this.frameInputs.keysReleased.forEach(key => {
            this.keysReleased[key] = true;
        });

        this.frameInputs.buttonsPressed.forEach(button => {
            this.mouse.buttonsPressed[button] = true;
        });

        this.frameInputs.buttonsReleased.forEach(button => {
            this.mouse.buttonsReleased[button] = true;
        });

        // Réinitialiser pour la prochaine frame
        this.frameInputs.keysPressed.clear();
        this.frameInputs.keysReleased.clear();
        this.frameInputs.buttonsPressed.clear();
        this.frameInputs.buttonsReleased.clear();

        // Réinitialiser la molette
        this.mouse.wheelDelta = 0;
    }

    // ========== API Publique ==========

    /**
     * Vérifier si une touche est pressée (maintenue)
     * @param {string} key - Touche (ex: 'a', 'ArrowUp', 'Space')
     * @returns {boolean} True si pressée
     */
    isKeyPressed(key) {
        return !!this.keys[key];
    }

    /**
     * Vérifier si une touche vient d'être pressée (cette frame)
     * @param {string} key - Touche
     * @returns {boolean} True si juste pressée
     */
    isKeyJustPressed(key) {
        return !!this.keysPressed[key];
    }

    /**
     * Vérifier si une touche vient d'être relâchée (cette frame)
     * @param {string} key - Touche
     * @returns {boolean} True si juste relâchée
     */
    isKeyJustReleased(key) {
        return !!this.keysReleased[key];
    }

    /**
     * Obtenir toutes les touches actuellement pressées
     * @returns {Array<string>} Liste des touches
     */
    getPressedKeys() {
        return Object.keys(this.keys).filter(key => this.keys[key]);
    }

    /**
     * Vérifier si un bouton de souris est pressé (maintenu)
     * @param {number} button - 0=gauche, 1=milieu, 2=droit
     * @returns {boolean} True si pressé
     */
    isMouseButtonPressed(button = 0) {
        return !!this.mouse.buttons[button];
    }

    /**
     * Vérifier si un bouton vient d'être pressé (cette frame)
     * @param {number} button - Numéro du bouton
     * @returns {boolean} True si juste pressé
     */
    isMouseButtonJustPressed(button = 0) {
        return !!this.mouse.buttonsPressed[button];
    }

    /**
     * Vérifier si un bouton vient d'être relâché (cette frame)
     * @param {number} button - Numéro du bouton
     * @returns {boolean} True si juste relâché
     */
    isMouseButtonJustReleased(button = 0) {
        return !!this.mouse.buttonsReleased[button];
    }

    /**
     * Obtenir la position de la souris dans le canvas
     * @returns {{x: number, y: number}} Position
     */
    getMousePosition() {
        return {
            x: this.mouse.x,
            y: this.mouse.y
        };
    }

    /**
     * Obtenir le delta de la molette
     * @returns {number} Delta (positif = bas, négatif = haut)
     */
    getMouseWheelDelta() {
        return this.mouse.wheelDelta;
    }

    /**
     * Vérifier si la souris est au-dessus du canvas
     * @returns {boolean} True si au-dessus
     */
    isMouseOverCanvas() {
        return this.mouse.isOverCanvas;
    }

    /**
     * Obtenir toutes les touches tactiles actives
     * @returns {Array} Liste des touches avec {id, x, y, force}
     */
    getTouches() {
        return this.touches;
    }

    /**
     * Obtenir le nombre de touches actives
     * @returns {number} Nombre de touches
     */
    getTouchCount() {
        return this.touches.length;
    }

    /**
     * Obtenir une touche spécifique par ID
     * @param {number} id - ID de la touche
     * @returns {Object|null} Touche ou null
     */
    getTouchById(id) {
        return this.touches.find(t => t.id === id) || null;
    }

    // ========== Helpers utiles ==========

    /**
     * Vérifier si une des touches du tableau est pressée
     * @param {Array<string>} keys - Liste de touches
     * @returns {boolean} True si au moins une est pressée
     */
    isAnyKeyPressed(keys) {
        return keys.some(key => this.isKeyPressed(key));
    }

    /**
     * Obtenir l'axe horizontal (-1, 0, 1)
     * @param {string} left - Touche gauche (défaut: 'ArrowLeft')
     * @param {string} right - Touche droite (défaut: 'ArrowRight')
     * @returns {number} -1, 0 ou 1
     */
    getAxis(left = 'ArrowLeft', right = 'ArrowRight') {
        let axis = 0;
        if (this.isKeyPressed(left)) axis -= 1;
        if (this.isKeyPressed(right)) axis += 1;
        return axis;
    }

    /**
     * Obtenir l'axe WASD/Flèches
     * @returns {{x: number, y: number}} Axe 2D normalisé
     */
    getMovementAxis() {
        const x = this.getAxis('ArrowLeft', 'ArrowRight') || this.getAxis('a', 'd');
        const y = this.getAxis('ArrowUp', 'ArrowDown') || this.getAxis('w', 's');
        return { x, y };
    }

    /**
     * Réinitialiser tous les inputs
     */
    reset() {
        this.keys = {};
        this.keysPressed = {};
        this.keysReleased = {};
        this.mouse.buttons = {};
        this.mouse.buttonsPressed = {};
        this.mouse.buttonsReleased = {};
        this.touches = [];
        this.frameInputs.keysPressed.clear();
        this.frameInputs.keysReleased.clear();
        this.frameInputs.buttonsPressed.clear();
        this.frameInputs.buttonsReleased.clear();
    }

    /**
     * Nettoyer les event listeners
     */
    destroy() {
    }
}

module.exports = InputManager;
