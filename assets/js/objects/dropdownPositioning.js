/**
 * Dropdown Positioning Utility
 * Ensures all dropdowns and submenus stay within viewport
 */

class DropdownPositioning {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDropdowns());
        } else {
            this.setupDropdowns();
        }

        // Reposition on window resize
        window.addEventListener('resize', () => this.repositionAllVisibleDropdowns());
    }

    setupDropdowns() {
        // Find all workspace menu items
        const menuItems = document.querySelectorAll('.workspaceMenuItem');

        menuItems.forEach(menuItem => {
            menuItem.addEventListener('mouseenter', () => {
                setTimeout(() => {
                    const submenu = menuItem.querySelector('.workspaceSubMenu');
                    if (submenu && getComputedStyle(submenu).display !== 'none') {
                        this.adjustDropdownPosition(submenu, menuItem);
                    }
                }, 10);
            });
        });

        console.log('[DropdownPositioning] Initialized for', menuItems.length, 'menu items');
    }

    /**
     * Adjust dropdown position to keep it within viewport
     * @param {HTMLElement} dropdown - Dropdown element
     * @param {HTMLElement} trigger - Trigger element
     */
    adjustDropdownPosition(dropdown, trigger) {
        const rect = dropdown.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        const padding = 8;

        // Reset inline styles for recalculation
        dropdown.style.left = '';
        dropdown.style.right = '';
        dropdown.style.top = '';
        dropdown.style.bottom = '';
        dropdown.style.transform = '';

        // Get updated position
        const newRect = dropdown.getBoundingClientRect();

        // Check right edge overflow
        if (newRect.right > window.innerWidth - padding) {
            // Position on left side of trigger instead
            const leftPosition = triggerRect.left - newRect.width;
            if (leftPosition > padding) {
                dropdown.style.left = '0';
                dropdown.style.right = 'auto';
            } else {
                // If it doesn't fit on left either, align to right edge of viewport
                dropdown.style.left = 'auto';
                dropdown.style.right = padding + 'px';
                dropdown.style.position = 'fixed';
            }
        }

        // Check left edge overflow
        if (newRect.left < padding && dropdown.style.left !== 'auto') {
            dropdown.style.left = padding + 'px';
            dropdown.style.position = 'fixed';
        }

        // Check bottom edge overflow
        if (newRect.bottom > window.innerHeight - padding) {
            // Try to position above trigger
            const spaceAbove = triggerRect.top;
            const spaceBelow = window.innerHeight - triggerRect.bottom;

            if (spaceAbove > spaceBelow && spaceAbove > newRect.height) {
                // Position above
                dropdown.style.top = 'auto';
                dropdown.style.bottom = '100%';
                dropdown.style.marginTop = '0';
                dropdown.style.marginBottom = 'var(--space-1-5)';
            } else {
                // Keep below but adjust to fit
                const maxHeight = window.innerHeight - triggerRect.bottom - padding * 2;
                dropdown.style.maxHeight = maxHeight + 'px';
            }
        }

        // Check top edge overflow
        const finalRect = dropdown.getBoundingClientRect();
        if (finalRect.top < padding) {
            dropdown.style.top = padding + 'px';
            dropdown.style.position = 'fixed';
        }
    }

    /**
     * Reposition all currently visible dropdowns
     */
    repositionAllVisibleDropdowns() {
        const visibleDropdowns = document.querySelectorAll('.workspaceSubMenu');

        visibleDropdowns.forEach(dropdown => {
            if (getComputedStyle(dropdown).display !== 'none') {
                const menuItem = dropdown.closest('.workspaceMenuItem');
                if (menuItem) {
                    this.adjustDropdownPosition(dropdown, menuItem);
                }
            }
        });
    }

    /**
     * Static utility: Adjust any element position to stay in viewport
     * @param {HTMLElement} element - Element to position
     * @param {number} x - Desired X position
     * @param {number} y - Desired Y position
     * @returns {object} Adjusted {x, y} position
     */
    static adjustPosition(element, x, y) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        let newX = x;
        let newY = y;

        // Check right edge
        if (x + rect.width > window.innerWidth - padding) {
            newX = window.innerWidth - rect.width - padding;
        }

        // Check left edge
        if (newX < padding) {
            newX = padding;
        }

        // Check bottom edge
        if (y + rect.height > window.innerHeight - padding) {
            newY = window.innerHeight - rect.height - padding;
        }

        // Check top edge
        if (newY < padding) {
            newY = padding;
        }

        return { x: newX, y: newY };
    }
}

// Global instance
const dropdownPositioning = new DropdownPositioning();

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dropdownPositioning;
}
