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
    }
};