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
        //set size
        sceneEditor.setObjectWidth(object, data.properties.width);
        sceneEditor.setObjectHeight(object, data.properties.height);
        //apply rotation
        sceneEditor.setObjectAngle(object, data.properties.angle);
        //
        //
        if (data.properties.animator == "") {
            this.drawNoImage(ctx, data);
            return;
        }
        const anim = animator.getFromResources(data.properties.animator);
        if (!anim || !anim.animations || anim.animations.length == 0 || anim.animations[0].frames.length == 0) {
            this.drawNoImage(ctx, data);
            return;
        }
        //
        let imagePath = application.getFilePathFromResources(anim.animations[0].frames[0].path);
        if (imagePath == "") {
            this.drawNoImage(ctx, data);
            return;
        }
        //
        // Get the first frame to extract reference origin point
        const firstFrame = anim.animations[0].frames[0];

        //Start Drawing object
        const img = new Image();
        img.onload = function () {
            // Récupérer l'origin de référence (première frame)
            const referenceOriginPoint = firstFrame.points?.find(p => p.name === 'origin');
            const referenceOriginX = referenceOriginPoint ? referenceOriginPoint.x : firstFrame.width / 2;
            const referenceOriginY = referenceOriginPoint ? referenceOriginPoint.y : firstFrame.height / 2;

            // Pour la première frame, on utilise toujours son origin comme référence
            // Donc currentOrigin = referenceOrigin, et le dessin se fait à (0, 0)
            const currentOriginPoint = firstFrame.points?.find(p => p.name === 'origin');
            const currentOriginX = currentOriginPoint ? currentOriginPoint.x : firstFrame.width / 2;
            const currentOriginY = currentOriginPoint ? currentOriginPoint.y : firstFrame.height / 2;

            // Calculer l'échelle entre l'image originale et la taille affichée
            const scaleX = data.properties.width / firstFrame.width;
            const scaleY = data.properties.height / firstFrame.height;

            // Calculer l'offset relatif à la première frame
            // Pour la première frame: offset = (current - reference) = 0
            // Pour les autres frames: offset = (currentOrigin - referenceOrigin)
            const drawX = (currentOriginX - referenceOriginX) * scaleX;
            const drawY = (currentOriginY - referenceOriginY) * scaleY;

            // Clear canvas first
            ctx.clearRect(0, 0, data.properties.width, data.properties.height);

            // Draw the image with relative offset to first frame
            ctx.drawImage(img, drawX, drawY, data.properties.width, data.properties.height);
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
        // Cleanup if necessary
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
