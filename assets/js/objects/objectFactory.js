const fs = nw.require('fs');
const path = nw.require('path');
const sceneEditor = nw.require('./assets/js/objects/sceneEditor');

module.exports = {
    availableExtensions: [],

    /**
     * Load all available extensions from the extensions folder
     */
    loadAvailableExtensions() {
        this.availableExtensions = [];

        try {
            const extensionsDir = './extensions';
            const items = fs.readdirSync(extensionsDir, { withFileTypes: true });

            items.forEach(item => {
                if (item.isDirectory()) {
                    const extensionPath = path.join(extensionsDir, item.name);
                    const dataPath = path.join(extensionPath, 'data.json');

                    // Skip internal extensions for now (they're not addable objects)
                    if (item.name.startsWith('internal') || item.name === 'common') {
                        return;
                    }

                    try {
                        if (fs.existsSync(dataPath)) {
                            const dataContent = fs.readFileSync(dataPath, 'utf8');
                            const extensionData = JSON.parse(dataContent);

                            // Build full icon path
                            const iconFileName = extensionData.extensionIcon || extensionData.icon || 'icon.png';
                            const iconPath = path.join(extensionPath, iconFileName);
                            const iconExists = fs.existsSync(iconPath);

                            // Convert path to forward slashes for HTML compatibility
                            const iconPathWeb = iconExists ? iconPath.replace(/\\/g, '/') : null;

                            // Add extension info
                            this.availableExtensions.push({
                                id: item.name,
                                name: extensionData.extensionName || item.name,
                                description: extensionData.description || 'No description',
                                icon: iconPathWeb,
                                category: extensionData.category || 'Game Objects',
                                path: extensionPath,
                                data: extensionData
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to load extension ${item.name}:`, err);
                    }
                }
            });

            return this.availableExtensions;
        } catch (err) {
            console.error('Failed to load extensions:', err);
            return [];
        }
    },

    /**
     * Get extensions by category
     */
    getExtensionsByCategory(category) {
        return this.availableExtensions.filter(ext => ext.category === category);
    },

    /**
     * Create a new object instance from extension
     */
    createObject(extensionId, layer = 0) {
        const extension = this.availableExtensions.find(ext => ext.id === extensionId);
        if (!extension) {
            console.error(`Extension not found: ${extensionId}`);
            return null;
        }

        // Generate unique OID
        const oid = this.generateOID();

        // Create object data from extension defaults
        const objectData = {
            extension: extensionId,
            oid: oid,
            properties: { ...extension.data.properties },
            groups: "",
            layer: layer
        };

        // Generate unique name
        objectData.properties.name = this.generateUniqueName(objectData.properties.name);

        // Set default position (center of viewport)
        const scnEditor = document.querySelector("#scnEditor");
        if (scnEditor) {
            const scrollX = scnEditor.scrollLeft;
            const scrollY = scnEditor.scrollTop;
            const viewWidth = scnEditor.clientWidth;
            const viewHeight = scnEditor.clientHeight;

            objectData.properties.x = scrollX + viewWidth / 2;
            objectData.properties.y = scrollY + viewHeight / 2;
        }

        return objectData;
    },

    /**
     * Generate unique object name by checking existing names
     */
    generateUniqueName(baseName) {
        if (!sceneEditor.sceneData || !sceneEditor.sceneData.objects) {
            return baseName;
        }

        const existingNames = sceneEditor.sceneData.objects.map(obj => obj.properties.name);

        // If base name doesn't exist, use it
        if (!existingNames.includes(baseName)) {
            return baseName;
        }

        // Find the highest counter for this base name
        let counter = 1;
        let uniqueName;

        do {
            uniqueName = `${baseName} (${counter})`;
            counter++;
        } while (existingNames.includes(uniqueName));

        return uniqueName;
    },

    /**
     * Generate unique object ID
     */
    generateOID() {
        const currentTimeInMillis = new Date().getTime();
        const randomValue = Math.random();
        const randomInteger = Math.floor(currentTimeInMillis * randomValue);
        const randomHex = randomInteger.toString(16);
        return '__ajs_oid_' + randomHex;
    },

    /**
     * Add object to current scene
     */
    addObjectToScene(extensionId, layer = 0) {
        if (!sceneEditor.sceneData) {
            console.error('No scene loaded');
            return null;
        }

        // Create object data
        const objectData = this.createObject(extensionId, layer);
        if (!objectData) {
            return null;
        }

        // Add to scene data
        sceneEditor.sceneData.objects.push(objectData);

        // Load extension if not already loaded
        sceneEditor.requireOnceExtension(extensionId);

        // Create visual representation
        __editorExtensions[extensionId].create(objectData);

        // Refresh the object
        setTimeout(() => {
            sceneEditor.refreshSceneObjects([objectData]);
        }, 100);

        return objectData;
    }
};
