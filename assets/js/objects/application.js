const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');

module.exports = {
    projectDir: "",
    projectData: {},

    async fileExistsInResources(path) {
        if (path == "") return false;
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
        if (path == "") return "None";
        //
        if (this.fileExistsInResources(path)) {
            const parts = path.split('/');
            return parts[parts.length - 1];
        }
        //
        return "None";
    },

    getFilePathFromResources(path) {
        const filePath = this.projectDir + "/" + path;
        if (this.fileExistsInResources(path)) {
            return filePath;
        }
        return "";
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

            console.log('Project saved:', projectDataPath);
            return true;
        }
        catch (err) {
            console.error('Failed to save project:', err);
            alert('Failed to save project: ' + err.message);
            return false;
        }
    }
};