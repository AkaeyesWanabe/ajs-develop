/**
 * Rigidbody2D - 2D Physics Component
 *
 * Adds realistic physics simulation to game objects.
 * Handles velocity, forces, gravity, and drag.
 *
 * @internal
 * @version 1.0.0
 * @author AJS Engine
 */

class Rigidbody2D {
    // Default properties (will be merged with user properties)
    properties = {
        mass: 1,
        gravityScale: 1,
        drag: 0,
        angularDrag: 0.05,
        isKinematic: false,
        useGravity: true
    };

    onStart(gameObject, api) {
        // Internal physics state (not exposed to user)
        this._velocity = { x: 0, y: 0 };
        this._angularVelocity = 0;
        this._forces = [];
        this._impulses = [];

        // Cache
        this._lastPosition = { x: gameObject.properties.x, y: gameObject.properties.y };
        this._lastAngle = gameObject.properties.angle || 0;

        // Register with physics manager
        const physicsManager = require('../PhysicsManager');
        physicsManager.registerRigidbody(gameObject, this);

        api.log(`[Rigidbody2D] Initialized for ${gameObject.name}`);
    }

    onUpdate(gameObject, deltaTime, api) {
        if (this.properties.isKinematic) {
            // Kinematic objects don't respond to forces
            return;
        }

        const dt = deltaTime / 1000; // Convert to seconds

        // Get physics settings from global physics manager
        const gravity = this.getGravity(api);

        // Apply gravity
        if (this.properties.useGravity && this.properties.gravityScale !== 0) {
            this._velocity.y += gravity.y * this.properties.gravityScale * dt;
        }

        // Apply forces (F = ma, so a = F/m)
        this._forces.forEach(force => {
            this._velocity.x += (force.x / this.properties.mass) * dt;
            this._velocity.y += (force.y / this.properties.mass) * dt;
        });

        // Apply impulses (instant velocity change)
        this._impulses.forEach(impulse => {
            this._velocity.x += impulse.x / this.properties.mass;
            this._velocity.y += impulse.y / this.properties.mass;
        });

        // Clear forces and impulses
        this._forces = [];
        this._impulses = [];

        // Apply drag (air resistance)
        if (this.properties.drag > 0) {
            const dragFactor = 1 - Math.min(this.properties.drag * dt, 0.99);
            this._velocity.x *= dragFactor;
            this._velocity.y *= dragFactor;
        }

        // Apply angular drag
        if (this.properties.angularDrag > 0) {
            const angularDragFactor = 1 - Math.min(this.properties.angularDrag * dt, 0.99);
            this._angularVelocity *= angularDragFactor;
        }

        // Update position based on velocity
        gameObject.properties.x += this._velocity.x * dt;
        gameObject.properties.y += this._velocity.y * dt;

        // Update rotation based on angular velocity
        if (this._angularVelocity !== 0) {
            gameObject.properties.angle = (gameObject.properties.angle || 0) + this._angularVelocity * dt;
        }

        // Cache for next frame
        this._lastPosition = { x: gameObject.properties.x, y: gameObject.properties.y };
        this._lastAngle = gameObject.properties.angle || 0;
    }

    // ========== PUBLIC API ==========

    /**
     * Add a force to the rigidbody (continuous)
     * @param {number} x - Force on X axis
     * @param {number} y - Force on Y axis
     */
    addForce(x, y) {
        this._forces.push({ x, y });
    }

    /**
     * Add an impulse to the rigidbody (instant)
     * @param {number} x - Impulse on X axis
     * @param {number} y - Impulse on Y axis
     */
    addImpulse(x, y) {
        this._impulses.push({ x, y });
    }

    /**
     * Set velocity directly
     * @param {number} x - Velocity X
     * @param {number} y - Velocity Y
     */
    setVelocity(x, y) {
        this._velocity.x = x;
        this._velocity.y = y;
    }

    /**
     * Get current velocity
     * @returns {{x: number, y: number}}
     */
    getVelocity() {
        return { ...this._velocity };
    }

    /**
     * Set angular velocity (rotation speed in degrees/second)
     * @param {number} angularVelocity
     */
    setAngularVelocity(angularVelocity) {
        this._angularVelocity = angularVelocity;
    }

    /**
     * Get angular velocity
     * @returns {number}
     */
    getAngularVelocity() {
        return this._angularVelocity;
    }

    /**
     * Add torque (rotational force)
     * @param {number} torque
     */
    addTorque(torque) {
        this._angularVelocity += torque / this.properties.mass;
    }

    /**
     * Get gravity from physics manager or use default
     */
    getGravity(api) {
        const physicsManager = require('../PhysicsManager');
        return physicsManager.getGravity();
    }

    onDestroy(gameObject, api) {
        const physicsManager = require('../PhysicsManager');
        physicsManager.unregisterRigidbody(gameObject);
        api.log(`[Rigidbody2D] Destroyed for ${gameObject.name}`);
    }
}

module.exports = Rigidbody2D;
