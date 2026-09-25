'use strict';

window.CZ = window.CZ || {};

const DEFAULT_PALETTE = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', 
    '#f97316', '#6366f1', '#14b8a6', '#e11d48'
];

window.CZ.Color = {
    DEFAULT_PALETTE,

    /**
     * Convert HEX to RGB
     * @param {string} hex 
     * @returns {object} {r, g, b}
     */
    hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    },

    /**
     * Convert RGB to HEX
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @returns {string} hex color
     */
    rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    /**
     * Add alpha to HEX color
     * @param {string} hexColor 
     * @param {number} alpha 
     * @returns {string} rgba color
     */
    withAlpha(hexColor, alpha) {
        const rgb = window.CZ.Color.hexToRgb(hexColor);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    },

    /**
     * Lighten a HEX color
     * @param {string} hexColor 
     * @param {number} amount (0-1)
     * @returns {string} hex color
     */
    lighten(hexColor, amount) {
        const rgb = window.CZ.Color.hexToRgb(hexColor);
        const r = Math.round(window.CZ.Math.clamp(rgb.r + (255 - rgb.r) * amount, 0, 255));
        const g = Math.round(window.CZ.Math.clamp(rgb.g + (255 - rgb.g) * amount, 0, 255));
        const b = Math.round(window.CZ.Math.clamp(rgb.b + (255 - rgb.b) * amount, 0, 255));
        return window.CZ.Color.rgbToHex(r, g, b);
    },

    /**
     * Darken a HEX color
     * @param {string} hexColor 
     * @param {number} amount (0-1)
     * @returns {string} hex color
     */
    darken(hexColor, amount) {
        const rgb = window.CZ.Color.hexToRgb(hexColor);
        const r = Math.round(window.CZ.Math.clamp(rgb.r * (1 - amount), 0, 255));
        const g = Math.round(window.CZ.Math.clamp(rgb.g * (1 - amount), 0, 255));
        const b = Math.round(window.CZ.Math.clamp(rgb.b * (1 - amount), 0, 255));
        return window.CZ.Color.rgbToHex(r, g, b);
    },

    /**
     * Get a series color from default palette
     * @param {number} index 
     * @returns {string} hex color
     */
    getSeriesColor(index) {
        return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
    },

    /**
     * Generate canvas linear gradient
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {string} color 
     * @param {number} startAlpha 
     * @param {number} endAlpha 
     * @returns {CanvasGradient}
     */
    generateGradient(ctx, x1, y1, x2, y2, color, startAlpha, endAlpha) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, window.CZ.Color.withAlpha(color, startAlpha));
        gradient.addColorStop(1, window.CZ.Color.withAlpha(color, endAlpha));
        return gradient;
    }
};

// Alias for consumer modules that reference CZ.ColorUtils
window.CZ.ColorUtils = window.CZ.Color;
