/**
 * PhysicsManager - Manages physics simulation and collision detection
 *
 * Coordinates all physics objects (rigidbodies and colliders) in the scene.
 * Handles collision detection, resolution, and physics callbacks.
 *
 * @internal
 * @version 1.0.0
 * @author AJS Engine
 */

class PhysicsManager {
    constructor() {
        this.colliders = new Map(); // Map<gameObjectOid, ColliderData[]>
        this.rigidbodies = new Map(); // Map<gameObjectOid, RigidbodyData>
        this.gravity = { x: 0, y: 980 }; // Default gravity (pixels/s²)
        this.initialized = false;
    }

    /**
     * Initialize the physics manager
     */
    init() {
        if (this.initialized) return;

        console.log('[PhysicsManager] Initialized');
        this.initialized = true;
    }

    /**
     * Register a collider
     */
    registerCollider(gameObject, scriptInstance) {
        if (!this.colliders.has(gameObject.oid)) {
            this.colliders.set(gameObject.oid, []);
        }

        const colliders = this.colliders.get(gameObject.oid);

        // Check if already registered
        const exists = colliders.some(c => c.scriptInstance === scriptInstance);
        if (!exists) {
            colliders.push({
                gameObject: gameObject,
                scriptInstance: scriptInstance
            });
            console.log(`[PhysicsManager] Registered collider for ${gameObject.name}`);
        }
    }

    /**
     * Unregister a collider
     */
    unregisterCollider(gameObject, scriptInstance) {
        if (!this.colliders.has(gameObject.oid)) return;

        const colliders = this.colliders.get(gameObject.oid);
        const index = colliders.findIndex(c => c.scriptInstance === scriptInstance);

        if (index !== -1) {
            colliders.splice(index, 1);

            if (colliders.length === 0) {
                this.colliders.delete(gameObject.oid);
            }

            console.log(`[PhysicsManager] Unregistered collider for ${gameObject.name}`);
        }
    }

    /**
     * Register a rigidbody
     */
    registerRigidbody(gameObject, scriptInstance) {
        this.rigidbodies.set(gameObject.oid, {
            gameObject: gameObject,
            scriptInstance: scriptInstance
        });
        console.log(`[PhysicsManager] Registered rigidbody for ${gameObject.name}`);
    }

    /**
     * Unregister a rigidbody
     */
    unregisterRigidbody(gameObject) {
        this.rigidbodies.delete(gameObject.oid);
        console.log(`[PhysicsManager] Unregistered rigidbody for ${gameObject.name}`);
    }

    /**
     * Get all colliders in the scene
     */
    getAllColliders() {
        const allColliders = [];
        for (const colliderArray of this.colliders.values()) {
            allColliders.push(...colliderArray);
        }
        return allColliders;
    }

    /**
     * Get colliders for a specific game object
     */
    getCollidersForObject(oid) {
        return this.colliders.get(oid) || [];
    }

    /**
     * Find a game object by OID
     */
    findGameObjectByOid(oid, api) {
        // Use the scene's game objects if available
        if (api && api.scene && api.scene.gameObjects) {
            return api.scene.gameObjects.find(go => go.oid === oid);
        }

        // Fallback: search through colliders and rigidbodies
        for (const colliderArray of this.colliders.values()) {
            const collider = colliderArray.find(c => c.gameObject.oid === oid);
            if (collider) return collider.gameObject;
        }

        const rigidbody = this.rigidbodies.get(oid);
        if (rigidbody) return rigidbody.gameObject;

        return null;
    }

    /**
     * Get the gravity vector
     */
    getGravity() {
        return { ...this.gravity };
    }

    /**
     * Set the gravity vector
     */
    setGravity(x, y) {
        this.gravity.x = x;
        this.gravity.y = y;
        console.log(`[PhysicsManager] Gravity set to (${x}, ${y})`);
    }

    /**
     * Update physics simulation
     */
    update(deltaTime) {
        // Detect collisions between all colliders
        this.detectCollisions();
    }

