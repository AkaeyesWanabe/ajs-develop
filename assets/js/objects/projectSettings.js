const fs = nw.require('fs');
const path = nw.require('path');
const application = nw.require('./assets/js/objects/application');
const projectCache = nw.require('./assets/js/objects/projectCache');

/**
 * Project Settings Manager
 * Gère l'interface des paramètres du projet (extension com.ajs.application)
 */
const projectSettings = {
    modal: null,
    currentSettings: null,

    /**
     * Initialize the project settings manager
     */
    init() {

        // Get modal reference
        this.modal = document.getElementById('projectSettingsModal');

        // Setup tabs
        this.setupTabs();

        // Load current settings
        this.loadSettings();
    },

    /**
     * Setup tab switching
     */
    setupTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    },

    /**
     * Switch to a specific tab
     * @param {string} tabName - Tab identifier
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Update tab content
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.toggle('active', content.getAttribute('data-tab') === tabName);
        });
    },

    /**
     * Open the settings modal
     */
    open() {
        this.loadSettings();
        this.populateFields();
        this.modal.style.display = 'flex';
    },

    /**
     * Close the settings modal
     */
    close() {
        this.modal.style.display = 'none';
    },

    /**
     * Load settings from project data
     */
    loadSettings() {
        if (!application.projectData || !application.projectData.properties) {
            console.warn('[ProjectSettings] No project data available');
            this.currentSettings = this.getDefaultSettings();
            return;
        }

        const props = application.projectData.properties;

        this.currentSettings = {
            name: props.name || 'New Game',
            version: props.version || '1.0.0',
            author: props.author || '',
            company: props.company || '',
            package: props.package || 'com.company.newgame',
            icon: props.icon || 'favicon.png',
            width: props.width || 640,
            height: props.height || 480,
            fullscreen: props.fullscreen || false,
            resizable: props.resizable !== undefined ? props.resizable : true,
            mainScene: props.mainScene || '',
            targetFPS: props.targetFPS || 60
        };

    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            name: 'New Game',
            version: '1.0.0',
            author: '',
            company: '',
            package: 'com.company.newgame',
            icon: 'favicon.png',
            width: 640,
            height: 480,
            fullscreen: false,
            resizable: true,
            mainScene: '',
            targetFPS: 60
        };
    },

    /**
     * Populate form fields with current settings
     */
    populateFields() {
        if (!this.currentSettings) {
            this.loadSettings();
        }

        // General tab
        document.getElementById('appName').value = this.currentSettings.name;
        document.getElementById('appVersion').value = this.currentSettings.version;
        document.getElementById('appAuthor').value = this.currentSettings.author;
        document.getElementById('appCompany').value = this.currentSettings.company;
        document.getElementById('appPackage').value = this.currentSettings.package;
        document.getElementById('appIcon').value = this.currentSettings.icon;

        // Window tab
        document.getElementById('appWidth').value = this.currentSettings.width;
        document.getElementById('appHeight').value = this.currentSettings.height;
        document.getElementById('appFullscreen').checked = this.currentSettings.fullscreen;
        document.getElementById('appResizable').checked = this.currentSettings.resizable;

        // Runtime tab
        document.getElementById('appMainScene').value = this.currentSettings.mainScene;
        document.getElementById('appTargetFPS').value = this.currentSettings.targetFPS;
    },

    /**
     * Collect values from form fields
     */
    collectFieldValues() {
        return {
            name: document.getElementById('appName').value,
            version: document.getElementById('appVersion').value,
            author: document.getElementById('appAuthor').value,
            company: document.getElementById('appCompany').value,
            package: document.getElementById('appPackage').value,
            icon: document.getElementById('appIcon').value,
            width: parseInt(document.getElementById('appWidth').value) || 640,
            height: parseInt(document.getElementById('appHeight').value) || 480,
            fullscreen: document.getElementById('appFullscreen').checked,
            resizable: document.getElementById('appResizable').checked,
            mainScene: document.getElementById('appMainScene').value,
            targetFPS: parseInt(document.getElementById('appTargetFPS').value) || 60
        };
    },

    /**
     * Save settings to project data
     */
    save() {
        const newSettings = this.collectFieldValues();

        // Validate
        if (!this.validateSettings(newSettings)) {
            return;
        }

        try {
            const projectPath = application.currentProjectPath;
            if (!projectPath) {
                alert('Erreur: Aucun projet ouvert');
                return;
            }

            // IMPORTANT: Load existing project data to preserve cache and other fields
            let projectData = projectCache.loadProjectData();

            if (!projectData) {
                // If no existing data, create new structure
                projectData = {
                    properties: {},
                    cache: {}
                };
            }

            // Ensure properties object exists
            if (!projectData.properties) {
                projectData.properties = {};
            }

            // Apply new settings to properties
            Object.assign(projectData.properties, newSettings);

            // Update application.projectData reference
            application.projectData = projectData;

            // Save to file using projectCache to preserve all fields
            const success = projectCache.saveProjectData(projectData);

            if (!success) {
                throw new Error('Failed to write project data file');
            }


            // Update runtime if player is initialized
            if (window.player && window.player.runtimeManager) {
                this.updateRuntimeSettings(newSettings);
            }

            // Close modal
            this.close();

            // Show success notification
            if (window.notifications) {
                window.notifications.success('Paramètres sauvegardés avec succès');
            }

        } catch (err) {
            console.error('[ProjectSettings] Failed to save settings:', err);
            alert('Erreur lors de la sauvegarde des paramètres: ' + err.message);
        }
    },

    /**
     * Validate settings
     * @param {Object} settings - Settings to validate
     * @returns {boolean} True if valid
     */
    validateSettings(settings) {
        // Validate name
        if (!settings.name || settings.name.trim() === '') {
            alert('Le nom de l\'application est requis');
            this.switchTab('general');
            document.getElementById('appName').focus();
            return false;
        }

        // Validate package
        if (!settings.package || !settings.package.match(/^[a-z0-9.]+$/)) {
            alert('Le package doit être au format: com.company.name (lettres minuscules, chiffres et points uniquement)');
            this.switchTab('general');
            document.getElementById('appPackage').focus();
            return false;
        }

        // Validate dimensions
        if (settings.width < 320 || settings.width > 3840) {
            alert('La largeur doit être entre 320 et 3840 pixels');
            this.switchTab('window');
            document.getElementById('appWidth').focus();
            return false;
        }

        if (settings.height < 240 || settings.height > 2160) {
            alert('La hauteur doit être entre 240 et 2160 pixels');
            this.switchTab('window');
            document.getElementById('appHeight').focus();
            return false;
        }

        // Validate FPS
        if (settings.targetFPS < 30 || settings.targetFPS > 144) {
            alert('Le FPS cible doit être entre 30 et 144');
            this.switchTab('runtime');
            document.getElementById('appTargetFPS').focus();
            return false;
        }

        return true;
    },

    /**
     * Update runtime settings (if player is running)
     * @param {Object} settings - New settings
     */
    updateRuntimeSettings(settings) {
        try {
            const appExt = window.player.runtimeManager.getSystemInstance('com.ajs.application');
            if (appExt && appExt.runtime.updateApplicationInfo) {
                appExt.runtime.updateApplicationInfo(appExt, settings);
            }
        } catch (err) {
            console.error('[ProjectSettings] Failed to update runtime settings:', err);
        }
    },

    /**
     * Open scene selector for main scene
     */
    selectMainScene() {
        // Get all .scn files in the project
        const projectPath = application.currentProjectPath;
        if (!projectPath) {
            alert('Aucun projet ouvert');
            return;
        }

        const scenesPath = path.join(projectPath, 'scenes');
        if (!fs.existsSync(scenesPath)) {
            alert('Aucun dossier scenes trouvé dans le projet');
            return;
        }

        // List all .scn files
        const sceneFiles = this.findSceneFiles(scenesPath);

        if (sceneFiles.length === 0) {
            alert('Aucune scène trouvée dans le projet');
            return;
        }

        // Show modern scene selector modal
        this.showSceneSelector(sceneFiles);
    },

    /**
     * Find all scene files recursively
     * @param {string} dir - Directory to search
     * @param {string} basePath - Base path for relative paths
     * @returns {Array} List of scene file paths
     */
    findSceneFiles(dir, basePath = null) {
        if (!basePath) basePath = dir;

        const results = [];
        const items = fs.readdirSync(dir);

        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                results.push(...this.findSceneFiles(fullPath, basePath));
            } else if (item.endsWith('.scn')) {
                const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
                results.push(relativePath);
            }
        });

        return results;
    },

    /**
     * Show scene selector modal
     * @param {Array} scenes - List of scene paths
     */
    showSceneSelector(scenes) {
        // Store scenes for later use
        this.availableScenes = scenes;
        this.selectedScenePath = null;

        // Get current main scene value
        const currentMainScene = document.getElementById('appMainScene').value;

        // Populate scene list
        const sceneList = document.getElementById('sceneList');
        sceneList.innerHTML = '';

        scenes.forEach((scenePath, index) => {
            const li = document.createElement('li');
            li.className = 'scene-list-item';
            li.dataset.scenePath = scenePath;
            li.dataset.index = index;

            // Check if this is the current main scene
            const fullScenePath = 'scenes/' + scenePath;
            if (fullScenePath === currentMainScene) {
                li.classList.add('selected');
                this.selectedScenePath = scenePath;
            }

            li.innerHTML = `
                <i class="ri-film-line"></i>
                <span class="scene-name">${scenePath}</span>
            `;

            li.addEventListener('click', () => {
                // Remove selected class from all items
                sceneList.querySelectorAll('.scene-list-item').forEach(item => {
                    item.classList.remove('selected');
                });

                // Add selected class to clicked item
                li.classList.add('selected');
                this.selectedScenePath = scenePath;
            });

            // Double-click to confirm selection
            li.addEventListener('dblclick', () => {
                this.selectedScenePath = scenePath;
                this.confirmSceneSelection();
            });

            sceneList.appendChild(li);
        });

        // Update count
        this.updateSceneCount(scenes.length, scenes.length);

        // Clear search input
        const searchInput = document.getElementById('sceneSearchInput');
        searchInput.value = '';

        // Add keyboard handler for search input
        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.confirmSceneSelection();
            } else if (e.key === 'Escape') {
                this.closeSceneSelector();
            }
        };

        // Show modal
        document.getElementById('sceneSelectorModal').style.display = 'flex';

        // Focus search input
        setTimeout(() => searchInput.focus(), 100);
    },

    /**
     * Filter scenes based on search input
     */
    filterScenes() {
        const searchTerm = document.getElementById('sceneSearchInput').value.toLowerCase();
        const sceneList = document.getElementById('sceneList');
        const items = sceneList.querySelectorAll('.scene-list-item');

        let visibleCount = 0;

        items.forEach(item => {
            const sceneName = item.dataset.scenePath.toLowerCase();
            if (sceneName.includes(searchTerm)) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        this.updateSceneCount(visibleCount, items.length);
    },

    /**
     * Update scene count display
     * @param {number} visible - Number of visible scenes
     * @param {number} total - Total number of scenes
     */
    updateSceneCount(visible, total) {
        const countElem = document.getElementById('sceneCount');
        const sceneList = document.getElementById('sceneList');
        const noScenesMessage = document.getElementById('noScenesMessage');

        if (visible === total) {
            countElem.textContent = `${total} scène(s) trouvée(s)`;
        } else {
            countElem.textContent = `${visible} / ${total} scène(s)`;
        }

        // Show/hide no scenes message
        if (visible === 0) {
            sceneList.style.display = 'none';
            noScenesMessage.style.display = 'flex';
        } else {
            sceneList.style.display = 'block';
            noScenesMessage.style.display = 'none';
        }
    },

    /**
     * Confirm scene selection
     */
    confirmSceneSelection() {
        if (!this.selectedScenePath) {
            alert('Veuillez sélectionner une scène');
            return;
        }

        // Set the selected scene as main scene
        const fullPath = 'scenes/' + this.selectedScenePath;
        document.getElementById('appMainScene').value = fullPath;

        // Close modal
        this.closeSceneSelector();

    },

    /**
     * Close scene selector modal
     */
    closeSceneSelector() {
        document.getElementById('sceneSelectorModal').style.display = 'none';
        this.selectedScenePath = null;
        this.availableScenes = null;
    }
};

module.exports = projectSettings;
