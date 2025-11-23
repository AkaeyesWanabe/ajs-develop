const application = nw.require('./assets/js/objects/application');
const filePicker = nw.require('./assets/js/objects/filePicker');
const fs = nw.require('fs');
const globals = nw.require('./assets/js/common/globals');

let propertiesCache = {
    selectedObjectData: {},
    selectedObjectExtensionData: {},
    lastSelectedObjectOID: "",
    lastSelectedObjectExtensionData: {},
    isCommonProperties: false,
    selectedObjectsOID: [],
    selectedObjectsData: [],
    isApplyingValue: false, // Lock to prevent loops
    eventsAttached: false,
};

module.exports = {
    cache: propertiesCache,

    closeProperties() {
        document.querySelector('.propertiesExtensionInfo').setAttribute("shown", "false");
        let propBox = document.querySelector("#propertiesBox");
        propBox.innerHTML = "";
        this.cache.selectedObjectData = {};
        this.cache.selectedObjectExtensionData = {};
        this.cache.lastSelectedObjectOID = {};
        this.cache.lastSelectedObjectExtensionData = {};
        this.cache.selectedObjectsOID = [];
        this.cache.selectedObjectsData = [];
        this.cache.isCommonProperties = false;
    },

    openObjectProperties(objectData, extensionData) {
        document.querySelector('.propertiesExtensionInfo').setAttribute("shown", "true");
        document.querySelectorAll('.propertiesExtensionInfo label')[1].innerHTML = extensionData.extensionName;
        document.querySelector('.propertiesExtensionInfo img').style.display = "inline-block";
        document.querySelector('.propertiesExtensionInfo img').src = "./extensions/" + extensionData.extension + "/" + extensionData.extensionIcon;

        if (!this.cache.isCommonProperties) {
            if (this.cache.lastSelectedObjectExtensionData.extension && this.cache.lastSelectedObjectExtensionData != extensionData) {
                this.cache.isCommonProperties = true;
            }
        }

        this.cache.selectedObjectsOID.push(objectData.oid);
        this.cache.selectedObjectsData.push(objectData);

        if (objectData.oid == this.cache.lastSelectedObjectOID) {
            return;
        }

        this.cache.lastSelectedObjectOID = objectData.oid;
        this.cache.lastSelectedObjectExtensionData = extensionData;
        this.cache.selectedObjectData = objectData;
        this.cache.selectedObjectExtensionData = extensionData;

        if (this.cache.isCommonProperties) {
            let commonExtensionData = fs.readFileSync("extensions/common/data.json");
            commonExtensionData = JSON.parse(`${commonExtensionData}`);

            document.querySelectorAll('.propertiesExtensionInfo label')[1].innerHTML = commonExtensionData.extensionName;
            document.querySelector('.propertiesExtensionInfo img').style.display = "none";

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
                if (newVal != null) commonObjectData.properties[key] = newVal;
            }

            this.refreshProperties(commonObjectData, commonExtensionData);
            return;
        }

        this.refreshProperties(objectData, extensionData);
    },

    refreshProperties(objectData, extensionData) {
        let propBox = document.querySelector("#propertiesBox");
        propBox.innerHTML = "";

        // Create tabs
        extensionData.propertiesTabs.forEach((tab, index) => {
            let elem = `
            <div class="propertiesTab" opened="true">
                <div class="propertiesTabHeader">
                    <a class="propertiesTabName">` + tab.name + `</a>
                    <i class="open ri-arrow-down-s-fill" tabIndex="` + index + `"></i>
                    <i class="close ri-arrow-up-s-fill" tabIndex="` + index + `"></i>
                </div>
                <div class="propertiesTabChildren"></div>
            </div>
            `;
            propBox.innerHTML = propBox.innerHTML + elem.trim();
        });

        setTimeout(() => {
            let $self = this;

            // Tab toggle events
            $(".propertiesTab .open").click(function () {
                $(".propertiesTab")[this.getAttribute("tabIndex")].setAttribute("opened", true);
            });
            $(".propertiesTab .close").click(function () {
                $(".propertiesTab")[this.getAttribute("tabIndex")].setAttribute("opened", false);
            });

            // Create property inputs
            extensionData.propertiesVariables.forEach((prop, index) => {
                let disbaledValue = false;

                if (prop.disable != null) {
                    if (prop.disable["enabled-value"] != objectData.properties[prop.disable["enabled-propertyName"]]) {
                        disbaledValue = true;
                    }
                }

                let elem = `
                <div class="propertiesItem" __ajs_propertyName="` + prop.name + `" __ajs_propertyDisabled="` + (disbaledValue ? 'true' : 'false') + `">
                    <label>` + prop.label + `</label>`;

                switch (prop.type) {
                    case "text": {
                        elem += `<input type="text" class="propertiesItemText" data-prop-name="` + prop.name + `" data-prop-type="text" value="` + objectData.properties[prop.name] + `">`;
                        break;
                    }

                    case "number": {
                        // Custom number input with +/- buttons (NO native spinners)
                        elem += `
                        <div class="propertiesItemNumber">
                            <button class="propNumberBtn propNumberDecrease" data-prop-name="` + prop.name + `">
                                <i class="ri-subtract-line"></i>
                            </button>
                            <input type="text" class="propertiesItemText" data-prop-name="` + prop.name + `" data-prop-type="number" value="` + (objectData.properties[prop.name] - 0) + `">
                            <button class="propNumberBtn propNumberIncrease" data-prop-name="` + prop.name + `">
                                <i class="ri-add-line"></i>
                            </button>
                        </div>`;
                        break;
                    }

                    case "checkbox": {
                        elem += `
                        <div class="propertiesItemCheckBox">
                            <label>` + prop["checkbox-label"] + `</label>
                            <input type="checkbox" data-prop-name="` + prop.name + `" ` + (objectData.properties[prop.name] ? 'checked' : '') + `>
                        </div>`;
                        break;
                    }

                    case "image": {
                        elem += `
                        <div class="propertiesItemPicker">
                            <img data-prop-name="` + prop.name + `" data-prop-type="` + prop.type + `" data-prop-editable="` + prop.editable + `" src="` + (objectData.properties[prop.name] == '' ? '' : application.getFilePathFromResources(objectData.properties[prop.name])) + `"/>
                            <span>` + application.getFileNameFromResources(objectData.properties[prop.name]) + `</span>
                        </div>`;
                        break;
                    }

                    case "animator": {
                        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
                        elem += `
                        <div class="propertiesItemPicker">
                            <img data-prop-name="` + prop.name + `" data-prop-type="` + prop.type + `" data-prop-editable="` + prop.editable + `" src="` + (objectData.properties[prop.name] == '' ? '' : (path + globals.user.fileIconTheme.data.files.animation)) + `"/>
                            <span>` + application.getFileNameFromResources(objectData.properties[prop.name]) + `</span>
                        </div>`;
                        break;
                    }

                    case "color": {
                        const colorValue = objectData.properties[prop.name] || '#000000';
                        elem += `
                        <div class="propertiesItemColor">
                            <input type="text" class="colorInput" data-prop-name="` + prop.name + `" data-prop-type="color" value="` + colorValue + `" maxlength="7" placeholder="#000000">
                            <input type="color" class="colorPicker" data-prop-name="` + prop.name + `" value="` + colorValue + `">
                        </div>`;
                        break;
                    }

                    default: {
                        elem += `<input type="text" class="propertiesItemText" data-prop-name="` + prop.name + `" data-prop-type="text" value="` + objectData.properties[prop.name] + `">`;
                        break;
                    }
                }

                elem += `</div>`;

                let tabChildren = document.querySelectorAll(".propertiesTabChildren")[prop.tab];
                tabChildren.innerHTML = tabChildren.innerHTML + elem.trim();
            });

            // Attach event handlers once
            if (!$self.cache.eventsAttached) {
                $self.attachPropertyEventHandlers();
                $self.cache.eventsAttached = true;
            }

            setTimeout(() => {
                // Checkbox events
                $(".propertiesItemCheckBox").off('click').on('click', function () {
                    if ($self.cache.isApplyingValue) return;

                    let input = this.querySelector("input");
                    let propName = input.getAttribute('data-prop-name');
                    $self.applyValue(propName, input.checked);
                });

                // File picker events
                $(".propertiesItemPicker").off('click').on('click', function () {
                    if ($self.cache.isApplyingValue) return;

                    let propName = this.querySelector("img").getAttribute('data-prop-name');
                    let propType = this.querySelector("img").getAttribute('data-prop-type').toLowerCase();

                    let fpBody = document.querySelector("#filePicker #fpBody");
                    fpBody.innerHTML = "";

                    filePicker.createNoneFileItem();
                    filePicker.loadAssetsFiles(globals.project.files, propType);

                    let $self1 = this;
                    $(".fpBodyItem img").click(function () {
                        $self1.querySelector("img").src = this.src;
                        $self1.querySelector("span").innerHTML = this.getAttribute("filename") == '' ? 'None' : this.getAttribute("filename");
                        $self.applyValue(propName, this.getAttribute("assetsPath"));
                        $("#filePickerBack").attr('opened', false);
                    });

                    $('#filePickerBack').attr('opened', true);
                });

                // Color picker events
                $(".propertiesItemColor").each(function() {
                    const container = this;
                    const preview = container.querySelector('.colorPreview');
                    const textInput = container.querySelector('.colorInput');
                    const colorPicker = container.querySelector('.colorPicker');
                    const propName = textInput.getAttribute('data-prop-name');

                    // Update from text input
                    $(textInput).off('input').on('input', function() {
                        if ($self.cache.isApplyingValue) return;
                        let value = this.value.trim();

                        // Auto-add # if missing
                        if (value.length > 0 && value[0] !== '#') {
                            value = '#' + value;
                            this.value = value;
                        }

                        // Validate hex color
                        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                            preview.style.backgroundColor = value;
                            colorPicker.value = value;
                            $self.applyValue(propName, value);
                        }
                    });

                    // Update from color picker
                    $(colorPicker).off('input').on('input', function() {
                        if ($self.cache.isApplyingValue) return;
                        const value = this.value;
                        preview.style.backgroundColor = value;
                        textInput.value = value;
                        $self.applyValue(propName, value);
                    });

                    // Click on preview opens color picker
                    $(preview).off('click').on('click', function() {
                        colorPicker.click();
                    });
                });
            }, 100);
        }, 100);
    },

    /**
     * Attach property event handlers using event delegation
     */
    attachPropertyEventHandlers() {
        const $self = this;
        const propBox = document.querySelector("#propertiesBox");

        if (!propBox) {
            console.error('propertiesBox not found');
            return;
        }

        let repeatTimeout = null;
        let repeatDelay = 100; // Starting delay for repeat
        let repeatAcceleration = null; // For progressive acceleration

        // Handle text inputs - Enter key
        propBox.addEventListener('keydown', function(event) {
            if (event.key !== 'Enter') return;
            if ($self.cache.isApplyingValue) return;

            const target = event.target;
            if (!target.classList.contains('propertiesItemText')) return;

            const propName = target.getAttribute('data-prop-name');
            const propType = target.getAttribute('data-prop-type');

            if (!$self.cache.selectedObjectData || !$self.cache.selectedObjectData.properties) return;

            let value = target.value;
            if (propType === 'number') {
                value = parseFloat(value) || 0;
            }

            const oldValue = $self.cache.selectedObjectData.properties[propName];
            if (oldValue != value) {
                console.log('[Enter] Applying:', propName, '=', value);
                $self.applyValue(propName, value);
                target.blur();
            }
        }, false);

        // Handle text inputs - Blur (focus out)
        propBox.addEventListener('focusout', function(event) {
            if ($self.cache.isApplyingValue) return;

            const target = event.target;
            if (!target.classList.contains('propertiesItemText')) return;

            const propName = target.getAttribute('data-prop-name');
            const propType = target.getAttribute('data-prop-type');

            if (!$self.cache.selectedObjectData || !$self.cache.selectedObjectData.properties) return;

            let value = target.value;
            if (propType === 'number') {
                value = parseFloat(value) || 0;
            }

            const oldValue = $self.cache.selectedObjectData.properties[propName];
            if (oldValue != value) {
                console.log('[Blur] Applying:', propName, '=', value);
                $self.applyValue(propName, value);
            }
        }, false);

        // Function to increment/decrement value
        const changeNumberValue = function(button, isIncrease, event, skipApply = false) {
            const propName = button.getAttribute('data-prop-name');
            const input = button.parentElement.querySelector('input');

            if (!input || !$self.cache.selectedObjectData || !$self.cache.selectedObjectData.properties) return;

            let currentValue = parseFloat(input.value) || 0;

            // Increment amount based on modifier keys
            let increment = 1;
            if (event && event.shiftKey) {
                increment = 10; // Shift = +10/-10
            } else if (event && event.ctrlKey) {
                increment = 0.1; // Ctrl = +0.1/-0.1
            }

            if (isIncrease) {
                currentValue += increment;
            } else {
                currentValue -= increment;
            }

            // Round to avoid floating point issues
            currentValue = Math.round(currentValue * 100) / 100;

            input.value = currentValue;

            // Update object data directly for immediate feedback
            if ($self.cache.selectedObjectData.properties) {
                $self.cache.selectedObjectData.properties[propName] = currentValue;
            }

            if (!skipApply) {
                $self.applyValue(propName, currentValue);
            }

            return currentValue;
        };

        // Handle number buttons - mousedown for repeat with progressive acceleration
        let currentButton = null;
        let currentIsIncrease = false;
        let currentEvent = null;
        let lastAppliedValue = null;

        propBox.addEventListener('mousedown', function(event) {
            const target = event.target.closest('.propNumberBtn');
            if (!target) return;

            event.preventDefault(); // Prevent text selection

            currentButton = target;
            currentIsIncrease = target.classList.contains('propNumberIncrease');
            currentEvent = event;

            // First click - apply immediately
            lastAppliedValue = changeNumberValue(target, currentIsIncrease, event, false);

            // Reset acceleration parameters
            repeatDelay = 100; // Start with 100ms delay

            // Progressive acceleration function
            const acceleratedRepeat = function() {
                // Update value without applying to scene (for speed)
                lastAppliedValue = changeNumberValue(currentButton, currentIsIncrease, currentEvent, true);

                // Decrease delay for acceleration (minimum 20ms)
                repeatDelay = Math.max(20, repeatDelay - 5);

                // Schedule next repeat with new delay
                repeatAcceleration = setTimeout(acceleratedRepeat, repeatDelay);
            };

            // Start repeating after initial delay
            repeatTimeout = setTimeout(() => {
                acceleratedRepeat();
            }, 400); // Start repeating after 400ms hold
        }, false);

        // Stop repeat on mouseup or mouseleave
        const stopRepeat = function() {
            if (repeatTimeout) {
                clearTimeout(repeatTimeout);
                repeatTimeout = null;
            }
            if (repeatAcceleration) {
                clearTimeout(repeatAcceleration);
                repeatAcceleration = null;
            }

            // Apply final value to scene
            if (currentButton && lastAppliedValue !== null) {
                const propName = currentButton.getAttribute('data-prop-name');
                $self.applyValue(propName, lastAppliedValue);
            }

            // Reset
            repeatDelay = 100;
            currentButton = null;
            currentIsIncrease = false;
            currentEvent = null;
            lastAppliedValue = null;
        };

        propBox.addEventListener('mouseup', stopRepeat, false);
        propBox.addEventListener('mouseleave', stopRepeat, false);

        console.log('✓ Property event handlers attached');
    },

    applyValue(propName, value) {
        if (this.cache.isApplyingValue) {
            console.warn('Already applying a value, skipping...');
            return;
        }

        // Lock to prevent any loops
        this.cache.isApplyingValue = true;

        // Update dependent properties (disabled state)
        this.cache.selectedObjectExtensionData.propertiesVariables.forEach((prop) => {
            if (prop.disable != null) {
                if (prop.disable["enabled-propertyName"] == propName) {
                    let obj = document.querySelector(".propertiesItem[__ajs_propertyName='" + prop.name + "']");
                    if (prop.disable["enabled-value"] == value) {
                        obj.setAttribute('__ajs_propertyDisabled', "false");
                    } else {
                        obj.setAttribute('__ajs_propertyDisabled', "true");
                    }
                }
            }
        });

        // Apply value to sceneEditor
        const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');
        if (sceneEditor && sceneEditor.setObjectProperty) {
            console.log('→ Applying to scene:', propName, '=', value);
            sceneEditor.setObjectProperty(this.cache.selectedObjectData, propName, value, true);
        } else {
            console.error('sceneEditor.setObjectProperty not available');
        }

        // Unlock after delay
        setTimeout(() => {
            this.cache.isApplyingValue = false;
        }, 200);
    },

    /**
     * Update property values displayed in inputs (called from external sources like transform controls)
     */
    updatePropertyValues(objectData) {
        if (!objectData || !this.cache.selectedObjectData) return;
        if (objectData.oid !== this.cache.selectedObjectData.oid) return;
        if (this.cache.isApplyingValue) {
            console.log('↻ Skipping update (currently applying value)');
            return;
        }

        console.log('↻ Updating property values for:', objectData.properties.name);

        // Lock during update
        this.cache.isApplyingValue = true;

        // Update cache
        this.cache.selectedObjectData = objectData;

        // Get focused element
        const focusedElement = document.activeElement;

        // Update text inputs
        document.querySelectorAll('.propertiesItemText').forEach(input => {
            if (input === focusedElement) return; // Don't update focused input

            const propName = input.getAttribute('data-prop-name');
            if (propName && objectData.properties.hasOwnProperty(propName)) {
                const newValue = objectData.properties[propName];
                if (input.value != newValue) {
                    input.value = newValue;
                }
            }
        });

        // Update checkboxes
        document.querySelectorAll('.propertiesItemCheckBox input').forEach(checkbox => {
            const propName = checkbox.getAttribute('data-prop-name');
            if (propName && objectData.properties.hasOwnProperty(propName)) {
                checkbox.checked = objectData.properties[propName];
            }
        });

        // Update color pickers
        document.querySelectorAll('.propertiesItemColor').forEach(container => {
            const preview = container.querySelector('.colorPreview');
            const textInput = container.querySelector('.colorInput');
            const colorPicker = container.querySelector('.colorPicker');
            const propName = textInput.getAttribute('data-prop-name');

            if (propName && objectData.properties.hasOwnProperty(propName)) {
                const newValue = objectData.properties[propName];
                if (textInput.value !== newValue) {
                    textInput.value = newValue;
                    colorPicker.value = newValue;
                    preview.style.backgroundColor = newValue;
                }
            }
        });

        console.log('✓ Property values updated');

        // Unlock
        setTimeout(() => {
            this.cache.isApplyingValue = false;
        }, 100);
    },
};