    /**
     * Detect collisions between all colliders in the scene
     */
    detectCollisions() {
        const allColliders = this.getAllColliders();

        // Check each pair of colliders
        for (let i = 0; i < allColliders.length; i++) {
            for (let j = i + 1; j < allColliders.length; j++) {
                const colliderA = allColliders[i];
                const colliderB = allColliders[j];

                // Don't check collision between colliders on the same object
                if (colliderA.gameObject.oid === colliderB.gameObject.oid) {
                    continue;
                }

                // Check if collision occurs
                const isColliding = this.checkCollision(colliderA, colliderB);

                // Get collision pair key
                const pairKey = this.getCollisionPairKey(
                    colliderA.gameObject.oid,
                    colliderB.gameObject.oid
                );

                // Initialize collision tracking if needed
                if (!this.collisionPairs) {
                    this.collisionPairs = new Map();
                }

                const wasColliding = this.collisionPairs.get(pairKey) || false;

                if (isColliding && !wasColliding) {
                    // Collision Enter
                    this.onCollisionEnter(colliderA, colliderB);
                    this.collisionPairs.set(pairKey, true);
                } else if (isColliding && wasColliding) {
                    // Collision Stay
                    this.onCollisionStay(colliderA, colliderB);
                } else if (!isColliding && wasColliding) {
                    // Collision Exit
                    this.onCollisionExit(colliderA, colliderB);
                    this.collisionPairs.set(pairKey, false);
                }
            }
        }
    }

    /**
     * Check collision between two colliders
     */
    checkCollision(colliderA, colliderB) {
        const typeA = colliderA.scriptInstance.constructor.name;
        const typeB = colliderB.scriptInstance.constructor.name;

        // Box vs Box
        if (typeA === 'BoxCollider2D' && typeB === 'BoxCollider2D') {
            return this.checkBoxBox(colliderA, colliderB);
        }
        // Circle vs Circle
        else if (typeA === 'CircleCollider2D' && typeB === 'CircleCollider2D') {
            return this.checkCircleCircle(colliderA, colliderB);
        }
        // Box vs Circle or Circle vs Box
        else if (
            (typeA === 'BoxCollider2D' && typeB === 'CircleCollider2D') ||
            (typeA === 'CircleCollider2D' && typeB === 'BoxCollider2D')
        ) {
            const box = typeA === 'BoxCollider2D' ? colliderA : colliderB;
            const circle = typeA === 'CircleCollider2D' ? colliderA : colliderB;
            return this.checkBoxCircle(box, circle);
        }

        return false;
    }

    /**
     * Check collision between two box colliders (AABB)
     */
    checkBoxBox(colliderA, colliderB) {
        const boundsA = this.getBoxBounds(colliderA);
        const boundsB = this.getBoxBounds(colliderB);

        return !(
            boundsA.right < boundsB.left ||
            boundsA.left > boundsB.right ||
            boundsA.bottom < boundsB.top ||
            boundsA.top > boundsB.bottom
        );
    }

    /**
     * Check collision between two circle colliders
     */
    checkCircleCircle(colliderA, colliderB) {
        const centerA = this.getCircleCenter(colliderA);
        const centerB = this.getCircleCenter(colliderB);
        const radiusA = colliderA.scriptInstance.properties.radius || 32;
        const radiusB = colliderB.scriptInstance.properties.radius || 32;

        const dx = centerB.x - centerA.x;
        const dy = centerB.y - centerA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < (radiusA + radiusB);
    }

