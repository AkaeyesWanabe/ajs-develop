/**
 * BoxCollider2D - Rectangular Collision Shape
 *
 * Detects collisions with other colliders via PhysicsManager.
 * Can be used as a trigger or a solid collider.
 *
 * @internal
 * @version 2.0.0
 * @author AJS Engine
 */

class BoxCollider2D {
    properties = {
        showInEditor: true,
        offsetX: 0,
        offsetY: 0,
        width: 64,
        height: 64,
        isTrigger: false
    };

    onStart(gameObject, api) {
        // Register with physics manager
        const physicsManager = require('../PhysicsManager');
        physicsManager.registerCollider(gameObject, this);
    }

    /**
     * Get the world bounds of this collider
     * Positioned from the center of the object's box (x + w/2, y + h/2)
     */
    getBounds(gameObject) {
        const width = this.properties.width || 64;
        const height = this.properties.height || 64;
        const offsetX = this.properties.offsetX || 0;
        const offsetY = this.properties.offsetY || 0;

        // Get object dimensions
        const objWidth = gameObject.properties.width || 64;
        const objHeight = gameObject.properties.height || 64;

        // Calculate center of object's box (from top-left position)
        const objCenterX = gameObject.properties.x + objWidth / 2;
        const objCenterY = gameObject.properties.y + objHeight / 2;

        // Collider center = center of object's box + offset
        const centerX = objCenterX + offsetX;
        const centerY = objCenterY + offsetY;

        return {
            left: centerX - width / 2,
            right: centerX + width / 2,
            top: centerY - height / 2,
            bottom: centerY + height / 2,
            centerX: centerX,
            centerY: centerY,
            width: width,
            height: height
        };
    }

    /**
     * Called when collision enters (from PhysicsManager)
     */
    onCollisionEnter(otherGameObject) {
        // Override in user scripts if needed
    }

    /**
     * Called while collision continues (from PhysicsManager)
     */
    onCollisionStay(otherGameObject) {
        // Override in user scripts if needed
    }

    /**
     * Called when collision exits (from PhysicsManager)
     */
    onCollisionExit(otherGameObject) {
        // Override in user scripts if needed
    }

    /**
     * Called when trigger enters (from PhysicsManager)
     */
    onTriggerEnter(otherGameObject) {
        // Override in user scripts if needed
    }

    /**
     * Called while trigger continues (from PhysicsManager)
     */
    onTriggerStay(otherGameObject) {
        // Override in user scripts if needed
    }

    /**
     * Called when trigger exits (from PhysicsManager)
     */
    onTriggerExit(otherGameObject) {
        // Override in user scripts if needed
    }

    onDestroy(gameObject, api) {
        const physicsManager = require('../PhysicsManager');
        physicsManager.unregisterCollider(gameObject, this);
    }
}

module.exports = BoxCollider2D;
