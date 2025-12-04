/**
 * AssetManager
 * Gère le préchargement et la mise en cache des ressources (images, sons, etc.)
 */
class AssetManager {
    constructor() {
        // Caches pour chaque type de ressource
        this.images = new Map();
        this.sounds = new Map();
        this.data = new Map();

        // État de chargement
        this.loading = new Set();
        this.loaded = new Set();
        this.failed = new Set();

        // Statistiques
        this.stats = {
            totalAssets: 0,
            loadedAssets: 0,
            failedAssets: 0
        };

    }

    // ========== Images ==========

    /**
     * Charger une image
     * @param {string} path - Chemin de l'image
     * @returns {Promise<Image>} Promesse de l'image chargée
     */
    async loadImage(path) {
        // Si déjà chargée, retourner depuis le cache
        if (this.images.has(path)) {
            return this.images.get(path);
        }

        // Si en cours de chargement, attendre
        if (this.loading.has(path)) {
            return this.waitForAsset(path, 'image');
        }

        this.loading.add(path);
        this.stats.totalAssets++;

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                this.images.set(path, img);
                this.loading.delete(path);
                this.loaded.add(path);
                this.stats.loadedAssets++;

                resolve(img);
            };

            img.onerror = (err) => {
                this.loading.delete(path);
                this.failed.add(path);
                this.stats.failedAssets++;

                console.error(`[AssetManager] Failed to load image: ${path}`, err);
                reject(new Error(`Failed to load image: ${path}`));
            };

