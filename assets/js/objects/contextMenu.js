/**
 * ContextMenu - Custom Context Menu System
 * Replaces default browser context menu with custom menus
 */

class ContextMenu {
    constructor() {
        this.activeMenu = null;
        this.menuContainer = null;
        this.init();
    }

    init() {
        // Create menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'contextMenuContainer';
        this.menuContainer.className = 'context-menu';
        document.body.appendChild(this.menuContainer);

        // Hide menu on click outside
        document.addEventListener('click', (e) => {
            if (!this.menuContainer.contains(e.target)) {
                this.hide();
            }
        });

        // Hide menu on scroll
        document.addEventListener('scroll', () => this.hide(), true);

        // Hide menu on window resize
        window.addEventListener('resize', () => this.hide());
    }

    /**
     * Show context menu
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Array} items - Menu items array
     */
    show(x, y, items) {
        this.hide(); // Hide any existing menu

        if (!items || items.length === 0) return;

        // Build menu HTML
        this.menuContainer.innerHTML = this.buildMenuHTML(items);

        // Position menu
        this.menuContainer.style.left = x + 'px';
        this.menuContainer.style.top = y + 'px';
        this.menuContainer.style.display = 'block';

        // Adjust position if menu goes off screen
        setTimeout(() => {
            this.adjustMenuPosition(this.menuContainer, x, y);
            this.initSubmenuPositioning();
        }, 0);

        this.activeMenu = this.menuContainer;
    }

    /**
     * Adjust menu position to keep it within viewport
     * @param {HTMLElement} menu - Menu element
     * @param {number} x - Original X position
     * @param {number} y - Original Y position
     */
    adjustMenuPosition(menu, x, y) {
        const rect = menu.getBoundingClientRect();
        const padding = 8; // Padding from viewport edges
        let newX = x;
        let newY = y;

        // Check right edge
        if (rect.right > window.innerWidth - padding) {
            newX = window.innerWidth - rect.width - padding;
        }

        // Check left edge
        if (newX < padding) {
            newX = padding;
        }

        // Check bottom edge
        if (rect.bottom > window.innerHeight - padding) {
            newY = window.innerHeight - rect.height - padding;
        }

        // Check top edge
        if (newY < padding) {
            newY = padding;
        }

        menu.style.left = newX + 'px';
        menu.style.top = newY + 'px';
    }

    /**
     * Initialize smart positioning for all submenus
     */
    initSubmenuPositioning() {
        const submenus = this.menuContainer.querySelectorAll('.context-menu-submenu');

        submenus.forEach(submenu => {
            const submenuContent = submenu.querySelector('.context-menu-submenu-content');
            if (!submenuContent) return;

            const positionSubmenu = () => {
                // Get parent item position
                const parentRect = submenu.getBoundingClientRect();
                const padding = 8;
                const gap = 4; // Gap between parent and submenu

                // Calculate initial position (right side of parent)
                let left = parentRect.right + gap;
                let top = parentRect.top;

                // Show submenu temporarily to get its dimensions
                const originalDisplay = submenuContent.style.display;
                submenuContent.style.visibility = 'hidden';
                submenuContent.style.display = 'block';

                const submenuRect = submenuContent.getBoundingClientRect();

                // Check if submenu goes off right edge
                if (submenuRect.right > window.innerWidth - padding) {
                    // Position on left side instead
                    left = parentRect.left - submenuRect.width - gap;

                    // If still off screen on left, clamp to padding
                    if (left < padding) {
                        left = padding;
                    }
                }

                // Check if submenu goes off bottom edge
                if (submenuRect.bottom > window.innerHeight - padding) {
                    // Align bottom of submenu with bottom of viewport
                    top = window.innerHeight - submenuRect.height - padding;
                }

                // Check if submenu goes off top edge
                if (top < padding) {
                    top = padding;
                }

                // Apply final position
                submenuContent.style.left = left + 'px';
                submenuContent.style.top = top + 'px';
                submenuContent.style.visibility = 'visible';
                submenuContent.style.display = originalDisplay;
            };

            // Position on mouseenter
            submenu.addEventListener('mouseenter', positionSubmenu);
        });
    }

