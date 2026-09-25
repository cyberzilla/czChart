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
     * Parse any color string to {r, g, b, a}
     * Supports: #RGB, #RRGGBB, #RRGGBBAA, rgb(), rgba()
     * @param {string} color
     * @returns {object} {r, g, b, a}
     */
    parse(color) {
        if (!color || typeof color !== 'string') return { r: 0, g: 0, b: 0, a: 1 };

        color = color.trim();

        // rgba(r, g, b, a) or rgb(r, g, b)
        const rgbaMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
        if (rgbaMatch) {
            return {
                r: parseInt(rgbaMatch[1]),
                g: parseInt(rgbaMatch[2]),
                b: parseInt(rgbaMatch[3]),
                a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
            };
        }

        // Hex
        let hex = color.replace(/^#/, '');

        // #RGB → #RRGGBB
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        // #RGBA → #RRGGBBAA
        if (hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }

        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

        return { r, g, b, a };
    },

    /**
     * Convert {r,g,b,a} to CSS string
     * @param {object} rgba
     * @returns {string}
     */
    toCss(rgba) {
        if (rgba.a < 1) {
            return 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',' + Math.round(rgba.a * 1000) / 1000 + ')';
        }
        return '#' + ((1 << 24) + (rgba.r << 16) + (rgba.g << 8) + rgba.b).toString(16).slice(1);
    },

    /**
     * Convert HEX to RGB (backwards compat)
     */
    hexToRgb(hex) {
        const c = window.CZ.Color.parse(hex);
        return { r: c.r, g: c.g, b: c.b };
    },

    /**
     * Convert RGB to HEX
     */
    rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    /**
     * Set alpha on any color string. Preserves original RGB.
     * @param {string} color - Any supported color format
     * @param {number} alpha - 0 to 1
     * @returns {string} rgba() string
     */
    withAlpha(color, alpha) {
        const c = window.CZ.Color.parse(color);
        return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
    },

    /**
     * Lighten a color
     */
    lighten(color, amount) {
        const c = window.CZ.Color.parse(color);
        const r = Math.round(Math.min(255, c.r + (255 - c.r) * amount));
        const g = Math.round(Math.min(255, c.g + (255 - c.g) * amount));
        const b = Math.round(Math.min(255, c.b + (255 - c.b) * amount));
        if (c.a < 1) return 'rgba(' + r + ',' + g + ',' + b + ',' + c.a + ')';
        return window.CZ.Color.rgbToHex(r, g, b);
    },

    /**
     * Darken a color
     */
    darken(color, amount) {
        const c = window.CZ.Color.parse(color);
        const r = Math.round(Math.max(0, c.r * (1 - amount)));
        const g = Math.round(Math.max(0, c.g * (1 - amount)));
        const b = Math.round(Math.max(0, c.b * (1 - amount)));
        if (c.a < 1) return 'rgba(' + r + ',' + g + ',' + b + ',' + c.a + ')';
        return window.CZ.Color.rgbToHex(r, g, b);
    },

    /**
     * Get a series color from default palette
     */
    getSeriesColor(index) {
        return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
    },

    /**
     * Generate canvas linear gradient
     */
    generateGradient(ctx, x1, y1, x2, y2, color, startAlpha, endAlpha) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, window.CZ.Color.withAlpha(color, startAlpha));
        gradient.addColorStop(1, window.CZ.Color.withAlpha(color, endAlpha));
        return gradient;
    }
};

// Alias
window.CZ.ColorUtils = window.CZ.Color;
