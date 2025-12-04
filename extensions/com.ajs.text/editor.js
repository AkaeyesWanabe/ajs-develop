const script = {
    //editor methods
    create(data) {
        // Create a div element to display text
        let object = document.createElement("div");

        sceneEditor.initObject(object); // do not remove this line
        sceneEditor.setObjectID(object, data.oid); //do not remove this line
        sceneEditor.setObjectName(object, data.properties.name); //do not remove this line
        sceneEditor.setObjectGroups(object, data.groups); //do not remove this line
        sceneEditor.renderObjectClickable(object); //do not remove this line
        sceneEditor.renderObjectResizable(object);
        sceneEditor.renderObjectRotable(object);

        // Style the div
        object.style.overflow = 'hidden';
        object.style.wordWrap = 'break-word';
        object.style.whiteSpace = 'pre-wrap';

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

        // Update text content and style
        object.innerText = data.properties.text || 'Hello World';

        // Font styling
        const fontSize = data.properties.fontSize || 24;
        const fontFamily = data.properties.fontFamily || 'Arial';
        const fontWeight = data.properties.fontWeight || 'normal';
        const fontStyle = data.properties.fontStyle || 'normal';

        object.style.fontSize = fontSize + 'px';
        object.style.fontFamily = fontFamily;
        object.style.fontWeight = fontWeight;
        object.style.fontStyle = fontStyle;

        // Color
        object.style.color = data.properties.color || '#000000';

        // Text alignment
        const textAlign = data.properties.textAlign || 'left';
        const verticalAlign = data.properties.verticalAlign || 'top';
        const lineHeight = data.properties.lineHeight || 1.2;

        object.style.textAlign = textAlign;
        object.style.lineHeight = lineHeight;

        // Vertical alignment using flexbox
        object.style.display = 'flex';
        object.style.flexDirection = 'column';

        switch (verticalAlign) {
            case 'top':
                object.style.justifyContent = 'flex-start';
                break;
            case 'middle':
                object.style.justifyContent = 'center';
                break;
            case 'bottom':
                object.style.justifyContent = 'flex-end';
                break;
        }

        // Text decoration, transform, spacing
        const textDecoration = data.properties.textDecoration || 'none';
        const textTransform = data.properties.textTransform || 'none';
        const letterSpacing = data.properties.letterSpacing || 0;
        const wordSpacing = data.properties.wordSpacing || 0;

        object.style.textDecoration = textDecoration;
        object.style.textTransform = textTransform;
        object.style.letterSpacing = letterSpacing + 'px';
        object.style.wordSpacing = wordSpacing + 'px';

        // Text shadow
        const textShadowX = data.properties.textShadowX || 0;
        const textShadowY = data.properties.textShadowY || 0;
        const textShadowBlur = data.properties.textShadowBlur || 0;
        const textShadowColor = data.properties.textShadowColor || 'rgba(0,0,0,0.5)';

        // Text stroke (approximation with text-shadow)
        const strokeWidth = data.properties.strokeWidth || 0;
        const strokeColor = data.properties.strokeColor || '#000000';

        const shadows = [];

        // Add text shadow if configured
        if (textShadowX !== 0 || textShadowY !== 0 || textShadowBlur !== 0) {
            shadows.push(`${textShadowX}px ${textShadowY}px ${textShadowBlur}px ${textShadowColor}`);
        }

        // Add stroke effect if configured
        if (strokeWidth > 0) {
            for (let i = -strokeWidth; i <= strokeWidth; i++) {
                for (let j = -strokeWidth; j <= strokeWidth; j++) {
                    if (i !== 0 || j !== 0) {
                        shadows.push(`${i}px ${j}px 0 ${strokeColor}`);
                    }
                }
            }
        }

        object.style.textShadow = shadows.length > 0 ? shadows.join(', ') : 'none';

        //apply rotation
        sceneEditor.setObjectAngle(object, data.properties.angle);
    },

    destroy(object, data) {
        // Cleanup if needed
    }
};

script;
