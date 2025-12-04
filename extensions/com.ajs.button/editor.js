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
        //Start Drawing object with improved styling
        object.innerText = data.properties.text || 'Button';

        // Background color with gradient
        const bgColor = data.properties.bkgColor || '#4CAF50';
        object.style.background = `linear-gradient(180deg, ${this.lightenColor(bgColor, 10)}, ${this.darkenColor(bgColor, 10)})`;

        // Text styling
        object.style.color = data.properties.textColor || '#ffffff';
        object.style.fontSize = (data.properties.fontSize || 16) + 'px';
        object.style.fontFamily = data.properties.fontFamily || 'Arial';
        object.style.fontWeight = data.properties.fontWeight || 'normal';
        object.style.fontStyle = data.properties.fontStyle || 'normal';
        object.style.textDecoration = data.properties.textDecoration || 'none';
        object.style.textTransform = data.properties.textTransform || 'none';
        object.style.letterSpacing = (data.properties.letterSpacing || 0) + 'px';
        object.style.wordSpacing = (data.properties.wordSpacing || 0) + 'px';
        object.style.textAlign = 'center';
        object.style.lineHeight = data.properties.height + 'px';

        // Text shadow
        const textShadowX = data.properties.textShadowX || 0;
        const textShadowY = data.properties.textShadowY || 1;
        const textShadowBlur = data.properties.textShadowBlur || 2;
        const textShadowColor = data.properties.textShadowColor || 'rgba(0,0,0,0.3)';
        if (textShadowX !== 0 || textShadowY !== 0 || textShadowBlur !== 0) {
            object.style.textShadow = `${textShadowX}px ${textShadowY}px ${textShadowBlur}px ${textShadowColor}`;
        } else {
            object.style.textShadow = 'none';
        }

        // Border styling
        const borderRadius = data.properties.borderRadius !== undefined ? data.properties.borderRadius : 8;
        const borderWidth = data.properties.borderWidth !== undefined ? data.properties.borderWidth : 2;
        const borderColor = data.properties.borderColor || '#2e7d32';

        object.style.borderRadius = borderRadius + 'px';
        object.style.border = borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none';

        // Shadow for depth
        object.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';

        // Cursor
        object.style.cursor = 'pointer';

        // Remove default button styles
        object.style.outline = 'none';
        object.style.userSelect = 'none';

        //End Drawing object
        //
        //apply rotation
        sceneEditor.setObjectAngle(object, data.properties.angle);
    },

    /**
     * Éclaircir une couleur hexadécimale
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    },

    /**
     * Assombrir une couleur hexadécimale
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    },

    destroy(object, data) {
        alert("The object has been destroyed from the editor!");
    }
};

script;