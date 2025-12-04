/**
 * ScriptsList - Gère l'affichage et l'édition des scripts multiples
 * Similaire au système de composants de Unity
 */

const $ = nw.require('jquery');
const fs = nw.require('fs');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');
const filePicker = nw.require('./assets/js/objects/filePicker');
const sceneEditor = nw.require('./assets/js/objects/sceneEditor');

module.exports = {
    currentObjectData: null,

    /**
     * Afficher la liste des scripts pour un objet
     * @param {Object} objectData - Données de l'objet
     * @param {HTMLElement} container - Conteneur où afficher la liste
     */
    display(objectData, container) {
        this.currentObjectData = objectData;

        // Initialiser scripts array si nécessaire
        if (!objectData.properties.scripts) {
            objectData.properties.scripts = [];
        }

        // Créer le conteneur principal
        let html = `
            <div class="scriptsListContainer">
                <div class="scriptsListHeader">
                    <button class="btn btn-primary scriptsListAddBtn" title="Add Script">
                        <i class="ri-add-line"></i> Add Script
                    </button>
                </div>
                <div class="scriptsListBody">
                    ${this.renderScriptsList(objectData)}
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Attacher les événements
        this.attachEvents(container, objectData);
    },

    /**
     * Générer le HTML pour la liste des scripts
     * @param {Object} objectData - Données de l'objet
     * @returns {string} - HTML de la liste
     */
    renderScriptsList(objectData) {
        if (!objectData.properties.scripts || objectData.properties.scripts.length === 0) {
            return '<div class="scriptsListEmpty">No scripts attached. Click "Add Script" to attach a script.</div>';
        }

        let html = '';

        // Load internal scripts manager
        const internalScriptsManager = nw.require('./assets/js/objects/internalScriptsManager');

        objectData.properties.scripts.forEach((scriptData, index) => {
            const isInternal = internalScriptsManager.isInternalScript(scriptData.path);
            let scriptName = application.getFileNameFromResources(scriptData.path).replace('.js', '');
            let iconHtml = '<i class="ri-file-code-line scriptItemIcon"></i>';
            let iconClass = '';

            // Custom icon for internal scripts
            if (isInternal) {
                const scriptMeta = internalScriptsManager.getScriptByPath(scriptData.path);
                if (scriptMeta) {
                    scriptName = scriptMeta.name;
                    iconHtml = `
                        <div class="scriptItemIconInternal" style="background: ${scriptMeta.color}20; border-color: ${scriptMeta.color}">
                            <i class="${scriptMeta.icon}" style="color: ${scriptMeta.color}"></i>
                        </div>
                    `;
                    iconClass = ' scriptItemInternal';
                }
            }

            const isEnabled = scriptData.enabled !== false;

            html += `
                <div class="scriptItem${iconClass}" data-script-index="${index}">
                    <div class="scriptItemHeader">
                        <input type="checkbox" class="scriptItemCheckbox" ${isEnabled ? 'checked' : ''} data-script-index="${index}">
                        ${iconHtml}
                        <span class="scriptItemName">${scriptName}</span>
                        <div class="scriptItemActions">
                            <button class="scriptItemBtn scriptItemChangeBtn" title="Change Script" data-script-index="${index}">
                                <i class="ri-exchange-line"></i>
                            </button>
                            <button class="scriptItemBtn scriptItemRemoveBtn" title="Remove Script" data-script-index="${index}">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                    <div class="scriptItemProperties">
                        ${this.renderScriptProperties(scriptData, index)}
                    </div>
                </div>
            `;
        });

        return html;
    },

    /**
     * Générer le HTML pour les propriétés d'un script
     * @param {Object} scriptData - Données du script
     * @param {number} scriptIndex - Index du script
     * @returns {string} - HTML des propriétés
     */
    renderScriptProperties(scriptData, scriptIndex) {
        // Vérifier si les propriétés existent
        if (!scriptData.properties) {
            console.warn('[ScriptsList] No properties object for script:', scriptData.path);
            return '<div class="scriptPropertiesEmpty">No configurable properties</div>';
        }

        const propKeys = Object.keys(scriptData.properties);
        if (propKeys.length === 0) {
            return '<div class="scriptPropertiesEmpty">No configurable properties</div>';
        }

        let html = '<div class="scriptProperties">';

        for (const [key, value] of Object.entries(scriptData.properties)) {
            const isNumber = typeof value === 'number';
            const isBoolean = typeof value === 'boolean';
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;

            html += `<div class="scriptProperty">
                    <label>${key}</label>`;

            if (isBoolean) {
                // Checkbox for boolean values
                html += `
                    <input
                        type="checkbox"
                        class="scriptPropertyCheckbox"
                        data-script-index="${scriptIndex}"
                        data-property-name="${key}"
                        data-property-type="boolean"
                        ${value ? 'checked' : ''}
                    >`;
            } else if (isNumber) {
                // Custom number input with +/- buttons (like properties.js)
                html += `
                    <div class="scriptPropertyNumber">
                        <button class="scriptPropNumberBtn scriptPropNumberDecrease"
                                data-script-index="${scriptIndex}"
                                data-property-name="${key}">
                            <i class="ri-subtract-line"></i>
                        </button>
                        <input
                            type="text"
                            class="scriptPropertyInput"
                            data-script-index="${scriptIndex}"
                            data-property-name="${key}"
                            data-property-type="number"
                            value="${value}"
                        >
                        <button class="scriptPropNumberBtn scriptPropNumberIncrease"
                                data-script-index="${scriptIndex}"
                                data-property-name="${key}">
                            <i class="ri-add-line"></i>
                        </button>
                    </div>`;
            } else {
                // Regular text input
                html += `
                    <input
                        type="text"
                        class="scriptPropertyInput"
                        data-script-index="${scriptIndex}"
                        data-property-name="${key}"
                        data-property-type="text"
                        value="${valueStr}"
                    >`;
            }

            html += `</div>`;
        }

        html += '</div>';
        return html;
    },

    /**
     * Attacher les événements aux éléments
     * @param {HTMLElement} container - Conteneur
     * @param {Object} objectData - Données de l'objet
     */
    attachEvents(container, objectData) {
        const $self = this;

        // Bouton "Add Script"
        const addBtn = container.querySelector('.scriptsListAddBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                $self.showScriptPicker(objectData, container);
            });
        }

        // Checkboxes enable/disable
        container.querySelectorAll('.scriptItemCheckbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-script-index'));
                objectData.properties.scripts[index].enabled = e.target.checked;
                sceneEditor.markAsModified();
            });
        });

        // Boutons "Change Script"
        container.querySelectorAll('.scriptItemChangeBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.scriptItemBtn').getAttribute('data-script-index'));
                $self.changeScript(objectData, index, container);
            });
        });

        // Boutons "Edit Script File" (si présents)
        const editBtns = container.querySelectorAll('.scriptItemEditBtn');
        if (editBtns.length > 0) {
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.closest('.scriptItemBtn').getAttribute('data-script-index'));
                    const scriptPath = objectData.properties.scripts[index].path;
                    $self.openScriptInEditor(scriptPath);
                });
            });
        }

        // Boutons "Remove Script"
        container.querySelectorAll('.scriptItemRemoveBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.scriptItemBtn').getAttribute('data-script-index'));
                $self.removeScript(objectData, index, container);
            });
        });

        // Inputs des propriétés
        container.querySelectorAll('.scriptPropertyInput').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-script-index'));
                const propName = e.target.getAttribute('data-property-name');
                const propType = e.target.getAttribute('data-property-type');
                let value = e.target.value;

                // Parser le type
                if (propType === 'number') {
                    value = parseFloat(value);
                }

                objectData.properties.scripts[index].properties[propName] = value;
                sceneEditor.markAsModified();

                // Refresh collider visualizations if this is a collider property
                if (sceneEditor.refreshAllColliderVisualizations) {
                    sceneEditor.refreshAllColliderVisualizations();
                }
            });
        });

        // Checkboxes des propriétés (boolean)
        container.querySelectorAll('.scriptPropertyCheckbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.getAttribute('data-script-index'));
                const propName = e.target.getAttribute('data-property-name');
                const value = e.target.checked;

                objectData.properties.scripts[index].properties[propName] = value;
                sceneEditor.markAsModified();

                // Refresh collider visualizations if this is a collider property
                if (sceneEditor.refreshAllColliderVisualizations) {
                    sceneEditor.refreshAllColliderVisualizations();
                }
            });
        });

        // Gestion des boutons +/- pour les inputs number (comme dans properties.js)
        this.setupNumberButtons(container, objectData);

        // Drag and drop support
        this.setupDragAndDrop(container, objectData);
    },

    /**
     * Configurer le drag and drop pour les scripts
     * @param {HTMLElement} container - Conteneur
     * @param {Object} objectData - Données de l'objet
     */
    setupDragAndDrop(container, objectData) {
        const $self = this;
        const scriptsListBody = container.querySelector('.scriptsListBody');

        if (!scriptsListBody) return;

        // Drag over sur la zone globale des scripts
        scriptsListBody.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const scriptPath = e.dataTransfer.types.includes('text/script-path');
            if (scriptPath) {
                e.dataTransfer.dropEffect = 'copy';
                this.style.outline = '2px dashed var(--secondary)';
                this.style.backgroundColor = 'rgba(94, 205, 187, 0.05)';
            }
        });

        scriptsListBody.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.outline = '';
            this.style.backgroundColor = '';
        });

        // Drop sur la zone globale - ajouter un nouveau script
        scriptsListBody.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.outline = '';
            this.style.backgroundColor = '';

            const scriptPath = e.dataTransfer.getData('text/script-path');
            const scriptName = e.dataTransfer.getData('text/script-name');

            if (scriptPath && scriptName.toLowerCase().endsWith('.js')) {
                // Convertir en chemin relatif
                const relativePath = application.getResourcesPathFromFile(scriptPath);
                $self.addScript(objectData, relativePath, container);
            }
        });

        // Drag and drop sur les items individuels pour remplacer
        container.querySelectorAll('.scriptItem').forEach((item, index) => {
            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const scriptPath = e.dataTransfer.types.includes('text/script-path');
                if (scriptPath) {
                    e.dataTransfer.dropEffect = 'copy';
                    this.style.outline = '2px dashed var(--warning-500)';
                    this.style.backgroundColor = 'rgba(251, 191, 36, 0.05)';
                }
            });

            item.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.style.outline = '';
                this.style.backgroundColor = '';
            });

            item.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.style.outline = '';
                this.style.backgroundColor = '';

                const scriptPath = e.dataTransfer.getData('text/script-path');
                const scriptName = e.dataTransfer.getData('text/script-name');

                if (scriptPath && scriptName.toLowerCase().endsWith('.js')) {
                    // Convertir en chemin relatif
                    const relativePath = application.getResourcesPathFromFile(scriptPath);

                    // Vérifier si le script n'est pas déjà attaché
                    const alreadyAttached = objectData.properties.scripts.some((s, i) => i !== index && s.path === relativePath);
                    if (alreadyAttached) {
                        const notifications = nw.require('./assets/js/objects/notifications');
                        if (notifications) {
                            notifications.warning('This script is already attached to this object');
                        }
                        return;
                    }

                    // Obtenir les propriétés par défaut du nouveau script
                    let defaultProperties = {};
                    try {
                        const player = nw.require('./assets/js/objects/player');
                        if (player && player.scriptManager && typeof player.scriptManager.getScriptDefaultProperties === 'function') {
                            defaultProperties = player.scriptManager.getScriptDefaultProperties(relativePath);
                        } else {
                            // Fallback: charger le script directement
                            const fullPath = application.getFilePathFromResources(relativePath);
                            delete require.cache[require.resolve(fullPath)];
                            const ScriptClass = require(fullPath);
                            const tempInstance = new ScriptClass();
                            defaultProperties = tempInstance.properties || {};
                        }
                    } catch (error) {
                        console.error('[ScriptsList] Error loading script properties:', error);
                    }

                    // Remplacer le script
                    objectData.properties.scripts[index] = {
                        path: relativePath,
                        enabled: objectData.properties.scripts[index].enabled,
                        properties: { ...defaultProperties }
                    };

                    // Marquer comme modifié
                    sceneEditor.markAsModified();

                    // Rafraîchir l'affichage
                    $self.display(objectData, container);

                    // Notification
                    const notifications = nw.require('./assets/js/objects/notifications');
                    if (notifications) {
                        const name = application.getFileNameFromResources(relativePath).replace('.js', '');
                        notifications.success(`Script changed to "${name}"`);
                    }
                }
            });
        });
    },

    /**
     * Configurer les boutons +/- pour les inputs number
     * @param {HTMLElement} container - Conteneur
     * @param {Object} objectData - Données de l'objet
     */
    setupNumberButtons(container, objectData) {
        // Variables pour la répétition et l'accélération
        let repeatTimeout = null;
        let repeatAcceleration = null;
        let repeatDelay = 100;
        let currentButton = null;
        let currentIsIncrease = false;
        let currentEvent = null;
        let lastAppliedValue = null;

        // Fonction pour incrémenter/décrémenter une valeur
        const changeNumberValue = function (button, isIncrease, event, skipApply = false) {
            const scriptIndex = parseInt(button.getAttribute('data-script-index'));
            const propName = button.getAttribute('data-property-name');
            const input = button.parentElement.querySelector('input');

            if (!input || !objectData.properties.scripts[scriptIndex]) return null;

            let currentValue = parseFloat(input.value) || 0;

            // Incrément basé sur les touches modificatrices
            let increment = 1;
            if (event && event.shiftKey) {
                increment = 10; // Shift = +10/-10
            } else if (event && event.ctrlKey) {
                increment = 0.1; // Ctrl = +0.1/-0.1
            }

            if (isIncrease) {
                currentValue += increment;
            } else {
                currentValue -= increment;
            }

            // Arrondir pour éviter les problèmes de virgule flottante
            currentValue = Math.round(currentValue * 100) / 100;

            input.value = currentValue;

            // Mettre à jour les données
            objectData.properties.scripts[scriptIndex].properties[propName] = currentValue;

            if (!skipApply) {
                sceneEditor.markAsModified();
            }

            return currentValue;
        };

        // Mousedown pour démarrer la répétition
        container.addEventListener('mousedown', function (event) {
            const target = event.target.closest('.scriptPropNumberBtn');
            if (!target) return;

            event.preventDefault(); // Empêcher la sélection de texte

            currentButton = target;
            currentIsIncrease = target.classList.contains('scriptPropNumberIncrease');
            currentEvent = event;

            // Premier clic - appliquer immédiatement
            lastAppliedValue = changeNumberValue(target, currentIsIncrease, event, false);

            // Réinitialiser les paramètres d'accélération
            repeatDelay = 100;

            // Fonction de répétition accélérée progressive
            const acceleratedRepeat = function () {
                // Mettre à jour la valeur sans appliquer (pour la vitesse)
                lastAppliedValue = changeNumberValue(currentButton, currentIsIncrease, currentEvent, true);

                // Diminuer le délai pour l'accélération (minimum 20ms)
                repeatDelay = Math.max(20, repeatDelay - 5);

                // Planifier la prochaine répétition avec le nouveau délai
                repeatAcceleration = setTimeout(acceleratedRepeat, repeatDelay);
            };

            // Commencer la répétition après un délai initial
            repeatTimeout = setTimeout(() => {
                acceleratedRepeat();
            }, 400); // Commencer la répétition après 400ms de maintien
        }, false);

        // Arrêter la répétition sur mouseup ou mouseleave
        const stopRepeat = function () {
            if (repeatTimeout) {
                clearTimeout(repeatTimeout);
                repeatTimeout = null;
            }
            if (repeatAcceleration) {
                clearTimeout(repeatAcceleration);
                repeatAcceleration = null;
            }

            // Appliquer la valeur finale
            if (currentButton && lastAppliedValue !== null) {
                sceneEditor.markAsModified();
            }

            // Réinitialiser
            repeatDelay = 100;
            currentButton = null;
            currentIsIncrease = false;
            currentEvent = null;
            lastAppliedValue = null;
        };

        container.addEventListener('mouseup', stopRepeat, false);
        container.addEventListener('mouseleave', stopRepeat, false);
    },

    /**
     * Afficher le sélecteur de scripts
     * @param {Object} objectData - Données de l'objet
     * @param {HTMLElement} container - Conteneur
     */
    showScriptPicker(objectData, container) {
        const $self = this;

        // Ouvrir le file picker
        let fpBody = document.querySelector("#filePicker #fpBody");
        fpBody.innerHTML = "";

        // Charger les scripts internes
        const internalScriptsManager = nw.require('./assets/js/objects/internalScriptsManager');
        internalScriptsManager.init();

        // Créer les sections
        let html = '';

        // Section des scripts internes
        const categories = internalScriptsManager.getCategories();
        if (categories.length > 0) {
            html += '<div class="fpSection fpInternalScripts">';
            html += '<div class="fpSectionTitle"><i class="ri-code-box-line"></i> Internal Scripts</div>';

            categories.forEach(category => {
                const scripts = internalScriptsManager.getCategoryScripts(category.id);

                if (scripts.length > 0) {
                    html += `<div class="fpCategory">`;
                    html += `<div class="fpCategoryTitle" style="color: ${category.color}">`;
                    html += `<i class="${category.icon}"></i> ${category.name}`;
                    html += `</div>`;
                    html += `<div class="fpCategoryScripts">`;

                    scripts.forEach(script => {
                        html += `<div class="fpInternalScriptItem" data-script-id="${script.id}" data-script-path="${script.path}">`;
                        html += `<div class="fpScriptIcon" style="background: ${script.color}20; border-color: ${script.color}">`;
                        html += `<i class="${script.icon}" style="color: ${script.color}"></i>`;
                        html += `</div>`;
                        html += `<div class="fpScriptInfo">`;
                        html += `<div class="fpScriptName">${script.name}</div>`;
                        html += `<div class="fpScriptDesc">${script.description || ''}</div>`;
                        html += `</div>`;
                        html += `</div>`;
                    });

                    html += `</div></div>`;
                }
            });

            html += '</div>';
        }

        // Section des scripts utilisateur
        html += '<div class="fpSection fpUserScripts">';
        html += '<div class="fpSectionTitle"><i class="ri-file-code-line"></i> Project Scripts</div>';
        html += '<div id="fpUserScriptsContent"></div>';
        html += '</div>';

        // Charger les scripts utilisateur d'abord (dans fpBody)
        filePicker.loadAssetsFiles(globals.project.files, 'script');

        // Récupérer tous les éléments de scripts utilisateur avant d'insérer notre HTML
        const userScriptItems = Array.from(fpBody.querySelectorAll('.fpBodyItem'));

        // Maintenant insérer notre HTML personnalisé
        fpBody.innerHTML = html;

        // Obtenir le conteneur des scripts utilisateur et y déplacer les éléments
        const userScriptsContainer = document.getElementById('fpUserScriptsContent');
        userScriptItems.forEach(item => {
            userScriptsContainer.appendChild(item);
        });

        // Montrer le file picker
        $("#filePickerBack").attr("opened", "true");

        // Gérer la sélection des scripts internes
        $(".fpInternalScriptItem").off('click').on('click', function () {
            const scriptPath = this.getAttribute('data-script-path');

            if (scriptPath && scriptPath !== '') {
                $self.addScript(objectData, scriptPath, container);
            }

            // Fermer le picker
            $("#filePickerBack").attr("opened", "false");
        });

        // Gérer la sélection des scripts utilisateur
        $(".fpBodyItem img").off('click').on('click', function () {
            const scriptPath = this.getAttribute('assetsPath');

            if (scriptPath && scriptPath !== '') {
                $self.addScript(objectData, scriptPath, container);
            }

            // Fermer le picker
            $("#filePickerBack").attr("opened", "false");
        });
    },

    /**
     * Ajouter un script à un objet
     * @param {Object} objectData - Données de l'objet
     * @param {string} scriptPath - Chemin du script
     * @param {HTMLElement} container - Conteneur
     */
    addScript(objectData, scriptPath, container) {
        console.log('[ScriptsList] Adding script:', scriptPath);

        // Note: Permettre d'attacher le même script plusieurs fois
        // Chaque instance aura ses propres propriétés indépendantes

        // Vérifier si c'est un script interne
        const internalScriptsManager = nw.require('./assets/js/objects/internalScriptsManager');
        const isInternal = internalScriptsManager.isInternalScript(scriptPath);

        // Obtenir les propriétés par défaut du script
        let defaultProperties = {};
        let scriptName = '';

        if (isInternal) {
            // Script interne: obtenir les propriétés depuis le registry
            defaultProperties = internalScriptsManager.getScriptDefaultProperties(scriptPath);
            const scriptMeta = internalScriptsManager.getScriptByPath(scriptPath);
            scriptName = scriptMeta ? scriptMeta.name : scriptPath;
            console.log('[ScriptsList] Internal script properties:', defaultProperties);
        } else {
            // Script utilisateur: charger depuis le fichier
            try {
                const player = nw.require('./assets/js/objects/player');
                console.log('[ScriptsList] Player loaded:', !!player);
                console.log('[ScriptsList] ScriptManager available:', !!player.scriptManager);

                if (player && player.scriptManager && typeof player.scriptManager.getScriptDefaultProperties === 'function') {
                    defaultProperties = player.scriptManager.getScriptDefaultProperties(scriptPath);
                    console.log('[ScriptsList] Default properties loaded:', defaultProperties);
                } else {
                    console.warn('[ScriptsList] ScriptManager not available, trying to load script directly');
                    // Fallback: charger le script directement
                    try {
                        const fullPath = application.getFilePathFromResources(scriptPath);
                        delete require.cache[require.resolve(fullPath)];
                        const ScriptClass = require(fullPath);
                        const tempInstance = new ScriptClass();
                        defaultProperties = tempInstance.properties || {};
                        console.log('[ScriptsList] Properties loaded from script:', defaultProperties);
                    } catch (err) {
                        console.error('[ScriptsList] Failed to load script properties:', err);
                    }
                }
            } catch (error) {
                console.error('[ScriptsList] Error loading script properties:', error);
            }

            scriptName = application.getFileNameFromResources(scriptPath).replace('.js', '');
        }

        // Créer l'entrée du script
        const scriptData = {
            path: scriptPath,
            enabled: true,
            properties: { ...defaultProperties }
        };

        console.log('[ScriptsList] Script data created:', scriptData);

        // Ajouter à l'objet
        objectData.properties.scripts.push(scriptData);

        // Marquer comme modifié
        sceneEditor.markAsModified();

        // Rafraîchir l'affichage
        this.display(objectData, container);

        // Rafraîchir les visualisations de colliders si applicable
        if (sceneEditor.refreshAllColliderVisualizations) {
            sceneEditor.refreshAllColliderVisualizations();
        }

        // Notification
        const notifications = nw.require('./assets/js/objects/notifications');
        if (notifications) {
            notifications.success(`Script "${scriptName}" added successfully`);
        }
    },

    /**
     * Changer un script par un autre
     * @param {Object} objectData - Données de l'objet
     * @param {number} index - Index du script à changer
     * @param {HTMLElement} container - Conteneur
     */
    changeScript(objectData, index, container) {
        const $self = this;
        const oldScriptPath = objectData.properties.scripts[index].path;

        // Ouvrir le file picker
        let fpBody = document.querySelector("#filePicker #fpBody");
        fpBody.innerHTML = "";

        // Charger les scripts internes
        const internalScriptsManager = nw.require('./assets/js/objects/internalScriptsManager');
        internalScriptsManager.init();

        // Créer les sections
        let html = '';

        // Section des scripts internes
        const categories = internalScriptsManager.getCategories();
        if (categories.length > 0) {
            html += '<div class="fpSection fpInternalScripts">';
            html += '<div class="fpSectionTitle"><i class="ri-code-box-line"></i> Internal Scripts</div>';

            categories.forEach(category => {
                const scripts = internalScriptsManager.getCategoryScripts(category.id);

                if (scripts.length > 0) {
                    html += `<div class="fpCategory">`;
                    html += `<div class="fpCategoryTitle" style="color: ${category.color}">`;
                    html += `<i class="${category.icon}"></i> ${category.name}`;
                    html += `</div>`;
                    html += `<div class="fpCategoryScripts">`;

                    scripts.forEach(script => {
                        html += `<div class="fpInternalScriptItem" data-script-id="${script.id}" data-script-path="${script.path}">`;
                        html += `<div class="fpScriptIcon" style="background: ${script.color}20; border-color: ${script.color}">`;
                        html += `<i class="${script.icon}" style="color: ${script.color}"></i>`;
                        html += `</div>`;
                        html += `<div class="fpScriptInfo">`;
                        html += `<div class="fpScriptName">${script.name}</div>`;
                        html += `<div class="fpScriptDesc">${script.description || ''}</div>`;
                        html += `</div>`;
                        html += `</div>`;
                    });

                    html += `</div></div>`;
                }
            });

            html += '</div>';
        }

        // Section des scripts utilisateur
        html += '<div class="fpSection fpUserScripts">';
        html += '<div class="fpSectionTitle"><i class="ri-file-code-line"></i> Project Scripts</div>';
        html += '<div id="fpUserScriptsContent"></div>';
        html += '</div>';

        // Charger les scripts utilisateur d'abord (dans fpBody)
        filePicker.loadAssetsFiles(globals.project.files, 'script');

        // Récupérer tous les éléments de scripts utilisateur avant d'insérer notre HTML
        const userScriptItems = Array.from(fpBody.querySelectorAll('.fpBodyItem'));

        // Maintenant insérer notre HTML personnalisé
        fpBody.innerHTML = html;

        // Obtenir le conteneur des scripts utilisateur et y déplacer les éléments
        const userScriptsContainer = document.getElementById('fpUserScriptsContent');
        userScriptItems.forEach(item => {
            userScriptsContainer.appendChild(item);
        });

        // Montrer le file picker
        $("#filePickerBack").attr("opened", "true");

        // Fonction pour changer le script
        const replaceScript = function(scriptPath) {
            if (scriptPath && scriptPath !== '' && scriptPath !== oldScriptPath) {
                // Vérifier si le nouveau script n'est pas déjà attaché
                const alreadyAttached = objectData.properties.scripts.some((s, i) => i !== index && s.path === scriptPath);
                if (alreadyAttached) {
                    const notifications = nw.require('./assets/js/objects/notifications');
                    if (notifications) {
                        notifications.warning('This script is already attached to this object');
                    }
                    $("#filePickerBack").attr("opened", "false");
                    return;
                }

                // Vérifier si c'est un script interne
                const isInternal = internalScriptsManager.isInternalScript(scriptPath);
                let defaultProperties = {};
                let scriptName = '';

                if (isInternal) {
                    // Script interne
                    defaultProperties = internalScriptsManager.getScriptDefaultProperties(scriptPath);
                    const scriptMeta = internalScriptsManager.getScriptByPath(scriptPath);
                    scriptName = scriptMeta ? scriptMeta.name : scriptPath;
                } else {
                    // Script utilisateur
                    try {
                        const player = nw.require('./assets/js/objects/player');
                        if (player && player.scriptManager && typeof player.scriptManager.getScriptDefaultProperties === 'function') {
                            defaultProperties = player.scriptManager.getScriptDefaultProperties(scriptPath);
                        } else {
                            // Fallback: charger le script directement
                            const fullPath = application.getFilePathFromResources(scriptPath);
                            delete require.cache[require.resolve(fullPath)];
                            const ScriptClass = require(fullPath);
                            const tempInstance = new ScriptClass();
                            defaultProperties = tempInstance.properties || {};
                        }
                    } catch (error) {
                        console.error('[ScriptsList] Error loading script properties:', error);
                    }

                    scriptName = application.getFileNameFromResources(scriptPath).replace('.js', '');
                }

                // Remplacer le script
                objectData.properties.scripts[index] = {
                    path: scriptPath,
                    enabled: objectData.properties.scripts[index].enabled, // Garder l'état enabled
                    properties: { ...defaultProperties }
                };

                // Marquer comme modifié
                sceneEditor.markAsModified();

                // Rafraîchir l'affichage
                $self.display(objectData, container);

                // Notification
                const notifications = nw.require('./assets/js/objects/notifications');
                if (notifications) {
                    notifications.success(`Script changed to "${scriptName}"`);
                }
            }

            // Fermer le picker
            $("#filePickerBack").attr("opened", "false");
        };

        // Gérer la sélection des scripts internes
        $(".fpInternalScriptItem").off('click').on('click', function () {
            const scriptPath = this.getAttribute('data-script-path');
            replaceScript(scriptPath);
        });

        // Gérer la sélection des scripts utilisateur
        $(".fpBodyItem img").off('click').on('click', function () {
            const scriptPath = this.getAttribute('assetsPath');
            replaceScript(scriptPath);
        });
    },

    /**
     * Retirer un script d'un objet
     * @param {Object} objectData - Données de l'objet
     * @param {number} index - Index du script
     * @param {HTMLElement} container - Conteneur
     */
    removeScript(objectData, index, container) {
        const scriptName = application.getFileNameFromResources(objectData.properties.scripts[index].path).replace('.js', '');

        // Retirer du tableau
        objectData.properties.scripts.splice(index, 1);

        // Marquer comme modifié
        sceneEditor.markAsModified();

        // Rafraîchir l'affichage
        this.display(objectData, container);

        // Rafraîchir les visualisations de colliders si applicable
        if (sceneEditor.refreshAllColliderVisualizations) {
            sceneEditor.refreshAllColliderVisualizations();
        }

        // Notification
        const notifications = nw.require('./assets/js/objects/notifications');
        if (notifications) {
            notifications.info(`Script "${scriptName}" removed`);
        }
    },

    /**
     * Ouvrir un script dans l'éditeur
     * @param {string} scriptPath - Chemin relatif du script
     */
    openScriptInEditor(scriptPath) {
        const scriptEditor = nw.require('./assets/js/objects/scriptEditor');
        const fullPath = application.getFilePathFromResources(scriptPath);

        if (scriptEditor && typeof scriptEditor.openFile === 'function') {
            scriptEditor.openFile(fullPath);

            // Basculer vers l'onglet Script Editor
            const scriptEditorTab = document.getElementById('scriptEditorTab');
            if (scriptEditorTab) {
                scriptEditorTab.click();
            }
        }
    }
};
