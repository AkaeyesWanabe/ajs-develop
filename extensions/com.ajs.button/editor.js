const script = {
    //editor methods
    create(data) {
        //init a canvas
        let object = document.createElement("button");
        //
        sceneEditor.initObject(object);// do not remove this line
        sceneEditor.setObjectID(object, data.oid);//do not remove this line
        sceneEditor.setObjectName(object, data.properties.name);//do not remove this line
        sceneEditor.setObjectGroups(object, data.groups);//do not remove this line
        sceneEditor.renderObjectClickable(object);//do not remove this line
        sceneEditor.renderObjectResizable(object);
        sceneEditor.renderObjectRotable(object);
        //
        //add object to the scene
        sceneEditor.addObjectToSceneLayer(object, data.layer);//do not remove this line
    },

    update(object, data) {
        //set position
        sceneEditor.setObjectX(object, data.properties.x);
        sceneEditor.setObjectY(object, data.properties.y);
        //set size
        sceneEditor.setObjectWidth(object, data.properties.width);
        sceneEditor.setObjectHeight(object, data.properties.height);
        //
        //Start Drawing object
        //fill with white color
        object.innerText = data.properties.text;
        object.style.backgroundColor = data.properties.bkgColor;
        //End Drawing object
        //
        //apply rotation
        sceneEditor.setObjectAngle(object, data.properties.angle);
    },

    destroy(object, data) {
        alert("The object has been destroyed from the editor!");
    }
};

script;