    /**
     * Check collision between box and circle collider
     */
    checkBoxCircle(boxCollider, circleCollider) {
        const bounds = this.getBoxBounds(boxCollider);
        const center = this.getCircleCenter(circleCollider);
        const radius = circleCollider.scriptInstance.properties.radius || 32;

        // Find closest point on box to circle center
        const closestX = Math.max(bounds.left, Math.min(center.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(center.y, bounds.bottom));

        // Calculate distance from closest point to circle center
        const dx = center.x - closestX;
        const dy = center.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < radius;
    }

    /**
     * Get bounding box of a box collider
     */
    getBoxBounds(collider) {
        const go = collider.gameObject;
        const props = collider.scriptInstance.properties;

        const width = props.width || go.properties.width || 64;
        const height = props.height || go.properties.height || 64;
        const offsetX = props.offsetX || 0;
        const offsetY = props.offsetY || 0;

        const left = go.properties.x + offsetX - (width / 2);
        const top = go.properties.y + offsetY - (height / 2);

        return {
            left: left,
            top: top,
            right: left + width,
            bottom: top + height
        };
    }

    /**
     * Get center position of a circle collider
     */
    getCircleCenter(collider) {
        const go = collider.gameObject;
        const props = collider.scriptInstance.properties;

        const offsetX = props.offsetX || 0;
        const offsetY = props.offsetY || 0;

        return {
            x: go.properties.x + offsetX,
            y: go.properties.y + offsetY
        };
    }

    /**
     * Get unique key for collision pair
     */
    getCollisionPairKey(oidA, oidB) {
        // Always use same order to ensure consistent key
        return oidA < oidB ? `${oidA}_${oidB}` : `${oidB}_${oidA}`;
    }

    /**
     * Handle collision enter event
     */
    onCollisionEnter(colliderA, colliderB) {
        const isTriggerA = colliderA.scriptInstance.properties.isTrigger;
        const isTriggerB = colliderB.scriptInstance.properties.isTrigger;

        if (isTriggerA || isTriggerB) {
            // Trigger callbacks
            this.callScriptMethod(colliderA.gameObject, 'onTriggerEnter', colliderB.gameObject);
            this.callScriptMethod(colliderB.gameObject, 'onTriggerEnter', colliderA.gameObject);
        } else {
            // Collision callbacks
            this.callScriptMethod(colliderA.gameObject, 'onCollisionEnter', colliderB.gameObject);
            this.callScriptMethod(colliderB.gameObject, 'onCollisionEnter', colliderA.gameObject);
        }
    }

    /**
     * Handle collision stay event
     */
    onCollisionStay(colliderA, colliderB) {
        const isTriggerA = colliderA.scriptInstance.properties.isTrigger;
        const isTriggerB = colliderB.scriptInstance.properties.isTrigger;

        if (isTriggerA || isTriggerB) {
            // Trigger callbacks
            this.callScriptMethod(colliderA.gameObject, 'onTriggerStay', colliderB.gameObject);
            this.callScriptMethod(colliderB.gameObject, 'onTriggerStay', colliderA.gameObject);
        } else {
            // Collision callbacks
            this.callScriptMethod(colliderA.gameObject, 'onCollisionStay', colliderB.gameObject);
            this.callScriptMethod(colliderB.gameObject, 'onCollisionStay', colliderA.gameObject);
        }
    }

    /**
     * Handle collision exit event
     */
    onCollisionExit(colliderA, colliderB) {
        const isTriggerA = colliderA.scriptInstance.properties.isTrigger;
        const isTriggerB = colliderB.scriptInstance.properties.isTrigger;

        if (isTriggerA || isTriggerB) {
            // Trigger callbacks
            this.callScriptMethod(colliderA.gameObject, 'onTriggerExit', colliderB.gameObject);
            this.callScriptMethod(colliderB.gameObject, 'onTriggerExit', colliderA.gameObject);
        } else {
            // Collision callbacks
            this.callScriptMethod(colliderA.gameObject, 'onCollisionExit', colliderB.gameObject);
            this.callScriptMethod(colliderB.gameObject, 'onCollisionExit', colliderA.gameObject);
        }
    }

    /**
     * Call a method on all scripts of a game object
     */
    callScriptMethod(gameObject, methodName, otherGameObject) {
        if (!gameObject.scripts) return;

        gameObject.scripts.forEach(script => {
            if (script && typeof script[methodName] === 'function') {
                script[methodName](otherGameObject);
            }
        });
    }

    /**
     * Clear all physics data (e.g., when changing scenes)
     */
    clear() {
        this.colliders.clear();
        this.rigidbodies.clear();
        console.log('[PhysicsManager] Cleared all physics data');
    }

    /**
     * Debug: Get statistics
     */
    getStats() {
        return {
            colliders: this.colliders.size,
            rigidbodies: this.rigidbodies.size,
            gravity: this.gravity
        };
    }
}

// Singleton instance
const physicsManager = new PhysicsManager();

module.exports = physicsManager;