    /**
     * Build menu HTML from items
     * @param {Array} items - Menu items
     * @returns {string} HTML string
     */
    buildMenuHTML(items) {
        let html = '';

        items.forEach(item => {
            if (item.type === 'separator') {
                html += '<div class="context-menu-separator"></div>';
            } else if (item.type === 'submenu') {
                html += this.buildSubmenuHTML(item);
            } else {
                html += this.buildItemHTML(item);
            }
        });

        return html;
    }

    /**
     * Build single menu item HTML
     * @param {Object} item - Menu item
     * @returns {string} HTML string
     */
    buildItemHTML(item) {
        // Handle category items
        if (item.type === 'category') {
            return `
                <div class="context-menu-category">
                    ${this.escapeHtml(item.label)}
                </div>
            `;
        }

        const disabled = item.disabled ? 'disabled' : '';
        const icon = item.icon ? `<i class="${item.icon}"></i>` : '<span class="context-menu-icon-spacer"></span>';
        const shortcut = item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : '';
        const danger = item.danger ? 'danger' : '';

        return `
            <div class="context-menu-item ${disabled} ${danger}"
                 data-item-id="${item.id}"
                 onclick="${item.disabled ? '' : `contextMenu.handleClick(event)`}">
                ${icon}
                <span class="context-menu-label">${this.escapeHtml(item.label)}</span>
                ${shortcut}
            </div>
        `;
    }

    /**
     * Build submenu HTML
     * @param {Object} item - Submenu item
     * @returns {string} HTML string
     */
    buildSubmenuHTML(item) {
        const icon = item.icon ? `<i class="${item.icon}"></i>` : '<span class="context-menu-icon-spacer"></span>';
        const itemsHTML = this.buildMenuHTML(item.items);

        return `
            <div class="context-menu-item context-menu-submenu">
                ${icon}
                <span class="context-menu-label">${this.escapeHtml(item.label)}</span>
                <i class="ri-arrow-right-s-line context-menu-arrow"></i>
                <div class="context-menu-submenu-content">
                    ${itemsHTML}
                </div>
            </div>
        `;
    }

    /**
     * Handle menu item click
     * @param {string} itemId - Item identifier
     */
    handleClick(itemIdOrEvent) {
        // Handle both cases: direct call with itemId or onclick event
        let itemId;
        if (typeof itemIdOrEvent === 'string') {
            // Called directly with itemId
            itemId = itemIdOrEvent;
        } else if (itemIdOrEvent && itemIdOrEvent.target) {
            // Called from onclick, need to extract itemId from data attribute
            const menuItem = itemIdOrEvent.target.closest('.context-menu-item');
            itemId = menuItem ? menuItem.dataset.itemId : null;
        }

        if (!itemId) {
            console.warn('No itemId found in handleClick');
            return;
        }

        this.hide();

        // Emit custom event with item ID using jQuery for maximum compatibility
        $(document).trigger('contextMenuClick', { itemId: itemId });
    }

    /**
     * Hide context menu
     */
    hide() {
        if (this.menuContainer) {
            this.menuContainer.style.display = 'none';
            this.menuContainer.innerHTML = '';
        }
        this.activeMenu = null;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Register context menu for an element
     * @param {HTMLElement} element - Target element
     * @param {Function|Array} itemsOrCallback - Menu items or callback function
     */
    register(element, itemsOrCallback) {
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const items = typeof itemsOrCallback === 'function'
                ? itemsOrCallback(e)
                : itemsOrCallback;

            if (items && items.length > 0) {
                this.show(e.clientX, e.clientY, items);
            }
        });
    }
}

// Global instance
const contextMenu = new ContextMenu();
