const fs = require('fs');
const path = require('path');

/**
 * RuntimeManager
 * Gère le chargement et l'accès aux runtime.js de toutes les extensions
 */
module.exports = {
    runtimeRegistry: new Map(),
    extensionMetadata: new Map(), // Stocke les data.json de chaque extension
    systemExtensions: new Map(), // Extensions système (singletons)
    extensionsPath: null,

    /**
     * Initialiser le RuntimeManager
     */
    init() {
        this.extensionsPath = path.join(__dirname, '../../../extensions');
        this.loadAllRuntimes();
    },

    /**
     * Charger tous les runtime.js des extensions
     */
    loadAllRuntimes() {
        try {
            // Scanner le dossier extensions principal
            this.scanExtensionsFolder(this.extensionsPath);

            // Scanner le dossier extensions/internal
            const internalPath = path.join(this.extensionsPath, 'internal');
            if (fs.existsSync(internalPath)) {
                this.scanExtensionsFolder(internalPath);
            }
        } catch (err) {
            console.error('[RuntimeManager] Failed to load runtimes:', err);
        }
    },

    /**
     * Scanner un dossier d'extensions
     * @param {string} folderPath - Chemin du dossier à scanner
     */
    scanExtensionsFolder(folderPath) {
        if (!fs.existsSync(folderPath)) {
            console.warn('[RuntimeManager] Folder not found:', folderPath);
            return;
        }

        const items = fs.readdirSync(folderPath);

        items.forEach(item => {
            const itemPath = path.join(folderPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                this.loadExtensionRuntime(itemPath, item);
            }
        });
    },

    /**
     * Charger le runtime.js d'une extension
     * @param {string} extensionPath - Chemin de l'extension
     * @param {string} extensionName - Nom de l'extension
     */
    loadExtensionRuntime(extensionPath, extensionName) {
        const runtimePath = path.join(extensionPath, 'runtime.js');

        if (!fs.existsSync(runtimePath)) {
            return;
        }

        try {
            // Charger le data.json pour obtenir l'ID et les métadonnées
            const dataPath = path.join(extensionPath, 'data.json');
            let extensionId = extensionName;
            let metadata = {};

            if (fs.existsSync(dataPath)) {
                const dataContent = fs.readFileSync(dataPath, 'utf8');
                metadata = JSON.parse(dataContent);
                extensionId = metadata.id || extensionName;
            }

            // Supprimer du cache Node.js pour permettre le hot reload
            delete require.cache[require.resolve(runtimePath)];

            // Charger le runtime
            const runtime = require(runtimePath);

            // Valider que c'est un runtime valide
            if (!runtime || typeof runtime !== 'object') {
                console.warn(`[RuntimeManager] Invalid runtime for ${extensionId}: not an object`);
                return;
            }

            // Stocker les métadonnées
            this.extensionMetadata.set(extensionId, metadata);

            // Enregistrer le runtime
            this.runtimeRegistry.set(extensionId, runtime);

        } catch (err) {
            console.error(`[RuntimeManager] Failed to load runtime for ${extensionName}:`, err.message);
        }
    },

    /**
     * Obtenir le runtime d'une extension
     * @param {string} extensionId - ID de l'extension
     * @returns {Object|null} Le runtime ou null si non trouvé
     */
    getRuntimeForExtension(extensionId) {
        const runtime = this.runtimeRegistry.get(extensionId);

        if (!runtime) {
            console.warn(`[RuntimeManager] No runtime found for extension: ${extensionId}`);
            return null;
        }

        return runtime;
    },

    /**
     * Vérifier si une extension a un runtime
     * @param {string} extensionId - ID de l'extension
     * @returns {boolean} True si un runtime existe
     */
    hasRuntime(extensionId) {
        return this.runtimeRegistry.has(extensionId);
    },

    /**
     * Recharger un runtime spécifique (hot reload)
     * @param {string} extensionId - ID de l'extension à recharger
     */
    reloadRuntime(extensionId) {

        // Trouver le chemin de l'extension
        const extensionPath = this.findExtensionPath(extensionId);
        if (!extensionPath) {
            console.error(`[RuntimeManager] Extension not found: ${extensionId}`);
            return false;
        }

        // Recharger le runtime
        const extensionName = path.basename(extensionPath);
        this.loadExtensionRuntime(extensionPath, extensionName);
        return true;
    },

    /**
     * Trouver le chemin d'une extension par son ID
     * @param {string} extensionId - ID de l'extension
     * @returns {string|null} Le chemin ou null
     */
    findExtensionPath(extensionId) {
        // Chercher dans extensions/
        let extensionPath = path.join(this.extensionsPath, extensionId);
        if (fs.existsSync(extensionPath)) {
            return extensionPath;
        }

        // Chercher dans extensions/internal/
        extensionPath = path.join(this.extensionsPath, 'internal', extensionId);
        if (fs.existsSync(extensionPath)) {
            return extensionPath;
        }

        return null;
    },

    /**
     * Obtenir la liste de tous les runtimes chargés
     * @returns {Array} Liste des IDs d'extensions avec runtime
     */
    getLoadedRuntimes() {
        return Array.from(this.runtimeRegistry.keys());
    },

    /**
     * Vérifier si une extension est une extension système
     * @param {string} extensionId - ID de l'extension
     * @returns {boolean} True si c'est une extension système
     */
    isSystemExtension(extensionId) {
        const metadata = this.extensionMetadata.get(extensionId);
        return metadata && (metadata.type === 'system' || metadata.internal === true);
    },

    /**
     * Vérifier si une extension est un singleton
     * @param {string} extensionId - ID de l'extension
     * @returns {boolean} True si c'est un singleton
     */
    isSingleton(extensionId) {
        const metadata = this.extensionMetadata.get(extensionId);
        return metadata && metadata.singleton === true;
    },

    /**
     * Obtenir les métadonnées d'une extension
     * @param {string} extensionId - ID de l'extension
     * @returns {Object|null} Les métadonnées ou null
     */
    getMetadata(extensionId) {
        return this.extensionMetadata.get(extensionId) || null;
    },

    /**
     * Obtenir toutes les extensions système
     * @returns {Array} Liste des IDs d'extensions système
     */
    getSystemExtensions() {
        const systemExts = [];
        this.extensionMetadata.forEach((metadata, id) => {
            if (metadata.type === 'system' || metadata.internal === true) {
                systemExts.push(id);
            }
        });
        return systemExts;
    },

    /**
     * Obtenir ou créer une instance singleton d'une extension système
     * @param {string} extensionId - ID de l'extension
     * @param {Object} runtimeAPI - API runtime
     * @returns {GameObject|null} L'instance singleton
     */
    getOrCreateSystemInstance(extensionId, runtimeAPI) {
        // Vérifier si l'instance existe déjà
        if (this.systemExtensions.has(extensionId)) {
            return this.systemExtensions.get(extensionId);
        }

        // Vérifier que c'est bien une extension système
        if (!this.isSystemExtension(extensionId)) {
            console.warn(`[RuntimeManager] ${extensionId} is not a system extension`);
            return null;
        }

        // Obtenir le runtime
        const runtime = this.getRuntimeForExtension(extensionId);
        if (!runtime) {
            return null;
        }

        // Obtenir les métadonnées pour les propriétés par défaut
        const metadata = this.getMetadata(extensionId);
        const GameObject = require('./GameObject');

        // Obtenir les propriétés par défaut
        let properties = this.getDefaultProperties(metadata);

        // Pour l'extension application, charger les propriétés depuis le projet en cours
        if (extensionId === 'com.ajs.application') {
            const application = require('./application');
            if (application.projectData && application.projectData.properties) {
                // Fusionner les propriétés du projet avec les valeurs par défaut
                properties = { ...properties, ...application.projectData.properties };
            }
        }

        // Créer les données d'objet pour le système
        const systemObjectData = {
            oid: `system_${extensionId}`,
            name: metadata.name || extensionId,
            extension: extensionId,
            layer: 'system',
            properties: properties,
            tags: ['system']
        };

        // Créer l'instance GameObject
        const instance = new GameObject(systemObjectData, runtime, runtimeAPI);

        // Stocker l'instance
        this.systemExtensions.set(extensionId, instance);


        return instance;
    },

    /**
     * Obtenir les propriétés par défaut depuis les métadonnées
     * @param {Object} metadata - Métadonnées de l'extension
     * @returns {Object} Propriétés par défaut
     */
    getDefaultProperties(metadata) {
        const props = {};

        if (metadata.properties) {
            Object.keys(metadata.properties).forEach(key => {
                const propDef = metadata.properties[key];
                if (propDef.default !== undefined) {
                    props[key] = propDef.default;
                }
            });
        }

        return props;
    },

    /**
     * Initialiser toutes les extensions système
     * @param {Object} runtimeAPI - API runtime
     * @returns {Map} Map des instances système
     */
    initializeSystemExtensions(runtimeAPI) {

        const systemExts = this.getSystemExtensions();

        // Ordre d'initialisation (important!)
        const initOrder = [
            'com.ajs.time',              // En premier - calcule deltaTime
            'com.ajs.input.keyboard',    // Input
            'com.ajs.input.mouse',       // Input
            'com.ajs.camera',            // Camera
            'com.ajs.sound',             // Audio
            'com.ajs.application',       // Application
            'com.ajs.scene'              // Scene
        ];

        // Initialiser dans l'ordre spécifié
        initOrder.forEach(extId => {
            if (systemExts.includes(extId)) {
                const instance = this.getOrCreateSystemInstance(extId, runtimeAPI);
                if (instance) {
                    instance.onCreate();
                }
            }
        });

        // Initialiser les extensions système restantes
        systemExts.forEach(extId => {
            if (!initOrder.includes(extId)) {
                const instance = this.getOrCreateSystemInstance(extId, runtimeAPI);
                if (instance) {
                    instance.onCreate();
                }
            }
        });


        return this.systemExtensions;
    },

    /**
     * Obtenir une instance système
     * @param {string} extensionId - ID de l'extension système
     * @returns {GameObject|null} L'instance ou null
     */
    getSystemInstance(extensionId) {
        return this.systemExtensions.get(extensionId) || null;
    },

    /**
     * Obtenir les statistiques des runtimes
     * @returns {Object} Statistiques
     */
    getStats() {
        const stats = {
            total: this.runtimeRegistry.size,
            runtimes: []
        };

        this.runtimeRegistry.forEach((runtime, id) => {
            stats.runtimes.push({
                id,
                hasOnCreated: typeof runtime.onCreated === 'function',
                hasOnUpdate: typeof runtime.onUpdate === 'function',
                hasOnRender: typeof runtime.onRender === 'function',
                hasOnDestroyed: typeof runtime.onDestroyed === 'function',
                hasOnCollision: typeof runtime.onCollision === 'function',
                hasOnInput: typeof runtime.onInput === 'function'
            });
        });

        return stats;
    }
};
