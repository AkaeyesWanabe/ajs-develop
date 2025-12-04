/**
 * BoxCollider2D - Rectangular Collision Shape
 *
 * Detects collisions with other colliders.
 * Can be used as a trigger or a solid collider.
 *
 * @internal
 * @version 1.0.0
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
        this._colliding = new Set(); // Track current collisions
        this._collidingLastFrame = new Set();

        // Register with physics manager
        this.registerCollider(gameObject, api);

        console.log(`[BoxCollider2D] Initialized for ${gameObject.name}`, this.properties);
    }

    onUpdate(gameObject, deltaTime, api) {
        // Update collision tracking
        this._collidingLastFrame = new Set(this._colliding);
        this._colliding.clear();

        // Get all colliders from physics manager
        const allColliders = this.getAllColliders(api);

        // Check collisions with other colliders
        allColliders.forEach(other => {
            if (other.gameObject.oid === gameObject.oid) return; // Skip self

            if (this.checkCollision(gameObject, other)) {
                this._colliding.add(other.gameObject.oid);

                // Trigger events
                if (!this._collidingLastFrame.has(other.gameObject.oid)) {
                    // OnCollisionEnter
                    this.onCollisionEnter(gameObject, other.gameObject, api);
                } else {
                    // OnCollisionStay
                    this.onCollisionStay(gameObject, other.gameObject, api);
                }
            }
        });

        // Check for exits
        this._collidingLastFrame.forEach(oid => {
            if (!this._colliding.has(oid)) {
                // OnCollisionExit
                const otherGameObject = this.findGameObjectByOid(oid, api);
                if (otherGameObject) {
                    this.onCollisionExit(gameObject, otherGameObject, api);
                }
            }
        });
    }

    /**
     * Get the world bounds of this collider
     */
    getBounds(gameObject) {
        const x = gameObject.properties.x + this.properties.offsetX;
        const y = gameObject.properties.y + this.properties.offsetY;

        return {
            left: x,
            right: x + this.properties.width,
            top: y,
            bottom: y + this.properties.height,
            centerX: x + this.properties.width / 2,
            centerY: y + this.properties.height / 2
        };
    }

    /**
     * Check collision with another collider
     */
    checkCollision(gameObject, otherCollider) {
        const bounds1 = this.getBounds(gameObject);

        // Check if other collider has getBounds method
        if (typeof otherCollider.scriptInstance.getBounds !== 'function') {
            return false;
        }

        const bounds2 = otherCollider.scriptInstance.getBounds(otherCollider.gameObject);

        // AABB collision detection
        return !(
            bounds1.right < bounds2.left ||
            bounds1.left > bounds2.right ||
            bounds1.bottom < bounds2.top ||
            bounds1.top > bounds2.bottom
        );
    }

    /**
     * Called when collision starts
     */
    onCollisionEnter(gameObject, otherGameObject, api) {
        // Call user scripts if they have onCollisionEnter
        this.callScriptEvent(gameObject, 'onCollisionEnter', otherGameObject, api);

        if (!this.properties.isTrigger) {
            // Resolve collision (push objects apart)
            this.resolveCollision(gameObject, otherGameObject);
        }
    }

    /**
     * Called while collision continues
     */
    onCollisionStay(gameObject, otherGameObject, api) {
        // Call user scripts if they have onCollisionStay
        this.callScriptEvent(gameObject, 'onCollisionStay', otherGameObject, api);
    }

    /**
     * Called when collision ends
     */
    onCollisionExit(gameObject, otherGameObject, api) {
        // Call user scripts if they have onCollisionExit
        this.callScriptEvent(gameObject, 'onCollisionExit', otherGameObject, api);
    }

    /**
     * Resolve collision by pushing objects apart
     */
    resolveCollision(gameObject, otherGameObject) {
        // Simple collision resolution
        // TODO: Implement proper physics resolution with rigidbody
        const bounds1 = this.getBounds(gameObject);
        const bounds2 = this.getBounds(otherGameObject); // Assuming other has getBounds

        // Calculate overlap
        const overlapX = Math.min(bounds1.right - bounds2.left, bounds2.right - bounds1.left);
        const overlapY = Math.min(bounds1.bottom - bounds2.top, bounds2.bottom - bounds1.top);

        // Push along the axis of least overlap
        if (overlapX < overlapY) {
            // Push horizontally
            if (bounds1.centerX < bounds2.centerX) {
                gameObject.properties.x -= overlapX / 2;
            } else {
                gameObject.properties.x += overlapX / 2;
            }
        } else {
            // Push vertically
            if (bounds1.centerY < bounds2.centerY) {
                gameObject.properties.y -= overlapY / 2;
            } else {
                gameObject.properties.y += overlapY / 2;
            }
        }
    }

    /**
     * Call event on all scripts attached to gameObject
     */
    callScriptEvent(gameObject, eventName, otherGameObject, api) {
        // This would be called by the ScriptManager
        // For now, just log
        // api.log(`[BoxCollider2D] ${eventName} with ${otherGameObject.name}`);
    }

    /**
     * Helper methods to interact with physics manager
     */
    registerCollider(gameObject, api) {
        const physicsManager = require('../PhysicsManager');
        physicsManager.registerCollider(gameObject, this);
    }

    getAllColliders(api) {
        const physicsManager = require('../PhysicsManager');
        return physicsManager.getAllColliders();
    }

    findGameObjectByOid(oid, api) {
        const physicsManager = require('../PhysicsManager');
        return physicsManager.findGameObjectByOid(oid, api);
    }

    /**
     * Draw debug visualization
     */
    onRenderGizmos(gameObject, ctx) {
        const bounds = this.getBounds(gameObject);

        ctx.save();
        ctx.strokeStyle = this.properties.isTrigger ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            bounds.left,
            bounds.top,
            this.properties.width,
            this.properties.height
        );
        ctx.restore();
    }

    onDestroy(gameObject, api) {
        const physicsManager = require('../PhysicsManager');
        physicsManager.unregisterCollider(gameObject, this);
        api.log(`[BoxCollider2D] Destroyed for ${gameObject.name}`);
    }
}

module.exports = BoxCollider2D;
