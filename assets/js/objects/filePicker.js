const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');

module.exports = {
    loadAssetsFiles(files, propType) {
        //parse all files and folders
        files.forEach((file) => {
            //if it's a folder
            if (file.type == "dir") {
                let dir = file;
                this.loadAssetsFiles(dir.children, propType);
                return;
            }
            //if it's a file
            this.createFileItem(file, propType);
        });

    },

    createFileItem(file, propType) {
        const label = file.name.toLowerCase();
        let fpBody = document.querySelector("#filePicker #fpBody");
        let elem = "";
        //
        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
        //
        switch (propType) {
            case "image": {
                if (label.endsWith(".jpeg") || label.endsWith(".jpg") || label.endsWith(".png") || label.endsWith(".webp") || label.endsWith(".bmp")) {
                    //
                    elem = `
                    <div class='fpBodyItem' type = '` + file.type + `' path = '` + file.path + `'>
                        <img class="local-image" src='`+ file.path + `' filename='` + file.name + `' assetsPath='` + file.relativeParentPath + "/" + file.name + `'/>
                        <center>
                            <div>`+ file.name + `</div>
                        </center>
                    </div>`;
                }
                break;
            }

            case "animator": {
                if (label.endsWith(".anim")) {
                    //
                    elem = `
                    <div class='fpBodyItem' type = '` + file.type + `' path = '` + file.path + `'>
                        <img src='`+ path + globals.user.fileIconTheme.data.files.animation + `' filename='` + file.name + `' assetsPath='` + file.relativeParentPath + "/" + file.name + `'/>
                        <center>
                            <div>`+ file.name + `</div>
                        </center>
                    </div>`;
                }
                break;
            }

            case "script": {
                if (label.endsWith(".js")) {
                    //
                    elem = `
                    <div class='fpBodyItem' type = '` + file.type + `' path = '` + file.path + `'>
                        <img src='`+ path + globals.user.fileIconTheme.data.files.js + `' filename='` + file.name + `' assetsPath='` + file.relativeParentPath + "/" + file.name + `'/>
                        <center>
                            <div>`+ file.name + `</div>
                        </center>
                    </div>`;
                }
                break;
            }

            default: {
            }
        }
        //show the file
        fpBody.innerHTML = fpBody.innerHTML + elem.trim();
    },

    createNoneFileItem() {
        let fpBody = document.querySelector("#filePicker #fpBody");
        let elem = `
        <div class='fpBodyItem' type='' path=''>
            <img filename='' assetsPath=''/>
            <center>
                <div>None</div>
            </center>
        </div> `;
        //show the file
        fpBody.innerHTML = fpBody.innerHTML + elem.trim();
    }

};