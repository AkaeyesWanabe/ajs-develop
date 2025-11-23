module.exports = {
    b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, { type: contentType });
        return blob;
    },

    /**
     * Escapes HTML special characters to prevent XSS attacks
     * @param {string} str - String to escape
     * @returns {string} Escaped string safe for HTML insertion
     */
    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Escapes attribute values to prevent XSS in HTML attributes
     * @param {string} str - String to escape
     * @returns {string} Escaped string safe for HTML attributes
     */
    escapeAttr(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Creates a DOM element safely without innerHTML injection
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Attributes object
     * @param {string|HTMLElement|Array} children - Child content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attrs = {}, children = null) {
        const elem = document.createElement(tag);

        // Set attributes safely
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'className') {
                elem.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(elem.style, value);
            } else if (key.startsWith('data-')) {
                elem.dataset[key.slice(5)] = value;
            } else {
                elem.setAttribute(key, value);
            }
        }

        // Add children safely
        if (children != null) {
            if (Array.isArray(children)) {
                children.forEach(child => {
                    if (typeof child === 'string') {
                        elem.appendChild(document.createTextNode(child));
                    } else if (child instanceof HTMLElement) {
                        elem.appendChild(child);
                    }
                });
            } else if (typeof children === 'string') {
                elem.textContent = children;
            } else if (children instanceof HTMLElement) {
                elem.appendChild(children);
            }
        }

        return elem;
    }

};
