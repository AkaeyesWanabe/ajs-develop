const fs = nw.require('fs');
const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');
const application = nw.require('./assets/js/objects/application');
const properties = nw.require('./assets/js/objects/properties');

module.exports = {
    sceneData: {},

    cache: {
        sceneFilePath: "",
        sceneFilename: "",
    },

    isInsideObject: false,
    canBeOutside: true,

    openScene(path, filename, data) {
        //
        if (path == this.cache.sceneFilePath) {
            return;
        }
        //
        this.cache.sceneFilePath = path;
        this.cache.sceneFilename = filename;
        //
        try {
            this.sceneData = JSON.parse(data);
            //
            $("#scnEditor").attr("visible", "true");
            $("#scnEditorTabs").attr("visible", "true");
            $("#noScnOpened").attr("visible", "false");
            //
            this.refreshEditor();
            this.loadScene();
        }
        catch (err) {
            //remove all object
            let scnEditor = document.querySelector("#scnEditor");
            scnEditor.innerHTML = "";
            //hide the sceneEditor
            $("#scnEditor").attr("visible", "false");
            $("#scnEditorTabs").attr("visible", "false");
            $("#noScnOpened").attr("visible", "true");
            //
            alert("This scene file is dammaged or corrupted !");
        }
    },

    /* --------------------------------------------------------
        EXTERNAL METHODS
    -------------------------------------------------------- */
    refreshEditor() {
        let sceneEditor = document.querySelector("#sceneEditor");
        sceneEditor.style.width = sceneEditor.parentElement.clientWidth + "px";
        sceneEditor.style.height = sceneEditor.parentElement.clientHeight - 32 + "px";
        //
        let scnEditor = document.querySelector("#scnEditor");
        scnEditor.style.width = sceneEditor.clientWidth + "px";
        scnEditor.style.height = sceneEditor.clientHeight - 32 + "px";
        //
        let virtualBox = document.querySelector("#scnVirtualBox");
        if (virtualBox != null) {
            virtualBox.style.width = Math.max(this.sceneData.properties.virtualWidth, scnEditor.clientWidth) + "px";
            virtualBox.style.height = Math.max(this.sceneData.properties.virtualHeight, scnEditor.clientHeight) + "px";
        }
        //
        let sceneAppBox = document.querySelector("#scnSceneAppBox");
        let appBox = document.querySelector("#scnAppBox");
        let sceneBox = document.querySelector("#scnSceneBox");
        if (sceneAppBox != null && appBox != null && sceneBox != null) {
            let x = virtualBox.clientWidth / 2.0 - sceneBox.clientWidth / 2.0 + "px";
            let y = virtualBox.clientHeight / 2.0 - sceneBox.clientHeight / 2.0 + "px";
            //
            sceneAppBox.style.left = x;
            sceneAppBox.style.top = y;
            //
            appBox.style.left = x;
            appBox.style.top = y;
            //
            sceneBox.style.left = x;
            sceneBox.style.top = y;
        }
    },

    loadScene() {
        //remove all object
        let scnEditor = document.querySelector("#scnEditor");
        scnEditor.innerHTML = "";
        //create the virtual box
        let elem = `<div id="scnVirtualBox"></div>`;
        scnEditor.innerHTML = elem.trim();
        //configure the virtual box
        setTimeout(() => {
            this.setVirtualWidth(this.sceneData.properties.virtualWidth);
            this.setVirtualHeight(this.sceneData.properties.virtualHeight);
            //
            //create the scene box
            let elem = `
            <div id="scnSceneAppBox"></div>
            <div id="scnAppBox"></div>
            <div id="scnSceneBox"></div>
            `;
            scnEditor.innerHTML = scnEditor.innerHTML + elem.trim();
            //configure the scene box
            setTimeout(() => {
                this.setAppWidth(application.projectData.properties.width);
                this.setAppHeight(application.projectData.properties.height);
                //
                this.setSceneWidth(this.sceneData.properties.width);
                this.setSceneHeight(this.sceneData.properties.height);
                this.setSceneBackgroundColor(this.sceneData.properties.backgroundColor);
                //goto scene position in cache if exist
                if (this.sceneData.cache != null && this.sceneData.cache.sceneEditor != null) {
                    scnEditor.scrollTo(this.sceneData.cache.sceneEditor.scrollX, this.sceneData.cache.sceneEditor.scrollY);
                } else {
                    //center the editor as default position
                    let svb = document.querySelector("#scnVirtualBox");
                    const middleX = (svb.clientWidth - scnEditor.clientWidth) / 2;
                    const middleY = (svb.clientHeight - scnEditor.clientHeight) / 2;
                    scnEditor.scrollTo(middleX, middleY);
                }
                //load all layers
                this.sceneData.layers.forEach((layer) => {
                    let scene = document.querySelector("#scnSceneBox");
                    let elem = `<div class="__ajs_scene_layer" __ajs_layer_name="` + layer.name + `"></div>`;
                    scene.innerHTML = scene.innerHTML + elem.trim();
                });
                setTimeout(() => {
                    //load all objects from loaded scene
                    this.loadAllSceneObjects();
                    //
                    setTimeout(() => {
                        //refresh all objects
                        this.refreshSceneObjects(this.sceneData.objects);
                    }, 100);
                }, 100);
            }, 100);
        }, 100);
    },

    clickEvent() {
        if (!sceneEditor.isInsideObject) {
            sceneEditor.deselectAllObjects();
        }
    },

    setVirtualWidth(width) {
        let obj = document.querySelector("#scnVirtualBox");
        obj.style.width = width + "px";
    },

    setVirtualHeight(height) {
        let obj = document.querySelector("#scnVirtualBox");
        obj.style.height = height + "px";
    },

    //app box
    setAppWidth(width) {
        let obj = document.querySelector("#scnAppBox");
        obj.style.width = width + "px";
    },

    setAppHeight(height) {
        let obj = document.querySelector("#scnAppBox");
        obj.style.height = height + "px";
    },

    //scene box
    getSceneX() {
        let obj = document.querySelector("#scnSceneBox");
        return parseInt(obj.style.left);
    },

    getSceneY() {
        let obj = document.querySelector("#scnSceneBox");
        return parseInt(obj.style.top);
    },

    getSceneWidth() {
        let obj = document.querySelector("#scnSceneBox");
        return obj.clientWidth;
    },

    getSceneHeight() {
        let obj = document.querySelector("#scnSceneBox");
        return obj.clientHeight;
    },

    setSceneWidth(width) {
        let obj = document.querySelector("#scnSceneAppBox");
        obj.style.width = width + "px";
        //
        obj = document.querySelector("#scnSceneBox");
        obj.style.width = width + "px";
        this.refreshEditor();
    },

    setSceneHeight(height) {
        let obj = document.querySelector("#scnSceneAppBox");
        obj.style.height = height + "px";
        //
        obj = document.querySelector("#scnSceneBox");
        obj.style.height = height + "px";
        this.refreshEditor();
    },

    setSceneBackgroundColor(color) {
        let obj = document.querySelector("#scnSceneAppBox");
        obj.style.backgroundColor = color;
    },

    ///////////////////////////
    //extensions manipulations
    ///////////////////////////
    requireOnceExtension(extension) {
        //if it's an file read it's content
        const dataFileContent = fs.readFileSync("./extensions/" + extension + "/data.json");
        const editorFileContent = fs.readFileSync("./extensions/" + extension + "/editor.js");
        const runtimeFileContent = fs.readFileSync("./extensions/" + extension + "/runtime.js");
        //store correctly extension editor script if it doesn't exists
        let isExists = false;
        Object.keys(__editorExtensions).forEach(key => {
            if (key == extension) {
                isExists = true;
                return;
            }
        });
        //load extension editor script
        if (!isExists) {
            __dataExtensions[extension] = JSON.parse(`${dataFileContent}`);
            __editorExtensions[extension] = eval(`${editorFileContent}`);
            __runtimeExtensions[extension] = eval(`${runtimeFileContent}`);
        }
    },

    loadAllSceneObjects() {
        this.sceneData.objects.forEach((data, index) => {
            this.requireOnceExtension(data.extension);
            //call the extension object create function
            __editorExtensions[data.extension].create(data);
        });
    },

    refreshSceneObjects(oData) {
        oData.forEach((data, index) => {
            //get corresponding object
            let object = document.querySelector(".__ajs_scene_object[__ajs_object_ID='" + data.oid + "']");
            //call the extension object create function
            if (object.tagName == "CANVAS") {
                const ctx = object.getContext('2d');
                // Clear the entire canvas
                ctx.clearRect(0, 0, object.width, object.height);
            }
            __editorExtensions[data.extension].update(object, data);
        });
    },

    addObjectToSceneLayer(elem, layerID) {
        let layer = document.querySelectorAll(".__ajs_scene_layer")[layerID];
        layer.appendChild(elem);
        //
        $self = this;
        //
        //clickable object event
        $(elem).click(function () {
            $self.isInsideObject = true;
            //reset canBeOutside
            setTimeout(function () {
                $self.canBeOutside = true;
            }, 100);
            //get object oid
            let oid = elem.getAttribute("__ajs_object_ID");
            //check if ctrl is pressed
            if (!globals.keysIsPressed.ctrl) {
                if (oid != properties.cache.lastSelectedObjectOID) {
                    $self.deselectAllObjects();
                }
            }
            //
            elem.classList.add("clickable_selected");
            //
            //test properties
            let objectData = {};
            $self.sceneData.objects.forEach((data, index) => {
                if (data.oid == oid) {
                    objectData = data;
                }
            });
            let extensionData = __dataExtensions[objectData.extension];
            properties.openObjectProperties(objectData, extensionData);
        });
        ////////////////////////////
        //DESELECT ALL OBJECTS EVENT
        ////////////////////////////
        // Event listener for mousedown on myObject
        elem.addEventListener("mousedown", function () {
            if (!$self.isInsideObject) {
                $self.isInsideObject = true;
            }
        });
        //
    },

    deselectAllObjects() {
        document.querySelectorAll(".clickable_selected").forEach((elem) => {
            elem.classList.remove("clickable_selected");
        });
        //
        properties.closeProperties();
    },

    //////////////////////
    //
    //OBJECT MANIPULATON
    //
    //////////////////////
    initObject(object) {
        object.style.position = "absolute";
        object.classList.add("__ajs_scene_object");
    },

    generateObjectID(object) {
        const currentTimeInMillis = new Date().getTime();
        const randomValue = Math.random();
        const randomInteger = Math.floor(currentTimeInMillis * randomValue);
        const randomHex = randomInteger.toString(16);
        //
        object.setAttribute("__ajs_object_ID", randomHex);
    },

    setObjectID(object, oid) {
        if (oid == null || oid.length <= 5) {
            this.generateObjectID(object);
        }
        else {
            object.setAttribute("__ajs_object_ID", oid);
        }
    },

    getObjectID(object) {
        return object.getAttribute("__ajs_object_ID");
    },

    //
    setObjectName(object, name) {
        object.setAttribute("__ajs_object_name", name);
    },

    getObjectName(object) {
        return object.getAttribute("__ajs_object_name");
    },

    setObjectGroups(object, groups) {
        object.setAttribute("__ajs_object_groups", groups);
    },

    addObjectGroup(object, groupId) {
        let groups = object.getAttribute("__ajs_object_groups");
        let arr = groups.split(',');
        arr.push(groupId);
        groups = arr.join(",");
        object.setAttribute("__ajs_object_groups", groups);
    },

    removeObjectGroup(object, groupId) {
        let groups = object.getAttribute("__ajs_object_groups");
        let arr = groups.split(',');
        arr.splice(arr.indexOf(groupId), 1);
        groups = arr.join(",");
        object.setAttribute("__ajs_object_groups", groups);
    },

    getObjectGroups() {
        let groups = object.getAttribute("__ajs_object_groups");
        let arr = groups.split(',');
        return arr;
    },

    renderObjectClickable(object) {
        object.setAttribute("__ajs_object_clickable", true);
    },

    renderObjectRotable(object) {
        object.setAttribute("__ajs_object_rotable", true);
    },

    renderObjectEditable(object) {
        object.setAttribute("__ajs_object_editable", true);
    },

    renderObjectNonClickable(object) {
        object.setAttribute("__ajs_object_clickable", false);
    },

    renderObjectNonRotable(object) {
        object.setAttribute("__ajs_object_rotable", false);
    },

    getObjectVisibility(object) {
        if (object.style.display == "none") {
            return false;
        }
        //
        return true;
    },

    setObjectVisibility(object, visible) {
        object.style.display = (visible == "true" || visible) ? "block" : "none";
    },

    getObjectX(object) {
        return parseFloat(object.style.left);
    },

    setObjectX(object, x) {
        object.style.left = x + "px";
    },

    getObjectY(object) {
        return parseFloat(object.style.top);
    },

    setObjectY(object, y) {
        object.style.top = y + "px";
    },

    getObjectWidth(object) {
        return parseFloat(object.style.width);
    },

    setObjectWidth(object, w) {
        if (object.tagName == "CANVAS") {
            object.width = w;
        }
        else {
            object.style.width = w + "px";
        }
    },

    getObjectHeight(object) {
        return parseFloat(object.style.height);
    },

    setObjectHeight(object, h) {
        if (object.tagName == "CANVAS") {
            object.height = h;
        }
        else {
            object.style.height = h + "px";
        }
    },

    setObjectAngle(object, angle) {
        object.style.transform = "rotate(" + angle + "deg)";
    },

    ////////////////////////////
    //internal object functions
    ////////////////////////////
    setObjectProperty(objectData, propertyName, value) {
        let oData = [];
        try {
            //check if property is for single object or no
            let singleObject = false;
            __dataExtensions[objectData.extension].propertiesVariables.forEach((prop, index) => {
                if (prop.name == propertyName) {
                    singleObject = prop.singleObject != null ? prop.singleObject : false;
                }
            });
            //
            if (singleObject) {
                //case of only the selected object
                this.sceneData.objects.forEach((data, index) => {
                    if (data.oid == objectData.oid) {
                        data.properties[propertyName] = value;
                        //
                        oData.push(data);
                    }
                });
            } else {
                //case of all objects of selected object name
                const oname = objectData.properties.name;
                //
                this.sceneData.objects.forEach((data, index) => {
                    if (data.properties.name == oname) {
                        data.properties[propertyName] = value;
                        //
                        oData.push(data);
                    }
                });
            }
            //refesh only impacted objects
            this.refreshSceneObjects(oData);
        }
        catch (err) {
            alert("objects extension is dammaged or corrupted !");
        }
    }
};