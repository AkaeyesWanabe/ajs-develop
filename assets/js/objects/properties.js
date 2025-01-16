const application = nw.require('./assets/js/objects/application');
const filePicker = nw.require('./assets/js/objects/filePicker');

let propertiesCache = {
    selectedObjectData: {},
    selectedObjectExtensionData: {},
    //
    lastSelectedObjectOID: "",
    lastSelectedObjectExtensionData: {},
    //
    isCommonProperties: false,
    selectedObjectsOID: [],
    selectedObjectsData: [],
};

module.exports = {
    cache: propertiesCache,

    closeProperties() {
        //hide extension info
        document.querySelector('.propertiesExtensionInfo').setAttribute("shown", "false");
        //clear properties
        let propBox = document.querySelector("#propertiesBox");
        propBox.innerHTML = "";
        //clear properties cache
        this.cache.selectedObjectData = {};
        this.cache.selectedObjectExtensionData = {};
        this.cache.lastSelectedObjectOID = {};
        this.cache.lastSelectedObjectExtensionData = {};
        //reset object oid list
        this.cache.selectedObjectsOID = [];
        this.cache.selectedObjectsData = [];
        this.cache.isCommonProperties = false;
    },

    openObjectProperties(objectData, extensionData) {
        //show extension info
        document.querySelector('.propertiesExtensionInfo').setAttribute("shown", "true");
        document.querySelectorAll('.propertiesExtensionInfo label')[1].innerHTML = extensionData.extensionName;
        document.querySelector('.propertiesExtensionInfo img').style.display = "inline-block";
        document.querySelector('.propertiesExtensionInfo img').src = "./extensions/" + extensionData.extension + "/" + extensionData.extensionIcon;
        //check if last selected object extension is defferent from current selected object extension
        if (!this.cache.isCommonProperties) {
            if (this.cache.lastSelectedObjectExtensionData.extension && this.cache.lastSelectedObjectExtensionData != extensionData) {
                this.cache.isCommonProperties = true;
            }
        }
        //add oid to object oid list
        this.cache.selectedObjectsOID.push(objectData.oid);
        this.cache.selectedObjectsData.push(objectData);
        //
        //check if it's the same object
        if (objectData.oid == this.cache.lastSelectedObjectOID) {
            return;
        }
        this.cache.lastSelectedObjectOID = objectData.oid;
        this.cache.lastSelectedObjectExtensionData = extensionData;
        //store data in cache
        this.cache.selectedObjectData = objectData;
        this.cache.selectedObjectExtensionData = extensionData;

        //refresh properties
        //on multiple extension so common properties
        if (this.cache.isCommonProperties) {
            let commonExtensionData = fs.readFileSync("extensions/common/data.json");
            commonExtensionData = JSON.parse(`${commonExtensionData}`);
            //
            //show extension info
            document.querySelectorAll('.propertiesExtensionInfo label')[1].innerHTML = commonExtensionData.extensionName;
            document.querySelector('.propertiesExtensionInfo img').style.display = "none";
            //
            let commonObjectData = {
                "properties": {
                    "visible": false,
                    "x": 0,
                    "y": 0,
                    "width": 0,
                    "height": 0,
                    "angle": 0
                }
            }
            //determinate all common properties
            for (const key in commonObjectData.properties) {
                let newVal = null;
                this.cache.selectedObjectsData.forEach((obj, index) => {
                    if (index == 0) {
                        newVal = obj.properties[key];
                        return;
                    }
                    if (newVal !== obj.properties[key]) {
                        newVal = null;
                    }
                });
                //set the new value of property
                if (newVal != null) commonObjectData.properties[key] = newVal;
            }
            //
            this.refreshProperties(commonObjectData, commonExtensionData);
            return;
        }
        //on unique extension
        this.refreshProperties(objectData, extensionData);
    },

    refreshProperties(objectData, extensionData) {
        //clear properties
        let propBox = document.querySelector("#propertiesBox");
        propBox.innerHTML = "";
        //load all tabs
        extensionData.propertiesTabs.forEach((tab, index) => {
            let elem = `
            <div class="propertiesTab" opened="true">
                <div class="propertiesTabHeader">
                    <a class="propertiesTabName">`+ tab.name + `</a>

                    <i class="open bi bi-caret-down-fill" tabIndex="`+ index + `"></i>
                    <i class="close bi bi-caret-up-fill"  tabIndex="`+ index + `"></i>
                </div>

                <div class="propertiesTabChildren"></div>
            </div>
            `;
            propBox.innerHTML = propBox.innerHTML + elem.trim();
        });
        //
        //load all properties and push it in the corresponding tab
        setTimeout(() => {
            let $self = this;
            //
            $(".propertiesTab .open").click(function () {
                $(".propertiesTab")[this.getAttribute("tabIndex")].setAttribute("opened", true);
            });
            $(".propertiesTab .close").click(function () {
                $(".propertiesTab")[this.getAttribute("tabIndex")].setAttribute("opened", false);
            });
            //
            //
            extensionData.propertiesVariables.forEach((prop, index) => {
                let disbaledValue = false;
                //
                if (prop.disable != null) {
                    //get the current disabled value
                    if (prop.disable["enabled-value"] != objectData.properties[prop.disable["enabled-propertyName"]]) {
                        disbaledValue = true;
                    }
                }
                //
                //
                //open elem
                let elem = `
                <div class="propertiesItem" __ajs_propertyName="` + prop.name + `" __ajs_propertyDisabled="` + (disbaledValue ? 'true' : 'false') + `" >
                    <label>`+ prop.label + `</label>`;
                //create the input
                switch (prop.type) {
                    case "text": {
                        elem = elem +
                            `<input type="text" class="propertiesItemText normalPropertiesItem" __ajs_propertyName="` + prop.name + `" value="` + objectData.properties[prop.name] + `">`;
                        break;
                    };
                    //
                    case "number": {
                        elem = elem +
                            `<input type="number" class="propertiesItemText normalPropertiesItem" __ajs_propertyName="` + prop.name + `" value="` + (objectData.properties[prop.name] - 0) + `">`;
                        break;
                    };
                    //
                    case "checkbox": {
                        elem = elem + `
                        <div class="propertiesItemCheckBox">
                            <label>`+ prop["checkbox-label"] + `</label>
                            <input type="checkbox" __ajs_propertyName="` + prop.name + `" ` + (objectData.properties[prop.name] ? 'checked' : '') + `>
                        </div > `;
                        break;
                    };
                    //
                    case "image": {
                        elem = elem + `
                        <div class="propertiesItemPicker" >
                            <img __ajs_propertyName="` + prop.name + `" __ajs_propertyType="` + prop.type + `" __ajs_propertyEditable="` + prop.editable + `" src="` + (objectData.properties[prop.name] == '' ? '' : application.getFilePathFromResources(objectData.properties[prop.name])) + `"/>
                            <span>`+ application.getFileNameFromResources(objectData.properties[prop.name]) + `</span>
                        </div>`;
                        break;
                    };
                    //
                    case "animator": {
                        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
                        elem = elem + `
                        <div class="propertiesItemPicker" >
                            <img __ajs_propertyName="` + prop.name + `" __ajs_propertyType="` + prop.type + `" __ajs_propertyEditable="` + prop.editable + `" src="` + (objectData.properties[prop.name] == '' ? '' : (path + globals.user.fileIconTheme.data.files.animation)) + `"/>
                            <span>`+ application.getFileNameFromResources(objectData.properties[prop.name]) + `</span>
                        </div>`;
                        break;
                    };
                    //
                    default: {
                        elem = elem +
                            `< input type = "text" class="propertiesItemText normalPropertiesItem" __ajs_propertyName = "` + prop.name + `" value = "` + objectData.properties[prop.name] + `" > `;
                        break;
                    }
                }
                //close elem
                elem = elem + `</div > `;
                //add elem to corresponding tab
                let tabChildren = document.querySelectorAll(".propertiesTabChildren")[prop.tab];
                tabChildren.innerHTML = tabChildren.innerHTML + elem.trim();
            });
            //
            //
            setTimeout(() => {
                //////////////////////////
                //FOR PROPERTIES TYPE TEXT
                //////////////////////////
                //validate on focus out
                $(".normalPropertiesItem").focusout(function () {
                    let propName = this.getAttribute('__ajs_propertyName');
                    //check if the property value has been changed
                    let oldValue = $self.cache.selectedObjectData.properties[propName];
                    if (oldValue != this.value) {
                        $self.applyValue(propName, this.value);
                    }
                });
                //validate on enter press
                $(".normalPropertiesItem").keyup(function () {
                    if (event.key === 'Enter') {
                        let propName = this.getAttribute('__ajs_propertyName');
                        //check if the property value has been changed
                        let oldValue = $self.cache.selectedObjectData.properties[propName];
                        if (oldValue != this.value) {
                            $self.applyValue(propName, this.value);
                        }
                    }
                });
                //////////////////////////////
                //FOR PROPERTIES TYPE CHECKBOX
                //////////////////////////////
                //validate on focus out
                $(".propertiesItemCheckBox").click(function () {
                    let input = this.querySelector("input");
                    //get property name
                    let propName = input.getAttribute('__ajs_propertyName');
                    //check if the property value has been changed
                    $self.applyValue(propName, input.checked);
                });
                ///////////////////////////
                //FOR PROPERTIES TYPE FILE
                ///////////////////////////
                //validate on focus out
                $(".propertiesItemPicker").click(function () {
                    //get property data
                    let propName = this.querySelector("img").getAttribute('__ajs_propertyName');
                    let propType = this.querySelector("img").getAttribute('__ajs_propertyType').toLowerCase();
                    //reset content temp
                    let fpBody = document.querySelector("#filePicker #fpBody");
                    fpBody.innerHTML = "";
                    //
                    filePicker.createNoneFileItem();
                    filePicker.loadAssetsFiles(globals.project.files, propType);
                    //
                    $self1 = this;
                    $(".fpBodyItem img").click(function () {
                        $self1.querySelector("img").src = this.src;
                        $self1.querySelector("span").innerHTML = this.getAttribute("filename") == '' ? 'None' : this.getAttribute("filename");
                        $self.applyValue(propName, this.getAttribute("assetsPath"));
                        //
                        $("#filePickerBack").attr('opened', false);
                    });
                    //
                    $('#filePickerBack').attr('opened', true);
                });
            }, 100);
        }, 100);
    },

    applyValue(propName, value) {
        //
        this.cache.selectedObjectExtensionData.propertiesVariables.forEach((prop) => {
            //check all properties which has disable param
            if (prop.disable != null) {
                //check if disable param depend of this property
                if (prop.disable["enabled-propertyName"] == propName) {
                    //check if disable state and apply disable mode
                    let obj = document.querySelector(".propertiesItem[__ajs_propertyName='" + prop.name + "']");
                    if (prop.disable["enabled-value"] == value) {
                        obj.setAttribute('__ajs_propertyDisabled', "false");
                    }
                    else {
                        obj.setAttribute('__ajs_propertyDisabled', "true");
                    }
                }
            }
        });
        //
        sceneEditor.setObjectProperty(this.cache.selectedObjectData, propName, value);
    },
};