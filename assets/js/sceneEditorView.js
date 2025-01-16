var __dataExtensions = {};
var __editorExtensions = {};
var __runtimeExtensions = {};


document.addEventListener("mouseup", function () {
    if (sceneEditor.canBeOutside) {
        sceneEditor.canBeOutside = false;
        //
        if (sceneEditor.isInsideObject) {
            sceneEditor.isInsideObject = false;
        }
        else {
            sceneEditor.deselectAllObjects();
        }
    }
});