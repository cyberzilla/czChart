'use strict';

window.CZ = window.CZ || {};

const DEFAULT_PALETTE = [
    '#3b82f6', // 1. blue        (hue ~217°)
    '#ef4444', // 2. red          (hue ~0°)
    '#22c55e', // 3. green        (hue ~142°)
    '#f59e0b', // 4. amber        (hue ~38°)
    '#8b5cf6', // 5. violet       (hue ~258°)
    '#06b6d4', // 6. cyan         (hue ~189°)
    '#f97316', // 7. orange       (hue ~25°)
    '#14b8a6', // 8. teal         (hue ~174°)
    '#e11d48', // 9. rose         (hue ~347°)
    '#84cc16', // 10. lime        (hue ~84°)
    '#6366f1', // 11. indigo      (hue ~239°)
    '#ec4899', // 12. pink        (hue ~330°)
    '#eab308', // 13. yellow      (hue ~48°)
    '#0ea5e9', // 14. sky         (hue ~199°)
    '#d946ef', // 15. fuchsia     (hue ~292°)
    '#fb923c', // 16. light-orange(hue ~27°)
    '#2dd4bf', // 17. mint        (hue ~170°)
    '#a855f7', // 18. purple      (hue ~270°)
    '#64748b', // 19. slate       (hue ~215°)
    '#facc15', // 20. gold        (hue ~50°)
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
     * Get a series color from default palette.
     * When palette is exhausted, generates colors using golden angle
     * to maximize visual distinction between adjacent series.
     */
    getSeriesColor(index) {
        if (index < DEFAULT_PALETTE.length) {
            return DEFAULT_PALETTE[index];
        }
        // Golden angle (~137.5°) distributes hues maximally
        const hue = (index * 137.508) % 360;
        const sat = 65 + (index % 3) * 10;   // 65-85% saturation
        const lit = 50 + (index % 2) * 10;    // 50-60% lightness
        return 'hsl(' + Math.round(hue) + ',' + sat + '%,' + lit + '%)';
    },

    /**
     * Generate canvas linear gradient
     */
    generateGradient(ctx, x1, y1, x2, y2, color, startAlpha, endAlpha) {
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, window.CZ.Color.withAlpha(color, startAlpha));
        gradient.addColorStop(1, window.CZ.Color.withAlpha(color, endAlpha));
        return gradient;
    },

    /**
     * Generate a vibrant random color
     * @param {number} [alpha=1] - Alpha value 0-1
     * @returns {string} color string
     */
    randomColor(alpha) {
        var h = Math.floor(Math.random() * 360);
        var s = 60 + Math.floor(Math.random() * 30); // 60-90%
        var l = 45 + Math.floor(Math.random() * 20); // 45-65%
        // Convert HSL to RGB
        var c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = l / 100 - c / 2;
        var r1, g1, b1;
        if (h < 60)       { r1 = c; g1 = x; b1 = 0; }
        else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
        else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
        else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
        else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
        else              { r1 = c; g1 = 0; b1 = x; }
        var r = Math.round((r1 + m) * 255);
        var g = Math.round((g1 + m) * 255);
        var b = Math.round((b1 + m) * 255);
        if (alpha !== undefined && alpha < 1) {
            return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    /**
     * Resolve color value — converts 'random' to a distinct color.
     * When index is provided, uses golden angle spacing from a random
     * starting hue (seeded once per page load) for max distinction.
     * @param {string} color
     * @param {number} [index] - Index for distinct color generation
     * @param {number} [alpha] - Optional alpha
     * @returns {string} resolved color
     */
    resolve(color, index, alpha) {
        if (typeof color === 'string' && color.toLowerCase() === 'random') {
            if (typeof index === 'number') {
                // Random start (fixed per session) + golden angle spacing
                if (!window.CZ.Color._randomHueOffset) {
                    window.CZ.Color._randomHueOffset = Math.floor(Math.random() * 360);
                }
                const hue = (window.CZ.Color._randomHueOffset + index * 137.508) % 360;
                const sat = 65 + (index % 3) * 10;
                const lit = 48 + (index % 3) * 7;
                return 'hsl(' + Math.round(hue) + ',' + sat + '%,' + lit + '%)';
            }
            return window.CZ.Color.randomColor(alpha);
        }
        return color;
    }
};

// Alias
window.CZ.ColorUtils = window.CZ.Color;
