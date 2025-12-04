/**
 * CircleCollider2D - Circular Collision Shape
 *
 * Detects collisions with other colliders using circular bounds.
 * More efficient for round objects than BoxCollider2D.
 *
 * @internal
 * @version 1.0.0
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
        this._colliding = new Set();
        this._collidingLastFrame = new Set();

        this.registerCollider(gameObject, api);

        console.log(`[CircleCollider2D] Initialized for ${gameObject.name}`, this.properties);
    }

    onUpdate(gameObject, deltaTime, api) {
        // Update collision tracking
        this._collidingLastFrame = new Set(this._colliding);
        this._colliding.clear();

        const allColliders = this.getAllColliders(api);

        allColliders.forEach(other => {
            if (other.gameObject.oid === gameObject.oid) return;

            if (this.checkCollision(gameObject, other)) {
                this._colliding.add(other.gameObject.oid);

                if (!this._collidingLastFrame.has(other.gameObject.oid)) {
                    this.onCollisionEnter(gameObject, other.gameObject, api);
                } else {
                    this.onCollisionStay(gameObject, other.gameObject, api);
                }
            }
        });

        this._collidingLastFrame.forEach(oid => {
            if (!this._colliding.has(oid)) {
                const otherGameObject = this.findGameObjectByOid(oid, api);
                if (otherGameObject) {
                    this.onCollisionExit(gameObject, otherGameObject, api);
                }
            }
        });
    }

    /**
     * Get circle center and radius
     */
    getBounds(gameObject) {
        return {
            centerX: gameObject.properties.x + this.properties.offsetX + this.properties.radius,
            centerY: gameObject.properties.y + this.properties.offsetY + this.properties.radius,
            radius: this.properties.radius
        };
    }

    /**
     * Check collision with another collider
     */
    checkCollision(gameObject, otherCollider) {
        const circle = this.getBounds(gameObject);

        // Check if other collider is also a circle
        if (otherCollider.scriptInstance.constructor.name === 'CircleCollider2D') {
            return this.checkCircleCircle(circle, otherCollider.scriptInstance.getBounds(otherCollider.gameObject));
        }

        // Check if other collider is a box
        if (otherCollider.scriptInstance.constructor.name === 'BoxCollider2D') {
            return this.checkCircleBox(circle, otherCollider.scriptInstance.getBounds(otherCollider.gameObject));
        }

        return false;
    }

    /**
     * Circle vs Circle collision
     */
    checkCircleCircle(circle1, circle2) {
        const dx = circle1.centerX - circle2.centerX;
        const dy = circle1.centerY - circle2.centerY;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSum = circle1.radius + circle2.radius;

        return distanceSquared < (radiusSum * radiusSum);
    }

    /**
     * Circle vs Box collision
     */
    checkCircleBox(circle, box) {
        // Find closest point on box to circle center
        const closestX = Math.max(box.left, Math.min(circle.centerX, box.right));
        const closestY = Math.max(box.top, Math.min(circle.centerY, box.bottom));

        // Calculate distance from closest point to circle center
        const dx = circle.centerX - closestX;
        const dy = circle.centerY - closestY;
        const distanceSquared = dx * dx + dy * dy;

        return distanceSquared < (circle.radius * circle.radius);
    }

    /**
     * Collision callbacks
     */
    onCollisionEnter(gameObject, otherGameObject, api) {
        this.callScriptEvent(gameObject, 'onCollisionEnter', otherGameObject, api);

        if (!this.properties.isTrigger) {
            this.resolveCollision(gameObject, otherGameObject);
        }
    }

    onCollisionStay(gameObject, otherGameObject, api) {
        this.callScriptEvent(gameObject, 'onCollisionStay', otherGameObject, api);
    }

    onCollisionExit(gameObject, otherGameObject, api) {
        this.callScriptEvent(gameObject, 'onCollisionExit', otherGameObject, api);
    }

    /**
     * Resolve collision
     */
    resolveCollision(gameObject, otherGameObject) {
        const circle = this.getBounds(gameObject);
        const otherBounds = this.getBounds(otherGameObject);

        // Calculate direction from other to this
        const dx = circle.centerX - otherBounds.centerX;
        const dy = circle.centerY - otherBounds.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        // Normalize direction
        const nx = dx / distance;
        const ny = dy / distance;

        // Calculate overlap
        const overlap = (circle.radius + otherBounds.radius) - distance;

        // Push apart
        gameObject.properties.x += nx * overlap / 2;
        gameObject.properties.y += ny * overlap / 2;
    }

    callScriptEvent(gameObject, eventName, otherGameObject, api) {
        // Called by ScriptManager
    }

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
        ctx.beginPath();
        ctx.arc(bounds.centerX, bounds.centerY, bounds.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    onDestroy(gameObject, api) {
        const physicsManager = require('../PhysicsManager');
        physicsManager.unregisterCollider(gameObject, this);
        api.log(`[CircleCollider2D] Destroyed for ${gameObject.name}`);
    }
}

module.exports = CircleCollider2D;
