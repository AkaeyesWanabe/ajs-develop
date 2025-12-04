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
    loadedSceneData: null, // Store the loaded scene data for editing
    loadedSceneFilePath: null, // Store the file path of the loaded scene
    // PERFORMANCE: Cache DOM elements
    domCache: {
        propertiesExtensionInfo: null,
        propertiesBox: null,
        extensionLabels: null,
        extensionImg: null
    }
};

// PERFORMANCE: Initialize DOM cache
function initDOMCache() {
    if (!propertiesCache.domCache.propertiesBox) {
        propertiesCache.domCache.propertiesExtensionInfo = document.querySelector('.propertiesExtensionInfo');
        propertiesCache.domCache.propertiesBox = document.querySelector("#propertiesBox");
        propertiesCache.domCache.extensionLabels = document.querySelectorAll('.propertiesExtensionInfo label');
        propertiesCache.domCache.extensionImg = document.querySelector('.propertiesExtensionInfo img');
    }
    return propertiesCache.domCache;
}

module.exports = {
    cache: propertiesCache,

    closeProperties() {
        // PERFORMANCE: Use cached DOM elements
        const dom = initDOMCache();
        dom.propertiesExtensionInfo.setAttribute("shown", "false");
        dom.propertiesBox.innerHTML = "";
        this.cache.selectedObjectData = {};
        this.cache.selectedObjectExtensionData = {};
        this.cache.lastSelectedObjectOID = {};
        this.cache.lastSelectedObjectExtensionData = {};
        this.cache.selectedObjectsOID = [];
        this.cache.selectedObjectsData = [];
        this.cache.isCommonProperties = false;
        this.cache.loadedSceneData = null;
        this.cache.loadedSceneFilePath = null;

        // Remove scene save button if it exists
        this.removeSceneSaveButton();
    },

    openObjectProperties(objectData, extensionData) {
        // PERFORMANCE: Use cached DOM elements
        const dom = initDOMCache();
        dom.propertiesExtensionInfo.setAttribute("shown", "true");
        dom.extensionLabels[1].innerHTML = extensionData.extensionName;
        dom.extensionImg.style.display = "inline-block";
        dom.extensionImg.src = "./extensions/" + extensionData.extension + "/" + extensionData.extensionIcon;

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

            // PERFORMANCE: Use cached DOM elements
            const dom = initDOMCache();
            dom.extensionLabels[1].innerHTML = commonExtensionData.extensionName;
            dom.extensionImg.style.display = "none";

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

        // Check if this is scene properties
        const isSceneProperties = extensionData.extension === 'internal/com.ajs.scene';

        // Add save button for scene properties
        if (isSceneProperties) {
            this.addSceneSaveButton(objectData);
        } else {
            this.removeSceneSaveButton();
        }

        this.refreshProperties(objectData, extensionData);
    },

    refreshProperties(objectData, extensionData) {
        // PERFORMANCE: Use cached DOM element
        const dom = initDOMCache();
        dom.propertiesBox.innerHTML = "";

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
            dom.propertiesBox.innerHTML = dom.propertiesBox.innerHTML + elem.trim();
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

                let elem = "";

                if (prop.type != "script") {
                    elem = `
                <div class="propertiesItem" __ajs_propertyName="` + prop.name + `" __ajs_propertyDisabled="` + (disbaledValue ? 'true' : 'false') + `">
                    <label>` + prop.label + `</label>`;
                }

                switch (prop.type) {
                    case "text": {
                        elem += `<input type="text" class="propertiesItemText" data-prop-name="` + prop.name + `" data-prop-type="text" value="` + objectData.properties[prop.name] + `">`;
                        break;
                    }

                    case "number": {
                        // Custom number input with +/- buttons (NO native spinners)
                        const min = prop.min !== undefined ? prop.min : '';
                        const max = prop.max !== undefined ? prop.max : '';
                        const step = prop.step !== undefined ? prop.step : 1;

                        elem += `
                        <div class="propertiesItemNumber">
                            <button class="propNumberBtn propNumberDecrease" data-prop-name="` + prop.name + `" data-min="` + min + `" data-max="` + max + `" data-step="` + step + `">
                                <i class="ri-subtract-line"></i>
                            </button>
                            <input type="text" class="propertiesItemText" data-prop-name="` + prop.name + `" data-prop-type="number" data-min="` + min + `" data-max="` + max + `" data-step="` + step + `" value="` + (objectData.properties[prop.name] - 0) + `">
                            <button class="propNumberBtn propNumberIncrease" data-prop-name="` + prop.name + `" data-min="` + min + `" data-max="` + max + `" data-step="` + step + `">
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

                    case "script": {
                        let path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";
                        const scriptName = objectData.properties[prop.name] ? application.getFileNameFromResources(objectData.properties[prop.name]) : 'None';
                        break;
                    }

                    case "color": {
                        const colorValue = objectData.properties[prop.name] || '#ffffff';
                        elem += `
                        <div class="propertiesItemColor">
                            <span class="colorLabel">` + colorValue + `</span>
                            <input type="color" class="colorPicker" data-prop-name="` + prop.name + `" value="` + colorValue + `">
                        </div>`;
                        break;
                    }

                    case "select": {
                        const currentValue = objectData.properties[prop.name];
                        elem += `<select class="propertiesItemSelect" data-prop-name="` + prop.name + `" data-prop-type="select">`;

                        if (prop.options && Array.isArray(prop.options)) {
                            prop.options.forEach(option => {
                                const selected = (currentValue == option.value) ? 'selected' : '';
                                elem += `<option value="` + option.value + `" ` + selected + `>` + option.label + `</option>`;
                            });
                        }

                        elem += `</select>`;
                        break;
                    }

                    default: {
                        elem += `<input type="text" class="propertiesItemText" data-prop-name="` + prop.name + `" data-prop-type="text" value="` + objectData.properties[prop.name] + `">`;
                        break;
                    }
                }

                if (prop.type != "script")
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
                $(".propertiesItemColor").each(function () {
                    const container = this;
                    const colorLabel = container.querySelector('.colorLabel');
                    const colorPicker = container.querySelector('.colorPicker');
                    const propName = colorPicker.getAttribute('data-prop-name');

                    // Update from color picker
                    $(colorPicker).off('input').on('input', function () {
                        if ($self.cache.isApplyingValue) return;
                        const value = this.value;
                        colorLabel.textContent = value;
                        $self.applyValue(propName, value);
                    });
                });

                // Select dropdown events
                $(".propertiesItemSelect").off('change').on('change', function () {
                    if ($self.cache.isApplyingValue) return;
                    const propName = this.getAttribute('data-prop-name');
                    const value = this.value;
                    // Convert to number if the value is numeric
                    const numValue = parseFloat(value);
                    const finalValue = !isNaN(numValue) && value !== '' ? numValue : value;
                    $self.applyValue(propName, finalValue);
                });

                // Create script button events
                $(".createScriptBtn").off('click').on('click', function (e) {
                    e.stopPropagation(); // Prevent opening file picker
                    $self.createNewScript();
                });

                // Add drag and drop support to script pickers
                $('.propertiesItemPicker').each(function () {
                    const img = this.querySelector('img');
                    if (img && img.getAttribute('data-prop-type') === 'script') {
                        const scriptPicker = this;
                        const propName = img.getAttribute('data-prop-name');

                        scriptPicker.addEventListener('dragover', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            const scriptPath = e.dataTransfer.types.includes('text/script-path');
                            if (scriptPath) {
                                e.dataTransfer.dropEffect = 'copy';
                                this.style.outline = '2px dashed #4CAF50';
                            }
                        });

                        scriptPicker.addEventListener('dragleave', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            this.style.outline = '';
                        });

                        scriptPicker.addEventListener('drop', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            this.style.outline = '';

                            const scriptPath = e.dataTransfer.getData('text/script-path');
                            const scriptName = e.dataTransfer.getData('text/script-name');

                            if (scriptPath && scriptName.toLowerCase().endsWith('.js')) {
                                // Convert to relative path
                                const application = nw.require('./assets/js/objects/application');
                                const relativePath = application.getResourcesPathFromFile(scriptPath);

                                // Update the picker UI
                                const img = this.querySelector('img');
                                const span = this.querySelector('span');
                                const path = "./assets/files-icons-themes/" + globals.user.fileIconTheme.theme + "/";

                                img.src = path + globals.user.fileIconTheme.data.files.js;
                                span.textContent = scriptName;

                                // Apply the value
                                $self.applyValue(propName, relativePath);

                                // Show notification
                                const notifications = nw.require('./assets/js/objects/notifications');
                                if (notifications) {
                                    notifications.success(`Script "${scriptName}" attached`);
                                }
                            }
                        });
                    }
                });

                // Intégrer le système de scripts multiples (Unity-style)
                // Ne pas afficher pour les propriétés de scène
                const isSceneProperties = extensionData.extension === 'internal/com.ajs.scene';
                if (!isSceneProperties && objectData.oid !== 'scene_properties') {
                    // Créer un conteneur pour la liste des scripts
                    const scriptsContainer = document.createElement('div');
                    scriptsContainer.id = 'scriptsListSection';
                    dom.propertiesBox.appendChild(scriptsContainer);

                    // Charger et afficher scriptsList
                    const scriptsList = nw.require('./assets/js/objects/scriptsList');
                    if (scriptsList) {
                        scriptsList.display(objectData, scriptsContainer);
                    }
                }
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
            return;
        }

        let repeatTimeout = null;
        let repeatDelay = 100; // Starting delay for repeat
        let repeatAcceleration = null; // For progressive acceleration

        // Handle text inputs - Enter key
        propBox.addEventListener('keydown', function (event) {
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
                $self.applyValue(propName, value);
                target.blur();
            }
        }, false);

        // Handle text inputs - Blur (focus out)
        propBox.addEventListener('focusout', function (event) {
            if ($self.cache.isApplyingValue) return;

            const target = event.target;
            if (!target.classList.contains('propertiesItemText')) return;

            const propName = target.getAttribute('data-prop-name');
            const propType = target.getAttribute('data-prop-type');

            if (!$self.cache.selectedObjectData || !$self.cache.selectedObjectData.properties) return;

            let value = target.value;
            if (propType === 'number') {
                value = parseFloat(value) || 0;

                // Get constraints and validate
                const minAttr = target.getAttribute('data-min');
                const maxAttr = target.getAttribute('data-max');

                const min = minAttr !== '' && minAttr !== null ? parseFloat(minAttr) : null;
                const max = maxAttr !== '' && maxAttr !== null ? parseFloat(maxAttr) : null;

                // Clamp to min/max if defined
                if (min !== null && value < min) {
                    value = min;
                }
                if (max !== null && value > max) {
                    value = max;
                }

                // Update input with clamped value
                target.value = value;
            }

            const oldValue = $self.cache.selectedObjectData.properties[propName];
            if (oldValue != value) {
                $self.applyValue(propName, value);
            }
        }, false);

        // Function to increment/decrement value
        const changeNumberValue = function (button, isIncrease, event, skipApply = false) {
            const propName = button.getAttribute('data-prop-name');
            const input = button.parentElement.querySelector('input');

            if (!input || !$self.cache.selectedObjectData || !$self.cache.selectedObjectData.properties) return;

            // Get constraints from data attributes
            const minAttr = button.getAttribute('data-min');
            const maxAttr = button.getAttribute('data-max');
            const stepAttr = button.getAttribute('data-step');

            const min = minAttr !== '' && minAttr !== null ? parseFloat(minAttr) : null;
            const max = maxAttr !== '' && maxAttr !== null ? parseFloat(maxAttr) : null;
            const step = stepAttr !== '' && stepAttr !== null ? parseFloat(stepAttr) : 1;

            let currentValue = parseFloat(input.value) || 0;

            // Increment amount based on modifier keys (override step)
            let increment = step;
            if (event && event.shiftKey) {
                increment = step * 10; // Shift = step * 10
            } else if (event && event.ctrlKey) {
                increment = step / 10; // Ctrl = step / 10
            }

            if (isIncrease) {
                currentValue += increment;
            } else {
                currentValue -= increment;
            }

            // Clamp to min/max if defined
            if (min !== null && currentValue < min) {
                currentValue = min;
            }
            if (max !== null && currentValue > max) {
                currentValue = max;
            }

            // Round to avoid floating point issues (respect step precision)
            const decimals = step.toString().split('.')[1]?.length || 0;
            const multiplier = Math.pow(10, Math.max(2, decimals));
            currentValue = Math.round(currentValue * multiplier) / multiplier;

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

        propBox.addEventListener('mousedown', function (event) {
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
            const acceleratedRepeat = function () {
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
        const stopRepeat = function () {
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

    },

    applyValue(propName, value) {
        if (this.cache.isApplyingValue) {
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

        // Check if we're editing scene properties vs object properties
        const isSceneProperty = this.cache.selectedObjectData?.extension === 'internal/com.ajs.scene';

        if (sceneEditor) {
            if (isSceneProperty && sceneEditor.setSceneProperty) {
                // Pass the loaded scene data to update it (not the currently open scene)
                sceneEditor.setSceneProperty(propName, value, this.cache.loadedSceneData);

                // If width or height changed, update the virtual dimensions in the UI
                if (propName === 'width' || propName === 'height') {
                    setTimeout(() => {
                        // PERFORMANCE: Cache querySelector
                        const virtualWidthInput = document.querySelector('.propertiesItemText[data-prop-name="virtualWidth"]');
                        const virtualHeightInput = document.querySelector('.propertiesItemText[data-prop-name="virtualHeight"]');

                        if (this.cache.loadedSceneData && this.cache.loadedSceneData.properties) {
                            if (virtualWidthInput) {
                                virtualWidthInput.value = this.cache.loadedSceneData.properties.virtualWidth;
                            }
                            if (virtualHeightInput) {
                                virtualHeightInput.value = this.cache.loadedSceneData.properties.virtualHeight;
                            }
                        }
                    }, 50);
                }
            } else if (sceneEditor.setObjectProperty) {
                sceneEditor.setObjectProperty(this.cache.selectedObjectData, propName, value, true);
            }
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
            return;
        }

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
            const colorLabel = container.querySelector('.colorLabel');
            const colorPicker = container.querySelector('.colorPicker');
            const propName = colorPicker ? colorPicker.getAttribute('data-prop-name') : null;

            if (propName && objectData.properties.hasOwnProperty(propName)) {
                const newValue = objectData.properties[propName];
                if (colorPicker && colorPicker.value !== newValue) {
                    colorPicker.value = newValue;
                    if (colorLabel) {
                        colorLabel.textContent = newValue;
                    }
                }
            }
        });

        // Unlock
        setTimeout(() => {
            this.cache.isApplyingValue = false;
        }, 100);
    },

    /**
     * Add a Save button to the properties panel for scene properties
     */
    addSceneSaveButton(objectData) {
        // Remove existing button if any
        this.removeSceneSaveButton();

        // Create save button - minimal design with icon only
        const saveButton = document.createElement('button');
        saveButton.id = 'sceneSaveButton';
        saveButton.className = 'btn btn-secondary';
        saveButton.innerHTML = '<i class="ri-save-line"></i>';
        saveButton.title = 'Save Scene';
        saveButton.style.cssText = 'display: inline-block;padding: 0 8px; font-size: 13px; width: max-content; opacity: 0.7; margin-left: 12px; max-height: 28px; margin-top: -1px;';

        // Add hover effect
        saveButton.addEventListener('mouseenter', () => {
            saveButton.style.opacity = '1';
        });
        saveButton.addEventListener('mouseleave', () => {
            saveButton.style.opacity = '0.7';
        });

        // Add click handler
        saveButton.addEventListener('click', () => {
            const properties = this;

            // Get the loaded scene data and file path from cache
            const sceneDataToSave = properties.cache.loadedSceneData;
            const sceneFilePath = properties.cache.loadedSceneFilePath;

            if (!sceneDataToSave) {
                if (typeof notifications !== 'undefined') {
                    notifications.error('No scene data available to save');
                }
                return;
            }

            if (!sceneFilePath) {
                if (typeof notifications !== 'undefined') {
                    notifications.error('No scene file path available');
                }
                return;
            }

            // Save the scene to the file
            const sceneEditor = window.sceneEditor || nw.require('./assets/js/objects/sceneEditor');

            // Check if this is the currently open scene
            const normalizePath = (p) => p ? p.replace(/\\/g, '/').toLowerCase() : '';
            const isCurrentScene = sceneEditor && sceneEditor.cache.sceneFilePath &&
                normalizePath(sceneEditor.cache.sceneFilePath) === normalizePath(sceneFilePath);

            if (isCurrentScene && sceneEditor.saveScene) {
                // Use the existing saveScene method for the current scene
                const success = sceneEditor.saveScene();
                if (success && typeof notifications !== 'undefined') {
                    notifications.success('Scene saved successfully');
                }
            } else {
                // Save a non-current scene file directly
                try {
                    const fs = nw.require('fs');
                    const sceneJSON = JSON.stringify(sceneDataToSave, null, 4);
                    fs.writeFileSync(sceneFilePath, sceneJSON, 'utf8');

                    if (typeof notifications !== 'undefined') {
                        notifications.success('Scene saved successfully');
                    }
                } catch (err) {
                    console.error('Error saving scene file:', err);
                    if (typeof notifications !== 'undefined') {
                        notifications.error('Failed to save scene: ' + err.message);
                    }
                }
            }
        });

        // Add button to the properties panel header
        // Find the title bar that contains the propertiesExtensionInfo element
        const extensionInfo = document.querySelector('.propertiesExtensionInfo');
        const titleBar = extensionInfo ? extensionInfo.closest('.workspaceTitleBar') : null;
        const menuItem = titleBar ? titleBar.querySelector('.workspaceMenuItem') : null;

        if (titleBar && menuItem) {
            titleBar.insertBefore(saveButton, menuItem);
        } else if (titleBar) {
            // If no menu item found, append to title bar
            titleBar.appendChild(saveButton);
        }
    },

    /**
     * Remove the Save button from the properties panel
     */
    removeSceneSaveButton() {
        const existingButton = document.getElementById('sceneSaveButton');
        if (existingButton) {
            existingButton.remove();
        }
    },

    /**
     * Create a new script file
     */
    createNewScript() {
        const fs = require('fs');
        const path = require('path');

        // Ask for script name
        const scriptName = prompt('Enter script name (without .js):', 'NewScript');
        if (!scriptName) return;

        // Ensure scripts directory exists
        const projectPath = application.projectDir || application.currentProjectPath;
        if (!projectPath) {
            alert('No project loaded');
            return;
        }

        const scriptsDir = path.join(projectPath, 'scripts');
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }

        // Create script file path
        const scriptFileName = scriptName.endsWith('.js') ? scriptName : `${scriptName}.js`;
        const scriptPath = path.join(scriptsDir, scriptFileName);

        // Check if file already exists
        if (fs.existsSync(scriptPath)) {
            alert(`Script "${scriptFileName}" already exists!`);
            return;
        }

        // Script template
        const template = `/**
 * ${scriptName} - Script description
 */

class ${scriptName} {
    // Properties configurable from the editor
    properties = {
        // Add your properties here
        // Example: speed: 100
    };

    /**
     * Called once when the scene starts
     */
    onStart(gameObject, api) {
        api.log('${scriptName} started for', gameObject.name);
    }

    /**
     * Called every frame
     */
    onUpdate(gameObject, deltaTime, api) {
        // Game logic here
        // deltaTime is in milliseconds
    }

    /**
     * Called when the object is destroyed
     */
    onDestroy(gameObject, api) {
        // Cleanup here
    }
}

module.exports = ${scriptName};
`;

        // Write the file
        try {
            fs.writeFileSync(scriptPath, template, 'utf8');
            window.notifications.success(`Script "${scriptFileName}" created successfully!`);

            // Refresh project files
            if (typeof projectFiles !== 'undefined' && projectFiles.refreshProjectFiles) {
                projectFiles.refreshProjectFiles();
            }
        } catch (err) {
            console.error('Error creating script:', err);
            alert('Error creating script: ' + err.message);
        }
    },
};
