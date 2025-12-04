const fs = nw.require('fs');
const path = nw.require('path');
const application = nw.require('./assets/js/objects/application');

/**
 * Project Cache Manager
 * Gère le cache du projet (lastScene, etc.) dans data.json
 */
const projectCache = {
    /**
     * Obtenir le chemin du fichier data.json du projet
     * @returns {string|null} Chemin du fichier ou null
     */
    getProjectDataPath() {
        if (!application.currentProjectPath) {
            return null;
        }
        return path.join(application.currentProjectPath, 'data.json');
    },

    /**
     * Charger les données du projet (y compris le cache)
     * @returns {Object|null} Données du projet ou null
     */
    loadProjectData() {
        const dataPath = this.getProjectDataPath();
        if (!dataPath || !fs.existsSync(dataPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(dataPath, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            console.error('[ProjectCache] Failed to load project data:', err);
            return null;
        }
    },

    /**
     * Sauvegarder les données du projet
     * @param {Object} data - Données du projet
     * @returns {boolean} True si sauvegardé avec succès
     */
    saveProjectData(data) {
        const dataPath = this.getProjectDataPath();
        if (!dataPath) {
            console.warn('[ProjectCache] No project loaded');
            return false;
        }

        try {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), 'utf8');
            return true;
        } catch (err) {
            console.error('[ProjectCache] Failed to save project data:', err);
            return false;
        }
    },

    /**
     * Obtenir le cache du projet
     * @returns {Object} Objet cache ou {}
     */
    getCache() {
        const data = this.loadProjectData();
        return data?.cache || {};
    },

    /**
     * Mettre à jour le cache du projet
     * @param {Object} cacheUpdates - Mises à jour du cache
     * @returns {boolean} True si sauvegardé avec succès
     */
    updateCache(cacheUpdates) {
        const data = this.loadProjectData();
        if (!data) {
            console.warn('[ProjectCache] No project data to update');
            return false;
        }

        // Initialiser cache si inexistant
        if (!data.cache) {
            data.cache = {};
        }

        // Fusionner les mises à jour
        Object.assign(data.cache, cacheUpdates);

        // Sauvegarder
        return this.saveProjectData(data);
    },

    /**
     * Obtenir la dernière scène ouverte
     * @returns {string|null} Chemin de la dernière scène ou null
     */
    getLastScene() {
        const cache = this.getCache();
        return cache.lastScene || null;
    },

    /**
     * Sauvegarder la dernière scène ouverte
     * @param {string} scenePath - Chemin de la scène
     * @returns {boolean} True si sauvegardé avec succès
     */
    saveLastScene(scenePath) {
        return this.updateCache({ lastScene: scenePath });
    },

    /**
     * Obtenir le chemin complet de la dernière scène
     * @returns {string|null} Chemin complet ou null
     */
    getLastSceneFullPath() {
        const lastScene = this.getLastScene();
        if (!lastScene || !application.currentProjectPath) {
            return null;
        }

        return path.join(application.currentProjectPath, lastScene);
    },

    /**
     * Charger la dernière scène ouverte
     * @returns {Object|null} Données de la scène ou null
     */
    loadLastScene() {
        const fullPath = this.getLastSceneFullPath();
        if (!fullPath || !fs.existsSync(fullPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const sceneData = JSON.parse(content);
            return sceneData;
        } catch (err) {
            console.error('[ProjectCache] Failed to load last scene:', err);
            return null;
        }
    },

    /**
     * Sauvegarder le cache de l'éditeur (position, zoom, etc.)
     * @param {Object} editorState - État de l'éditeur
     * @returns {boolean} True si sauvegardé avec succès
     */
    saveEditorState(editorState) {
        return this.updateCache({ editorState });
    },

    /**
     * Obtenir le cache de l'éditeur
     * @returns {Object|null} État de l'éditeur ou null
     */
    getEditorState() {
        const cache = this.getCache();
        return cache.editorState || null;
    },

    /**
     * Nettoyer le cache (lastScene uniquement)
     */
    clearLastScene() {
        return this.updateCache({ lastScene: null });
    },

    /**
     * Sauvegarder automatiquement le cache complet
     * Appelé périodiquement ou lors de changements importants
     */
    autoSave() {
        // Cette méthode peut être appelée par un timer ou lors d'événements

        // Sauvegarder l'état actuel si une scène est ouverte
        const sceneEditor = window.sceneEditor;
        if (sceneEditor && sceneEditor.cache && sceneEditor.cache.sceneFilePath) {
            // Convertir le chemin absolu en chemin relatif
            const relativePath = this.getRelativePath(sceneEditor.cache.sceneFilePath);
            if (relativePath) {
                this.saveLastScene(relativePath);
            }
        }

        return true;
    },

    /**
     * Convertir un chemin absolu en chemin relatif au projet
     * @param {string} absolutePath - Chemin absolu
     * @returns {string|null} Chemin relatif ou null
     */
    getRelativePath(absolutePath) {
        if (!application.currentProjectPath || !absolutePath) {
            return null;
        }

        try {
            const relative = path.relative(application.currentProjectPath, absolutePath);
            return relative.replace(/\\/g, '/');
        } catch (err) {
            console.error('[ProjectCache] Failed to get relative path:', err);
            return null;
        }
    }
};

module.exports = projectCache;
