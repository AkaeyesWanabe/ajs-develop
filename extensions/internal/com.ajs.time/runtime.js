/**
 * Time System Extension
 * Gère le temps de jeu, deltaTime, timeScale, etc.
 */
const runtime = {
    name: "Time System",
    version: "1.0.0",
    type: "system",

    /**
     * Initialisation du système de temps
     */
    onCreated(gameObject, api) {

        gameObject.internal.time = {
            // Time scale (pour slow motion / fast forward)
            timeScale: gameObject.properties.timeScale || 1,

            // Temps écoulé
            deltaTime: 0,
            totalTime: 0,
            frameCount: 0,

            // FPS
            fps: 0,
            frameCountForFPS: 0,
            lastFpsUpdate: performance.now(),

            // Temps réel (non affecté par timeScale)
            realDeltaTime: 0,
            realTotalTime: 0,

            // Timestamps
            lastFrameTime: performance.now(),
            startTime: performance.now()
        };
    },

    /**
     * Mise à jour du système de temps
     * Cette méthode est appelée AVANT tous les autres onUpdate
     */
    onUpdate(gameObject, deltaTime, api) {
        const time = gameObject.internal.time;
        const now = performance.now();

        // Calculer deltaTime réel
        time.realDeltaTime = now - time.lastFrameTime;
        time.lastFrameTime = now;

        // Appliquer timeScale
        time.deltaTime = time.realDeltaTime * time.timeScale;

        // Incrémenter temps total
        time.totalTime += time.deltaTime;
        time.realTotalTime += time.realDeltaTime;
        time.frameCount++;

        // Calculer FPS
        time.frameCountForFPS++;
        if (now - time.lastFpsUpdate >= 1000) {
            time.fps = time.frameCountForFPS;
            time.frameCountForFPS = 0;
            time.lastFpsUpdate = now;
        }

        // Sync properties
        gameObject.properties.timeScale = time.timeScale;
    },

    // ========== API ==========

    /**
     * Obtenir deltaTime
     */
    getDeltaTime(gameObject) {
        return gameObject.internal.time.deltaTime;
    },

    /**
     * Obtenir le temps total depuis le début
     */
    getTotalTime(gameObject) {
        return gameObject.internal.time.totalTime;
    },

    /**
     * Obtenir le nombre de frames
     */
    getFrameCount(gameObject) {
        return gameObject.internal.time.frameCount;
    },

    /**
     * Obtenir les FPS
     */
    getFPS(gameObject) {
        return gameObject.internal.time.fps;
    },

    /**
     * Obtenir le timeScale
     */
    getTimeScale(gameObject) {
        return gameObject.internal.time.timeScale;
    },

    /**
     * Définir le timeScale
     */
    setTimeScale(gameObject, scale) {
        gameObject.internal.time.timeScale = Math.max(0, scale);
    },

    /**
     * Mettre le jeu en pause (timeScale = 0)
     */
    pause(gameObject) {
        gameObject.internal.time.timeScale = 0;
    },

    /**
     * Reprendre le jeu (timeScale = 1)
     */
    resume(gameObject) {
        gameObject.internal.time.timeScale = 1;
    },

    /**
     * Slow motion
     */
    setSlowMotion(gameObject, factor = 0.5) {
        gameObject.internal.time.timeScale = factor;
    },

    /**
     * Fast forward
     */
    setFastForward(gameObject, factor = 2) {
        gameObject.internal.time.timeScale = factor;
    },

    /**
     * Obtenir deltaTime réel (non affecté par timeScale)
     */
    getRealDeltaTime(gameObject) {
        return gameObject.internal.time.realDeltaTime;
    },

    /**
     * Obtenir le temps total réel
     */
    getRealTotalTime(gameObject) {
        return gameObject.internal.time.realTotalTime;
    },

    /**
     * Obtenir le temps depuis le début en secondes
     */
    getTimeInSeconds(gameObject) {
        return gameObject.internal.time.totalTime / 1000;
    },

    /**
     * Obtenir toutes les stats de temps
     */
    getStats(gameObject) {
        const time = gameObject.internal.time;
        return {
            deltaTime: time.deltaTime,
            totalTime: time.totalTime,
            frameCount: time.frameCount,
            fps: time.fps,
            timeScale: time.timeScale,
            realDeltaTime: time.realDeltaTime,
            realTotalTime: time.realTotalTime
        };
    }
};

module.exports = runtime;
