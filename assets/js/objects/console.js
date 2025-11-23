const functions = require("../common/functions");

module.exports = {
    messages: [],
    currentFilter: 'all',
    maxMessages: 1000, // Limit to prevent memory issues
    _originalConsole: {
        log: console.log,
        warn: console.warn,
        error: console.error
    },
    _intercepted: false,

    /**
     * Intercept native console methods
     */
    interceptConsole() {
        if (this._intercepted) return;
        this._intercepted = true;

        const self = this;

        // Intercept console.log
        console.log = function(...args) {
            self._originalConsole.log.apply(console, args);
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg, null, 2); }
                    catch (e) { return String(arg); }
                }
                return String(arg);
            }).join(' ');
            self.log(message, 'log');
        };

        // Intercept console.warn
        console.warn = function(...args) {
            self._originalConsole.warn.apply(console, args);
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg, null, 2); }
                    catch (e) { return String(arg); }
                }
                return String(arg);
            }).join(' ');
            self.log(message, 'warn');
        };

        // Intercept console.error
        console.error = function(...args) {
            self._originalConsole.error.apply(console, args);
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg, null, 2); }
                    catch (e) { return String(arg); }
                }
                return String(arg);
            }).join(' ');
            self.log(message, 'error');
        };
    },

    /**
     * Log a message to the console
     * @param {string} message - Message to log
     * @param {string} type - Type: 'log', 'warn', 'error'
     */
    log(message, type = 'log') {
        const timestamp = new Date();
        const msg = {
            message: String(message),
            type: type,
            timestamp: timestamp,
            timeStr: this.formatTime(timestamp)
        };

        this.messages.push(msg);

        // Limit message count
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        // Add to DOM
        this.addMessageToDOM(msg);

        // Don't log to browser console again (already done by interceptor)
        // This prevents infinite recursion
    },

    /**
     * Log an info message
     */
    info(message) {
        this.log(message, 'log');
    },

    /**
     * Log a warning
     */
    warn(message) {
        this.log(message, 'warn');
    },

    /**
     * Log an error
     */
    error(message) {
        this.log(message, 'error');
    },

    /**
     * Clear all console messages
     */
    clear() {
        this.messages = [];
        const container = document.getElementById('consoleMessages');
        if (container) {
            container.innerHTML = '';
        }
    },

    /**
     * Filter messages by type
     * @param {string} filter - 'all', 'log', 'warn', 'error'
     */
    filter(filterType) {
        this.currentFilter = filterType;

        const messages = document.querySelectorAll('.consoleMessage');
        messages.forEach((msgElem) => {
            const type = msgElem.dataset.type;
            if (filterType === 'all' || type === filterType) {
                msgElem.classList.remove('hidden');
            } else {
                msgElem.classList.add('hidden');
            }
        });
    },

    /**
     * Add a message to the DOM
     */
    addMessageToDOM(msg) {
        const container = document.getElementById('consoleMessages');
        if (!container) return;

        // Create message element using safe DOM creation
        const msgElem = document.createElement('div');
        msgElem.className = `consoleMessage ${msg.type}`;
        msgElem.dataset.type = msg.type;

        // Create icon
        const icon = document.createElement('div');
        icon.className = 'consoleIcon';
        const iconClass = this.getIconClass(msg.type);
        icon.innerHTML = `<i class="${iconClass}"></i>`;

        // Create text content (safe)
        const text = document.createElement('div');
        text.className = 'consoleText';
        text.textContent = msg.message; // Use textContent to prevent XSS

        // Create timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'consoleTimestamp';
        timestamp.textContent = msg.timeStr;

        // Assemble
        msgElem.appendChild(icon);
        msgElem.appendChild(text);
        msgElem.appendChild(timestamp);

        // Apply current filter
        if (this.currentFilter !== 'all' && msg.type !== this.currentFilter) {
            msgElem.classList.add('hidden');
        }

        container.appendChild(msgElem);

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Get icon class for message type
     */
    getIconClass(type) {
        switch (type) {
            case 'warn':
                return 'ri-error-warning-line';
            case 'error':
                return 'ri-close-circle-line';
            case 'log':
            default:
                return 'ri-information-line';
        }
    },

    /**
     * Format timestamp
     */
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * Export console logs to file
     */
    export() {
        const content = this.messages.map(msg => {
            return `[${msg.timeStr}] [${msg.type.toUpperCase()}] ${msg.message}`;
        }).join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-log-${Date.now()}.txt`;
        a.click();

        URL.revokeObjectURL(url);
    }
};
