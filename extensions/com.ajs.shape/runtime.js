/**
 * Shape Extension - Runtime Module
 * Handles shape rendering during game execution
 */

const runtime = {
    name: "Shape Runtime",
    version: "1.0.0",

    /**
     * Called when object is created
     */
    onCreated(gameObject, api) {
        // No initialization needed for shapes
    },

    /**
     * Called every frame for updates
     */
    onUpdate(gameObject, deltaTime, api) {
        // No update logic needed for static shapes
        // Could add animations, rotations, etc. here
    },

    /**
     * Render shape at runtime
     */
    onRender(gameObject, ctx, api) {
        const { x, y, width, height, angle, opacity } = gameObject.getTransform();

        // Check if object should be rendered
        if (!gameObject.isVisible) {
            return;
        }

        ctx.save();

        // Apply transformations
        ctx.translate(x, y);
        ctx.rotate(angle * Math.PI / 180);
        ctx.globalAlpha = opacity;

        const shapeType = gameObject.properties.shapeType || 'rectangle';

        // Setup fill style
        this.setupFillStyle(ctx, gameObject.properties, width, height);

        // Setup stroke style
        if (gameObject.properties.strokeEnabled) {
            ctx.strokeStyle = gameObject.properties.strokeColor || '#000000';
            ctx.lineWidth = gameObject.properties.strokeWidth || 2;
        }

        // Draw the shape
        ctx.beginPath();
        this.drawShape(ctx, shapeType, width, height, gameObject.properties);
        ctx.closePath();

        // Fill and stroke
        if (gameObject.properties.fillType !== 'none') {
            ctx.fill();
        }
        if (gameObject.properties.strokeEnabled) {
            ctx.stroke();
        }

        ctx.restore();
    },

    /**
     * Setup fill style (solid color or gradient)
     */
    setupFillStyle(ctx, properties, width, height) {
        const fillType = properties.fillType || 'solid';
        const fillColor = properties.fillColor || '#5ECDDE';
        const fillColor2 = properties.fillColor2 || '#FF6B9D';

        if (fillType === 'solid') {
            ctx.fillStyle = fillColor;
        } else if (fillType === 'linear') {
            const angle = (properties.gradientAngle || 45) * Math.PI / 180;
            const x1 = 0;
            const y1 = 0;
            const x2 = Math.cos(angle) * width;
            const y2 = Math.sin(angle) * height;

            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, fillColor);
            gradient.addColorStop(1, fillColor2);
            ctx.fillStyle = gradient;
        } else if (fillType === 'radial') {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.max(width, height) / 2;

            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, fillColor);
            gradient.addColorStop(1, fillColor2);
            ctx.fillStyle = gradient;
        }
    },

    /**
     * Draw the specific shape
     */
    drawShape(ctx, shapeType, width, height, properties) {
        switch (shapeType) {
            case 'rectangle':
                this.drawRectangle(ctx, width, height, properties.cornerRadius || 0);
                break;
            case 'circle':
                this.drawCircle(ctx, Math.min(width, height) / 2);
                break;
            case 'ellipse':
                this.drawEllipse(ctx, width, height);
                break;
            case 'triangle':
                this.drawTriangle(ctx, width, height);
                break;
            case 'polygon':
                this.drawPolygon(ctx, width, height, properties.sides || 5);
                break;
            case 'star':
                this.drawStar(ctx, width, height, properties.sides || 5, properties.innerRadius || 0.5);
                break;
        }
    },

    /**
     * Draw rectangle (with optional rounded corners)
     */
    drawRectangle(ctx, width, height, cornerRadius) {
        if (cornerRadius > 0) {
            const radius = Math.min(cornerRadius, width / 2, height / 2);
            ctx.moveTo(radius, 0);
            ctx.lineTo(width - radius, 0);
            ctx.arcTo(width, 0, width, radius, radius);
            ctx.lineTo(width, height - radius);
            ctx.arcTo(width, height, width - radius, height, radius);
            ctx.lineTo(radius, height);
            ctx.arcTo(0, height, 0, height - radius, radius);
            ctx.lineTo(0, radius);
            ctx.arcTo(0, 0, radius, 0, radius);
        } else {
            ctx.rect(0, 0, width, height);
        }
    },

    /**
     * Draw circle
     */
    drawCircle(ctx, radius) {
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    },

    /**
     * Draw ellipse
     */
    drawEllipse(ctx, width, height) {
        ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    },

    /**
     * Draw triangle
     */
    drawTriangle(ctx, width, height) {
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
    },

    /**
     * Draw regular polygon
     */
    drawPolygon(ctx, width, height, sides) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2;

        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    },

    /**
     * Draw star
     */
    drawStar(ctx, width, height, points, innerRadius) {
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(width, height) / 2;
        const innerR = outerRadius * innerRadius;

        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI / points) - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerR;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    }
};

module.exports = runtime;
