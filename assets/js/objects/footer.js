const $ = nw.require('jquery');
const globals = nw.require('./assets/js/common/globals');

module.exports = {
    /**
     * Show/hide status details based on active tab
     */
    refreshStatusDetails() {
        let dts = document.querySelectorAll("#statusDetails>a");
        dts.forEach(function (item) {
            if (item.getAttribute("tab") == globals.app.tabName) {
                item.style.display = "block";
            }
            else {
                item.style.display = "none";
            }
        });
    },

    /**
     * Update scene editor status information
     */
    updateSceneEditorStatus(data) {
        const statusItems = document.querySelectorAll("#statusDetails>a[tab='sceneEditor']");

        if (statusItems.length >= 4) {
            // Update mouse position
            if (data.mouseX !== undefined && data.mouseY !== undefined) {
                statusItems[0].textContent = `X:${Math.round(data.mouseX)}, Y:${Math.round(data.mouseY)}`;
            }

            // Update selected objects count
            if (data.selectedCount !== undefined) {
                statusItems[1].textContent = `Selected objs:${data.selectedCount}`;
            }

            // Update screen dimensions
            if (data.screenWidth !== undefined && data.screenHeight !== undefined) {
                statusItems[2].textContent = `Screen dim:${data.screenWidth}x${data.screenHeight}`;
            }

            // Update zoom level
            if (data.zoom !== undefined) {
                statusItems[3].textContent = `Zoom:${data.zoom}%`;
            }
        }
    },

    /**
     * Update script editor status information
     */
    updateScriptEditorStatus(data) {
        const statusItems = document.querySelectorAll("#statusDetails>a[tab='scriptEditor']");

        if (statusItems.length >= 4) {
            // Update cursor position (line, column)
            if (data.line !== undefined && data.column !== undefined) {
                statusItems[0].textContent = `Line:${data.line}, Col:${data.column}`;
            }

            // Update character count
            if (data.charCount !== undefined) {
                statusItems[1].textContent = `Chars:${data.charCount}`;
            }

            // Update language/mode
            if (data.language !== undefined) {
                statusItems[2].textContent = `Lang:${data.language.toUpperCase()}`;
            }

            // Update indentation settings
            if (data.tabSize !== undefined) {
                statusItems[3].textContent = `Spaces:${data.tabSize}`;
            }
        }
    },

    /**
     * Update player status information
     */
    updatePlayerStatus(data) {
        const statusItems = document.querySelectorAll("#statusDetails>a[tab='player']");

        if (statusItems.length >= 3) {
            // Update position
            if (data.x !== undefined && data.y !== undefined) {
                statusItems[0].textContent = `X:${Math.round(data.x)}, Y:${Math.round(data.y)}`;
            }

            // Update object count
            if (data.objectCount !== undefined) {
                statusItems[1].textContent = `Objects:${data.objectCount}`;
            }

            // Update mode
            if (data.mode !== undefined) {
                statusItems[2].textContent = `Mode:${data.mode}`;
            }
        }
    },

    /**
     * Update status action message
     */
    updateStatusAction(message) {
        const statusAction = document.getElementById('statusAction');
        if (statusAction) {
            statusAction.textContent = message;
        }
    }
};