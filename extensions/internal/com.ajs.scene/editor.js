const script = {
    // Scene extension - editor methods
    // Scenes are containers and don't have visual representation in the editor
    // The scene editor handles scene rendering and management

    create(data) {
        // Scenes are loaded and managed by the sceneEditor itself
        // This method is called when a scene is created
    },

    update(_object, _data) {
        // Scene properties are managed by sceneEditor
        // This would handle scene-level updates if needed
    },

    destroy(_object) {
        // Called when a scene is destroyed
    }
};
