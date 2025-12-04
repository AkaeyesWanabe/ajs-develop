/**
 * Internal Scripts Manager
 *
 * Manages built-in scripts (physics, rendering, etc.)
 * Each internal script is in its own folder with a data.json file
 */

const internalScriptsManager = {
    scripts: new Map(), // Map<scriptPath, scriptData>
    categories: new Map(), // Map<categoryId, categoryData>
    initialized: false,

    /**
     * Initialize and scan internal scripts folders
     */
    init() {
        if (this.initialized) return;

        try {
            const fs = require('fs');
            const path = require('path');

            // Base path for internal scripts
            const scriptsBasePath = path.join(__dirname, '../../../scripts');

            // Scan physics folder
            this.scanCategory(scriptsBasePath, 'physics');

            console.log(`[InternalScriptsManager] Loaded ${this.scripts.size} internal scripts`);
            this.initialized = true;
        } catch (error) {
            console.error('[InternalScriptsManager] Failed to initialize:', error);
            this.initialized = true; // Mark as initialized to prevent retry loops
        }
    },

    /**
     * Scan a category folder for internal scripts
     */
    scanCategory(basePath, categoryId) {
        const fs = require('fs');
        const path = require('path');

        const categoryPath = path.join(basePath, categoryId);

        // Check if category folder exists
        if (!fs.existsSync(categoryPath)) {
            console.warn(`[InternalScriptsManager] Category folder not found: ${categoryPath}`);
            return;
        }

        // Read all items in category folder
        const items = fs.readdirSync(categoryPath, { withFileTypes: true });

        // Process each directory (each script has its own folder)
        for (const item of items) {
            if (item.isDirectory()) {
                const scriptFolder = item.name;
                const scriptFolderPath = path.join(categoryPath, scriptFolder);
                const dataJsonPath = path.join(scriptFolderPath, 'data.json');

                // Check if data.json exists
                if (fs.existsSync(dataJsonPath)) {
                    try {
                        const dataJson = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

                        // Build script path
                        const scriptPath = `internal/${categoryId}/${scriptFolder}/${dataJson.file}`;

                        // Store script data
                        this.scripts.set(scriptPath, {
                            ...dataJson,
                            path: scriptPath,
                            folderPath: scriptFolderPath,
                            categoryId: categoryId,
                            isInternal: true
                        });

                        // Register category if not already registered
                        if (!this.categories.has(categoryId)) {
                            this.categories.set(categoryId, {
                                id: categoryId,
                                name: dataJson.categoryName || categoryId,
                                icon: dataJson.categoryIcon || 'ri-folder-line',
                                color: dataJson.categoryColor || '#888888'
                            });
                        }

                        console.log(`[InternalScriptsManager] Loaded: ${dataJson.name} (${scriptPath})`);
                    } catch (error) {
                        console.error(`[InternalScriptsManager] Error loading ${dataJsonPath}:`, error);
                    }
                }
            }
        }
    },

    /**
     * Get all categories
     */
    getCategories() {
        if (!this.initialized) this.init();

        return Array.from(this.categories.values()).map(category => ({
            ...category,
            scripts: this.getCategoryScripts(category.id).length
        }));
    },

    /**
     * Get all scripts in a category
     */
    getCategoryScripts(categoryId) {
        if (!this.initialized) this.init();

        const scripts = [];
        for (const [path, scriptData] of this.scripts.entries()) {
            if (scriptData.categoryId === categoryId) {
                scripts.push(scriptData);
            }
        }

        return scripts;
    },

    /**
     * Get all internal scripts (flat list)
     */
    getAllScripts() {
        if (!this.initialized) this.init();
        return Array.from(this.scripts.values());
    },

    /**
     * Get script metadata by ID
     */
    getScriptById(scriptId) {
        if (!this.initialized) this.init();

        for (const scriptData of this.scripts.values()) {
            if (scriptData.id === scriptId) {
                return scriptData;
            }
        }

        return null;
    },

    /**
     * Get script metadata by path
     */
    getScriptByPath(scriptPath) {
        if (!this.initialized) this.init();
        return this.scripts.get(scriptPath) || null;
    },

    /**
     * Get default properties for a script
     * @param {string} scriptIdOrPath - Script ID or path
     */
    getScriptDefaultProperties(scriptIdOrPath) {
        if (!this.initialized) this.init();

        // Try to find by path first
        let scriptData = this.scripts.get(scriptIdOrPath);

        // If not found, try by ID
        if (!scriptData) {
            scriptData = this.getScriptById(scriptIdOrPath);
        }

        if (!scriptData) {
            return {};
        }

        // Build properties object from schema
        const properties = {};
        if (scriptData.properties) {
            Object.entries(scriptData.properties).forEach(([key, prop]) => {
                properties[key] = prop.default;
            });
        }

        return properties;
    },

    /**
     * Check if a script is singleton (only one per object)
     */
    isSingleton(scriptIdOrPath) {
        const script = this.scripts.get(scriptIdOrPath) || this.getScriptById(scriptIdOrPath);
        return script ? script.singleton : false;
    },

    /**
     * Get total script count
     */
    getScriptCount() {
        return this.scripts.size;
    },

    /**
     * Get full file path for an internal script
     */
    getScriptPath(scriptIdOrPath) {
        const script = this.scripts.get(scriptIdOrPath) || this.getScriptById(scriptIdOrPath);
        if (!script) return null;

        const path = require('path');
        return path.join(script.folderPath, script.file);
    },

    /**
     * Check if a path is an internal script
     */
    isInternalScript(scriptPath) {
        if (!scriptPath) return false;
        return scriptPath.startsWith('internal/');
    },

    /**
     * Clear cache (useful for hot reload)
     */
    clear() {
        this.scripts.clear();
        this.categories.clear();
        this.initialized = false;
    }
};

module.exports = internalScriptsManager;
