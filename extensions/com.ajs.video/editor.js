const script = {
    //editor methods
    create(data) {
        // Create a video element
        let object = document.createElement("video");

        sceneEditor.initObject(object); // do not remove this line
        sceneEditor.setObjectID(object, data.oid); //do not remove this line
        sceneEditor.setObjectName(object, data.properties.name); //do not remove this line
        sceneEditor.setObjectGroups(object, data.groups); //do not remove this line
        sceneEditor.renderObjectClickable(object); //do not remove this line
        sceneEditor.renderObjectResizable(object);
        sceneEditor.renderObjectRotable(object);

        // Prevent video from playing in editor
        object.muted = true;
        object.loop = false;
        object.autoplay = false;
        object.preload = "metadata";

        // Style
        object.style.objectFit = 'fill';
        object.style.pointerEvents = 'none'; // Prevent interaction in editor

        //add object to the scene
        sceneEditor.addObjectToSceneLayer(object, data.layer); //do not remove this line
    },

    update(object, data) {
        //set position
        sceneEditor.setObjectX(object, data.properties.x);
        sceneEditor.setObjectY(object, data.properties.y);
        //set size
        sceneEditor.setObjectWidth(object, data.properties.width);
        sceneEditor.setObjectHeight(object, data.properties.height);

        // Update video source
        const videoPath = application.getFilePathFromResources(data.properties.videoPath);

        if (videoPath && videoPath !== object.src) {
            object.src = videoPath;
            object.load();
        } else if (!videoPath) {
            object.removeAttribute('src');
            this.drawNoVideo(object, data);
        }

        //apply rotation
        sceneEditor.setObjectAngle(object, data.properties.angle);
    },

    destroy(object, data) {
        // Stop and cleanup video
        if (object.src) {
            object.pause();
            object.removeAttribute('src');
            object.load();
        }
    },

    drawNoVideo(object, data) {
        // For video, we can't draw directly on it like a canvas
        // We'll use the default broken video icon
        object.style.backgroundColor = '#333';
    }
};

script;
