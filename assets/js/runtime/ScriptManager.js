/**
 * ScriptManager - Gère l'exécution des scripts attachés aux GameObjects
 * Similaire au système de scripting de Unity
 */

const application = nw.require('./assets/js/objects/application');

class ScriptManager {
    constructor(runtimeManager) {
        this.runtimeManager = runtimeManager;
        this.scriptInstances = new Map(); // Map<gameObjectId, scriptInstance[]>
        this.loadedScriptClasses = new Map(); // Map<scriptPath, ScriptClass>
        this.scriptCache = new Map(); // Cache for loaded script modules
    }

    /**
     * Initialiser les scripts pour un GameObject
     * @param {GameObject} gameObject - L'objet de jeu
     */
    initializeScriptsForGameObject(gameObject) {
        // Support pour nouveau système (scripts array) et ancien système (script string)
        const scriptsArray = this.getScriptsArray(gameObject);

        if (!scriptsArray || scriptsArray.length === 0) {
            return;
        }

        // Initialiser chaque script
        scriptsArray.forEach(scriptData => {
            // Vérifier si le script est activé
            if (scriptData.enabled === false) {
                return;
            }

            const scriptPath = scriptData.path || scriptData;

            try {
                // Charger et instancier le script
                const ScriptClass = this.loadScript(scriptPath);
                if (!ScriptClass) {
                    console.error(`[ScriptManager] Failed to load script: ${scriptPath}`);
                    return;
                }

                // Créer une instance du script
                const scriptInstance = new ScriptClass();
                scriptInstance._scriptPath = scriptPath;
                scriptInstance._gameObject = gameObject;
                scriptInstance._scriptData = scriptData;

                // Appliquer les propriétés personnalisées de l'objet
                if (scriptData.properties && typeof scriptData.properties === 'object') {
                    // Merger les propriétés par défaut avec les propriétés personnalisées
                    if (scriptInstance.properties && typeof scriptInstance.properties === 'object') {
                        scriptInstance.properties = {
                            ...scriptInstance.properties,
                            ...scriptData.properties
                        };
                    } else {
                        scriptInstance.properties = scriptData.properties;
                    }
                }

                // Stocker l'instance
                if (!this.scriptInstances.has(gameObject.oid)) {
                    this.scriptInstances.set(gameObject.oid, []);
                }
                this.scriptInstances.get(gameObject.oid).push(scriptInstance);

                // Attacher également au GameObject pour un accès facile
                if (!gameObject.scripts) {
                    gameObject.scripts = [];
                }
                gameObject.scripts.push(scriptInstance);
                // Ajouter aussi le scriptPath pour l'identification
                scriptInstance.scriptPath = scriptPath;

                // Appeler onStart si défini
                if (typeof scriptInstance.onStart === 'function') {
                    const api = this.createScriptAPI(gameObject);
                    scriptInstance.onStart(gameObject, api);
                }

            } catch (error) {
                console.error(`[ScriptManager] Error initializing script ${scriptPath}:`, error);
            }
        });
    }

    /**
     * Obtenir le tableau de scripts d'un GameObject
     * Support pour nouveau système (scripts array) et ancien système (script string)
     * @param {GameObject} gameObject - L'objet de jeu
     * @returns {Array} - Tableau de scripts
     */
    getScriptsArray(gameObject) {
        // Nouveau système: propriété "scripts" (array)
        if (gameObject.properties.scripts && Array.isArray(gameObject.properties.scripts)) {
            return gameObject.properties.scripts;
        }

        // Ancien système: propriété "script" (string) - pour rétrocompatibilité
        const scriptProperty = this.findScriptProperty(gameObject);
        if (scriptProperty && scriptProperty.value && scriptProperty.value !== '') {
            return [{ path: scriptProperty.value, enabled: true, properties: {} }];
        }

        return [];
    }

    /**
     * Trouver la propriété script d'un GameObject
     * @param {GameObject} gameObject - L'objet de jeu
     * @returns {Object|null} - La propriété script ou null
     */
    findScriptProperty(gameObject) {
        // Obtenir la définition de l'extension
        const extensionData = this.runtimeManager.getExtensionData(gameObject.extension);
        if (!extensionData || !extensionData.propertiesVariables) {
            return null;
        }

        // Chercher la propriété de type "script"
        const scriptProp = extensionData.propertiesVariables.find(prop => prop.type === 'script');
        if (!scriptProp) {
            return null;
        }

        return {
            name: scriptProp.name,
            value: gameObject.properties[scriptProp.name]
        };
    }

    /**
     * Charger un script depuis un fichier
     * @param {string} scriptPath - Chemin relatif du script
     * @returns {Class|null} - La classe du script
     */
    loadScript(scriptPath) {
        // Vérifier le cache
        if (this.loadedScriptClasses.has(scriptPath)) {
            return this.loadedScriptClasses.get(scriptPath);
        }

        try {
            let fullPath;

            // Vérifier si c'est un script interne
            if (scriptPath.startsWith('internal/')) {
                // Script interne: charger depuis /scripts/ à la racine du projet
                const path = require('path');
                const internalPath = scriptPath.replace('internal/', '');
                fullPath = path.join(__dirname, '../../../scripts', internalPath);
                console.log('[ScriptManager] Loading internal script:', fullPath);
            } else {
                // Script utilisateur: résoudre depuis le projet
                fullPath = application.getFilePathFromResources(scriptPath);
            }

            // Charger le module
            delete require.cache[require.resolve(fullPath)];
            const scriptModule = require(fullPath);

            // Le script peut exporter soit une classe, soit un objet avec une classe par défaut
            const ScriptClass = scriptModule.default || scriptModule;

            // Mettre en cache
            this.loadedScriptClasses.set(scriptPath, ScriptClass);

            return ScriptClass;
        } catch (error) {
            console.error(`[ScriptManager] Error loading script ${scriptPath}:`, error);
            return null;
        }
    }

