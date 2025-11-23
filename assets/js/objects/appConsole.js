/**
 * Application Console - Intercepts console.log/warn/error and displays in UI
 */

const appConsole = {
    maxLogs: 1000, // Maximum number of logs to keep
    currentFilter: 'all', // Current filter: all, log, warn, error

    // Store original console methods
    _originalLog: console.log,
    _originalWarn: console.warn,
    _originalError: console.error,

    /**
     * Initialize the console
     */
    init() {
        // Intercept console methods
        this.interceptConsole();

        // Wire up controls
        this.wireControls();

        // Add welcome message
        this.log('AJS Develop Console initialized');
    },

    /**
     * Intercept console.log, console.warn, console.error
     */
    interceptConsole() {
        const self = this;

        // Intercept console.log
        console.log = function(...args) {
            self._originalLog.apply(console, args);
            self.addMessage('log', args);
        };

        // Intercept console.warn
        console.warn = function(...args) {
            self._originalWarn.apply(console, args);
            self.addMessage('warn', args);
        };

        // Intercept console.error
        console.error = function(...args) {
            self._originalError.apply(console, args);
            self.addMessage('error', args);
        };
    },

    /**
     * Add a message to the console UI
     */
    addMessage(type, args) {
        const container = document.getElementById('consoleMessages');
        if (!container) return;

        // Convert args to string
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        // Create message element
        const logItem = document.createElement('div');
        logItem.className = `console-message console-${type}`;
        logItem.setAttribute('data-type', type);

        // Get timestamp
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-US', { hour12: false });

        // Get icon
        let icon = 'ri-information-line';
        if (type === 'warn') icon = 'ri-error-warning-line';
        if (type === 'error') icon = 'ri-close-circle-line';

        logItem.innerHTML = `
            <span class="console-timestamp">[${timestamp}]</span>
            <span class="console-icon"><i class="${icon}"></i></span>
            <span class="console-text">${this.escapeHTML(message)}</span>
        `;

        // Add to container
        container.appendChild(logItem);

        // Apply current filter
        if (this.currentFilter !== 'all' && this.currentFilter !== type) {
            logItem.style.display = 'none';
        }

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Limit number of messages
        while (container.children.length > this.maxLogs) {
            container.removeChild(container.firstChild);
        }
    },

    /**
     * Direct log methods (bypass interception)
     */
    log(...args) {
        this.addMessage('log', args);
    },

    warn(...args) {
        this.addMessage('warn', args);
    },

    error(...args) {
        this.addMessage('error', args);
    },

    /**
     * Clear all messages
     */
    clear() {
        const container = document.getElementById('consoleMessages');
        if (container) {
            container.innerHTML = '';
            this.log('Console cleared');
        }
    },

    /**
     * Set filter
     */
    setFilter(filter) {
        this.currentFilter = filter;
        const container = document.getElementById('consoleMessages');
        if (!container) return;

        const messages = container.querySelectorAll('.console-message');
        messages.forEach(msg => {
            const type = msg.getAttribute('data-type');
            if (filter === 'all' || filter === type) {
                msg.style.display = 'flex';
            } else {
                msg.style.display = 'none';
            }
        });

        // Update button states
        document.querySelectorAll('.consoleFilterBtn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    },

    /**
     * Wire up controls
     */
    wireControls() {
        // Clear button
        const clearBtn = document.getElementById('consoleClearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clear();
            });
        }

        // Filter buttons
        const filterBtns = document.querySelectorAll('.consoleFilterBtn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                this.setFilter(filter);
            });
        });
    },

    /**
     * Escape HTML
     */
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

module.exports = appConsole;
