/**
 * CircleCollider2D - Circular Collision Shape
 *
 * Detects collisions with other colliders via PhysicsManager.
 * Can be used as a trigger or a solid collider.
 *
 * @internal
 * @version 2.0.0
 * @author AJS Engine
 */

class CircleCollider2D {
    properties = {
        showInEditor: true,
        offsetX: 0,
        offsetY: 0,
        radius: 32,
        isTrigger: false
    };

    onStart(gameObject, api) {
        // Register with physics manager
        const physicsManager = require('../PhysicsManager');
        physicsManager.registerCollider(gameObject, this);
    }

    /**
     * Get the center and radius of this collider
     * Positioned from the center of the object's box (x + w/2, y + h/2)
     */
    getBounds(gameObject) {
        const radius = this.properties.radius || 32;
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
            centerX: centerX,
            centerY: centerY,
            radius: radius
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

module.exports = CircleCollider2D;
