/**
 * CollisionTest - Simple script to test collision system
 *
 * Usage:
 * 1. Attach this script to a GameObject
 * 2. Attach BoxCollider2D or CircleCollider2D to the same GameObject
 * 3. Use arrow keys or WASD to move the object
 * 4. Watch console for collision events
 *
 * @version 1.0.0
 */

class CollisionTest {
    properties = {
        moveSpeed: 200  // pixels per second
    };

    onStart(gameObject, api) {
        console.log(`[CollisionTest] Started on ${gameObject.name}`);
        console.log(`[CollisionTest] Move with arrow keys or WASD`);
    }

    onUpdate(gameObject, deltaTime, api) {
        // Get movement input
        const horizontal = api.input.GetAxisHorizontal();
        const vertical = api.input.GetAxisVertical();

        // Calculate movement based on deltaTime (in seconds)
        const dt = deltaTime / 1000; // Convert ms to seconds
        const moveX = horizontal * this.properties.moveSpeed * dt;
        const moveY = vertical * this.properties.moveSpeed * dt;

        // Apply movement
        if (moveX !== 0 || moveY !== 0) {
            gameObject.properties.x += moveX;
            gameObject.properties.y += moveY;
        }
    }

    onCollisionEnter(otherGameObject) {
        console.log(`[CollisionTest] ${this._gameObject.name} collided with ${otherGameObject.name}!`);
    }

    onCollisionStay(otherGameObject) {
        // Uncomment to see continuous collision
        // console.log(`[CollisionTest] ${this._gameObject.name} still colliding with ${otherGameObject.name}`);
    }

    onCollisionExit(otherGameObject) {
        console.log(`[CollisionTest] ${this._gameObject.name} stopped colliding with ${otherGameObject.name}`);
    }

    onTriggerEnter(otherGameObject) {
        console.log(`[CollisionTest] ${this._gameObject.name} triggered by ${otherGameObject.name}!`);
    }

    onTriggerStay(otherGameObject) {
        // Uncomment to see continuous trigger
        // console.log(`[CollisionTest] ${this._gameObject.name} still in trigger with ${otherGameObject.name}`);
    }

    onTriggerExit(otherGameObject) {
        console.log(`[CollisionTest] ${this._gameObject.name} left trigger of ${otherGameObject.name}`);
    }
}

module.exports = CollisionTest;
