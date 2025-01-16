const application = require("./application");
const sceneEditor = require("./sceneEditor");
//
const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const animator = nw.require('./assets/js/objects/animator');

module.exports = {
    refreshFolderIcon() {
        let icons = document.querySelectorAll(".projectFoldersListNode>img");
        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
        icons.forEach(function (icon) {
            icon.src = path + globals.user.fileIconTheme.data.directories.default_16;
        });
    },

    refreshFilesIcon() {
        let icons = document.querySelectorAll(".projectFilesItem>img");
        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
        icons.forEach(function (icon) {
            let parent = icon.parentElement;
            //
            if (parent.getAttribute("type") == "dir") {
                icon.src = path + globals.user.fileIconTheme.data.directories.default_256;
            }
            else {
                let label = parent.getAttribute("filename").toLowerCase();
                //
                if (label.endsWith(".jpeg") || label.endsWith(".jpg") || label.endsWith(".png") || label.endsWith(".webp") || label.endsWith(".bmp")) {
                    //
                    icon.classList.add("local-image");
                    const path = parent.getAttribute("path");
                    icon.src = path;
                    return;
                }
                if (label.endsWith(".obj") || label.endsWith(".blend") || label.endsWith(".fbx") || label.endsWith(".3ds")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.object3d;
                    return;
                }
                if (label.endsWith(".anim")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.animation;
                    return;
                }
                if (label.endsWith(".7z") || label.endsWith(".rar") || label.endsWith(".zip")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.archive;
                    return;
                }
                if (label.endsWith(".mp3") || label.endsWith(".ogg") || label.endsWith(".wav")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.audio;
                    return;
                }
                if (label.endsWith(".config")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.configuration;
                    return;
                }
                if (label.endsWith(".css") || label.endsWith(".scss")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.css;
                    return;
                }
                if (label.endsWith(".fx")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.effects;
                    return;
                }
                if (label.endsWith(".ttf") || label.endsWith(".otf") || label.endsWith(".fon")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.font;
                    return;
                }
                if (label.endsWith(".html") || label.endsWith(".htm") || label.endsWith(".xhtml") || label.endsWith(".xhtm")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.html;
                    return;
                }
                if (label.endsWith(".js") || label.endsWith(".jsx") || label.endsWith(".mjs") || label.endsWith(".cjs")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.javascript;
                    return;
                }
                if (label.endsWith(".json")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.json;
                    return;
                }
                if (label.endsWith(".mat")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.material;
                    return;
                }
                if (label.endsWith(".package") || label.endsWith(".pack")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.package;
                    return;
                }
                if (label.endsWith(".txt")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.text;
                    return;
                }
                if (label.endsWith(".tln")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.timeline;
                    return;
                }
                if (label.endsWith(".mp4") || label.endsWith(".mkv") || label.endsWith(".avi") || label.endsWith(".webm")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.video;
                    return;
                }
                if (label.endsWith(".xml")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.xml;
                    return;
                }
                if (label.endsWith(".scn")) {
                    //
                    icon.src = path + globals.user.fileIconTheme.data.files.scene;
                    return;
                }
                //for others types of files
                icon.src = path + globals.user.fileIconTheme.data.files.default;
            }
        });
        //
        //
        //
        $("#projectFilesBar").click(function (e) {
            if (e.target.id == "projectFilesBar") {
                $(".projectFilesItem").removeClass("selected");
            }
        });
        //
        //click event for all file item
        $('.projectFilesItem').click(function () {
            if (!globals.keysIsPressed.ctrl) {
                $(".projectFilesItem").removeClass("selected");
            }
            //
            if (globals.keysIsPressed.ctrl) {
                if (!this.classList.contains("selected")) {
                    this.classList.add("selected");
                }
                else {
                    this.classList.remove("selected");
                }
            }
            else {
                this.classList.add("selected");
            }
        });

        //
        //open the file with correspound reader
        $(".projectFilesItem").dblclick(function () {
            let path = this.getAttribute('path');
            let type = this.getAttribute('type');
            if (type == "dir") {
                let node = $(".projectFoldersListItem[path='" + path.replaceAll("\\","\\\\") + "'] .projectFoldersListNode")[0];
                console.log(node);
                node.click();
                return;
            }
            //detect file info for reading or editting
            const fname = this.getAttribute("filename").toLowerCase();
            const fext = fname.substring(fname.lastIndexOf("."), fname.length);
            const fitem = {
                name: fname,
                path: path,
                extension: fext,
                language: "Plain Text",
                cursor: {
                    char: 0,
                    line: 0,
                    col: 0,
                }
            };
            //if it's an file read it's content
            const data = fs.readFileSync(path);
            //language styling
            if (fext == ".js") {
                fitem.language = "JavaScript";
                globals.project.scriptEditor.files.push(fitem);
                //open editor
                scriptEditor.openFile(this.getAttribute("path"), this.getAttribute("filename"), fext, data);
                document.querySelector("#scriptEditorTab").click();
            }
            if (fext == ".scn") {
                //open editor
                sceneEditor.openScene(this.getAttribute("path"), this.getAttribute("filename"), data);
                document.querySelector("#sceneEditorTab").click();
            }
            if (fext == ".anim") {
                //open editor
                animator.openAnimator(this.getAttribute("path"), this.getAttribute("filename"), data);
            }
        });
    },

    getFileList(dirPath) {
        let files = [];
        const children = fs.readdirSync(dirPath, { withFileTypes: true });
        let relative = ".";
        //
        for (const child of children) {
            files.push(this.pushFileList(dirPath, relative, child));
        }
        //
        globals.project.files = files;
    },

    pushFileList(dirName, relative, file) {
        const item = {
            relativeParentPath: relative,
            parentPath: dirName,
            path: dirName + "\\" + file.name,
            name: file.name,
            size: 0,
            type: file.isDirectory() ? "dir" : "file",
            children: []
        };
        //
        if (item.type == "dir") {
            const children = fs.readdirSync(item.path, { withFileTypes: true });
            relative = item.relativeParentPath + "\\" + item.name;
            for (const child of children) {
                item.children.push(this.pushFileList(item.path, relative, child));
            }
        }
        //
        return item;
    },

    loadFolders() {
        //reset content temp
        contentTemp = "";
        //parse all folders
        globals.project.files.forEach((file) => {
            if (file.type == "dir") {
                this.createFolderItem(file);
            }
        });
        //show the folders
        document.querySelector("#projectFoldersList").innerHTML = contentTemp;
        //
        $this = this;
        //
        setTimeout(function () {
            $(".projectFoldersListNode").click(function () {
                $(".projectFoldersListNode").removeClass("folderTreeActive");
                this.classList.add("folderTreeActive");
                //open or close
                let parent = this.parentElement;
                if (parent.getAttribute("open") == "false") {
                    parent.setAttribute("open", "true");
                }
                else {
                    parent.setAttribute("open", "false");
                }
                //
                globals.project.current.relativeFileParentPath = parent.getAttribute('relative') + "\\" + parent.getAttribute('filename');
                globals.project.current.fileName = parent.getAttribute('filename');
                //
                $this.loadFiles(globals.project.current.relativeFileParentPath);
            });
            //
            //refresh folders icons
            $this.refreshFolderIcon();
        }, 100);
    },

    createFolderItem(dir) {
        contentTemp = contentTemp + "<li class='projectFoldersListItem' path='" + dir.path + "' relative='" + dir.relativeParentPath + "' filename='" + dir.name + "' open='false'>";
        contentTemp = contentTemp + /**/"<div class='projectFoldersListNode'>";
        contentTemp = contentTemp + /**//**/"<i class='bi bi-chevron-right'></i>";
        contentTemp = contentTemp + /**//**/"<i class='bi bi-chevron-down'></i>";
        contentTemp = contentTemp + /**//**/"<img />";
        contentTemp = contentTemp + /**//**/"<a>" + dir.name + "</a>";
        contentTemp = contentTemp + /**/"</div>";
        contentTemp = contentTemp + /**/"<ul class='projectFoldersListChildren'>";
        if (dir.children != null && dir.children.length > 0) {
            dir.children.forEach((child) => {
                if (child.type == "dir") {
                    this.createFolderItem(child);
                }
            });
        }
        contentTemp = contentTemp + /**/"</ul>";
        contentTemp = contentTemp + "</li >";
    },

    createFileItem(file) {
        contentTemp = contentTemp + "<div class='projectFilesItem' type='" + file.type + "' path='" + file.path + "' relative='" + file.relativeFileParentPath + "' filename='" + file.name + "'>";
        contentTemp = contentTemp + /**/"<img />";
        contentTemp = contentTemp + /**/"<center><div>" + file.name + "</div></center>";
        contentTemp = contentTemp + "</div>";
    },

    tryDirChildren(files, dirPath) {
        if (files[0].relativeParentPath == dirPath) {
            files.forEach((file) => {
                if (!file.relativeFileParentPath && file.name == "data.json") {
                    //don't show data.json file in projectfiles
                    return
                }
                //create file or folder while no exception encountred
                this.createFileItem(file);
            });
            return;
        }
        //
        files.forEach((file) => {
            if (file.type == "dir") {
                this.tryDirChildren(file.children, dirPath);
            }
        });
    },

    loadFiles(dirPath) {
        //reset content temp
        contentTemp = "";
        //parse all folders
        this.tryDirChildren(globals.project.files, dirPath);
        //show the folders
        document.querySelector("#projectFilesBar").innerHTML = contentTemp;
        //
        setTimeout(() => {
            this.refreshFilesIcon();
        }, 1);
    },

    loadProjectFiles() {
        this.getFileList(globals.project.dir);
        this.loadFolders();
        this.loadFiles(globals.project.current.relativeFileParentPath);
        //
        //load last scene on opened project
        let lastSceneFPath = application.getFilePathFromResources(globals.project.data.cache.lastScene);
        let lastSceneFName = application.getFileNameFromResources(globals.project.data.cache.lastScene);
        let lastSceneData = fs.readFileSync(lastSceneFPath);
        sceneEditor.openScene(lastSceneFPath, lastSceneFName, lastSceneData);
        document.querySelector("#sceneEditorTab").click();
    }
}