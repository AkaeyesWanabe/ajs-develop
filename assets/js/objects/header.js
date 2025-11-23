const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');
const projectFiles = nw.require('./assets/js/objects/projectFiles');

module.exports = {
    loadProject(path) {
        console.log('Loading project from:', path);
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
                console.log('Project loaded successfully:', globals.project.data.properties.name);
                console.log('Project details:', {
                    name: globals.project.data.properties.name,
                    version: globals.project.data.properties.version,
                    author: globals.project.data.properties.author,
                    path: path
                });
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
        });
    },

    saveProject() {
        console.log('[SAVE_PROJECT] Starting project save...');
        console.log('[SAVE_PROJECT] Project dir:', globals.project.dir);
        console.log('[SAVE_PROJECT] Project data:', globals.project.data);

        if (!globals.project.dir) {
            console.error('[SAVE_PROJECT] No project directory');
            return false;
        }

        if (!globals.project.data) {
            console.error('[SAVE_PROJECT] No project data');
            return false;
        }

        try {
            const projectPath = globals.project.dir + "/data.json";
            const jsonString = JSON.stringify(globals.project.data, null, 4);

            console.log('[SAVE_PROJECT] Writing to:', projectPath);
            console.log('[SAVE_PROJECT] Data to write:', jsonString);

            fs.writeFileSync(projectPath, jsonString, 'utf8');

            console.log('[SAVE_PROJECT] Project saved successfully');
            return true;
        } catch (err) {
            console.error('[SAVE_PROJECT] Failed to save project:', err);
            return false;
        }
    },
};