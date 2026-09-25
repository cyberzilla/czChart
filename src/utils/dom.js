'use strict';

window.CZ = window.CZ || {};

window.CZ.DOM = {
    /**
     * Select an element by selector or return the element itself
     * @param {string|HTMLElement} selectorOrElement 
     * @returns {HTMLElement}
     */
    select(selectorOrElement) {
        if (typeof selectorOrElement === 'string') {
            return document.querySelector(selectorOrElement);
        }
        return selectorOrElement;
    },

    /**
     * Create an element with inline styles and append to parent
     * @param {string} tag 
     * @param {object} styles 
     * @param {HTMLElement} [parent] 
     * @returns {HTMLElement}
     */
    createElement(tag, styles = {}, parent = null) {
        const el = document.createElement(tag);
        window.CZ.DOM.setStyles(el, styles);
        if (parent) {
            parent.appendChild(el);
        }
        return el;
    },

    /**
     * Apply styles object to element
     * @param {HTMLElement} element 
     * @param {object} styles 
     */
    setStyles(element, styles) {
        for (const key in styles) {
            if (Object.prototype.hasOwnProperty.call(styles, key)) {
                element.style[key] = styles[key];
            }
        }
    },

    /**
     * Get element size accounting for padding
     * @param {HTMLElement} element 
     * @returns {object} {width, height}
     */
    getElementSize(element) {
        const rect = element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    },

    /**
     * Run callback when DOM is ready
     * @param {Function} callback 
     */
    onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }
};
