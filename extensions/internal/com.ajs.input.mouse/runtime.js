/**
 * Mouse & Touch Input System Extension
 * Gère tous les inputs souris et tactiles du jeu
 */
const runtime = {
    name: "Mouse & Touch Input System",
    version: "1.0.0",
    type: "system",

    /**
     * Initialisation du système souris
     */
    onCreated(gameObject, api) {

        // État de la souris
        gameObject.internal.mouse = {
            x: 0,
            y: 0,
            buttons: {},
            buttonsPressed: {},
            buttonsReleased: {},
            wheelDelta: 0,
            isOverCanvas: false
        };

        // État tactile
        gameObject.internal.touches = [];

        // Frame inputs
        gameObject.internal.frameInputs = {
            buttonsPressed: new Set(),
            buttonsReleased: new Set()
        };

        // Canvas reference (sera défini par player)
        gameObject.internal.canvas = null;
    },

    /**
     * Initialiser avec le canvas
     */
    initWithCanvas(gameObject, canvas) {
        gameObject.internal.canvas = canvas;
        this.setupListeners(gameObject, canvas);
    },

    /**
     * Configuration des event listeners
     */
    setupListeners(gameObject, canvas) {
        const mouse = gameObject.internal.mouse;
        const frameInputs = gameObject.internal.frameInputs;

        // Mouse enter/leave
        canvas.addEventListener('mouseenter', () => {
            mouse.isOverCanvas = true;
        });

        canvas.addEventListener('mouseleave', () => {
            mouse.isOverCanvas = false;
        });

        // Mouse move
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });

        // Mouse down
        canvas.addEventListener('mousedown', (e) => {
            const button = e.button;

            if (!mouse.buttons[button]) {
                frameInputs.buttonsPressed.add(button);
            }

            mouse.buttons[button] = true;

            if (button === 2) {
                e.preventDefault();
            }
        });

        // Mouse up
        canvas.addEventListener('mouseup', (e) => {
            const button = e.button;
            frameInputs.buttonsReleased.add(button);
            mouse.buttons[button] = false;
        });

        // Mouse wheel
        canvas.addEventListener('wheel', (e) => {
            mouse.wheelDelta = e.deltaY;
            e.preventDefault();
        }, { passive: false });

        // Context menu
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            this.updateTouches(gameObject, canvas, e.touches);
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            this.updateTouches(gameObject, canvas, e.touches);
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            this.updateTouches(gameObject, canvas, e.touches);
        });

        canvas.addEventListener('touchcancel', (e) => {
            this.updateTouches(gameObject, canvas, e.touches);
        });
    },

    /**
     * Mettre à jour les touches tactiles
     */
    updateTouches(gameObject, canvas, touchList) {
        const rect = canvas.getBoundingClientRect();

        gameObject.internal.touches = Array.from(touchList).map(touch => ({
            id: touch.identifier,
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
            force: touch.force || 1
        }));
    },

    /**
     * Mise à jour chaque frame
     */
    onUpdate(gameObject, deltaTime, api) {
        const mouse = gameObject.internal.mouse;
        const frameInputs = gameObject.internal.frameInputs;

        // Copier les états pour cette frame
        mouse.buttonsPressed = {};
        mouse.buttonsReleased = {};

        frameInputs.buttonsPressed.forEach(button => {
            mouse.buttonsPressed[button] = true;
        });

        frameInputs.buttonsReleased.forEach(button => {
            mouse.buttonsReleased[button] = true;
        });

        // Réinitialiser pour la prochaine frame
        frameInputs.buttonsPressed.clear();
        frameInputs.buttonsReleased.clear();

        // Réinitialiser la molette
        mouse.wheelDelta = 0;
    },

    // ========== API ==========

    /**
     * Vérifier si un bouton est pressé
     */
    isMouseButtonPressed(gameObject, button = 0) {
        return !!gameObject.internal.mouse.buttons[button];
    },

    /**
     * Vérifier si un bouton vient d'être pressé
     */
    isMouseButtonJustPressed(gameObject, button = 0) {
        return !!gameObject.internal.mouse.buttonsPressed[button];
    },

    /**
     * Vérifier si un bouton vient d'être relâché
     */
    isMouseButtonJustReleased(gameObject, button = 0) {
        return !!gameObject.internal.mouse.buttonsReleased[button];
    },

    /**
     * Obtenir la position de la souris
     */
    getMousePosition(gameObject) {
        return {
            x: gameObject.internal.mouse.x,
            y: gameObject.internal.mouse.y
        };
    },

    /**
     * Obtenir le delta de la molette
     */
    getMouseWheelDelta(gameObject) {
        return gameObject.internal.mouse.wheelDelta;
    },

    /**
     * Vérifier si la souris est au-dessus du canvas
     */
    isMouseOverCanvas(gameObject) {
        return gameObject.internal.mouse.isOverCanvas;
    },

    /**
     * Obtenir toutes les touches tactiles
     */
    getTouches(gameObject) {
        return gameObject.internal.touches;
    },

    /**
     * Obtenir le nombre de touches
     */
    getTouchCount(gameObject) {
        return gameObject.internal.touches.length;
    },

    /**
     * Réinitialiser tous les inputs
     */
    reset(gameObject) {
        gameObject.internal.mouse.buttons = {};
        gameObject.internal.mouse.buttonsPressed = {};
        gameObject.internal.mouse.buttonsReleased = {};
        gameObject.internal.touches = [];
        gameObject.internal.frameInputs.buttonsPressed.clear();
        gameObject.internal.frameInputs.buttonsReleased.clear();
    }
};

module.exports = runtime;
