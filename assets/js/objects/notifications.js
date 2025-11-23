/**
 * Notification System for AJS Develop
 * Provides toast notifications, loading spinners, and progress bars
 */

module.exports = {
    toastContainer: null,
    activeToasts: [],
    maxToasts: 5,

    /**
     * Initialize notification system
     */
    init() {
        // Create toast container if it doesn't exist
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }
    },

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'info', 'success', 'warning', 'error'
     * @param {number} duration - Duration in ms (0 = persistent)
     */
    toast(message, type = 'info', duration = 3000) {
        this.init();

        // Limit number of toasts
        if (this.activeToasts.length >= this.maxToasts) {
            this.removeToast(this.activeToasts[0]);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon based on type
        const iconMap = {
            info: 'ri-information-line',
            success: 'ri-checkbox-circle-line',
            warning: 'ri-error-warning-line',
            error: 'ri-close-circle-line'
        };

        toast.innerHTML = `
            <i class="${iconMap[type]}"></i>
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="ri-close-line"></i>
            </button>
        `;

        // Add to container
        this.toastContainer.appendChild(toast);
        this.activeToasts.push(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        // Auto-remove if duration specified
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        return toast;
    },

    /**
     * Remove a toast
     */
    removeToast(toast) {
        if (!toast) return;

        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');

        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            const index = this.activeToasts.indexOf(toast);
            if (index > -1) {
                this.activeToasts.splice(index, 1);
            }
        }, 300);
    },

    /**
     * Show info toast
     */
    info(message, duration = 3000) {
        return this.toast(message, 'info', duration);
    },

    /**
     * Show success toast
     */
    success(message, duration = 3000) {
        return this.toast(message, 'success', duration);
    },

    /**
     * Show warning toast
     */
    warning(message, duration = 4000) {
        return this.toast(message, 'warning', duration);
    },

    /**
     * Show error toast
     */
    error(message, duration = 5000) {
        return this.toast(message, 'error', duration);
    },

    /**
     * Show loading spinner
     * @param {string} message - Loading message
     * @returns {Object} Loading instance with hide() method
     */
    loading(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-message">${this.escapeHtml(message)}</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        setTimeout(() => {
            overlay.classList.add('loading-show');
        }, 10);

        return {
            hide: () => {
                overlay.classList.remove('loading-show');
                setTimeout(() => {
                    if (overlay.parentElement) {
                        overlay.parentElement.removeChild(overlay);
                    }
                }, 300);
            },
            updateMessage: (newMessage) => {
                const msgElem = overlay.querySelector('.loading-message');
                if (msgElem) {
                    msgElem.textContent = newMessage;
                }
            }
        };
    },

    /**
     * Show progress bar
     * @param {string} title - Progress title
     * @returns {Object} Progress instance with update() and hide() methods
     */
    progress(title = 'Progress') {
        const overlay = document.createElement('div');
        overlay.className = 'progress-overlay';
        overlay.innerHTML = `
            <div class="progress-container">
                <div class="progress-title">${this.escapeHtml(title)}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text">0%</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        setTimeout(() => {
            overlay.classList.add('progress-show');
        }, 10);

        const fillElem = overlay.querySelector('.progress-fill');
        const textElem = overlay.querySelector('.progress-text');

        return {
            update: (percent, message = null) => {
                const clampedPercent = Math.max(0, Math.min(100, percent));
                fillElem.style.width = clampedPercent + '%';

                if (message) {
                    textElem.textContent = message;
                } else {
                    textElem.textContent = Math.round(clampedPercent) + '%';
                }
            },
            hide: () => {
                overlay.classList.remove('progress-show');
                setTimeout(() => {
                    if (overlay.parentElement) {
                        overlay.parentElement.removeChild(overlay);
                    }
                }, 300);
            }
        };
    },

    /**
     * Show confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Object} options - Options {confirmText, cancelText, type}
     * @returns {Promise<boolean>} True if confirmed
     */
    confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const {
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                type = 'warning' // 'info', 'warning', 'danger'
            } = options;

            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-header">
                        <h3>${this.escapeHtml(title)}</h3>
                    </div>
                    <div class="confirm-body">
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                    <div class="confirm-footer">
                        <button class="btn btn-secondary confirm-cancel">${this.escapeHtml(cancelText)}</button>
                        <button class="btn btn-${type} confirm-ok">${this.escapeHtml(confirmText)}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Animate in
            setTimeout(() => {
                overlay.classList.add('confirm-show');
            }, 10);

            const hide = (result) => {
                overlay.classList.remove('confirm-show');
                setTimeout(() => {
                    if (overlay.parentElement) {
                        overlay.parentElement.removeChild(overlay);
                    }
                }, 300);
                resolve(result);
            };

            // Event listeners
            overlay.querySelector('.confirm-ok').addEventListener('click', () => hide(true));
            overlay.querySelector('.confirm-cancel').addEventListener('click', () => hide(false));

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    hide(false);
                }
            });

            // ESC to cancel
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    hide(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
