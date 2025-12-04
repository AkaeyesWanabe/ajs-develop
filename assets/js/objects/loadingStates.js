/**
 * Loading States Manager
 * Provides loading indicators, spinners, and progress bars
 */

module.exports = {
    overlayElement: null,

    /**
     * Initialize loading states system
     */
    init() {
        // Create overlay element
        this.overlayElement = document.createElement('div');
        this.overlayElement.className = 'loading-overlay hidden';
        this.overlayElement.innerHTML = `
            <div class="loading-overlay-content">
                <div class="loading-spinner large"></div>
                <div class="loading-overlay-text"></div>
                <div class="loading-progress" style="display: none; width: 250px;">
                    <div class="loading-progress-bar"></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlayElement);

    },

    /**
     * Show loading overlay with optional message
     * @param {string} message - Loading message to display
     * @param {boolean} showProgress - Show progress bar
     */
    show(message = 'Loading...', showProgress = false) {
        if (!this.overlayElement) this.init();

        const textElement = this.overlayElement.querySelector('.loading-overlay-text');
        const progressElement = this.overlayElement.querySelector('.loading-progress');
        const progressBar = this.overlayElement.querySelector('.loading-progress-bar');

        textElement.textContent = message;

        if (showProgress) {
            progressElement.style.display = 'block';
            progressBar.classList.add('indeterminate');
        } else {
            progressElement.style.display = 'none';
        }

        this.overlayElement.classList.remove('hidden');
    },

    /**
     * Update loading progress
     * @param {number} percent - Progress percentage (0-100)
     * @param {string} message - Optional message to update
     */
    updateProgress(percent, message = null) {
        if (!this.overlayElement) return;

        const textElement = this.overlayElement.querySelector('.loading-overlay-text');
        const progressBar = this.overlayElement.querySelector('.loading-progress-bar');

        if (message) {
            textElement.textContent = message;
        }

        progressBar.classList.remove('indeterminate');
        progressBar.style.width = percent + '%';
    },

    /**
     * Hide loading overlay
     */
    hide() {
        if (!this.overlayElement) return;

        this.overlayElement.classList.add('hidden');

        // Reset progress bar
        const progressBar = this.overlayElement.querySelector('.loading-progress-bar');
        progressBar.classList.remove('indeterminate');
        progressBar.style.width = '0%';
    },

    /**
     * Create an inline spinner
     * @param {string} size - Size: 'small', 'medium', 'large'
     * @returns {HTMLElement} Spinner element
     */
    createSpinner(size = 'medium') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        if (size === 'small') spinner.classList.add('small');
        if (size === 'large') spinner.classList.add('large');
        return spinner;
    },

    /**
     * Show button loading state
     * @param {HTMLElement} button - Button element
     */
    setButtonLoading(button) {
        if (!button) return;
        button.classList.add('loading');
        button.disabled = true;
    },

    /**
     * Remove button loading state
     * @param {HTMLElement} button - Button element
     */
    removeButtonLoading(button) {
        if (!button) return;
        button.classList.remove('loading');
        button.disabled = false;
    },

    /**
     * Execute async function with loading indicator
     * @param {Function} asyncFn - Async function to execute
     * @param {string} message - Loading message
     * @param {boolean} showProgress - Show progress bar
     * @returns {Promise} Result of async function
     */
    async withLoading(asyncFn, message = 'Loading...', showProgress = false) {
        this.show(message, showProgress);
        try {
            const result = await asyncFn();
            return result;
        } finally {
            this.hide();
        }
    },

    /**
     * Execute async function with button loading state
     * @param {HTMLElement} button - Button element
     * @param {Function} asyncFn - Async function to execute
     * @returns {Promise} Result of async function
     */
    async withButtonLoading(button, asyncFn) {
        this.setButtonLoading(button);
        try {
            const result = await asyncFn();
            return result;
        } finally {
            this.removeButtonLoading(button);
        }
    }
};
