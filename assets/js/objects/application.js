const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');

module.exports = {
    projectDir: "",
    projectData: {},

    // Alias for backward compatibility
    get currentProjectPath() {
        return this.projectDir;
    },
    set currentProjectPath(value) {
        this.projectDir = value;
    },

    async fileExistsInResources(path) {
        if (!path || path == "") return false;
        //
        const filePath = this.projectDir + "/" + path;
        //
        try {
            fs.accessSync(filePath, fs.constants.F_OK);
            //
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                return false;
            }
            //
            return true;
        }
        catch (err) {
            return false;
        }
    },

    getFileNameFromResources(path) {
        if (!path || path == "") return "None";
        //
        if (this.fileExistsInResources(path)) {
            const parts = path.split('/');
            return parts[parts.length - 1];
        }
        //
        return "None";
    },

    getFilePathFromResources(path) {
        if (!path) return "";
        const filePath = this.projectDir + "/" + path;
        if (this.fileExistsInResources(path)) {
            return filePath;
        }
        return "";
    },

    /**
     * Convert absolute file path to relative path from project directory
     * @param {string} absolutePath - Absolute file path
     * @returns {string} - Relative path from project directory
     */
    getResourcesPathFromFile(absolutePath) {
        if (!absolutePath || !this.projectDir) {
            return "";
        }

        const path = require('path');

        // Normalize paths to use forward slashes
        const normalizedAbsolute = absolutePath.replace(/\\/g, '/');
        const normalizedProject = this.projectDir.replace(/\\/g, '/');

        // Check if the file is inside the project directory
        if (!normalizedAbsolute.startsWith(normalizedProject)) {
            console.warn('[Application] File is not inside project directory:', absolutePath);
            return "";
        }

        // Get relative path
        let relativePath = normalizedAbsolute.substring(normalizedProject.length);

        // Remove leading slash
        if (relativePath.startsWith('/')) {
            relativePath = relativePath.substring(1);
        }

        return relativePath;
    },

    getExtensionsDir() {
        return "./extensions";
    },

    /**
     * Save current project data to data.json file
     */
    saveProject() {
        if (!this.projectDir || !this.projectData) {
            console.warn('No project to save');
            return false;
        }

        try {
            const projectDataPath = this.projectDir + "/data.json";
            const data = JSON.stringify(this.projectData, null, 4);
            fs.writeFileSync(projectDataPath, data, 'utf8');

            return true;
        }
        catch (err) {
            console.error('Failed to save project:', err);
            alert('Failed to save project: ' + err.message);
            return false;
        }
    }
};