            img.src = path;
        });
    }

    /**
     * Obtenir une image depuis le cache
     * @param {string} path - Chemin de l'image
     * @returns {Image|null} L'image ou null si non chargée
     */
    getImage(path) {
        return this.images.get(path) || null;
    }

    /**
     * Vérifier si une image est chargée
     * @param {string} path - Chemin de l'image
     * @returns {boolean} True si chargée
     */
    hasImage(path) {
        return this.images.has(path);
    }

    // ========== Sons ==========

    /**
     * Charger un son
     * @param {string} path - Chemin du son
     * @returns {Promise<Audio>} Promesse de l'audio chargé
     */
    async loadSound(path) {
        // Si déjà chargé, retourner depuis le cache
        if (this.sounds.has(path)) {
            return this.sounds.get(path);
        }

        // Si en cours de chargement, attendre
        if (this.loading.has(path)) {
            return this.waitForAsset(path, 'sound');
        }

        this.loading.add(path);
        this.stats.totalAssets++;

        return new Promise((resolve, reject) => {
            const audio = new Audio();

            audio.oncanplaythrough = () => {
                this.sounds.set(path, audio);
                this.loading.delete(path);
                this.loaded.add(path);
                this.stats.loadedAssets++;

                resolve(audio);
            };

            audio.onerror = (err) => {
                this.loading.delete(path);
                this.failed.add(path);
                this.stats.failedAssets++;

                console.error(`[AssetManager] Failed to load sound: ${path}`, err);
                reject(new Error(`Failed to load sound: ${path}`));
            };

            audio.src = path;
        });
    }

    /**
     * Obtenir un son depuis le cache
     * @param {string} path - Chemin du son
     * @returns {Audio|null} L'audio ou null si non chargé
     */
    getSound(path) {
        return this.sounds.get(path) || null;
    }

    /**
     * Vérifier si un son est chargé
     * @param {string} path - Chemin du son
     * @returns {boolean} True si chargé
     */
    hasSound(path) {
        return this.sounds.has(path);
    }

    // ========== Données (JSON, etc.) ==========

    /**
     * Charger un fichier JSON
     * @param {string} path - Chemin du JSON
     * @returns {Promise<Object>} Promesse du JSON parsé
     */
    async loadJSON(path) {
        // Si déjà chargé, retourner depuis le cache
        if (this.data.has(path)) {
            return this.data.get(path);
        }

        // Si en cours de chargement, attendre
        if (this.loading.has(path)) {
            return this.waitForAsset(path, 'data');
        }

        this.loading.add(path);
        this.stats.totalAssets++;

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const json = await response.json();

            this.data.set(path, json);
            this.loading.delete(path);
            this.loaded.add(path);
            this.stats.loadedAssets++;

            return json;
        } catch (err) {
            this.loading.delete(path);
            this.failed.add(path);
            this.stats.failedAssets++;

            console.error(`[AssetManager] Failed to load JSON: ${path}`, err);
            throw new Error(`Failed to load JSON: ${path}`);
        }
    }

    /**
     * Obtenir des données JSON depuis le cache
     * @param {string} path - Chemin du JSON
     * @returns {Object|null} Les données ou null si non chargées
     */
    getData(path) {
        return this.data.get(path) || null;
    }

    // ========== Préchargement de Scène ==========

    /**
     * Précharger tous les assets d'une scène
     * @param {Object} sceneData - Données de la scène
     * @param {Function} onProgress - Callback de progression (progress, total)
     * @returns {Promise<void>} Promesse de chargement complet
     */
    async preloadSceneAssets(sceneData, onProgress = null) {

        const promises = [];
        const assetPaths = this.extractSceneAssets(sceneData);

        const total = assetPaths.length;
        let loaded = 0;


        // Charger toutes les ressources
        for (const asset of assetPaths) {
            const promise = this.loadAsset(asset.type, asset.path)
                .then(() => {
                    loaded++;
                    if (onProgress) {
                        onProgress(loaded, total);
                    }
                })
                .catch(err => {
                    console.warn(`[AssetManager] Failed to load ${asset.type}: ${asset.path}`, err);
                    loaded++;
                    if (onProgress) {
                        onProgress(loaded, total);
                    }
                });

            promises.push(promise);
        }

        await Promise.allSettled(promises);

    }

    /**
     * Charger un asset selon son type
     * @param {string} type - Type d'asset (image, sound, json)
     * @param {string} path - Chemin
     * @returns {Promise} Promesse de chargement
     */
    async loadAsset(type, path) {
        switch (type) {
            case 'image':
                return this.loadImage(path);
            case 'sound':
                return this.loadSound(path);
            case 'json':
                return this.loadJSON(path);
            default:
                console.warn(`[AssetManager] Unknown asset type: ${type}`);
                return Promise.resolve();
        }
    }

    /**
     * Extraire tous les chemins d'assets d'une scène
     * @param {Object} sceneData - Données de la scène
     * @returns {Array<{type: string, path: string}>} Liste des assets
     */
    extractSceneAssets(sceneData) {
        const assets = [];
        const seen = new Set();

        if (!sceneData || !sceneData.objects) {
            return assets;
        }

        sceneData.objects.forEach(obj => {
            const props = obj.properties || {};

            // Images
            if (props.imagePath && !seen.has(props.imagePath)) {
                assets.push({ type: 'image', path: props.imagePath });
                seen.add(props.imagePath);
            }

            // Sprite sheets
            if (props.spriteSheet && !seen.has(props.spriteSheet)) {
                assets.push({ type: 'image', path: props.spriteSheet });
                seen.add(props.spriteSheet);
            }

            // Sons
            if (props.soundPath && !seen.has(props.soundPath)) {
                assets.push({ type: 'sound', path: props.soundPath });
                seen.add(props.soundPath);
            }

            // Background music
            if (props.musicPath && !seen.has(props.musicPath)) {
                assets.push({ type: 'sound', path: props.musicPath });
                seen.add(props.musicPath);
            }

            // Données JSON
            if (props.dataPath && !seen.has(props.dataPath)) {
                assets.push({ type: 'json', path: props.dataPath });
                seen.add(props.dataPath);
            }
        });

        return assets;
    }

    // ========== Utilitaires ==========

    /**
     * Attendre qu'un asset en cours de chargement soit prêt
     * @param {string} path - Chemin de l'asset
     * @param {string} type - Type d'asset
     * @returns {Promise} Promesse de l'asset
     */
    async waitForAsset(path, type) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.loaded.has(path)) {
                    clearInterval(checkInterval);
                    switch (type) {
                        case 'image':
                            resolve(this.getImage(path));
                            break;
                        case 'sound':
                            resolve(this.getSound(path));
                            break;
                        case 'data':
                            resolve(this.getData(path));
                            break;
                    }
                } else if (this.failed.has(path)) {
                    clearInterval(checkInterval);
                    resolve(null);
                }
            }, 50);
        });
    }

    /**
     * Obtenir la progression du chargement
     * @returns {number} Pourcentage (0-1)
     */
    getLoadingProgress() {
        const total = this.stats.totalAssets;
        const loaded = this.stats.loadedAssets + this.stats.failedAssets;
        return total > 0 ? loaded / total : 1;
    }

    /**
     * Obtenir le nombre d'assets en cours de chargement
     * @returns {number} Nombre d'assets
     */
    getLoadingCount() {
        return this.loading.size;
    }

    /**
     * Vérifier si le chargement est terminé
     * @returns {boolean} True si terminé
     */
    isLoadingComplete() {
        return this.loading.size === 0;
    }

    /**
     * Obtenir les statistiques de chargement
     * @returns {Object} Statistiques
     */
    getStats() {
        return {
            ...this.stats,
            cached: {
                images: this.images.size,
                sounds: this.sounds.size,
                data: this.data.size
            },
            loading: this.loading.size,
            progress: this.getLoadingProgress()
        };
    }

    /**
     * Vider le cache d'un type spécifique
     * @param {string} type - Type de cache (images, sounds, data, all)
     */
    clearCache(type = 'all') {
        switch (type) {
            case 'images':
                this.images.clear();
                break;
            case 'sounds':
                this.sounds.clear();
                break;
            case 'data':
                this.data.clear();
                break;
            case 'all':
                this.images.clear();
                this.sounds.clear();
                this.data.clear();
                break;
        }

    }

    /**
     * Réinitialiser complètement l'AssetManager
     */
    reset() {
        this.clearCache('all');
        this.loading.clear();
        this.loaded.clear();
        this.failed.clear();

        this.stats = {
            totalAssets: 0,
            loadedAssets: 0,
            failedAssets: 0
        };

    }

    /**
     * Nettoyer les ressources
     */
    destroy() {
        this.reset();
    }
}

module.exports = AssetManager;
