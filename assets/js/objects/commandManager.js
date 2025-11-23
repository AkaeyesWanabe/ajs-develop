/**
 * Command Manager - Implements Undo/Redo functionality using Command Pattern
 */

const notifications = nw.require('./assets/js/objects/notifications');

module.exports = {
    undoStack: [],
    redoStack: [],
    maxStackSize: 50, // Limit history to prevent memory issues

    /**
     * Execute a command and add it to the undo stack
     */
    execute(command) {
        if (!command || typeof command.execute !== 'function') {
            console.error('Invalid command:', command);
            return false;
        }

        try {
            command.execute();
            this.undoStack.push(command);

            // Clear redo stack when a new command is executed
            this.redoStack = [];

            // Limit stack size
            if (this.undoStack.length > this.maxStackSize) {
                this.undoStack.shift();
            }

            console.log('[COMMAND] Executed:', command.name || 'Unknown');
            return true;
        } catch (error) {
            console.error('[COMMAND] Execution failed:', error);
            notifications.error(`Failed to execute command: ${error.message}`);
            return false;
        }
    },

    /**
     * Undo the last command
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('[COMMAND] Nothing to undo');
            notifications.info('Nothing to undo');
            return false;
        }

        const command = this.undoStack.pop();

        if (typeof command.undo !== 'function') {
            console.error('[COMMAND] Command does not support undo:', command);
            notifications.error('This command cannot be undone');
            return false;
        }

        try {
            command.undo();
            this.redoStack.push(command);

            console.log('[COMMAND] Undone:', command.name || 'Unknown');
            notifications.success(`Undone: ${command.name || 'action'}`);
            return true;
        } catch (error) {
            console.error('[COMMAND] Undo failed:', error);
            notifications.error(`Failed to undo: ${error.message}`);
            return false;
        }
    },

    /**
     * Redo the last undone command
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('[COMMAND] Nothing to redo');
            notifications.info('Nothing to redo');
            return false;
        }

        const command = this.redoStack.pop();

        try {
            command.execute();
            this.undoStack.push(command);

            console.log('[COMMAND] Redone:', command.name || 'Unknown');
            notifications.success(`Redone: ${command.name || 'action'}`);
            return true;
        } catch (error) {
            console.error('[COMMAND] Redo failed:', error);
            notifications.error(`Failed to redo: ${error.message}`);
            return false;
        }
    },

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('[COMMAND] History cleared');
    },

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.undoStack.length > 0;
    },

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    },

    /**
     * Get undo stack size
     */
    getUndoCount() {
        return this.undoStack.length;
    },

    /**
     * Get redo stack size
     */
    getRedoCount() {
        return this.redoStack.length;
    }
};
