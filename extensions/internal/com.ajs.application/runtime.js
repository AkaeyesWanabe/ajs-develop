/**
 * Application System Extension
 * Gère les paramètres et le runtime de l'application/projet
 */
const runtime = {
    name: "Application System",
    version: "1.0.0",
    type: "system",

    /**
     * Initialisation du système d'application
     */
    onCreated(gameObject, api) {

        gameObject.internal.application = {
            // Mode de jeu
            playMode: 'scene', // 'scene' ou 'application'
            currentScene: null,
            mainScene: gameObject.properties.mainScene || '',

            // Paramètres de fenêtre
            width: gameObject.properties.width || 640,
            height: gameObject.properties.height || 480,
            fullscreen: gameObject.properties.fullscreen || false,
            resizable: gameObject.properties.resizable || true,

            // Informations
            name: gameObject.properties.name || 'New Game',
            version: gameObject.properties.version || '1.0.0',
            author: gameObject.properties.author || '',
            company: gameObject.properties.company || '',
            package: gameObject.properties.package || 'com.company.newgame',

            // Performance
            targetFPS: gameObject.properties.targetFPS || 60,

            // Statistiques runtime
            startTime: performance.now(),
            totalSceneLoads: 0,
            sceneHistory: []
        };
    },

    /**
     * Mise à jour du système d'application
     */
    onUpdate(gameObject, deltaTime, api) {
        const app = gameObject.internal.application;

        // Sync properties
        gameObject.properties.mainScene = app.mainScene;
        gameObject.properties.width = app.width;
        gameObject.properties.height = app.height;
        gameObject.properties.fullscreen = app.fullscreen;
        gameObject.properties.resizable = app.resizable;
        gameObject.properties.targetFPS = app.targetFPS;
    },

    // ========== API ==========

    /**
     * Définir la scène principale
     * @param {string} scenePath - Chemin vers la scène principale
     */
    setMainScene(gameObject, scenePath) {
        gameObject.internal.application.mainScene = scenePath;
        gameObject.properties.mainScene = scenePath;
    },

    /**
     * Obtenir la scène principale
     * @returns {string} Chemin de la scène principale
     */
    getMainScene(gameObject) {
        return gameObject.internal.application.mainScene;
    },

    /**
     * Vérifier si une scène principale est définie
     * @returns {boolean} True si mainScene est définie
     */
    hasMainScene(gameObject) {
        const mainScene = gameObject.internal.application.mainScene;
        return mainScene && mainScene.trim() !== '';
    },

    /**
     * Définir le mode de jeu
     * @param {string} mode - 'scene' ou 'application'
     */
    setPlayMode(gameObject, mode) {
        if (mode === 'scene' || mode === 'application') {
            gameObject.internal.application.playMode = mode;
        }
    },

    /**
     * Obtenir le mode de jeu actuel
     * @returns {string} 'scene' ou 'application'
     */
    getPlayMode(gameObject) {
        return gameObject.internal.application.playMode;
    },

    /**
     * Enregistrer le chargement d'une scène
     * @param {string} scenePath - Chemin de la scène
     */
    registerSceneLoad(gameObject, scenePath) {
        const app = gameObject.internal.application;
        app.currentScene = scenePath;
        app.totalSceneLoads++;
        app.sceneHistory.push({
            path: scenePath,
            timestamp: performance.now()
        });

        // Garder seulement les 10 dernières scènes
        if (app.sceneHistory.length > 10) {
            app.sceneHistory.shift();
        }
    },

    /**
     * Obtenir la scène courante
     * @returns {string} Chemin de la scène courante
     */
    getCurrentScene(gameObject) {
        return gameObject.internal.application.currentScene;
    },

    /**
     * Définir les dimensions de la fenêtre
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     */
    setWindowSize(gameObject, width, height) {
        const app = gameObject.internal.application;
        app.width = Math.max(320, Math.min(3840, width));
        app.height = Math.max(240, Math.min(2160, height));
    },

    /**
     * Obtenir les dimensions de la fenêtre
     * @returns {Object} {width, height}
     */
    getWindowSize(gameObject) {
        const app = gameObject.internal.application;
        return {
            width: app.width,
            height: app.height
        };
    },

    /**
     * Activer/désactiver le mode plein écran
     * @param {boolean} fullscreen - True pour activer
     */
    setFullscreen(gameObject, fullscreen) {
        gameObject.internal.application.fullscreen = fullscreen;
        // TODO: Implémenter le changement de mode plein écran via NW.js
    },

    /**
     * Vérifier si le mode plein écran est activé
     * @returns {boolean} True si plein écran
     */
    isFullscreen(gameObject) {
        return gameObject.internal.application.fullscreen;
    },

    /**
     * Définir le FPS cible
     * @param {number} fps - FPS cible
     */
    setTargetFPS(gameObject, fps) {
        gameObject.internal.application.targetFPS = Math.max(30, Math.min(144, fps));
    },

    /**
     * Obtenir le FPS cible
     * @returns {number} FPS cible
     */
    getTargetFPS(gameObject) {
        return gameObject.internal.application.targetFPS;
    },

    /**
     * Obtenir les informations de l'application
     * @returns {Object} Informations complètes
     */
    getApplicationInfo(gameObject) {
        const app = gameObject.internal.application;
        return {
            name: app.name,
            version: app.version,
            author: app.author,
            company: app.company,
            package: app.package,
            mainScene: app.mainScene,
            playMode: app.playMode,
            currentScene: app.currentScene
        };
    },

    /**
     * Mettre à jour les informations de l'application
     * @param {Object} info - Nouvelles informations
     */
    updateApplicationInfo(gameObject, info) {
        const app = gameObject.internal.application;

        if (info.name !== undefined) app.name = info.name;
        if (info.version !== undefined) app.version = info.version;
        if (info.author !== undefined) app.author = info.author;
        if (info.company !== undefined) app.company = info.company;
        if (info.package !== undefined) app.package = info.package;
        if (info.mainScene !== undefined) app.mainScene = info.mainScene;

        // Sync to properties
        gameObject.properties.name = app.name;
        gameObject.properties.version = app.version;
        gameObject.properties.author = app.author;
        gameObject.properties.company = app.company;
        gameObject.properties.package = app.package;
        gameObject.properties.mainScene = app.mainScene;
    },

    /**
     * Obtenir les statistiques runtime
     * @returns {Object} Statistiques
     */
    getRuntimeStats(gameObject) {
        const app = gameObject.internal.application;
        return {
            uptime: performance.now() - app.startTime,
            totalSceneLoads: app.totalSceneLoads,
            currentScene: app.currentScene,
            sceneHistory: [...app.sceneHistory]
        };
    }
};

module.exports = runtime;
