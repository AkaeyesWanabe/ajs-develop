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
        if (this.initialized) {
            console.log('[PhysicsManager] Already initialized');
            return;
        }

        console.log('[PhysicsManager] Initializing physics system...');
        this.colliders = new Map();
        this.rigidbodies = new Map();
        this.collisionPairs = new Map();
        this.gravity = { x: 0, y: 980 };
        this.initialized = true;
        console.log('[PhysicsManager] Physics system ready');
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
    }

    /**
     * Unregister a rigidbody
     */
    unregisterRigidbody(gameObject) {
        this.rigidbodies.delete(gameObject.oid);
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

        // Initialize collision tracking if needed
        if (!this.collisionPairs) {
            this.collisionPairs = new Map();
        }

        // Check each pair of colliders
        for (let i = 0; i < allColliders.length; i++) {
            for (let j = i + 1; j < allColliders.length; j++) {
                const colliderA = allColliders[i];
                const colliderB = allColliders[j];

                // Safety checks
                if (!colliderA || !colliderB || !colliderA.gameObject || !colliderB.gameObject) {
                    continue;
                }

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
     * Uses the collider's own getBounds() method for consistency
     */
    getBoxBounds(collider) {
        // Use the collider's own getBounds method
        if (collider.scriptInstance && typeof collider.scriptInstance.getBounds === 'function') {
            return collider.scriptInstance.getBounds(collider.gameObject);
        }

        // Fallback: manual calculation from center of object's box
        const go = collider.gameObject;
        const props = collider.scriptInstance.properties;

        const width = props.width || go.properties.width || 64;
        const height = props.height || go.properties.height || 64;
        const offsetX = props.offsetX || 0;
        const offsetY = props.offsetY || 0;

        // Get object dimensions
        const objWidth = go.properties.width || 64;
        const objHeight = go.properties.height || 64;

        // Calculate center of object's box
        const objCenterX = go.properties.x + objWidth / 2;
        const objCenterY = go.properties.y + objHeight / 2;

        // Collider center = center of object's box + offset
        const centerX = objCenterX + offsetX;
        const centerY = objCenterY + offsetY;

        return {
            left: centerX - width / 2,
            top: centerY - height / 2,
            right: centerX + width / 2,
            bottom: centerY + height / 2
        };
    }

    /**
     * Get center position of a circle collider
     * Uses the collider's own getBounds() method for consistency
     */
    getCircleCenter(collider) {
        // Use the collider's own getBounds method
        if (collider.scriptInstance && typeof collider.scriptInstance.getBounds === 'function') {
            const bounds = collider.scriptInstance.getBounds(collider.gameObject);
            return {
                x: bounds.centerX,
                y: bounds.centerY
            };
        }

        // Fallback: manual calculation from center of object's box
        const go = collider.gameObject;
        const props = collider.scriptInstance.properties;

        const offsetX = props.offsetX || 0;
        const offsetY = props.offsetY || 0;

        // Get object dimensions
        const objWidth = go.properties.width || 64;
        const objHeight = go.properties.height || 64;

        // Calculate center of object's box
        const objCenterX = go.properties.x + objWidth / 2;
        const objCenterY = go.properties.y + objHeight / 2;

        return {
            x: objCenterX + offsetX,
            y: objCenterY + offsetY
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
            // Solid collision - resolve physics
            this.resolveCollision(colliderA, colliderB);

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
            // Solid collision - continuously resolve physics
            this.resolveCollision(colliderA, colliderB);

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
     * Resolve collision physics between two colliders (Unity-style impulse resolution)
     */
    resolveCollision(colliderA, colliderB) {
        // Get rigidbodies for both objects
        const rbA = this.rigidbodies.get(colliderA.gameObject.oid);
        const rbB = this.rigidbodies.get(colliderB.gameObject.oid);

        // If neither has a rigidbody, no physics to resolve
        if (!rbA && !rbB) {
            return;
        }

        // Skip if both are kinematic
        if (rbA && rbA.scriptInstance.properties.isKinematic &&
            rbB && rbB.scriptInstance.properties.isKinematic) {
            return;
        }

        // Calculate penetration depth and normal
        const collision = this.calculateCollisionData(colliderA, colliderB);
        if (!collision) {
            return;
        }

        const { penetration, normalX, normalY } = collision;

        // Get velocities
        const velA = rbA ? rbA.scriptInstance.getVelocity() : { x: 0, y: 0 };
        const velB = rbB ? rbB.scriptInstance.getVelocity() : { x: 0, y: 0 };

        // Calculate relative velocity
        const relVelX = velA.x - velB.x;
        const relVelY = velA.y - velB.y;

        // Calculate relative velocity in collision normal direction
        const velocityAlongNormal = relVelX * normalX + relVelY * normalY;

        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) {
            return;
        }

        // Calculate restitution (bounciness) - 0 for no bounce, 1 for perfect bounce
        const restitution = 0.0; // No bounce for solid ground-like collisions

        // Get masses (kinematic objects have infinite mass)
        const massA = rbA && !rbA.scriptInstance.properties.isKinematic ? rbA.scriptInstance.properties.mass : Infinity;
        const massB = rbB && !rbB.scriptInstance.properties.isKinematic ? rbB.scriptInstance.properties.mass : Infinity;

        // Calculate impulse magnitude (Unity-style)
        const invMassA = massA === Infinity ? 0 : 1 / massA;
        const invMassB = massB === Infinity ? 0 : 1 / massB;
        const invMassSum = invMassA + invMassB;

        if (invMassSum === 0) {
            return; // Both objects are kinematic
        }

        const impulseMagnitude = -(1 + restitution) * velocityAlongNormal / invMassSum;

        // Apply impulse to velocities
        const impulseX = impulseMagnitude * normalX;
        const impulseY = impulseMagnitude * normalY;

        if (rbA && !rbA.scriptInstance.properties.isKinematic) {
            rbA.scriptInstance.setVelocity(
                velA.x + impulseX * invMassA,
                velA.y + impulseY * invMassA
            );
        }

        if (rbB && !rbB.scriptInstance.properties.isKinematic) {
            rbB.scriptInstance.setVelocity(
                velB.x - impulseX * invMassB,
                velB.y - impulseY * invMassB
            );
        }

        // Positional correction to prevent sinking (Unity-style)
        const percent = 0.8; // Penetration percentage to correct (increased for stability)
        const slop = 0.5; // Allowed penetration (increased tolerance)
        const correctionMagnitude = Math.max(penetration - slop, 0) / invMassSum * percent;
        const correctionX = correctionMagnitude * normalX;
        const correctionY = correctionMagnitude * normalY;

        if (rbA && !rbA.scriptInstance.properties.isKinematic) {
            colliderA.gameObject.properties.x -= correctionX * invMassA;
            colliderA.gameObject.properties.y -= correctionY * invMassA;
        }

        if (rbB && !rbB.scriptInstance.properties.isKinematic) {
            colliderB.gameObject.properties.x += correctionX * invMassB;
            colliderB.gameObject.properties.y += correctionY * invMassB;
        }
    }

    /**
     * Calculate collision penetration depth and normal
     */
    calculateCollisionData(colliderA, colliderB) {
        const typeA = colliderA.scriptInstance.constructor.name;
        const typeB = colliderB.scriptInstance.constructor.name;

        // Box vs Box
        if (typeA === 'BoxCollider2D' && typeB === 'BoxCollider2D') {
            return this.calculateBoxBoxCollision(colliderA, colliderB);
        }
        // Circle vs Circle
        else if (typeA === 'CircleCollider2D' && typeB === 'CircleCollider2D') {
            return this.calculateCircleCircleCollision(colliderA, colliderB);
        }
        // Box vs Circle
        else if (
            (typeA === 'BoxCollider2D' && typeB === 'CircleCollider2D') ||
            (typeA === 'CircleCollider2D' && typeB === 'BoxCollider2D')
        ) {
            const box = typeA === 'BoxCollider2D' ? colliderA : colliderB;
            const circle = typeA === 'CircleCollider2D' ? colliderA : colliderB;
            const data = this.calculateBoxCircleCollision(box, circle);

            // Flip normal if circle is colliderB
            if (typeA === 'BoxCollider2D') {
                return data;
            } else {
                return data ? { ...data, normalX: -data.normalX, normalY: -data.normalY } : null;
            }
        }

        return null;
    }

    /**
     * Calculate Box-Box collision data
     */
    calculateBoxBoxCollision(colliderA, colliderB) {
        const boundsA = this.getBoxBounds(colliderA);
        const boundsB = this.getBoxBounds(colliderB);

        // Calculate overlap on each axis
        const overlapX = Math.min(boundsA.right - boundsB.left, boundsB.right - boundsA.left);
        const overlapY = Math.min(boundsA.bottom - boundsB.top, boundsB.bottom - boundsA.top);

        // Use the smaller overlap as penetration
        if (overlapX < overlapY) {
            // Penetrating horizontally
            const normalX = (boundsA.left + boundsA.right) / 2 < (boundsB.left + boundsB.right) / 2 ? 1 : -1;
            return {
                penetration: overlapX,
                normalX: normalX,
                normalY: 0
            };
        } else {
            // Penetrating vertically
            const normalY = (boundsA.top + boundsA.bottom) / 2 < (boundsB.top + boundsB.bottom) / 2 ? 1 : -1;
            return {
                penetration: overlapY,
                normalX: 0,
                normalY: normalY
            };
        }
    }

    /**
     * Calculate Circle-Circle collision data
     */
    calculateCircleCircleCollision(colliderA, colliderB) {
        const centerA = this.getCircleCenter(colliderA);
        const centerB = this.getCircleCenter(colliderB);
        const radiusA = colliderA.scriptInstance.properties.radius || 32;
        const radiusB = colliderB.scriptInstance.properties.radius || 32;

        const dx = centerB.x - centerA.x;
        const dy = centerB.y - centerA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            // Objects are at exact same position, push apart on x-axis
            return {
                penetration: radiusA + radiusB,
                normalX: 1,
                normalY: 0
            };
        }

        const penetration = (radiusA + radiusB) - distance;

        return {
            penetration: penetration,
            normalX: dx / distance,
            normalY: dy / distance
        };
    }

    /**
     * Calculate Box-Circle collision data
     */
    calculateBoxCircleCollision(boxCollider, circleCollider) {
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

        if (distance === 0) {
            // Circle center is inside box, calculate normal from box center
            const boxCenterX = (bounds.left + bounds.right) / 2;
            const boxCenterY = (bounds.top + bounds.bottom) / 2;
            const toCenterX = center.x - boxCenterX;
            const toCenterY = center.y - boxCenterY;
            const toCenterDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

            return {
                penetration: radius,
                normalX: toCenterDist > 0 ? toCenterX / toCenterDist : 1,
                normalY: toCenterDist > 0 ? toCenterY / toCenterDist : 0
            };
        }

        const penetration = radius - distance;

        return {
            penetration: penetration,
            normalX: dx / distance,
            normalY: dy / distance
        };
    }

    /**
     * Call a method on all scripts of a game object (Unity-style)
     * This includes both collider scripts and user scripts
     */
    callScriptMethod(gameObject, methodName, otherGameObject) {
        // Call on ALL scripts attached to the GameObject (Unity-style behavior)
        if (!gameObject.scripts || gameObject.scripts.length === 0) {
            return;
        }

        gameObject.scripts.forEach(scriptInstance => {
            if (scriptInstance && typeof scriptInstance[methodName] === 'function') {
                try {
                    scriptInstance[methodName](otherGameObject);
                } catch (error) {
                    console.error(`[PhysicsManager] Error calling ${methodName} on ${gameObject.name}:`, error);
                }
            }
        });
    }

    /**
     * Clear all physics data (e.g., when changing scenes)
     */
    clear() {
        console.log('[PhysicsManager] Clearing physics system...');
        this.colliders.clear();
        this.rigidbodies.clear();
        if (this.collisionPairs) {
            this.collisionPairs.clear();
        }
        console.log('[PhysicsManager] Physics system cleared');
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
