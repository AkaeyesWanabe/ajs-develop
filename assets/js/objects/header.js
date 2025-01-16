const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');
const projectFiles = nw.require('./assets/js/objects/projectFiles');

module.exports = {
    loadProject(path) {
        fs.readFile(path + "/data.json", 'utf8', function (err, txt) {
            if (err) {
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
                alert("Impossible de charger cette application!");
                return;
            }
            //get projectName
            $("#appTitle")[0].innerHTML = globals.app.name + " - " + globals.project.data.properties.name;
            //load project folders
            projectFiles.loadProjectFiles();
        });
    },
};