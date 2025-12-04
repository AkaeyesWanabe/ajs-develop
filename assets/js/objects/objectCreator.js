/**
 * Object Creator Modal - Redesigned for 500+ Extensions
 * Modern, performant modal interface with pagination, search, and multiple view modes
 */

const objectFactory = nw.require('./assets/js/objects/objectFactory');
const objectPlacer = nw.require('./assets/js/objects/objectPlacer');
const layerManager = nw.require('./assets/js/objects/layerManager');
const notifications = nw.require('./assets/js/objects/notifications');
const functions = nw.require('./assets/js/common/functions');

module.exports = {
    // Modal state
    isOpen: false,
    selectedExtension: null,
    currentCategory: 'All',
    searchQuery: '',
    currentView: 'grid', // 'grid' or 'list'
    currentSort: 'name-asc', // 'name-asc', 'name-desc', 'category-asc', 'recent'

    // Pagination
    currentPage: 1,
    itemsPerPage: 50, // Optimized for 500+ extensions

    // Cache
    allExtensions: [],
    categories: [],
    recentlyUsed: [], // Track recently used extensions

    /**
     * Initialize the object creator modal
     */
    init() {

        // Load modal HTML into the app
        this.loadModalHTML();

        // Bind event listeners
        this.bindEvents();

        // Load recently used from localStorage
        this.loadRecentlyUsed();
    },

    /**
     * Load modal HTML into the application
     */
    loadModalHTML() {
        const fs = require('fs');
        const path = require('path');

        try {
            // Use __dirname or relative path for NW.js
            const modalPath = './views/objectCreator.html';
            const modalHTML = fs.readFileSync(modalPath, 'utf8');


            // Inject modal into body if not already present
            if (!document.getElementById('objectCreatorModal')) {
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            } else {
            }
        } catch (err) {
            console.error('[ObjectCreator] Failed to load modal HTML:', err);
        }
    },

    /**
     * Load recently used extensions from localStorage
     */
    loadRecentlyUsed() {
        try {
            const stored = localStorage.getItem('objectCreator_recentlyUsed');
            if (stored) {
                this.recentlyUsed = JSON.parse(stored);
            }
        } catch (err) {
            console.warn('[ObjectCreator] Failed to load recently used:', err);
            this.recentlyUsed = [];
        }
    },

    /**
     * Save recently used extensions to localStorage
     */
    saveRecentlyUsed() {
        try {
            localStorage.setItem('objectCreator_recentlyUsed', JSON.stringify(this.recentlyUsed));
        } catch (err) {
            console.warn('[ObjectCreator] Failed to save recently used:', err);
        }
    },

    /**
     * Add extension to recently used list
     */
    addToRecentlyUsed(extensionId) {
        // Remove if already exists
        this.recentlyUsed = this.recentlyUsed.filter(id => id !== extensionId);

        // Add to front
        this.recentlyUsed.unshift(extensionId);

        // Keep only last 20
        this.recentlyUsed = this.recentlyUsed.slice(0, 20);

        // Save to localStorage
        this.saveRecentlyUsed();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const $self = this;

        // Close buttons
        $(document).on('click', '#objectCreatorClose, #objectCreatorCancel', function() {
            $self.close();
        });

        // Click outside modal to close
        $(document).on('click', '#objectCreatorModal', function(e) {
            if (e.target.id === 'objectCreatorModal') {
                $self.close();
            }
        });

        // ESC key to close
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape' && $self.isOpen) {
                $self.close();
            }
        });

        // Search input with debounce
        let searchTimeout;
        $(document).on('input', '#objectCreatorSearch', function() {
            const value = $(this).val();

            // Show/hide clear button
            $('#objectCreatorSearchClear').toggle(value.length > 0);

            // Debounce search
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                $self.searchQuery = value.toLowerCase();
                $self.currentPage = 1; // Reset to first page
                $self.filterAndRenderObjects();
            }, 300);
        });

        // Search clear button
        $(document).on('click', '#objectCreatorSearchClear', function() {
            $('#objectCreatorSearch').val('').trigger('input').focus();
        });

        // Category pills
        $(document).on('click', '.category-pill', function() {
            const category = $(this).data('category');
            $self.currentCategory = category;
            $self.currentPage = 1; // Reset to first page

            // Update active pill
            $('.category-pill').removeClass('active');
            $(this).addClass('active');

            // Filter objects
            $self.filterAndRenderObjects();
        });

        // View toggle buttons
        $(document).on('click', '.view-control-btn', function() {
            const view = $(this).data('view');
            $self.currentView = view;

            // Update active button
            $('.view-control-btn').removeClass('active');
            $(this).addClass('active');

            // Update container class
            const $container = $('#objectCreatorContainer');
            if (view === 'grid') {
                $container.removeClass('list-view').addClass('grid-view');
            } else {
                $container.removeClass('grid-view').addClass('list-view');
            }

            // Re-render with new structure
            $self.filterAndRenderObjects();
        });

        // Sort dropdown
        $(document).on('change', '#objectCreatorSort', function() {
            $self.currentSort = $(this).val();
            $self.currentPage = 1; // Reset to first page
            $self.filterAndRenderObjects();
        });

        // Object item clicks
        $(document).on('click', '.object-item', function() {
            const extensionId = $(this).data('extension-id');
            $self.selectExtension(extensionId);
        });

        // Object item double-click to create immediately
        $(document).on('dblclick', '.object-item', function() {
            const extensionId = $(this).data('extension-id');
            $self.selectExtension(extensionId);
            $self.createObject();
        });

        // Create button
        $(document).on('click', '#objectCreatorCreate', function() {
            if (!$(this).prop('disabled')) {
                $self.createObject();
            }
        });

        // Pagination buttons
        $(document).on('click', '#paginationPrev', function() {
            if ($self.currentPage > 1) {
                $self.currentPage--;
                $self.filterAndRenderObjects();
                $('#objectCreatorContainer').scrollTop(0);
            }
        });

        $(document).on('click', '#paginationNext', function() {
            const filteredExtensions = $self.getFilteredExtensions();
            const totalPages = Math.ceil(filteredExtensions.length / $self.itemsPerPage);

            if ($self.currentPage < totalPages) {
                $self.currentPage++;
                $self.filterAndRenderObjects();
                $('#objectCreatorContainer').scrollTop(0);
            }
        });
    },

    /**
     * Open the modal
     */
    open() {

        // Check if modal exists in DOM
        const modalElement = document.getElementById('objectCreatorModal');
        if (!modalElement) {
            console.error('[ObjectCreator] Modal element not found in DOM! Trying to reload...');
            this.loadModalHTML();

            // Check again
            const retryModal = document.getElementById('objectCreatorModal');
            if (!retryModal) {
                console.error('[ObjectCreator] Failed to load modal HTML');
                return;
            }
        }

        // Load available extensions
        this.loadExtensions();

        // Show modal (use css to set display: flex instead of fadeIn's default block)
        $('#objectCreatorModal').css('display', 'flex').hide().fadeIn(200);
        this.isOpen = true;

        // Reset state
        this.selectedExtension = null;
        this.currentCategory = 'All';
        this.searchQuery = '';
        this.currentPage = 1;
        $('#objectCreatorSearch').val('');
        $('#objectCreatorSearchClear').hide();
        $('#objectCreatorCreate').prop('disabled', true);

        // Populate UI
        this.populateCategories();
        this.filterAndRenderObjects();
        this.updateObjectCount();


        // Focus search input
        setTimeout(() => {
            $('#objectCreatorSearch').focus();
        }, 250);
    },

    /**
     * Close the modal
     */
    close() {

        $('#objectCreatorModal').fadeOut(200);
        this.isOpen = false;
        this.selectedExtension = null;
    },

    /**
     * Load available extensions from objectFactory
     */
    loadExtensions() {
        this.allExtensions = [];
        this.categories = ['All'];

        if (!objectFactory.availableExtensions) {
            console.warn('[ObjectCreator] No extensions available');
            return;
        }

        // Get all extensions
        objectFactory.availableExtensions.forEach(ext => {
            // Skip internal extensions that shouldn't be created directly
            if (ext.id && ext.id.startsWith('internal/')) {
                return;
            }

            this.allExtensions.push({
                id: ext.id,
                name: ext.name || 'Unnamed Object',
                category: ext.category || 'Other',
                description: ext.description || '',
                icon: ext.icon || null,
                data: ext.data
            });

            // Debug icon paths
            if (ext.icon) {
            } else {
            }

            // Collect unique categories
            const category = ext.category || 'Other';
            if (!this.categories.includes(category)) {
                this.categories.push(category);
            }
        });

        // Sort categories (All first, then alphabetically)
        this.categories.sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return a.localeCompare(b);
        });

    },

    /**
     * Update object count display
     */
    updateObjectCount() {
        const count = this.allExtensions.length;
        $('#objectCreatorCount').text(`${count} object${count !== 1 ? 's' : ''}`);
    },

    /**
     * Populate category pills with counts
     */
    populateCategories() {
        const $pills = $('#objectCreatorCategories');
        $pills.empty();

        this.categories.forEach(category => {
            // Count objects in this category
            let count;
            if (category === 'All') {
                count = this.allExtensions.length;
            } else {
                count = this.allExtensions.filter(ext => ext.category === category).length;
            }

            const isActive = category === this.currentCategory ? 'active' : '';
            const $pill = $(`
                <button class="category-pill ${isActive}" data-category="${functions.escapeAttr(category)}">
                    ${functions.escapeHtml(category)}
                    <span class="category-pill-count">${count}</span>
                </button>
            `);
            $pills.append($pill);
        });
    },

    /**
     * Get filtered extensions based on category and search
     */
    getFilteredExtensions() {
        let filtered = this.allExtensions;

        // Filter by category
        if (this.currentCategory !== 'All') {
            filtered = filtered.filter(ext => ext.category === this.currentCategory);
        }

        // Filter by search query
        if (this.searchQuery) {
            filtered = filtered.filter(ext => {
                const searchText = (ext.name + ' ' + ext.description).toLowerCase();
                return searchText.includes(this.searchQuery);
            });
        }

        // Sort
        filtered = this.sortExtensions(filtered);

        return filtered;
    },

    /**
     * Sort extensions based on current sort option
     */
    sortExtensions(extensions) {
        const sorted = [...extensions];

        switch (this.currentSort) {
            case 'name-asc':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;

            case 'name-desc':
                sorted.sort((a, b) => b.name.localeCompare(a.name));
                break;

            case 'category-asc':
                sorted.sort((a, b) => {
                    const catCompare = a.category.localeCompare(b.category);
                    if (catCompare !== 0) return catCompare;
                    return a.name.localeCompare(b.name);
                });
                break;

            case 'recent':
                // Sort by recently used, then by name
                sorted.sort((a, b) => {
                    const aIndex = this.recentlyUsed.indexOf(a.id);
                    const bIndex = this.recentlyUsed.indexOf(b.id);

                    // Both in recently used
                    if (aIndex !== -1 && bIndex !== -1) {
                        return aIndex - bIndex;
                    }
                    // Only a is recent
                    if (aIndex !== -1) return -1;
                    // Only b is recent
                    if (bIndex !== -1) return 1;
                    // Neither recent, sort by name
                    return a.name.localeCompare(b.name);
                });
                break;
        }

        return sorted;
    },

    /**
     * Filter and render objects with pagination
     */
    filterAndRenderObjects() {
        const filtered = this.getFilteredExtensions();

        // Calculate pagination
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = filtered.slice(startIndex, endIndex);

        // Render current page
        this.renderObjects(pageItems, filtered.length);

        // Update pagination controls
        this.updatePagination(totalPages, filtered.length);
    },

    /**
     * Update pagination controls
     */
    updatePagination(totalPages, totalItems) {
        const $pagination = $('#objectCreatorPagination');

        if (totalPages <= 1) {
            // Hide pagination if only one page
            $pagination.hide();
        } else {
            $pagination.show();

            // Update pagination info
            const startItem = ((this.currentPage - 1) * this.itemsPerPage) + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
            $('#paginationInfo').text(`${startItem}-${endItem} of ${totalItems}`);

            // Update button states
            $('#paginationPrev').prop('disabled', this.currentPage === 1);
            $('#paginationNext').prop('disabled', this.currentPage === totalPages);
        }
    },

    /**
     * Render objects in the container
     */
    renderObjects(extensions, totalCount) {
        const $container = $('#objectCreatorContainer');
        const $empty = $('#objectCreatorEmpty');

        $container.empty();

        if (extensions.length === 0) {
            // Show empty state
            $container.hide();
            $empty.show();
            return;
        }

        // Hide empty state
        $empty.hide();
        $container.show();

        // Render each extension
        extensions.forEach(ext => {
            const isSelected = this.selectedExtension === ext.id ? 'selected' : '';

            // Determine icon display
            let iconHTML = '';
            if (ext.icon) {
                // Use custom icon image with error handling
                const defaultIcon = this.getDefaultIcon(ext.category);
                iconHTML = `<img src="${functions.escapeAttr(ext.icon)}"
                                 alt="${functions.escapeAttr(ext.name)}"
                                 onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'${defaultIcon}\\'></i>';" />`;
            } else {
                // Use default icon based on category
                const defaultIcon = this.getDefaultIcon(ext.category);
                iconHTML = `<i class="${defaultIcon}"></i>`;
            }

            // Generate HTML based on view mode
            let itemHTML;
            if (this.currentView === 'list') {
                // List view has object-item-info wrapper
                itemHTML = `
                    <div class="object-item ${isSelected}" data-extension-id="${functions.escapeAttr(ext.id)}">
                        <div class="object-item-icon">
                            ${iconHTML}
                        </div>
                        <div class="object-item-info">
                            <div class="object-item-name">${functions.escapeHtml(ext.name)}</div>
                            <div class="object-item-description">${functions.escapeHtml(ext.description)}</div>
                        </div>
                    </div>
                `;
            } else {
                // Grid view has no wrapper
                itemHTML = `
                    <div class="object-item ${isSelected}" data-extension-id="${functions.escapeAttr(ext.id)}">
                        <div class="object-item-icon">
                            ${iconHTML}
                        </div>
                        <div class="object-item-name">${functions.escapeHtml(ext.name)}</div>
                        <div class="object-item-description">${functions.escapeHtml(ext.description)}</div>
                    </div>
                `;
            }

            $container.append($(itemHTML));
        });
    },

    /**
     * Get default icon for a category
     */
    getDefaultIcon(category) {
        const iconMap = {
            'Visual': 'ri-image-line',
            'UI': 'ri-layout-line',
            'Interactive': 'ri-cursor-line',
            'Logic': 'ri-code-line',
            'Audio': 'ri-volume-up-line',
            'Other': 'ri-apps-line'
        };

        return iconMap[category] || 'ri-apps-line';
    },

    /**
     * Select an extension
     */
    selectExtension(extensionId) {

        this.selectedExtension = extensionId;

        // Update UI
        $('.object-item').removeClass('selected');
        $(`.object-item[data-extension-id="${extensionId}"]`).addClass('selected');

        // Enable create button
        $('#objectCreatorCreate').prop('disabled', false);

        // Update info text
        const ext = this.allExtensions.find(e => e.id === extensionId);
        if (ext) {
            $('#objectCreatorInfo').text(`Create ${ext.name} in the scene`);
        }
    },

    /**
     * Create the selected object
     */
    createObject() {

        if (!this.selectedExtension) {
            console.warn('[ObjectCreator] No extension selected!');
            notifications.warning('Please select an object type');
            return;
        }

        // IMPORTANT: Save extension ID before closing modal (close() resets selectedExtension to null)
        const extensionId = this.selectedExtension;


        // Check if objectPlacer is available

        // Add to recently used
        this.addToRecentlyUsed(extensionId);

        // Get current selected layer
        const currentLayer = layerManager.selectedLayer || 0;

        // Close modal (this resets this.selectedExtension to null)
        this.close();

        // Start placement mode with objectPlacer (use saved extensionId)
        objectPlacer.startPlacing(extensionId, currentLayer);
    }
};