    /**
     * Obtenir les propriétés par défaut d'un script
     * @param {string} scriptPath - Chemin relatif du script
     * @returns {Object} - Objet contenant les propriétés par défaut
     */
    getScriptDefaultProperties(scriptPath) {
        try {
            const ScriptClass = this.loadScript(scriptPath);
            if (!ScriptClass) {
                return {};
            }

            // Créer une instance temporaire pour accéder aux propriétés par défaut
            const tempInstance = new ScriptClass();
            return tempInstance.properties || {};
        } catch (error) {
            console.error(`[ScriptManager] Error getting default properties for ${scriptPath}:`, error);
            return {};
        }
    }

    /**
     * Mettre à jour tous les scripts actifs
     * @param {number} deltaTime - Temps écoulé depuis la dernière frame
     */
    updateAllScripts(deltaTime) {
        this.scriptInstances.forEach((scripts, gameObjectId) => {
            scripts.forEach(scriptInstance => {
                if (typeof scriptInstance.onUpdate === 'function') {
                    const gameObject = scriptInstance._gameObject;
                    if (gameObject && gameObject.isActive) {
                        const api = this.createScriptAPI(gameObject);
                        try {
                            scriptInstance.onUpdate(gameObject, deltaTime, api);
                        } catch (error) {
                            console.error(`[ScriptManager] Error in onUpdate for ${scriptInstance._scriptPath}:`, error);
                        }
                    }
                }
            });
        });
    }

    /**
     * Détruire les scripts d'un GameObject
     * @param {GameObject} gameObject - L'objet de jeu
     */
    destroyScriptsForGameObject(gameObject) {
        const scripts = this.scriptInstances.get(gameObject.oid);
        if (!scripts) return;

        scripts.forEach(scriptInstance => {
            if (typeof scriptInstance.onDestroy === 'function') {
                const api = this.createScriptAPI(gameObject);
                try {
                    scriptInstance.onDestroy(gameObject, api);
                } catch (error) {
                    console.error(`[ScriptManager] Error in onDestroy for ${scriptInstance._scriptPath}:`, error);
                }
            }
        });

        this.scriptInstances.delete(gameObject.oid);
    }

    /**
     * Créer l'API accessible aux scripts
     * @param {GameObject} gameObject - L'objet de jeu courant
     * @returns {Object} - L'API de scripting
     */
    createScriptAPI(gameObject) {
        const rm = this.runtimeManager;

        return {
            // Accès aux systèmes
            input: rm.getSystemInstance('com.ajs.input.keyboard') || {},
            mouse: rm.getSystemInstance('com.ajs.input.mouse') || {},
            time: rm.getSystemInstance('com.ajs.time') || {},
            audio: rm.getSystemInstance('com.ajs.sound') || {},

            // Gestion des GameObjects
            findGameObject: (name) => {
                if (!this.sceneData || !this.sceneData.objects) return null;
                return this.sceneData.objects.find(obj => obj.name === name);
            },

            findGameObjectsWithTag: (tag) => {
                if (!this.sceneData || !this.sceneData.objects) return [];
                return this.sceneData.objects.filter(obj => obj.tags && obj.tags.includes(tag));
            },

            instantiate: (prefabData, x, y) => {
                // TODO: Implémenter l'instanciation d'objets
                console.warn('[ScriptAPI] instantiate() not yet implemented');
            },

            destroy: (gameObject) => {
                rm.destroyGameObject(gameObject);
            },

            // Accès aux propriétés du GameObject
            getProperty: (propName) => {
                return gameObject.properties[propName];
            },

            setProperty: (propName, value) => {
                gameObject.properties[propName] = value;
            },

            // Accès aux composants/extensions
            getExtension: (extensionName) => {
                return rm.getExtensionRuntime(extensionName);
            },

            // Utilitaires
            log: (...args) => console.log('[Script]', ...args),
            warn: (...args) => console.warn('[Script]', ...args),
            error: (...args) => console.error('[Script]', ...args),

            // Accès au canvas pour dessins custom
            getContext: () => {
                return rm.ctx;
            }
        };
    }

    /**
     * Appeler un événement personnalisé sur un script
     * @param {GameObject} gameObject - L'objet de jeu
     * @param {string} eventName - Nom de l'événement (ex: 'onClick', 'onCollision')
     * @param {...any} args - Arguments à passer à l'événement
     */
    callScriptEvent(gameObject, eventName, ...args) {
        const scripts = this.scriptInstances.get(gameObject.oid);
        if (!scripts) return;

        scripts.forEach(scriptInstance => {
            if (typeof scriptInstance[eventName] === 'function') {
                const api = this.createScriptAPI(gameObject);
                try {
                    scriptInstance[eventName](gameObject, ...args, api);
                } catch (error) {
                    console.error(`[ScriptManager] Error in ${eventName} for ${scriptInstance._scriptPath}:`, error);
                }
            }
        });
    }

    /**
     * Nettoyer tous les scripts
     */
    cleanup() {
        this.scriptInstances.clear();
        this.loadedScriptClasses.clear();
        this.scriptCache.clear();
    }
}

module.exports = ScriptManager;
