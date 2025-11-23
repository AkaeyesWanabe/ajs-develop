const script = {
    //editor methods
    create(data) {
        //init a canvas
        let object = document.createElement("canvas");
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
        //
        let ctx = object.getContext('2d');
        //
        //draw icon if object is invisible
        if (!data.properties.visible || data.properties.visible == "false") {
            //set size
            sceneEditor.setObjectWidth(object, 32);
            sceneEditor.setObjectHeight(object, 32);
            //apply rotation
            sceneEditor.setObjectAngle(object, 0);
            //draw icon
            const img = new Image();
            img.onload = function () {
                // Draw the icon on the canvas
                ctx.drawImage(img, 0, 0, 32, 32);
            };
            img.src = application.getExtensionsDir() + "/" + data.extension + "/icon.png";
            //end of drawing icon
            return;
        }
        //
        //set size
        sceneEditor.setObjectWidth(object, data.properties.width);
        sceneEditor.setObjectHeight(object, data.properties.height);
        //apply rotation
        sceneEditor.setObjectAngle(object, data.properties.angle);
        //
        let imagePath = application.getFilePathFromResources(data.properties.imagePath);
        if (imagePath == "") {
            this.drawNoImage(ctx, data);
            return;
        }
        //
        //Start Drawing object
        const img = new Image();
        img.onload = function () {
            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0, data.properties.width, data.properties.height);
        };
        let $self = this;
        img.onerror = function () {
            $self.drawNoImage(ctx, data);
        };
        img.src = imagePath;
        //End of Drawing object
        //
    },

    destroy(object) {
        alert("The object has been destroyed from the editor!");
    },


    ///////////////////////
    ///CALLING OF FUNCTIONS
    ///////////////////////
    drawNoImage(ctx, data) {
        // Draw the gray box
        ctx.fillStyle = 'gray';
        ctx.fillRect(0, 0, data.properties.width, data.properties.height);
        // Draw the rectangle border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, data.properties.width, data.properties.height); // (x, y, width, height)
        // Draw the black diagonal line
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(data.properties.width, data.properties.height);
        ctx.stroke();
        // Draw the black diagonal line
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(data.properties.width, 0);
        ctx.lineTo(0, data.properties.height);
        ctx.stroke();
    }
};

script;