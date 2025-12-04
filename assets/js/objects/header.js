const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');
const projectFiles = nw.require('./assets/js/objects/projectFiles');

module.exports = {
    loadProject(path) {
        fs.readFile(path + "/data.json", 'utf8', function (err, txt) {
            if (err) {
                console.error('Failed to load project:', err);
                alert(err);
                return;
            }
            //project file exist
            //
            globals.project.dir = path;
            application.projectDir = path;
            try {
                globals.project.data = JSON.parse(txt);
                application.projectData = globals.project.data;
            }
            catch (err) {
                console.error('Failed to parse project data:', err);
                alert("Impossible de charger cette application!");
                return;
            }
            //get projectName
            $("#appTitle")[0].innerHTML = globals.app.name + " - " + globals.project.data.properties.name;
            //load project folders
            projectFiles.loadProjectFiles();

            // Load last scene from cache if available
            setTimeout(() => {
                const projectCache = nw.require('./assets/js/objects/projectCache');
                const sceneEditor = nw.require('./assets/js/objects/sceneEditor');
                const path = nw.require('path');

                if (projectCache && sceneEditor) {
                    const lastSceneData = projectCache.loadLastScene();
                    if (lastSceneData) {
                        const fullPath = projectCache.getLastSceneFullPath();
                        const filename = path.basename(fullPath);
                        const dataString = JSON.stringify(lastSceneData);

                        sceneEditor.openScene(fullPath, filename, dataString);
                    }
                }
            }, 500); // Delay to ensure UI is ready
        });
    },

    saveProject() {
        if (!globals.project.dir) {
            console.error('[SAVE_PROJECT] No project directory');
            return false;
        }

        if (!globals.project.data) {
            console.error('[SAVE_PROJECT] No project data');
            return false;
        }

        try {
            // Use projectCache to ensure cache is preserved
            const projectCache = nw.require('./assets/js/objects/projectCache');

            // Auto-save current scene to cache before saving project
            if (projectCache && projectCache.autoSave) {
                projectCache.autoSave();
            }

            const projectPath = globals.project.dir + "/data.json";
            const jsonString = JSON.stringify(globals.project.data, null, 4);

            fs.writeFileSync(projectPath, jsonString, 'utf8');

            return true;
        } catch (err) {
            console.error('[SAVE_PROJECT] Failed to save project:', err);
            return false;
        }
    },
};