/*!
 * czChart v1.0.0 — Lightweight, Data-Driven Chart Library
 * (c) 2026 CyberZilla
 * Released under the MIT License
 * Built: 2026-09-26T05:23:21.203Z
 */

(function(global) {
"use strict";


// ============================================================
// src/utils/math.js
// ============================================================

window.CZ = window.CZ || {};
window.CZ.Math = {
    /**
     * Clamp a value between a minimum and maximum.
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation.
     * @param {number} a
     * @param {number} b
     * @param {number} t
     * @returns {number}
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Crisp 1px canvas lines coordinate.
     * @param {number} x
     * @returns {number}
     */
    crispCoord(x) {
        return Math.round(x) + 0.5;
    },

    /**
     * Heckbert's nice number algorithm.
     * @param {number} range
     * @param {boolean} round
     * @returns {number}
     */
    niceNum(range, round) {
        const exponent = Math.floor(Math.log10(range));
        const fraction = range / Math.pow(10, exponent);
        let niceFraction;

        if (round) {
            if (fraction < 1.5) niceFraction = 1;
            else if (fraction < 3) niceFraction = 2;
            else if (fraction < 7) niceFraction = 5;
            else niceFraction = 10;
        } else {
            if (fraction <= 1) niceFraction = 1;
            else if (fraction <= 2) niceFraction = 2;
            else if (fraction <= 5) niceFraction = 5;
            else niceFraction = 10;
        }

        return niceFraction * Math.pow(10, exponent);
    },

    /**
     * Calculate nice scale.
     * @param {number} min
     * @param {number} max
     * @param {number} maxTicks
     * @returns {object}
     */
    calculateNiceScale(min, max, maxTicks) {
        const range = window.CZ.Math.niceNum(max - min, false);
        const tickSpacing = window.CZ.Math.niceNum(range / (maxTicks - 1), true);
        const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
        const niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
        
        const ticks = [];
        for (let t = niceMin; t <= niceMax + 1e-10; t += tickSpacing) {
            ticks.push(t);
        }
        
        return { min: niceMin, max: niceMax, tickSpacing, ticks };
    },

    /**
     * Convert degrees to radians.
     * @param {number} deg
     * @returns {number}
     */
    degreesToRadians(deg) {
        return deg * (Math.PI / 180);
    },

    /**
     * Polar to cartesian coordinates.
     * @param {number} cx
     * @param {number} cy
     * @param {number} radius
     * @param {number} angleRad
     * @returns {object}
     */
    polarToCartesian(cx, cy, radius, angleRad) {
        return {
            x: cx + radius * Math.cos(angleRad),
            y: cy + radius * Math.sin(angleRad)
        };
    },

    /**
     * Euclidean distance.
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {number}
     */
    distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    /**
     * Point in rectangle test.
     * @param {number} px
     * @param {number} py
     * @param {object} rect {left, top, right, bottom}
     * @returns {boolean}
     */
    isPointInRect(px, py, rect) {
        return px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
    },

    /**
     * Point in arc test.
     * @param {number} px
     * @param {number} py
     * @param {number} cx
     * @param {number} cy
     * @param {number} innerR
     * @param {number} outerR
     * @param {number} startAngle
     * @param {number} endAngle
     * @returns {boolean}
     */
    isPointInArc(px, py, cx, cy, innerR, outerR, startAngle, endAngle) {
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < innerR || dist > outerR) return false;
        
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;
        
        // Normalize angles to 0 - 2PI
        let start = startAngle % (2 * Math.PI);
        if (start < 0) start += 2 * Math.PI;
        
        let end = endAngle % (2 * Math.PI);
        if (end < 0) end += 2 * Math.PI;
        
        if (start < end) {
            return angle >= start && angle <= end;
        } else {
            return angle >= start || angle <= end;
        }
    }
};

// Alias for consumer modules that reference CZ.MathUtils
window.CZ.MathUtils = window.CZ.Math;


// ============================================================
// src/utils/color.js
// ============================================================

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
     * Resolve color value — converts 'random' to actual color
     * @param {string} color
     * @param {number} [alpha] - Optional alpha for random colors
     * @returns {string} resolved color
     */
    resolve(color, alpha) {
        if (typeof color === 'string' && color.toLowerCase() === 'random') {
            return window.CZ.Color.randomColor(alpha);
        }
        return color;
    }
};

// Alias
window.CZ.ColorUtils = window.CZ.Color;


// ============================================================
// src/utils/dom.js
// ============================================================

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


// ============================================================
// src/styles.js
// ============================================================

window.CZ = window.CZ || {};

window.CZ.Styles = {
    /**
     * Inject self-contained CSS styles into document head
     */
    injectStyles() {
        if (document.getElementById('cz-chart-styles')) {
            return;
        }

        const css = `
.cz-chart-container { position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; user-select: none; }
.cz-tooltip { position: absolute; pointer-events: none; opacity: 0; transition: opacity 0.15s ease-out, transform 0.1s ease-out; z-index: 100; will-change: transform; top: 0; left: 0; }
.cz-tooltip-content { background: rgba(17,24,39,0.95); color: #fff; border-radius: 8px; padding: 10px 14px; font-size: 12px; line-height: 1.5; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap; }
.cz-tooltip-title { color: #9ca3af; margin-bottom: 4px; font-size: 11px; }
.cz-tooltip-row { display: flex; align-items: center; gap: 8px; }
.cz-tooltip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.cz-tooltip-label { color: #d1d5db; }
.cz-tooltip-value { font-weight: 600; color: #fff; margin-left: auto; }
.cz-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 16px; padding: 8px 4px; font-size: 12px; line-height: 1; }
.cz-legend-item { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity 0.2s; text-decoration: none; padding: 2px 0; }
.cz-legend-item:hover { opacity: 0.75; }
.cz-legend-item.cz-legend-disabled { opacity: 0.3; }
.cz-legend-swatch { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; display: inline-block; }
.cz-legend-label { color: #374151; text-decoration: none; }
.cz-crosshair-label { position: absolute; background: #1f2937; color: #fff; padding: 2px 6px; font-size: 10px; border-radius: 3px; pointer-events: none; }
@keyframes cz-bounce { 0% { transform: scale(1); } 30% { transform: scale(1.6); } 50% { transform: scale(0.85); } 70% { transform: scale(1.15); } 85% { transform: scale(0.97); } 100% { transform: scale(1); } }
.cz-legend-swatch.cz-bounce { animation: cz-bounce 0.4s ease-out; }
`;

        const style = document.createElement('style');
        style.id = 'cz-chart-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }
};

// Convenience alias for CZ.injectStyles()
window.CZ.injectStyles = function() { window.CZ.Styles.injectStyles(); };


// ============================================================
// src/core/EventEmitter.js
// ============================================================

window.CZ = window.CZ || {};

/**
 * Lightweight pub/sub EventEmitter
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Register a listener
     * @param {string} event 
     * @param {Function} callback 
     * @returns {Function} unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        return () => this.off(event, callback);
    }

    /**
     * Remove a listener
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event
     * @param {string} event 
     * @param  {...any} args 
     */
    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(...args));
    }

    /**
     * Listen only once
     * @param {string} event 
     * @param {Function} callback 
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback(...args);
        };
        this.on(event, onceWrapper);
    }

    /**
     * Remove all listeners
     * @param {string} [event] 
     */
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

window.CZ.EventEmitter = EventEmitter;


// ============================================================
// src/core/Defaults.js
// ============================================================

window.CZ = window.CZ || {};

const DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    animation: {
        enabled: true,
        duration: 500,
        easing: 'easeOutCubic'
    },
    xAxis: {
        show: true,
        gridLines: false,
        gridColor: 'rgba(0,0,0,0.05)',
        lineColor: '#d1d5db',
        tickColor: '#6b7280',
        labelFont: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        labelColor: '#6b7280',
        maxTicks: 10,
        rotation: 0,
        title: null      // e.g. 'Bulan'
    },
    yAxis: {
        show: true,
        gridLines: true,
        gridColor: 'rgba(0,0,0,0.08)',
        lineColor: '#d1d5db',
        tickColor: '#6b7280',
        labelFont: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        labelColor: '#6b7280',
        maxTicks: 6,
        beginAtZero: true,
        format: null,
        title: null
    },
    tooltip: {
        enabled: true,
        shared: true  // show all series values
    },
    legend: {
        show: true,
        position: 'top'  // top, bottom
    },
    crosshair: {
        enabled: true,
        color: 'rgba(156,163,175,0.4)',
        dashArray: [4, 4],
        lineWidth: 1
    },
    zoom: {
        enabled: false,
        mode: 'x'  // x, y, xy
    },
    series: {
        lineWidth: 1.5,
        pointRadius: 2.5,
        pointHoverRadius: 8,
        smooth: false,
        fill: false,
        fillOpacity: 0.15
    },
    bar: {
        borderRadius: 4,
        gap: 0.2,  // gap ratio between bars
        groupGap: 0.1
    },
    pie: {
        innerRadius: 0,  // 0 for pie, >0 for donut
        padAngle: 0.02,
        cornerRadius: 0,
        startAngle: -90,
        showLabels: true,
        labelFormat: 'percent'  // percent, value, name
    },
    scatter: {
        pointRadius: 5,
        pointShape: 'circle'  // circle, square, triangle, diamond
    },
    radar: {
        gridType: 'polygon',  // polygon, circle
        fillOpacity: 0.2,
        pointRadius: 3
    }
};

/**
 * Check if item is a generic object
 * @param {any} item 
 * @returns {boolean}
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge defaults with user options
 * @param {object} userOptions 
 * @param {object} defaults 
 * @returns {object} merged options
 */
function mergeDefaults(userOptions, defaults) {
    if (!userOptions) return JSON.parse(JSON.stringify(defaults));
    
    const output = Object.assign({}, defaults);
    
    if (isObject(defaults) && isObject(userOptions)) {
        Object.keys(userOptions).forEach(key => {
            if (isObject(userOptions[key])) {
                if (!(key in defaults)) {
                    Object.assign(output, { [key]: userOptions[key] });
                } else {
                    output[key] = mergeDefaults(userOptions[key], defaults[key]);
                }
            } else {
                Object.assign(output, { [key]: userOptions[key] });
            }
        });
    }
    return output;
}

window.CZ.DEFAULTS = DEFAULTS;
window.CZ.mergeDefaults = mergeDefaults;


// ============================================================
// src/core/State.js
// ============================================================

window.CZ = window.CZ || {};

/**
 * Reactive state container
 */
class State {
    /**
     * @param {object} initialState 
     */
    constructor(initialState = {}) {
        this._state = { ...initialState };
        this._watchers = new Map();
        this._batching = false;
        this._pendingChanges = new Set();
    }

    /**
     * Get a state value
     * @param {string} key 
     * @returns {any}
     */
    get(key) {
        return this._state[key];
    }

    /**
     * Set a state value and notify watchers
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
        if (this._state[key] !== value) {
            const oldValue = this._state[key];
            this._state[key] = value;
            
            if (this._batching) {
                this._pendingChanges.add(key);
            } else {
                this._notify(key, value, oldValue);
            }
        }
    }

    /**
     * Watch for changes on a specific key
     * @param {string} key 
     * @param {Function} callback 
     * @returns {Function} unwatch function
     */
    watch(key, callback) {
        if (!this._watchers.has(key)) {
            this._watchers.set(key, new Set());
        }
        this._watchers.get(key).add(callback);
        
        return () => {
            if (this._watchers.has(key)) {
                this._watchers.get(key).delete(callback);
            }
        };
    }

    /**
     * Batch multiple set() calls to notify only once at the end
     * @param {Function} fn 
     */
    batch(fn) {
        this._batching = true;
        
        try {
            fn();
        } finally {
            this._batching = false;
            if (this._pendingChanges.size > 0) {
                this._pendingChanges.forEach(key => {
                    // Provide undefined for old value in batch since it may have changed multiple times
                    this._notify(key, this._state[key], undefined);
                });
                this._pendingChanges.clear();
            }
        }
    }

    /**
     * Notify watchers of a change
     * @param {string} key 
     * @param {any} newValue 
     * @param {any} oldValue 
     * @private
     */
    _notify(key, newValue, oldValue) {
        if (this._watchers.has(key)) {
            this._watchers.get(key).forEach(callback => {
                callback(newValue, oldValue);
            });
        }
    }
}

window.CZ.State = State;


// ============================================================
// src/data/Normalizer.js
// ============================================================

(function(CZ) {
  // Depends on: CZ.ColorUtils.getSeriesColor

  /**
   * Universal data normalizer that converts various data formats into the internal format.
   */
  class Normalizer {
    /**
     * Main entry point to normalize data
     * @param {*} input Raw data input
     * @param {Object} options Normalization options
     * @returns {Object} Normalized data
     */
    static normalize(input, options = {}) {
      let data = input;
      if (typeof input === 'string') {
        data = this.parseCSV(input, options);
      }

      let labels = [];
      let datasets = [];
      let xKey = options.x;
      let yKeys = options.y ? (Array.isArray(options.y) ? options.y : [options.y]) : [];
      let xType = 'category';

      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
          // Array of objects
          const keys = Object.keys(data[0]);
          if (!xKey) {
            const xRegex = /^(date|time|timestamp|x|label|name|category|month|year|day)$/i;
            xKey = keys.find(k => xRegex.test(k));
          }
          if (yKeys.length === 0) {
            yKeys = keys.filter(k => k !== xKey && typeof data[0][k] === 'number');
            if (yKeys.length === 0) {
              // fallback to any non-x keys
              yKeys = keys.filter(k => k !== xKey);
            }
          }

          if (xKey) {
            labels = data.map(d => d[xKey]);
            xType = data.length > 0 ? this.detectType(data[0][xKey]) : 'category';
          } else {
            labels = data.map((d, i) => i.toString());
            xType = 'linear';
          }

          yKeys.forEach((yKey, index) => {
            let color = (options.colors && options.colors[index]) || 
                          (CZ.ColorUtils ? CZ.ColorUtils.getSeriesColor(index) : '#000000');
            // Resolve 'random' keyword
            if (CZ.ColorUtils && CZ.ColorUtils.resolve) color = CZ.ColorUtils.resolve(color);
            
            // Extract per-point colors from data if 'color' key exists
            const hasPointColors = data.some(d => d.color !== undefined);
            const pointColors = hasPointColors ? data.map(d => {
              if (!d.color) return null;
              return (CZ.ColorUtils && CZ.ColorUtils.resolve) ? CZ.ColorUtils.resolve(d.color) : d.color;
            }) : null;

            datasets.push({
              name: (options.series && options.series[index]) || yKey,
              values: data.map(d => parseFloat(d[yKey]) || 0),
              color: color,
              pointColors: pointColors,
              ...options.seriesOptions
            });
          });
        } else {
          // Primitive Array
          labels = data.map((d, i) => i.toString());
          xType = 'linear';
          const color = (options.colors && options.colors[0]) || 
                        (CZ.ColorUtils ? CZ.ColorUtils.getSeriesColor(0) : '#000000');
          datasets.push({
            name: (options.series && options.series[0]) || 'Series 1',
            values: data.map(d => parseFloat(d) || 0),
            color: color,
            ...options.seriesOptions
          });
        }
      } else if (typeof data === 'object' && data !== null) {
        // Columnar Object
        xKey = options.x || 'x';
        if (data[xKey] && Array.isArray(data[xKey])) {
          labels = data[xKey];
          xType = labels.length > 0 ? this.detectType(labels[0]) : 'category';
        }

        yKeys = options.y ? (Array.isArray(options.y) ? options.y : [options.y]) : Object.keys(data).filter(k => k !== xKey && Array.isArray(data[k]));
        
        yKeys.forEach((yKey, index) => {
          if (Array.isArray(data[yKey])) {
            const color = (options.colors && options.colors[index]) || 
                          (CZ.ColorUtils ? CZ.ColorUtils.getSeriesColor(index) : '#000000');
            datasets.push({
              name: (options.series && options.series[index]) || yKey,
              values: data[yKey].map(d => parseFloat(d) || 0),
              color: color,
              ...options.seriesOptions
            });
          }
        });

        if (labels.length === 0 && datasets.length > 0) {
          labels = datasets[0].values.map((_, i) => i.toString());
          xType = 'linear';
        }
      }

      return {
        labels,
        datasets,
        xType,
        rawData: input
      };
    }

    /**
     * Parses a CSV string to normalized format
     * @param {string} csvString 
     * @param {Object} options 
     */
    static parseCSV(csvString, options = {}) {
      const lines = csvString.trim().split('\n');
      if (lines.length === 0) return [];

      const headers = lines[0].split(',').map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, index) => {
          let val = row[index];
          if (val !== undefined) {
            const numVal = Number(val);
            obj[h] = isNaN(numVal) ? val : numVal;
          }
        });
        data.push(obj);
      }

      return data;
    }

    /**
     * Detects type of data value
     * @param {*} sampleValue 
     * @returns {string} 'time', 'linear', or 'category'
     */
    static detectType(sampleValue) {
      if (typeof sampleValue === 'number') return 'linear';
      if (this.isDateString(sampleValue) || sampleValue instanceof Date) return 'time';
      return 'category';
    }

    /**
     * Checks if string is a valid date
     * @param {string} str 
     * @returns {boolean}
     */
    static isDateString(str) {
      if (typeof str !== 'string') return false;
      if (str.length < 8) return false;  // Too short to be a real date
      if (!isNaN(Number(str))) return false; // purely numeric
      // Only accept ISO-like patterns: YYYY-MM-DD, YYYY/MM/DD, or ISO 8601
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) return true;
      if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) return true;
      return false;
    }
  }

  CZ.Normalizer = Normalizer;
})(window.CZ = window.CZ || {});


// ============================================================
// src/data/Scale.js
// ============================================================

(function(CZ) {
  // Depends on: CZ.MathUtils.niceNum, CZ.MathUtils.calculateNiceScale

  class LinearScale {
    constructor(options = {}) {
      this.options = options;
      this.beginAtZero = options.beginAtZero || false;
      this.maxTicks = options.maxTicks || 10;
      this.format = options.format || (val => val.toString());
      this._min = 0;
      this._max = 0;
      this._pixelStart = 0;
      this._pixelEnd = 0;
      this._tickSpacing = 0;
      this._ticks = [];
    }

    configure(dataMin, dataMax, pixelStart, pixelEnd) {
      this._pixelStart = pixelStart;
      this._pixelEnd = pixelEnd;

      if (this.beginAtZero && dataMin > 0) {
        dataMin = 0;
      }

      if (dataMin === dataMax) {
        dataMin -= 1;
        dataMax += 1;
      }

      if (CZ.MathUtils && CZ.MathUtils.calculateNiceScale) {
        const scale = CZ.MathUtils.calculateNiceScale(dataMin, dataMax, this.maxTicks);
        this._min = scale.min;
        this._max = scale.max;
        this._tickSpacing = scale.tickSpacing;
      } else {
        // Fallback if MathUtils is not yet loaded
        this._min = dataMin;
        this._max = dataMax;
        this._tickSpacing = (this._max - this._min) / this.maxTicks;
      }

      this._ticks = [];
      for (let v = this._min; v <= this._max + 1e-10; v += this._tickSpacing) {
        this._ticks.push({
          value: v,
          label: this.format(v),
          pixel: this.getPixel(v)
        });
      }
    }

    getPixel(value) {
      const range = this._max - this._min;
      if (range === 0) return this._pixelStart;
      const normalized = (value - this._min) / range;
      return this._pixelStart + normalized * (this._pixelEnd - this._pixelStart);
    }

    getValue(pixel) {
      const pixelRange = this._pixelEnd - this._pixelStart;
      if (pixelRange === 0) return this._min;
      const normalized = (pixel - this._pixelStart) / pixelRange;
      return this._min + normalized * (this._max - this._min);
    }

    getTicks() {
      return this._ticks;
    }
  }

  class CategoryScale {
    constructor(options = {}) {
      this.options = options;
      this.maxTicks = options.maxTicks || 0;
      this._labels = [];
      this._pixelStart = 0;
      this._pixelEnd = 0;
      this._ticks = [];
      this._bandWidth = 0;
    }

    configure(labels, pixelStart, pixelEnd) {
      this._labels = labels;
      this._pixelStart = pixelStart;
      this._pixelEnd = pixelEnd;
      
      const count = this._labels.length;
      const pixelRange = this._pixelEnd - this._pixelStart;
      this._bandWidth = count > 0 ? pixelRange / count : 0;

      this._ticks = [];
      let step = 1;
      if (this.maxTicks > 0 && count > this.maxTicks) {
        step = Math.ceil(count / this.maxTicks);
      }

      for (let i = 0; i < count; i += step) {
        this._ticks.push({
          value: i,
          label: this._labels[i],
          pixel: this.getPixel(i)
        });
      }
    }

    getPixel(index) {
      return this._pixelStart + (index + 0.5) * this._bandWidth;
    }

    getPixelRange(index) {
      const start = this._pixelStart + index * this._bandWidth;
      return {
        start: start,
        end: start + this._bandWidth,
        width: this._bandWidth
      };
    }

    getValue(pixel) {
      const normalized = pixel - this._pixelStart;
      const index = Math.floor(normalized / this._bandWidth);
      return Math.max(0, Math.min(this._labels.length - 1, index));
    }

    getTicks() {
      return this._ticks;
    }

    getBandWidth() {
      return this._bandWidth;
    }
  }

  class TimeScale extends LinearScale {
    constructor(options = {}) {
      super(options);
    }

    configure(dates, pixelStart, pixelEnd) {
      const timestamps = dates.map(d => new Date(d).getTime());
      let min = Math.min(...timestamps);
      let max = Math.max(...timestamps);
      
      if (min === max) {
        min -= 86400000;
        max += 86400000;
      }

      super.configure(min, max, pixelStart, pixelEnd);

      // Reformat ticks as dates
      const range = this._max - this._min;
      this._ticks = this._ticks.map(t => ({
        ...t,
        label: this.formatDate(t.value, range)
      }));
    }

    formatDate(timestamp, range) {
      const date = new Date(timestamp);
      if (range < 60000) return date.getSeconds() + 's';
      if (range < 3600000) return date.getMinutes() + 'm';
      if (range < 86400000) return date.getHours() + ':00';
      if (range < 2592000000) return date.getDate() + '/' + (date.getMonth() + 1);
      if (range < 31536000000) return (date.getMonth() + 1) + '/' + date.getFullYear();
      return date.getFullYear().toString();
    }
  }

  CZ.LinearScale = LinearScale;
  CZ.CategoryScale = CategoryScale;
  CZ.TimeScale = TimeScale;

  CZ.createScale = function(type, options) {
    if (type === 'time') return new TimeScale(options);
    if (type === 'category') return new CategoryScale(options);
    return new LinearScale(options);
  };

})(window.CZ = window.CZ || {});


// ============================================================
// src/data/Fetcher.js
// ============================================================

(function(CZ) {
  class Fetcher {
    /**
     * Fetch data from URL or return as-is
     * @param {string|*} urlOrData 
     * @param {Object} options 
     * @returns {Promise<*>}
     */
    static async fetch(urlOrData, options = {}) {
      if (typeof urlOrData === 'string' && (urlOrData.startsWith('http') || urlOrData.startsWith('/'))) {
        try {
          let data;
          if (urlOrData.endsWith('.csv')) {
            data = await this.fetchCSV(urlOrData, options);
          } else {
            data = await this.fetchJSON(urlOrData, options);
          }

          if (options.transform && typeof options.transform === 'function') {
            return options.transform(data);
          }
          return data;
        } catch (error) {
          console.error('CZChart Fetcher Error:', error);
          throw new Error(`Failed to fetch data from ${urlOrData}: ${error.message}`);
        }
      }
      return Promise.resolve(urlOrData);
    }

    static async fetchJSON(url, options = {}) {
      const response = await fetch(url, { headers: options.headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    }

    static async fetchCSV(url, options = {}) {
      const response = await fetch(url, { headers: options.headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    }
  }

  CZ.Fetcher = Fetcher;
})(window.CZ = window.CZ || {});


// ============================================================
// src/themes/light.js
// ============================================================

(function(CZ) {
    /**
     * Light theme preset
     */
    const LightTheme = {
        name: 'light',
        background: '#ffffff',
        textColor: '#374151',
        gridColor: 'rgba(0, 0, 0, 0.06)',
        axisLineColor: '#e5e7eb',
        axisLabelColor: '#6b7280',
        tooltipBackground: 'rgba(17, 24, 39, 0.95)',
        tooltipTextColor: '#ffffff',
        crosshairColor: 'rgba(156, 163, 175, 0.4)',
        legendTextColor: '#374151',
        palette: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48']
    };

    CZ.Themes = CZ.Themes || {};
    CZ.Themes.Light = LightTheme;
})(window.CZ = window.CZ || {});


// ============================================================
// src/themes/dark.js
// ============================================================

(function(CZ) {
    /**
     * Dark theme preset
     */
    const DarkTheme = {
        name: 'dark',
        background: '#111827',
        textColor: '#e5e7eb',
        gridColor: 'rgba(255, 255, 255, 0.06)',
        axisLineColor: '#374151',
        axisLabelColor: '#9ca3af',
        tooltipBackground: 'rgba(31, 41, 55, 0.95)',
        tooltipTextColor: '#ffffff',
        crosshairColor: 'rgba(156, 163, 175, 0.3)',
        legendTextColor: '#d1d5db',
        palette: ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#818cf8', '#2dd4bf', '#fb7185']
    };

    CZ.Themes = CZ.Themes || {};
    CZ.Themes.Dark = DarkTheme;
})(window.CZ = window.CZ || {});


// ============================================================
// src/render/Viewport.js
// ============================================================

(function(CZ) {
  class Viewport {
    constructor(container, onResize) {
      this.container = container;
      this.onResizeCallback = onResize;
      this._width = 0;
      this._height = 0;
      this._dpr = window.devicePixelRatio || 1;
      this._rafId = null;

      this.observer = new ResizeObserver(entries => {
        if (!entries || entries.length === 0) return;
        
        if (this._rafId) {
          cancelAnimationFrame(this._rafId);
        }

        this._rafId = requestAnimationFrame(() => {
          this.resize();
        });
      });

      this.observer.observe(this.container);
      this.resize();
    }

    setupCanvas(canvas, isOverlay) {
      canvas.width = this._width * this._dpr;
      canvas.height = this._height * this._dpr;
      canvas.style.width = this._width + 'px';
      canvas.style.height = this._height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(this._dpr, this._dpr);
    }

    resize() {
      const rect = this.container.getBoundingClientRect();
      let newWidth = rect.width;
      let newHeight = rect.height;

      if (newWidth === 0 || newHeight === 0) {
        // Fallback for hidden tabs or unstyled containers
        newWidth = this.container.clientWidth || 300;
        newHeight = this.container.clientHeight || 150;
      }

      this._dpr = window.devicePixelRatio || 1;

      if (newWidth !== this._width || newHeight !== this._height) {
        this._width = newWidth;
        this._height = newHeight;
        if (this.onResizeCallback) {
          this.onResizeCallback(this._width, this._height);
        }
      }
    }

    getSize() {
      return { width: this._width, height: this._height };
    }

    getDpr() {
      return this._dpr;
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
      }
    }
  }

  CZ.Viewport = Viewport;
})(window.CZ = window.CZ || {});


// ============================================================
// src/render/Animator.js
// ============================================================

(function(CZ) {
  const Easing = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutElastic: t => { const p = 0.3; return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1; },
    easeOutBounce: t => { 
      if (t < 1 / 2.75) return 7.5625 * t * t; 
      else if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75; 
      else if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375; 
      else return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375; 
    }
  };

  class Animator {
    constructor() {
      this._rafId = null;
      this._isAnimating = false;
    }

    get isAnimating() {
      return this._isAnimating;
    }

    animate(renderCallback, duration = 500, easingName = 'easeOutCubic') {
      this.stop();

      if (duration <= 0) {
        renderCallback(1);
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        this._isAnimating = true;
        const startTime = performance.now();
        const easingFunc = Easing[easingName] || Easing.linear;

        const tick = (currentTime) => {
          const elapsed = currentTime - startTime;
          let progress = elapsed / duration;

          if (progress >= 1) {
            progress = 1;
            renderCallback(easingFunc(progress));
            this._isAnimating = false;
            resolve();
          } else {
            renderCallback(easingFunc(progress));
            this._rafId = requestAnimationFrame(tick);
          }
        };

        this._rafId = requestAnimationFrame(tick);
      });
    }

    stop() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      this._isAnimating = false;
    }
  }

  CZ.Easing = Easing;
  CZ.Animator = Animator;
})(window.CZ = window.CZ || {});


// ============================================================
// src/render/Grid.js
// ============================================================

(function(CZ) {
  class Grid {
    constructor(options = {}) {
      this.options = options;
    }

    draw(ctx, plotArea, xScale, yScale, options = {}) {
      ctx.save();

      const xOpts = options.xAxis || {};
      const yOpts = options.yAxis || {};
      const crispCoord = CZ.MathUtils ? CZ.MathUtils.crispCoord : (v) => Math.round(v) + 0.5;

      // Horizontal grid lines (Y ticks) — dashed, subtle
      if (yOpts.gridLines !== false && yScale) {
        const gridColor = yOpts.gridColor || 'rgba(0,0,0,0.08)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();

        const yTicks = yScale.getTicks();
        yTicks.forEach(tick => {
          const y = crispCoord(tick.pixel);
          if (y > plotArea.top && y < plotArea.bottom) {
            ctx.moveTo(plotArea.left, y);
            ctx.lineTo(plotArea.right, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Vertical grid lines (X ticks) — off by default, subtle if enabled
      if (xOpts.gridLines === true && xScale) {
        const gridColor = xOpts.gridColor || 'rgba(0,0,0,0.05)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();

        const xTicks = xScale.getTicks();
        xTicks.forEach(tick => {
          const x = crispCoord(tick.pixel);
          if (x > plotArea.left && x < plotArea.right) {
            ctx.moveTo(x, plotArea.top);
            ctx.lineTo(x, plotArea.bottom);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // L-shape axis border: left + bottom (solid)
      const borderColor = yOpts.lineColor || xOpts.lineColor || '#d1d5db';
      ctx.beginPath();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;

      const left = crispCoord(plotArea.left);
      const bottom = crispCoord(plotArea.bottom);
      const top = crispCoord(plotArea.top);
      const right = crispCoord(plotArea.right);

      // Left axis line
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      // Bottom axis line
      ctx.lineTo(right, bottom);
      ctx.stroke();

      // Tick at top-left corner (top of Y axis)
      ctx.beginPath();
      ctx.moveTo(left - 4, top);
      ctx.lineTo(left, top);
      ctx.stroke();

      // Tick at bottom-right corner (end of X axis)
      ctx.beginPath();
      ctx.moveTo(right, bottom);
      ctx.lineTo(right, bottom + 4);
      ctx.stroke();

      // Tick at origin (bottom-left corner)
      ctx.beginPath();
      ctx.moveTo(left - 4, bottom);
      ctx.lineTo(left, bottom);
      ctx.moveTo(left, bottom);
      ctx.lineTo(left, bottom + 4);
      ctx.stroke();

      // Small tick marks on Y axis
      if (yOpts.show !== false && yScale) {
        ctx.beginPath();
        ctx.strokeStyle = borderColor;
        const yTicks = yScale.getTicks();
        yTicks.forEach(tick => {
          const y = crispCoord(tick.pixel);
          if (y >= plotArea.top && y <= plotArea.bottom) {
            ctx.moveTo(left - 4, y);
            ctx.lineTo(left, y);
          }
        });
        ctx.stroke();
      }

      // Small tick marks on X axis
      if (xOpts.show !== false && xScale) {
        ctx.beginPath();
        ctx.strokeStyle = borderColor;
        const xTicks = xScale.getTicks();
        xTicks.forEach(tick => {
          const x = crispCoord(tick.pixel);
          if (x >= plotArea.left && x <= plotArea.right) {
            ctx.moveTo(x, bottom);
            ctx.lineTo(x, bottom + 4);
          }
        });
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  CZ.Grid = Grid;
})(window.CZ = window.CZ || {});


// ============================================================
// src/render/Axis.js
// ============================================================

(function(CZ) {
  class Axis {
    constructor(options = {}) {
      this.options = options;
    }

    /**
     * Draw X-axis labels below the plot area
     */
    drawXAxis(ctx, plotArea, scale, options = {}) {
      if (options.show === false) return;

      ctx.save();
      const ticks = scale.getTicks();
      const labelColor = options.labelColor || '#6b7280';
      const labelFont = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const rotation = options.rotation || 0;

      ctx.fillStyle = labelColor;
      ctx.font = labelFont;
      ctx.textAlign = rotation ? 'right' : 'center';
      ctx.textBaseline = 'top';

      let lastRightEdge = -Infinity;
      const minGap = 8;

      ticks.forEach(tick => {
        const x = tick.pixel;
        if (x < plotArea.left - 5 || x > plotArea.right + 5) return;

        const textWidth = ctx.measureText(tick.label).width;

        // Smart overlap prevention
        if (!rotation && (x - textWidth / 2) < lastRightEdge + minGap) return;

        ctx.save();
        ctx.translate(x, plotArea.bottom + 10);
        if (rotation) {
          ctx.rotate(-rotation * Math.PI / 180);
        }
        ctx.fillText(String(tick.label), 0, 0);
        ctx.restore();

        lastRightEdge = x + textWidth / 2;
      });

      // Draw X-axis title if provided
      if (options.title) {
        ctx.fillStyle = options.titleColor || '#6b7280';
        ctx.font = options.titleFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          options.title,
          plotArea.left + plotArea.width / 2,
          plotArea.bottom + 30
        );
      }

      ctx.restore();
    }

    /**
     * Draw Y-axis labels to the left of the plot area
     */
    drawYAxis(ctx, plotArea, scale, options = {}) {
      if (options.show === false) return;

      ctx.save();
      const ticks = scale.getTicks();
      const labelColor = options.labelColor || '#6b7280';
      const labelFont = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      ctx.fillStyle = labelColor;
      ctx.font = labelFont;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      ticks.forEach(tick => {
        const y = tick.pixel;
        if (y >= plotArea.top - 5 && y <= plotArea.bottom + 5) {
          ctx.fillText(String(tick.label), plotArea.left - 10, y);
        }
      });

      // Draw Y-axis title if provided (rotated vertically)
      if (options.title) {
        ctx.save();
        ctx.fillStyle = options.titleColor || '#6b7280';
        ctx.font = options.titleFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const cx = 14;
        const cy = plotArea.top + plotArea.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(options.title, 0, 0);
        ctx.restore();
      }

      ctx.restore();
    }

    /**
     * Measure the width needed for Y-axis labels + title
     */
    measureYAxisWidth(ctx, scale, options = {}) {
      ctx.save();
      ctx.font = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const ticks = scale.getTicks();
      let maxWidth = 0;
      ticks.forEach(tick => {
        const width = ctx.measureText(String(tick.label)).width;
        if (width > maxWidth) maxWidth = width;
      });
      ctx.restore();

      let totalWidth = maxWidth + 16;
      // Add space for title
      if (options.title) {
        totalWidth += 18;
      }
      return totalWidth;
    }

    /**
     * Measure the height needed for X-axis labels + title
     */
    measureXAxisHeight(ctx, scale, options = {}) {
      const rotation = options.rotation || 0;

      if (!rotation) {
        let height = 28;
        if (options.title) height += 20;
        return height;
      }

      ctx.save();
      ctx.font = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const ticks = scale.getTicks();
      let maxWidth = 0;
      ticks.forEach(tick => {
        const width = ctx.measureText(String(tick.label)).width;
        if (width > maxWidth) maxWidth = width;
      });
      ctx.restore();

      let height = Math.sin(rotation * Math.PI / 180) * maxWidth + 16;
      if (options.title) height += 20;
      return height;
    }
  }

  CZ.Axis = Axis;
})(window.CZ = window.CZ || {});


// ============================================================
// src/render/LayeredRenderer.js
// ============================================================

(function(CZ) {
  class LayeredRenderer {
    constructor(container) {
      this.container = container;
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';

      // 1. Legend Container (above canvases in DOM flow for 'top' position)
      this.legendContainer = document.createElement('div');
      this.legendContainer.style.position = 'relative';
      this.legendContainer.style.zIndex = '5';

      // 2. Canvas Wrapper (holds both canvases and tooltip)
      this.canvasWrapper = document.createElement('div');
      this.canvasWrapper.style.position = 'relative';
      this.canvasWrapper.style.flex = '1';
      this.canvasWrapper.style.minHeight = '0';

      // 3. Main Canvas
      this.mainCanvas = document.createElement('canvas');
      this.mainCanvas.style.display = 'block';
      this.mainCanvas.style.width = '100%';
      this.mainCanvas.style.height = '100%';

      // 4. Overlay Canvas
      this.overlayCanvas = document.createElement('canvas');
      this.overlayCanvas.style.position = 'absolute';
      this.overlayCanvas.style.top = '0';
      this.overlayCanvas.style.left = '0';
      this.overlayCanvas.style.pointerEvents = 'none';

      // 5. Tooltip Layer
      this.tooltipLayer = document.createElement('div');
      this.tooltipLayer.style.position = 'absolute';
      this.tooltipLayer.style.top = '0';
      this.tooltipLayer.style.left = '0';
      this.tooltipLayer.style.width = '100%';
      this.tooltipLayer.style.height = '100%';
      this.tooltipLayer.style.pointerEvents = 'none';
      this.tooltipLayer.style.zIndex = '10';
      this.tooltipLayer.style.overflow = 'visible';

      // Set container to flex column so legend and canvas share space
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';

      // Assemble DOM
      this.canvasWrapper.appendChild(this.mainCanvas);
      this.canvasWrapper.appendChild(this.overlayCanvas);
      this.canvasWrapper.appendChild(this.tooltipLayer);
      this.container.appendChild(this.legendContainer);
      this.container.appendChild(this.canvasWrapper);

      this.mainCtx = this.mainCanvas.getContext('2d');
      this.overlayCtx = this.overlayCanvas.getContext('2d');
    }

    getMainContext() { return this.mainCtx; }
    getOverlayContext() { return this.overlayCtx; }
    getTooltipLayer() { return this.tooltipLayer; }
    getLegendContainer() { return this.legendContainer; }
    getMainCanvas() { return this.mainCanvas; }
    getOverlayCanvas() { return this.overlayCanvas; }

    clearMain() {
      if (this.mainCanvas.width && this.mainCanvas.height) {
        this.mainCtx.save();
        this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCtx.restore();
      }
    }

    clearOverlay() {
      if (this.overlayCanvas.width && this.overlayCanvas.height) {
        this.overlayCtx.save();
        this.overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        this.overlayCtx.restore();
      }
    }

    resize(width, height, dpr) {
      // Measure legend height
      const legendH = this.legendContainer.offsetHeight || 0;
      const canvasH = height - legendH;

      this.canvasWrapper.style.width = width + 'px';
      this.canvasWrapper.style.height = canvasH + 'px';

      this.mainCanvas.width = width * dpr;
      this.mainCanvas.height = canvasH * dpr;
      this.mainCanvas.style.width = width + 'px';
      this.mainCanvas.style.height = canvasH + 'px';
      this.mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.overlayCanvas.width = width * dpr;
      this.overlayCanvas.height = canvasH * dpr;
      this.overlayCanvas.style.width = width + 'px';
      this.overlayCanvas.style.height = canvasH + 'px';
      this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Store logical canvas dimensions for Chart
      this._canvasWidth = width;
      this._canvasHeight = canvasH;
    }

    getCanvasSize() {
      return { width: this._canvasWidth || 0, height: this._canvasHeight || 0 };
    }

    destroy() {
      // Reset container styles
      this.container.style.display = '';
      this.container.style.flexDirection = '';

      if (this.container.contains(this.canvasWrapper)) this.container.removeChild(this.canvasWrapper);
      if (this.container.contains(this.legendContainer)) this.container.removeChild(this.legendContainer);
    }
  }

  CZ.LayeredRenderer = LayeredRenderer;
})(window.CZ = window.CZ || {});


// ============================================================
// src/render/series/LineSeries.js
// ============================================================

/**
 * Line Series Renderer
 * Handles rendering of line charts, including area fills and smoothed curves.
 */
class LineSeries {
    /**
     * @param {Object} chart - The main Chart instance
     * @param {Object} options - Series options
     */
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            smooth: false,
            fill: false,
            lineWidth: 1.5,
            pointRadius: 2.5,
            pointHoverRadius: 8,
            visible: true
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._selectedPoints = new Set(); // indices of pinned/clicked points
        this._bounceAnims = new Map();    // index → { startTime, selecting }
    }

    /**
     * @param {Object} dataset - The normalized dataset
     */
    setData(dataset) {
        this.dataset = dataset;
    }

    /**
     * @returns {Array} Array of legend items
     */
    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name,
            color: this.dataset.color,
            visible: this.visible,
            datasetIndex: this.options.datasetIndex,
            series: this
        }];
    }

    /**
     * @returns {Object} Data bounds for scale calculation
     */
    getBounds() {
        if (!this.dataset || !this.visible) return { minY: 0, maxY: 0 };
        const values = this.dataset.values.filter(v => v !== null && v !== undefined);
        if (values.length === 0) return { minY: 0, maxY: 0 };
        return {
            minY: Math.min(...values),
            maxY: Math.max(...values)
        };
    }

    /**
     * Calculate control points for Fritsch-Carlson monotone cubic interpolation
     */
    _calculateControlPoints(points) {
        const n = points.length;
        if (n <= 1) return [];
        if (n === 2) {
            return [{
                cp1x: points[0].x, cp1y: points[0].y,
                cp2x: points[1].x, cp2y: points[1].y
            }];
        }

        const m = new Array(n);
        const dx = new Array(n - 1);
        const dy = new Array(n - 1);
        const slope = new Array(n - 1);

        for (let i = 0; i < n - 1; i++) {
            dx[i] = points[i + 1].x - points[i].x;
            dy[i] = points[i + 1].y - points[i].y;
            slope[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
        }

        m[0] = slope[0];
        for (let i = 1; i < n - 1; i++) {
            if (slope[i - 1] * slope[i] <= 0) {
                m[i] = 0;
            } else {
                m[i] = 3 * (dx[i - 1] + dx[i]) / (
                    (2 * dx[i] + dx[i - 1]) / slope[i - 1] +
                    (dx[i] + 2 * dx[i - 1]) / slope[i]
                );
            }
        }
        m[n - 1] = slope[n - 2];

        const cps = [];
        for (let i = 0; i < n - 1; i++) {
            cps.push({
                cp1x: points[i].x + dx[i] / 3,
                cp1y: points[i].y + m[i] * dx[i] / 3,
                cp2x: points[i + 1].x - dx[i] / 3,
                cp2y: points[i + 1].y - m[i + 1] * dx[i] / 3
            });
        }
        return cps;
    }

    /**
     * Draw the line series
     */
    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || this.dataset.values.length === 0) return;

        const points = [];
        this.dataset.values.forEach((value, i) => {
            if (value !== null && value !== undefined) {
                points.push({
                    x: Math.round(xScale.getPixel(i)) + 0.5,
                    y: Math.round(yScale.getPixel(value)) + 0.5,
                    index: i,
                    value: value
                });
            }
        });

        if (points.length === 0) return;

        ctx.save();
        
        // Clip to plot area
        ctx.beginPath();
        ctx.rect(plotArea.left, plotArea.top, plotArea.width, plotArea.height);
        ctx.clip();
        
        // Clip for animation
        if (progress < 1) {
            ctx.beginPath();
            ctx.rect(plotArea.left, plotArea.top, plotArea.width * progress, plotArea.height);
            ctx.clip();
        }

        // Build path
        const path = new Path2D();
        path.moveTo(points[0].x, points[0].y);

        if (this.options.smooth) {
            const cps = this._calculateControlPoints(points);
            for (let i = 0; i < cps.length; i++) {
                path.bezierCurveTo(
                    cps[i].cp1x, cps[i].cp1y,
                    cps[i].cp2x, cps[i].cp2y,
                    points[i + 1].x, points[i + 1].y
                );
            }
        } else {
            for (let i = 1; i < points.length; i++) {
                path.lineTo(points[i].x, points[i].y);
            }
        }

        // Fill area
        if (this.options.fill) {
            const fillPath = new Path2D(path);
            fillPath.lineTo(points[points.length - 1].x, plotArea.bottom);
            fillPath.lineTo(points[0].x, plotArea.bottom);
            fillPath.closePath();

            const gradient = ctx.createLinearGradient(0, plotArea.top, 0, plotArea.bottom);
            const color = this.dataset.color || '#000';
            gradient.addColorStop(0, window.CZ && window.CZ.ColorUtils ? window.CZ.ColorUtils.withAlpha(color, 0.4) : color);
            gradient.addColorStop(1, window.CZ && window.CZ.ColorUtils ? window.CZ.ColorUtils.withAlpha(color, 0.0) : 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fill(fillPath);
        }

        // Stroke line
        ctx.strokeStyle = this.dataset.color || '#000';
        ctx.lineWidth = this.options.lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke(path);

        ctx.restore(); // exit clip — line and fill are clipped, points are NOT
        this._renderedPoints = points;

        // Draw points OUTSIDE clip so edge points are not cut off
        if (this.options.pointRadius > 0) {
            ctx.save();
            const color = this.dataset.color || '#000';
            const bgColor = this._getBackgroundColor();

            // Normal points: small subtle dots (skip selected, drawn separately)
            points.forEach(p => {
                if (this._selectedPoints.has(p.index)) return;
                ctx.beginPath();
                ctx.arc(p.x, p.y, this.options.pointRadius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = bgColor;
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            // Selected (toggled) points: hollow ring with center dot + bounce
            points.forEach(p => {
                if (!this._selectedPoints.has(p.index)) return;
                const bounceScale = this._getBounceScale(p.index);
                const r = this.options.pointHoverRadius * bounceScale;

                // Mask + hollow circle
                ctx.beginPath();
                ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2);
                ctx.fillStyle = bgColor;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = bgColor;
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = this.options.lineWidth;
                ctx.stroke();

                // Center dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.5 * bounceScale, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            });
            ctx.restore();
        }
    }

    /**
     * Get chart background color from theme
     * @returns {string} Background color
     */
    _getBackgroundColor() {
        return (this.chart._theme && this.chart._theme.background) || '#ffffff';
    }

    /**
     * Toggle a data point selection with bounce animation
     * @param {number} index - Data point index
     */
    togglePoint(index) {
        const selecting = !this._selectedPoints.has(index);
        if (selecting) {
            this._selectedPoints.add(index);
        } else {
            this._selectedPoints.delete(index);
        }

        // Start bounce animation
        this._bounceAnims.set(index, { startTime: performance.now(), selecting });
        this._runBounceLoop();
    }

    /** @private - Run bounce animation loop */
    _runBounceLoop() {
        if (this._bounceRaf) return; // already running
        const tick = () => {
            const now = performance.now();
            let anyActive = false;
            for (const [idx, anim] of this._bounceAnims) {
                const elapsed = now - anim.startTime;
                if (elapsed >= 400) {
                    this._bounceAnims.delete(idx);
                } else {
                    anyActive = true;
                }
            }
            this.chart._render(false);
            if (anyActive) {
                this._bounceRaf = requestAnimationFrame(tick);
            } else {
                this._bounceRaf = null;
            }
        };
        this._bounceRaf = requestAnimationFrame(tick);
    }

    /**
     * Get bounce scale multiplier for a point
     * @param {number} index
     * @returns {number} scale (1.0 = normal)
     */
    _getBounceScale(index) {
        const anim = this._bounceAnims.get(index);
        if (!anim) return 1.0;
        const t = Math.min(1, (performance.now() - anim.startTime) / 400);
        // easeOutElastic
        const p = 0.3;
        const bounce = Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        // Scale: overshoot to ~1.8x then settle to 1.0
        return 1.0 + (bounce - 1) * 0.8;
    }

    /**
     * Draw hover effect
     */
    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedPoints) return;
        const point = this._renderedPoints.find(p => p.index === activeIndex);
        if (!point) return;

        const r = this.options.pointHoverRadius;
        const color = this.dataset.color || '#000';
        const bgColor = this._getBackgroundColor();

        ctx.save();

        // Mask: covers line bleed at circle edge
        ctx.beginPath();
        ctx.arc(point.x, point.y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Hollow circle: bg fill + colored stroke (C3.js expand)
        ctx.beginPath();
        ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = this.options.lineWidth;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    /**
     * Hit test using binary search
     */
    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedPoints || this._renderedPoints.length === 0) return null;
        
        let left = 0;
        let right = this._renderedPoints.length - 1;
        let nearest = this._renderedPoints[0];
        let minDist = Math.abs(mouseX - nearest.x);

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const pt = this._renderedPoints[mid];
            const dist = Math.abs(mouseX - pt.x);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = pt;
            }
            
            if (pt.x < mouseX) {
                left = mid + 1;
            } else if (pt.x > mouseX) {
                right = mid - 1;
            } else {
                break;
            }
        }

        // Also check actual distance including Y
        const distToPt = Math.sqrt(Math.pow(mouseX - nearest.x, 2) + Math.pow(mouseY - nearest.y, 2));
        if (minDist <= 20 || distToPt <= 20) {
            return {
                index: nearest.index,
                x: nearest.x,
                y: nearest.y,
                value: nearest.value,
                seriesName: this.dataset.name,
                color: this.dataset.color
            };
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.LineSeries = LineSeries;


// ============================================================
// src/render/series/BarSeries.js
// ============================================================

/**
 * Bar Series Renderer
 * Handles rendering of bar charts (grouped and stacked).
 */
class BarSeries {
    /**
     * @param {Object} chart - The main Chart instance
     * @param {Object} options - Series options
     */
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            borderRadius: 0,
            gap: 0.2, // Gap between categories
            groupGap: 0.05, // Gap between bars in a group
            stacked: false,
            visible: true
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this.datasetIndex = 0;
        this.totalDatasets = 1;
        this._selectedPoints = new Set();
        this._bounceAnims = new Map(); // index → { startTime, selecting }
    }

    /**
     * Set the index of this dataset among all bar datasets
     */
    setDatasetIndex(index, totalDatasets) {
        this.datasetIndex = index;
        this.totalDatasets = totalDatasets;
    }

    /**
     * @param {Object} dataset - The normalized dataset
     */
    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name,
            color: this.dataset.color,
            visible: this.visible,
            datasetIndex: this.options.datasetIndex,
            series: this
        }];
    }

    getBounds() {
        if (!this.dataset || !this.visible) return { minY: 0, maxY: 0 };
        const values = this.dataset.values.filter(v => v !== null && v !== undefined);
        if (values.length === 0) return { minY: 0, maxY: 0 };
        return {
            minY: Math.min(0, ...values), // bars usually start at 0
            maxY: Math.max(...values)
        };
    }

    /**
     * Helper to draw rect with rounded top corners
     */
    _roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        if (height < 0) {
            // Negative bar (goes down)
            const r = Math.min(radius, Math.abs(height) / 2, width / 2);
            ctx.moveTo(x, y);
            ctx.lineTo(x + width, y);
            ctx.lineTo(x + width, y + height + r);
            ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height + r);
            ctx.closePath();
        } else {
            // Positive bar (goes up)
            const r = Math.min(radius, Math.abs(height) / 2, width / 2);
            ctx.moveTo(x, y + height);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x + width, y + r);
            ctx.quadraticCurveTo(x + width, y, x + width - r, y);
            ctx.lineTo(x + r, y);
            ctx.quadraticCurveTo(x, y, x, y + r);
            ctx.closePath();
        }
        ctx.fill();
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || this.dataset.values.length === 0) return;

        ctx.save();
        ctx.fillStyle = this.dataset.color || '#000';

        // Clip to plot area so bars don't overflow past axes
        ctx.beginPath();
        ctx.rect(plotArea.left, plotArea.top, plotArea.width, plotArea.height);
        ctx.clip();

        // Clamp zeroY to plotArea.bottom to prevent bars extending below x-axis
        const rawZeroY = yScale.getPixel(0);
        const zeroY = Math.min(rawZeroY, plotArea.bottom);
        this._renderedBars = [];

        this.dataset.values.forEach((value, i) => {
            if (value === null || value === undefined) return;

            // X scale logic - assumes categorical scale
            const bandCenter = xScale.getPixel(i);
            const bandWidth = xScale.getBandWidth ? xScale.getBandWidth() : (plotArea.width / this.dataset.values.length);
            
            const usableWidth = bandWidth * (1 - this.options.gap);
            let barWidth, xPos;

            if (this.options.stacked) {
                barWidth = usableWidth;
                xPos = bandCenter - barWidth / 2;
                // Stacked Y offset logic needs to be handled by Chart, assuming yScale provides it or we just draw normal for now
            } else {
                barWidth = (usableWidth - (this.totalDatasets - 1) * this.options.groupGap * bandWidth) / this.totalDatasets;
                const groupStartX = bandCenter - usableWidth / 2;
                xPos = groupStartX + this.datasetIndex * (barWidth + this.options.groupGap * bandWidth);
            }

            const targetY = yScale.getPixel(value);
            // Grow from bottom animation
            const currentY = zeroY + (targetY - zeroY) * progress;
            const barHeight = zeroY - currentY; // Note: Canvas Y is flipped
            
            let drawX = Math.round(xPos);
            let drawY = Math.round(currentY);
            let drawW = Math.max(1, Math.round(barWidth));
            let drawH = Math.round(barHeight);

            // Apply bounce animation to selected bars
            const bounceScale = this._getBounceScale(i);
            const isSelected = this._selectedPoints.has(i);
            if (bounceScale !== 1.0) {
                // Stretch height from base (zeroY) with bounce
                const extraH = drawH * (bounceScale - 1);
                drawH = Math.round(drawH * bounceScale);
                drawY = Math.round(value >= 0 ? currentY - extraH : currentY);
            }

            this._renderedBars.push({
                index: i,
                x: drawX,
                y: value >= 0 ? (bounceScale !== 1.0 ? drawY : drawY) : zeroY,
                width: drawW,
                height: Math.abs(drawH),
                value: value
            });

            ctx.fillStyle = this.dataset.color || '#000';
            if (this.options.borderRadius > 0) {
                this._roundedRect(ctx, drawX, value >= 0 ? drawY : zeroY, drawW, value >= 0 ? drawH : -drawH, this.options.borderRadius);
            } else {
                ctx.fillRect(drawX, value >= 0 ? drawY : zeroY, drawW, value >= 0 ? drawH : -drawH);
            }

            // Draw selection outline for selected bars
            if (isSelected) {
                ctx.save();
                ctx.strokeStyle = this.dataset.color || '#000';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                const selY = value >= 0 ? drawY : zeroY;
                const selH = value >= 0 ? drawH : -drawH;
                if (this.options.borderRadius > 0) {
                    // Re-use rounded rect path for stroke
                    ctx.beginPath();
                    const r = Math.min(this.options.borderRadius, Math.abs(selH) / 2, drawW / 2);
                    if (selH >= 0) {
                        ctx.moveTo(drawX, selY + selH);
                        ctx.lineTo(drawX + drawW, selY + selH);
                        ctx.lineTo(drawX + drawW, selY + r);
                        ctx.quadraticCurveTo(drawX + drawW, selY, drawX + drawW - r, selY);
                        ctx.lineTo(drawX + r, selY);
                        ctx.quadraticCurveTo(drawX, selY, drawX, selY + r);
                    } else {
                        ctx.moveTo(drawX, selY);
                        ctx.lineTo(drawX + drawW, selY);
                        ctx.lineTo(drawX + drawW, selY + selH - r);
                        ctx.quadraticCurveTo(drawX + drawW, selY + selH, drawX + drawW - r, selY + selH);
                        ctx.lineTo(drawX + r, selY + selH);
                        ctx.quadraticCurveTo(drawX, selY + selH, drawX, selY + selH - r);
                    }
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.strokeRect(drawX, selY, drawW, selH);
                }
                ctx.restore();
            }
        });

        ctx.restore();
    }

    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedBars) return;
        const bar = this._renderedBars.find(b => b.index === activeIndex);
        if (!bar) return;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // overlay
        
        if (this.options.borderRadius > 0) {
            const h = bar.value >= 0 ? bar.height : -bar.height;
            const y = bar.value >= 0 ? bar.y : bar.y - bar.height;
            this._roundedRect(ctx, bar.x, y, bar.width, h, this.options.borderRadius);
        } else {
            ctx.fillRect(bar.x, bar.value >= 0 ? bar.y : bar.y - bar.height, bar.width, bar.height);
        }
        ctx.restore();
    }

    /**
     * Toggle a data point selection with bounce animation
     */
    togglePoint(index) {
        const selecting = !this._selectedPoints.has(index);
        if (selecting) {
            this._selectedPoints.add(index);
        } else {
            this._selectedPoints.delete(index);
        }

        this._bounceAnims.set(index, { startTime: performance.now(), selecting });
        this._runBounceLoop();
    }

    /** @private */
    _runBounceLoop() {
        if (this._bounceRaf) return;
        const tick = () => {
            const now = performance.now();
            let anyActive = false;
            for (const [idx, anim] of this._bounceAnims) {
                if (now - anim.startTime >= 400) {
                    this._bounceAnims.delete(idx);
                } else {
                    anyActive = true;
                }
            }
            this.chart._render(false);
            if (anyActive) {
                this._bounceRaf = requestAnimationFrame(tick);
            } else {
                this._bounceRaf = null;
            }
        };
        this._bounceRaf = requestAnimationFrame(tick);
    }

    /** @private */
    _getBounceScale(index) {
        const anim = this._bounceAnims.get(index);
        if (!anim) return 1.0;
        const t = Math.min(1, (performance.now() - anim.startTime) / 400);
        const p = 0.3;
        const bounce = Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        return 1.0 + (bounce - 1) * 0.15; // subtle 15% bounce for bars
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedBars) return null;

        for (let bar of this._renderedBars) {
            const isInside = mouseX >= bar.x && mouseX <= bar.x + bar.width &&
                             mouseY >= (bar.value >= 0 ? bar.y : bar.y - bar.height) && 
                             mouseY <= (bar.value >= 0 ? bar.y + bar.height : bar.y);
            
            if (isInside) {
                return {
                    index: bar.index,
                    x: Math.round(bar.x + bar.width / 2) + 0.5,
                    y: bar.value >= 0 ? bar.y : bar.y + bar.height,
                    value: bar.value,
                    seriesName: this.dataset.name,
                    color: this.dataset.color,
                    datasetIndex: this.datasetIndex
                };
            }
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.BarSeries = BarSeries;


// ============================================================
// src/render/series/HorizontalBarSeries.js
// ============================================================

/**
 * Horizontal Bar Series Renderer
 * Handles rendering of horizontal bar charts (grouped and stacked).
 */
class HorizontalBarSeries {
    /**
     * @param {Object} chart - The main Chart instance
     * @param {Object} options - Series options
     */
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            borderRadius: 0,
            gap: 0.2, // Gap between categories
            groupGap: 0.05, // Gap between bars in a group
            stacked: false,
            visible: true
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this.datasetIndex = 0;
        this.totalDatasets = 1;
        this._selectedPoints = new Set();
        this._bounceAnims = new Map(); // index → { startTime, selecting }
    }

    /**
     * Set the index of this dataset among all bar datasets
     */
    setDatasetIndex(index, totalDatasets) {
        this.datasetIndex = index;
        this.totalDatasets = totalDatasets;
    }

    /**
     * @param {Object} dataset - The normalized dataset
     */
    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name,
            color: this.dataset.color,
            visible: this.visible,
            datasetIndex: this.options.datasetIndex,
            series: this
        }];
    }

    getBounds() {
        if (!this.dataset || !this.visible) return { minY: 0, maxY: 0 };
        const values = this.dataset.values.filter(v => v !== null && v !== undefined);
        if (values.length === 0) return { minY: 0, maxY: 0 };
        return {
            minY: Math.min(0, ...values), // bars usually start at 0
            maxY: Math.max(...values)
        };
    }

    /**
     * Helper to draw rect with rounded outer corners (right for positive, left for negative)
     */
    _roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        if (width < 0) {
            // Negative bar (goes left)
            const r = Math.min(radius, Math.abs(width) / 2, height / 2);
            ctx.moveTo(x, y);
            ctx.lineTo(x + width + r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(x + width, y + height, x + width + r, y + height);
            ctx.lineTo(x, y + height);
            ctx.closePath();
        } else {
            // Positive bar (goes right)
            const r = Math.min(radius, width / 2, height / 2);
            ctx.moveTo(x, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
            ctx.lineTo(x, y + height);
            ctx.closePath();
        }
        ctx.fill();
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || this.dataset.values.length === 0) return;

        ctx.save();
        ctx.fillStyle = this.dataset.color || '#000';

        // Clip to plot area so bars don't overflow past axes
        ctx.beginPath();
        ctx.rect(plotArea.left, plotArea.top, plotArea.width, plotArea.height);
        ctx.clip();

        // Clamp zeroX to plotArea left/right to prevent bars extending before y-axis
        const rawZeroX = xScale.getPixel(0);
        const zeroX = Math.max(plotArea.left, Math.min(plotArea.right, rawZeroX));
        this._renderedBars = [];

        this.dataset.values.forEach((value, i) => {
            if (value === null || value === undefined) return;

            // Y scale logic - assumes categorical scale on Y for horizontal bars
            const bandCenter = yScale.getPixel(i);
            const bandHeight = yScale.getBandWidth ? yScale.getBandWidth() : (plotArea.height / this.dataset.values.length);
            
            const usableHeight = bandHeight * (1 - this.options.gap);
            let barHeight, yPos;

            if (this.options.stacked) {
                barHeight = usableHeight;
                yPos = bandCenter - barHeight / 2;
                // Stacked X offset logic needs to be handled by Chart, assuming xScale provides it
            } else {
                barHeight = (usableHeight - (this.totalDatasets - 1) * this.options.groupGap * bandHeight) / this.totalDatasets;
                const groupStartY = bandCenter - usableHeight / 2;
                yPos = groupStartY + this.datasetIndex * (barHeight + this.options.groupGap * bandHeight);
            }

            const targetX = xScale.getPixel(value);
            // Grow from zeroX animation
            const currentX = zeroX + (targetX - zeroX) * progress;
            const barWidth = currentX - zeroX; 
            
            let drawX = Math.round(zeroX);
            let drawY = Math.round(yPos);
            let drawW = Math.round(barWidth);
            let drawH = Math.max(1, Math.round(barHeight));

            // Apply bounce animation to selected bars
            const bounceScale = this._getBounceScale(i);
            const isSelected = this._selectedPoints.has(i);
            if (bounceScale !== 1.0) {
                // Stretch width from base (zeroX) with bounce
                drawW = Math.round(drawW * bounceScale);
            }

            this._renderedBars.push({
                index: i,
                x: value >= 0 ? drawX : drawX + drawW, // Normalized x (leftmost)
                y: drawY,
                width: Math.abs(drawW), // Normalized width (positive)
                height: drawH,
                value: value,
                drawX: drawX,
                drawW: drawW
            });

            ctx.fillStyle = this.dataset.color || '#000';
            if (this.options.borderRadius > 0) {
                this._roundedRect(ctx, drawX, drawY, drawW, drawH, this.options.borderRadius);
            } else {
                ctx.fillRect(drawW < 0 ? drawX + drawW : drawX, drawY, Math.abs(drawW), drawH);
            }

            // Draw selection outline for selected bars
            if (isSelected) {
                ctx.save();
                ctx.strokeStyle = this.dataset.color || '#000';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                if (this.options.borderRadius > 0) {
                    // Re-use rounded rect path for stroke
                    ctx.beginPath();
                    if (drawW < 0) {
                        const r = Math.min(this.options.borderRadius, Math.abs(drawW) / 2, drawH / 2);
                        ctx.moveTo(drawX, drawY);
                        ctx.lineTo(drawX + drawW + r, drawY);
                        ctx.quadraticCurveTo(drawX + drawW, drawY, drawX + drawW, drawY + r);
                        ctx.lineTo(drawX + drawW, drawY + drawH - r);
                        ctx.quadraticCurveTo(drawX + drawW, drawY + drawH, drawX + drawW + r, drawY + drawH);
                        ctx.lineTo(drawX, drawY + drawH);
                    } else {
                        const r = Math.min(this.options.borderRadius, Math.abs(drawW) / 2, drawH / 2);
                        ctx.moveTo(drawX, drawY);
                        ctx.lineTo(drawX + drawW - r, drawY);
                        ctx.quadraticCurveTo(drawX + drawW, drawY, drawX + drawW, drawY + r);
                        ctx.lineTo(drawX + drawW, drawY + drawH - r);
                        ctx.quadraticCurveTo(drawX + drawW, drawY + drawH, drawX + drawW - r, drawY + drawH);
                        ctx.lineTo(drawX, drawY + drawH);
                    }
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    ctx.strokeRect(drawW < 0 ? drawX + drawW : drawX, drawY, Math.abs(drawW), drawH);
                }
                ctx.restore();
            }
        });

        ctx.restore();
    }

    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedBars) return;
        const bar = this._renderedBars.find(b => b.index === activeIndex);
        if (!bar) return;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // overlay
        
        if (this.options.borderRadius > 0) {
            this._roundedRect(ctx, bar.drawX, bar.y, bar.drawW, bar.height, this.options.borderRadius);
        } else {
            ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
        }
        ctx.restore();
    }

    /**
     * Toggle a data point selection with bounce animation
     */
    togglePoint(index) {
        const selecting = !this._selectedPoints.has(index);
        if (selecting) {
            this._selectedPoints.add(index);
        } else {
            this._selectedPoints.delete(index);
        }

        this._bounceAnims.set(index, { startTime: performance.now(), selecting });
        this._runBounceLoop();
    }

    /** @private */
    _runBounceLoop() {
        if (this._bounceRaf) return;
        const tick = () => {
            const now = performance.now();
            let anyActive = false;
            for (const [idx, anim] of this._bounceAnims) {
                if (now - anim.startTime >= 400) {
                    this._bounceAnims.delete(idx);
                } else {
                    anyActive = true;
                }
            }
            this.chart._render(false);
            if (anyActive) {
                this._bounceRaf = requestAnimationFrame(tick);
            } else {
                this._bounceRaf = null;
            }
        };
        this._bounceRaf = requestAnimationFrame(tick);
    }

    /** @private */
    _getBounceScale(index) {
        const anim = this._bounceAnims.get(index);
        if (!anim) return 1.0;
        const t = Math.min(1, (performance.now() - anim.startTime) / 400);
        const p = 0.3;
        const bounce = Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        return 1.0 + (bounce - 1) * 0.15; // subtle 15% bounce for bars
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedBars) return null;

        for (let bar of this._renderedBars) {
            const isInside = mouseX >= bar.x && mouseX <= bar.x + bar.width &&
                             mouseY >= bar.y && mouseY <= bar.y + bar.height;
            
            if (isInside) {
                return {
                    index: bar.index,
                    x: bar.value >= 0 ? bar.x + bar.width : bar.x,
                    y: Math.round(bar.y + bar.height / 2) + 0.5,
                    value: bar.value,
                    seriesName: this.dataset.name,
                    color: this.dataset.color,
                    datasetIndex: this.datasetIndex
                };
            }
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.HorizontalBarSeries = HorizontalBarSeries;


// ============================================================
// src/render/series/PieSeries.js
// ============================================================

/**
 * Pie and Donut Series Renderer
 * Supports hover explode effect and padAngle gaps between slices.
 */
class PieSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            innerRadius: 0,
            startAngle: -90,
            padAngle: 2,
            cornerRadius: 0,
            visible: true,
            showLabels: true,
            labelFormat: 'percent',
            animationStyle: 'bounce' // 'bounce' = drop-in, 'grow' = radius scale
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedSlices = [];
        this._colors = [];
        this._hoverIndex = -1;
        this._sliceAnims = new Map(); // index → { type: 'in'|'out', progress: 0-1 }
    }

    setData(dataset) {
        this.dataset = dataset;
        this._colors = [];
        if (dataset && dataset.values) {
            for (let i = 0; i < dataset.values.length; i++) {
                if (dataset.pointColors && dataset.pointColors[i]) {
                    // Per-data-point color from data (e.g. { color: '#ff0000cc' })
                    this._colors.push(dataset.pointColors[i]);
                } else if (dataset.colors && dataset.colors[i]) {
                    this._colors.push(dataset.colors[i]);
                } else if (window.CZ && window.CZ.ColorUtils) {
                    this._colors.push(window.CZ.ColorUtils.getSeriesColor(i));
                } else {
                    this._colors.push(dataset.color || '#3b82f6');
                }
            }
        }
    }

    getLegendItems() {
        if (!this.dataset || !this.dataset.values) return [];
        const labels = this.chart.normalizedData ? this.chart.normalizedData.labels : [];
        return this.dataset.values.map((val, i) => {
            const isHidden = this._hiddenSlices && this._hiddenSlices.has(i);
            const anim = this._sliceAnims ? this._sliceAnims.get(i) : null;
            const isExiting = anim && anim.type === 'out';
            return {
                name: labels[i] || ('Item ' + (i + 1)),
                color: this._colors[i] || '#000',
                visible: !isHidden && !isExiting,
                index: i,
                datasetIndex: i,
                series: this
            };
        });
    }

    getBounds() {
        return null;
    }

    /**
     * Set which slice is currently hovered (-1 = none)
     */
    setHoverIndex(index) {
        this._hoverIndex = index;
    }

    /**
     * Animate a slice in or out (toggle with animation)
     * @param {number} index - Slice index
     * @param {Function} onComplete - Callback when animation finishes
     */
    animateSliceToggle(index, onComplete) {
        if (!this._hiddenSlices) this._hiddenSlices = new Set();
        const isHiding = !this._hiddenSlices.has(index);
        const duration = 350; // ms
        const startTime = performance.now();

        // If showing, remove from hidden immediately so it draws during animation
        if (!isHiding) {
            this._hiddenSlices.delete(index);
        }

        this._sliceAnims.set(index, { type: isHiding ? 'out' : 'in', progress: 0 });

        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            this._sliceAnims.set(index, { type: isHiding ? 'out' : 'in', progress: t });

            // Re-render
            this.chart._render(false);

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                // Animation complete
                this._sliceAnims.delete(index);
                if (isHiding) {
                    this._hiddenSlices.add(index);
                }
                if (onComplete) onComplete();
                this.chart._render(false);
            }
        };
        requestAnimationFrame(tick);
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || !this.dataset.values || this.dataset.values.length === 0) return;

        const cx = plotArea.left + plotArea.width / 2;
        const cy = plotArea.top + plotArea.height / 2;
        const radius = Math.max(0, Math.min(plotArea.width, plotArea.height) / 2 * 0.82);
        const innerRadius = Math.max(0, radius * this.options.innerRadius);

        let startAngleRad = (this.options.startAngle * Math.PI) / 180;

        // Easing helpers for consistent animation (used in total calc AND visual)
        const _easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const _easeInCubic = (t) => t * t * t;

        // Calculate total: animate entering/exiting slices proportionally
        // IMPORTANT: use the same easing curve here as in the visual section
        // so angular redistribution stays perfectly in sync with the visual.
        let total = 0;
        for (let i = 0; i < this.dataset.values.length; i++) {
            const v = this.dataset.values[i] || 0;
            if (v <= 0) continue;
            const anim = this._sliceAnims.get(i);
            if (this._hiddenSlices && this._hiddenSlices.has(i) && !anim) continue;
            if (anim && anim.type === 'out') {
                const easedOut = _easeInCubic(anim.progress);
                total += v * (1 - easedOut);
            } else if (anim && anim.type === 'in') {
                const easedIn = _easeOutCubic(anim.progress);
                total += v * easedIn;
            } else {
                total += v;
            }
        }
        if (total === 0) {
            return;
        }

        this._renderedSlices = [];
        const values = this.dataset.values;
        const labels = this.chart.normalizedData ? this.chart.normalizedData.labels : [];
        const explodeOffset = 6;

        ctx.save();
        
        // Clip to plot area to prevent shadow bleeding
        ctx.beginPath();
        ctx.rect(plotArea.left - 10, plotArea.top - 10, plotArea.width + 20, plotArea.height + 20);
        ctx.clip();

        // Count visible slices for initial animation
        let visibleCount = 0;
        for (let i = 0; i < values.length; i++) {
            if (!values[i] || values[i] <= 0) continue;
            if (this._hiddenSlices && this._hiddenSlices.has(i) && !this._sliceAnims.has(i)) continue;
            visibleCount++;
        }

        // Easing function for initial page-load animation only
        const easeOutBack = (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        const animStyle = this.options.animationStyle || 'bounce';

        // First pass: draw non-hovered slices
        let angle = startAngleRad;
        const hlSlice = this._highlightSlice !== undefined ? this._highlightSlice : -1;
        let visibleIdx = 0;

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (!value || value <= 0) continue;
            
            const anim = this._sliceAnims.get(i);
            const isExiting = anim && anim.type === 'out';
            const isEntering = anim && anim.type === 'in';
            
            // Skip fully hidden (not animating) slices
            if (this._hiddenSlices && this._hiddenSlices.has(i) && !anim) continue;

            // Calculate effective fraction (animate for enter/exit)
            // Use the SAME easing as in total calculation for perfect sync
            let effectiveValue = value;
            if (isExiting) effectiveValue = value * (1 - _easeInCubic(anim.progress));
            if (isEntering) effectiveValue = value * _easeOutCubic(anim.progress);
            
            const fraction = total > 0 ? effectiveValue / total : 0;
            const sliceAngle = fraction * Math.PI * 2;
            const endAngle = angle + sliceAngle;
            const color = this._colors[i] || '#3b82f6';
            const isHovered = (i === this._hoverIndex);

            // Animation state
            let sliceProgress = 1;
            const dropDistance = radius * 0.4;
            let offsetX = 0, offsetY = 0, sliceAlpha = 1;
            let drawRadius = radius, drawInner = innerRadius;

            if (isExiting) {
                // Legend toggle out: smooth fade + angular shrink (in-place, no offset)
                // Angular shrink is handled by effectiveValue above.
                const t = _easeInCubic(anim.progress);
                sliceAlpha = Math.max(0, 1 - t);
            } else if (isEntering) {
                // Legend toggle in: smooth fade + angular grow (in-place, no offset)
                // Angular grow is handled by effectiveValue above.
                const t = _easeOutCubic(anim.progress);
                sliceAlpha = t;
            } else if (progress < 1) {
                // Initial page-load animation (bounce drop-in from outside)
                const sliceStart = visibleIdx / visibleCount;
                const sliceEnd = (visibleIdx + 1) / visibleCount;
                const overlap = 0.3 / visibleCount;
                const adjustedStart = Math.max(0, sliceStart - overlap);
                const wnd = sliceEnd - adjustedStart;
                const localT = (progress - adjustedStart) / wnd;
                sliceProgress = localT <= 0 ? 0 : localT >= 1 ? 1 : easeOutBack(Math.min(1, localT));
                
                if (animStyle === 'bounce') {
                    const midAngle = (angle + endAngle) / 2;
                    offsetX = Math.cos(midAngle) * dropDistance * (1 - sliceProgress);
                    offsetY = Math.sin(midAngle) * dropDistance * (1 - sliceProgress);
                } else {
                    drawRadius = radius * sliceProgress;
                    drawInner = innerRadius * sliceProgress;
                }
                sliceAlpha = Math.min(1, sliceProgress * 1.5);
            }

            this._renderedSlices.push({
                index: i,
                cx, cy,
                radius, innerRadius,
                startAngleRad: angle,
                endAngleRad: endAngle,
                value, fraction, color,
                label: labels[i] || ('Item ' + (i + 1))
            });

            // Skip active slice in first pass
            const hasActiveAnims = this._sliceAnims.size > 0;
            const isActive = isHovered || (!hasActiveAnims && hlSlice >= 0 && hlSlice === i);
            if (!isActive && (sliceProgress > 0 || isExiting || isEntering)) {
                // Don't apply highlight dimming while toggle animations are running
                const applyHighlight = hlSlice >= 0 && !hasActiveAnims;
                ctx.globalAlpha = applyHighlight ? 0.2 * sliceAlpha : sliceAlpha;
                this._drawSlice(ctx, cx, cy, drawRadius, drawInner, angle, endAngle, color, offsetX, offsetY);
                ctx.globalAlpha = 1.0;
            }

            visibleIdx++;
            angle = endAngle;
        }

        // Draw white gaps between slices
        if (this.options.padAngle > 0 && values.length > 1) {
            const bgColor = this._getBackgroundColor();
            ctx.strokeStyle = bgColor;
            ctx.lineWidth = this.options.padAngle;
            for (const slice of this._renderedSlices) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(
                    cx + Math.cos(slice.startAngleRad) * (radius + 1),
                    cy + Math.sin(slice.startAngleRad) * (radius + 1)
                );
                ctx.stroke();
                // Also draw inner-to-outer line at end of each slice
                if (innerRadius > 0) {
                    ctx.beginPath();
                    ctx.moveTo(
                        cx + Math.cos(slice.startAngleRad) * innerRadius,
                        cy + Math.sin(slice.startAngleRad) * innerRadius
                    );
                    ctx.lineTo(
                        cx + Math.cos(slice.startAngleRad) * radius,
                        cy + Math.sin(slice.startAngleRad) * radius
                    );
                    ctx.stroke();
                }
            }
        }

        // Second pass: draw active slice ON TOP with grown radius (no translate)
        // Active = hovered via mouse OR highlighted via legend hover (but NOT during toggle animations)
        const hasAnims = this._sliceAnims.size > 0;
        const activeIdx = this._hoverIndex >= 0 ? this._hoverIndex : (!hasAnims && hlSlice >= 0 ? hlSlice : -1);
        const growPx = 6;

        if (activeIdx >= 0 && progress >= 1) {
            const hSlice = this._renderedSlices.find(s => s.index === activeIdx);
            if (hSlice) {
                // Shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                // Draw slice with increased radius (no translate)
                ctx.globalAlpha = 1.0;
                const grownInner = innerRadius > 0 ? Math.max(0, innerRadius - 2) : 0;
                this._drawSlice(
                    ctx, cx, cy,
                    radius + growPx, grownInner,
                    hSlice.startAngleRad, hSlice.endAngleRad,
                    hSlice.color,
                    0, 0
                );

                // White edge highlight
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(cx, cy, radius + growPx, hSlice.startAngleRad, hSlice.endAngleRad);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Draw labels only when fully grown
        if (this.options.showLabels && progress >= 1) {
            this._drawLabels(ctx, cx, cy, radius, innerRadius, total, activeIdx, growPx);
        }

        ctx.restore();
    }

    /** @private */
    _drawSlice(ctx, cx, cy, outerR, innerR, startAngle, endAngle, fillColor, offsetX, offsetY) {
        outerR = Math.max(0, outerR);
        innerR = Math.max(0, innerR);
        if (outerR === 0) return;
        ctx.beginPath();
        ctx.arc(cx + offsetX, cy + offsetY, outerR, startAngle, endAngle);
        if (innerR > 0) {
            ctx.arc(cx + offsetX, cy + offsetY, innerR, endAngle, startAngle, true);
        } else {
            ctx.lineTo(cx + offsetX, cy + offsetY);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    /** @private */
    _getBackgroundColor() {
        if (this.chart && this.chart._theme && this.chart._theme.background) {
            return this.chart._theme.background;
        }
        return '#ffffff';
    }

    /** @private */
    _drawLabels(ctx, cx, cy, radius, innerRadius, total, activeIdx, growPx) {
        ctx.save();
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const slice of this._renderedSlices) {
            if (slice.fraction < 0.04) continue;

            const isActive = (slice.index === activeIdx);
            const sliceRadius = isActive ? radius + (growPx || 0) : radius;
            const sliceInner = isActive && innerRadius > 0 ? Math.max(0, innerRadius - 2) : innerRadius;

            const midAngle = (slice.startAngleRad + slice.endAngleRad) / 2;
            const labelR = sliceInner > 0
                ? (sliceInner + sliceRadius) / 2
                : sliceRadius * 0.65;
            const lx = cx + Math.cos(midAngle) * labelR;
            const ly = cy + Math.sin(midAngle) * labelR;

            let text = '';
            if (this.options.labelFormat === 'percent') {
                text = Math.round(slice.fraction * 100) + '%';
            } else if (this.options.labelFormat === 'value') {
                text = String(slice.value);
            } else {
                text = slice.label;
            }

            // Active label slightly bolder
            if (isActive) {
                ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            } else {
                ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            }

            ctx.fillStyle = '#fff';
            ctx.fillText(text, lx, ly);
        }
        ctx.restore();
    }

    /**
     * Pie hover is handled by re-rendering the main canvas (not overlay).
     * This method is intentionally minimal — the actual effect is in draw().
     */
    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        // No-op: pie hover is handled via setHoverIndex + main canvas re-render
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedSlices) return null;

        for (let slice of this._renderedSlices) {
            const dx = mouseX - slice.cx;
            const dy = mouseY - slice.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= slice.innerRadius && dist <= slice.radius) {
                let angle = Math.atan2(dy, dx);
                if (angle < 0) angle += Math.PI * 2;

                let start = slice.startAngleRad % (Math.PI * 2);
                let end = slice.endAngleRad % (Math.PI * 2);
                if (start < 0) start += Math.PI * 2;
                if (end < 0) end += Math.PI * 2;

                let inSlice = false;
                if (start <= end) {
                    inSlice = angle >= start && angle <= end;
                } else {
                    inSlice = angle >= start || angle <= end;
                }

                if (inSlice) {
                    return {
                        index: slice.index,
                        x: mouseX,
                        y: mouseY,
                        value: slice.value,
                        seriesName: this.dataset.name,
                        color: slice.color,
                        label: slice.label
                    };
                }
            }
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.PieSeries = PieSeries;


// ============================================================
// src/render/series/ScatterSeries.js
// ============================================================

/**
 * Scatter Series Renderer
 */
class ScatterSeries {
    /**
     * @param {Object} chart - The main Chart instance
     * @param {Object} options - Series options
     */
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            pointShape: 'circle', // circle, square, triangle, diamond
            baseRadius: 5,
            visible: true
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._selectedPoints = new Set();
        this._bounceAnims = new Map(); // index → { startTime, selecting }
    }

    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name,
            color: this.dataset.color,
            visible: this.visible,
            datasetIndex: this.options.datasetIndex,
            series: this
        }];
    }

    getBounds() {
        if (!this.dataset || !this.visible || !this.dataset.points) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        const xs = this.dataset.points.map(p => p.x).filter(v => v !== null && v !== undefined);
        const ys = this.dataset.points.map(p => p.y).filter(v => v !== null && v !== undefined);
        if (xs.length === 0 || ys.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };
    }

    _drawShape(ctx, shape, x, y, r) {
        ctx.beginPath();
        switch(shape) {
            case 'square':
                ctx.rect(x - r, y - r, r * 2, r * 2);
                break;
            case 'triangle':
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y + r);
                ctx.lineTo(x - r, y + r);
                ctx.closePath();
                break;
            case 'diamond':
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r, y);
                ctx.closePath();
                break;
            case 'circle':
            default:
                ctx.arc(x, y, r, 0, Math.PI * 2);
                break;
        }
        ctx.fill();
        ctx.stroke();
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || !this.dataset.points) return;

        const color = this.dataset.color || '#000';
        const bgColor = this._getBackgroundColor();

        ctx.save();
        ctx.globalAlpha = progress; // Fade in animation

        this._renderedPoints = [];

        this.dataset.points.forEach((pt, i) => {
            if (pt.x === null || pt.y === null) return;
            
            const px = Math.round(xScale.getPixel(pt.x)) + 0.5;
            const py = Math.round(yScale.getPixel(pt.y)) + 0.5;
            
            let r = this.options.baseRadius;
            if (this.dataset.sizes && this.dataset.sizes[i]) {
                r = this.dataset.sizes[i];
            }
            r *= progress; // Scale up animation

            this._renderedPoints.push({
                index: i, x: px, y: py,
                valueX: pt.x, valueY: pt.y, r: r
            });

            // Skip selected points in first pass
            if (this._selectedPoints.has(i)) return;

            ctx.fillStyle = color;
            ctx.strokeStyle = bgColor;
            ctx.lineWidth = 1.5;
            this._drawShape(ctx, this.options.pointShape, px, py, Math.max(0.1, r));
        });

        ctx.restore();

        // Second pass: selected points — hollow ring + center dot with bounce
        if (this._selectedPoints.size > 0) {
            ctx.save();
            for (const pt of this._renderedPoints) {
                if (!this._selectedPoints.has(pt.index)) continue;
                const bounceScale = this._getBounceScale(pt.index);
                const r = Math.max(3, pt.r * 1.2) * bounceScale;

                // Mask + hollow circle
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r + 2, 0, Math.PI * 2);
                ctx.fillStyle = bgColor;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fillStyle = bgColor;
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Center dot
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2.5 * bounceScale, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.restore();
        }
    }

    /**
     * Toggle a data point selection with bounce animation
     */
    togglePoint(index) {
        const selecting = !this._selectedPoints.has(index);
        if (selecting) {
            this._selectedPoints.add(index);
        } else {
            this._selectedPoints.delete(index);
        }

        this._bounceAnims.set(index, { startTime: performance.now(), selecting });
        this._runBounceLoop();
    }

    /** @private */
    _runBounceLoop() {
        if (this._bounceRaf) return;
        const tick = () => {
            const now = performance.now();
            let anyActive = false;
            for (const [idx, anim] of this._bounceAnims) {
                if (now - anim.startTime >= 400) {
                    this._bounceAnims.delete(idx);
                } else {
                    anyActive = true;
                }
            }
            this.chart._render(false);
            if (anyActive) {
                this._bounceRaf = requestAnimationFrame(tick);
            } else {
                this._bounceRaf = null;
            }
        };
        this._bounceRaf = requestAnimationFrame(tick);
    }

    /** @private */
    _getBounceScale(index) {
        const anim = this._bounceAnims.get(index);
        if (!anim) return 1.0;
        const t = Math.min(1, (performance.now() - anim.startTime) / 400);
        const p = 0.3;
        const bounce = Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        return 1.0 + (bounce - 1) * 0.8;
    }

    /**
     * Get chart background color from theme
     */
    _getBackgroundColor() {
        return (this.chart._theme && this.chart._theme.background) || '#ffffff';
    }

    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedPoints) return;
        const pt = this._renderedPoints.find(p => p.index === activeIndex);
        if (!pt) return;

        const r = Math.max(3, pt.r * 1.2);
        const color = this.dataset.color || '#000';
        const bgColor = this._getBackgroundColor();

        ctx.save();

        // Mask + hollow circle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedPoints) return null;

        let nearest = null;
        let minDist = 15; // Proximity threshold

        for (let pt of this._renderedPoints) {
            const dx = mouseX - pt.x;
            const dy = mouseY - pt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = pt;
            }
        }

        if (nearest) {
            return {
                index: nearest.index,
                x: nearest.x,
                y: nearest.y,
                value: { x: nearest.valueX, y: nearest.valueY },
                seriesName: this.dataset.name,
                color: this.dataset.color
            };
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.ScatterSeries = ScatterSeries;


// ============================================================
// src/render/series/RadarSeries.js
// ============================================================

/**
 * Radar/Spider Series Renderer
 */
class RadarSeries {
    /**
     * @param {Object} chart - The main Chart instance
     * @param {Object} options - Series options
     */
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            fillOpacity: 0.3,
            gridType: 'polygon', // polygon or circle
            levels: 5,
            visible: true
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._selectedPoints = new Set();
        this._bounceAnims = new Map(); // index → { startTime, selecting }
    }

    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name,
            color: this.dataset.color,
            visible: this.visible,
            datasetIndex: this.options.datasetIndex,
            series: this
        }];
    }

    getBounds() {
        return null; // Custom radial scale
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || this.dataset.values.length === 0) return;

        const cx = plotArea.left + plotArea.width / 2;
        const cy = plotArea.top + plotArea.height / 2;
        const radius = Math.min(plotArea.width, plotArea.height) / 2 * 0.75;
        const sides = this.dataset.values.length;
        const angleStep = (Math.PI * 2) / sides;
        
        // Find max value across dataset for scaling
        const maxVal = Math.max(...this.dataset.values, 1); // Simple max, real chart would share scale across datasets

        ctx.save();
        
        // Draw Grid
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        
        for (let lvl = 1; lvl <= this.options.levels; lvl++) {
            const r = radius * (lvl / this.options.levels);
            ctx.beginPath();
            if (this.options.gridType === 'circle') {
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
            } else {
                for (let i = 0; i < sides; i++) {
                    const a = i * angleStep - Math.PI / 2;
                    const px = cx + Math.cos(a) * r;
                    const py = cy + Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
            }
            ctx.stroke();
        }

        // Draw Axes
        for (let i = 0; i < sides; i++) {
            const a = i * angleStep - Math.PI / 2;
            const px = cx + Math.cos(a) * radius;
            const py = cy + Math.sin(a) * radius;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.stroke();
        }

        // Draw Data Polygon
        this._renderedPoints = [];
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const val = this.dataset.values[i] || 0;
            const scaledR = radius * (val / maxVal) * progress;
            const a = i * angleStep - Math.PI / 2;
            const px = cx + Math.cos(a) * scaledR;
            const py = cy + Math.sin(a) * scaledR;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);

            this._renderedPoints.push({
                index: i,
                x: px,
                y: py,
                value: val
            });
        }
        ctx.closePath();

        // Fill Data Polygon
        const color = this.dataset.color || '#000';
        ctx.fillStyle = window.CZ && window.CZ.ColorUtils ? window.CZ.ColorUtils.withAlpha(color, this.options.fillOpacity) : 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Stroke Data Polygon
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw normal (non-selected) data points
        const bgColor = this._getBackgroundColor();
        for (const pt of this._renderedPoints) {
            if (this._selectedPoints.has(pt.index)) continue;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = bgColor;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();

        // Selected points — hollow ring + center dot with bounce
        if (this._selectedPoints.size > 0) {
            ctx.save();
            const bgColor = this._getBackgroundColor();
            for (const pt of this._renderedPoints) {
                if (!this._selectedPoints.has(pt.index)) continue;
                const bounceScale = this._getBounceScale(pt.index);
                const r = 8 * bounceScale;

                // Mask + hollow circle
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r + 2, 0, Math.PI * 2);
                ctx.fillStyle = bgColor;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fillStyle = bgColor;
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Center dot
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2.5 * bounceScale, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }
            ctx.restore();
        }
    }

    /**
     * Get chart background color from theme
     */
    _getBackgroundColor() {
        return (this.chart._theme && this.chart._theme.background) || '#ffffff';
    }

    /**
     * Toggle a data point selection with bounce animation
     */
    togglePoint(index) {
        const selecting = !this._selectedPoints.has(index);
        if (selecting) {
            this._selectedPoints.add(index);
        } else {
            this._selectedPoints.delete(index);
        }

        this._bounceAnims.set(index, { startTime: performance.now(), selecting });
        this._runBounceLoop();
    }

    /** @private */
    _runBounceLoop() {
        if (this._bounceRaf) return;
        const tick = () => {
            const now = performance.now();
            let anyActive = false;
            for (const [idx, anim] of this._bounceAnims) {
                if (now - anim.startTime >= 400) {
                    this._bounceAnims.delete(idx);
                } else {
                    anyActive = true;
                }
            }
            this.chart._render(false);
            if (anyActive) {
                this._bounceRaf = requestAnimationFrame(tick);
            } else {
                this._bounceRaf = null;
            }
        };
        this._bounceRaf = requestAnimationFrame(tick);
    }

    /** @private */
    _getBounceScale(index) {
        const anim = this._bounceAnims.get(index);
        if (!anim) return 1.0;
        const t = Math.min(1, (performance.now() - anim.startTime) / 400);
        const p = 0.3;
        const bounce = Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        return 1.0 + (bounce - 1) * 0.8;
    }

    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedPoints) return;
        const pt = this._renderedPoints.find(p => p.index === activeIndex);
        if (!pt) return;

        const r = 8;
        const color = this.dataset.color || '#000';
        const bgColor = this._getBackgroundColor();

        ctx.save();

        // Mask + hollow circle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedPoints) return null;

        let nearest = null;
        let minDist = 20;

        for (let pt of this._renderedPoints) {
            const dist = Math.sqrt(Math.pow(mouseX - pt.x, 2) + Math.pow(mouseY - pt.y, 2));
            if (dist < minDist) {
                minDist = dist;
                nearest = pt;
            }
        }

        if (nearest) {
            return {
                index: nearest.index,
                x: nearest.x,
                y: nearest.y,
                value: nearest.value,
                seriesName: this.dataset.name,
                color: this.dataset.color
            };
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.RadarSeries = RadarSeries;


// ============================================================
// src/render/series/GaugeSeries.js
// ============================================================

class GaugeSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            min: 0,
            max: 100,
            arcWidth: 0.15,
            zones: [
                { min: 0, max: 50, color: '#10b981' },
                { min: 50, max: 75, color: '#f59e0b' },
                { min: 75, max: 100, color: '#ef4444' }
            ],
            showValue: true,
            valueFormat: null,
            visible: true
        }, options);
        
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedPoints = [];
    }

    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset || !this.options.visible) {
            return [];
        }
        
        return [{
            name: this.dataset.name || 'Gauge',
            color: this.dataset.color || '#333',
            visible: this.options.visible,
            datasetIndex: this.dataset.index || 0
        }];
    }

    getBounds() {
        return null;
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.visible || !this.dataset) return;

        const { min, max, zones, arcWidth: arcWidthRatio, showValue, valueFormat } = this.options;
        const range = max - min;
        
        // Calculate center and radius
        const cx = plotArea.left + plotArea.width / 2;
        const cy = plotArea.top + plotArea.height * 0.85; // Move center up slightly to fit value text
        const maxRadius = Math.min(plotArea.width / 2, plotArea.height * 0.8);
        const arcWidth = maxRadius * arcWidthRatio;
        const radius = maxRadius - arcWidth / 2;

        ctx.save();

        // 1. Draw background arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.lineWidth = arcWidth;
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineCap = 'butt';
        ctx.stroke();

        // 2. Draw colored zones
        if (zones && zones.length > 0) {
            for (const zone of zones) {
                // Clamp zones to min/max
                const zoneMin = Math.max(min, zone.min);
                const zoneMax = Math.min(max, zone.max);
                if (zoneMin >= zoneMax) continue;

                const startAngle = Math.PI + ((zoneMin - min) / range) * Math.PI;
                const endAngle = Math.PI + ((zoneMax - min) / range) * Math.PI;
                
                ctx.beginPath();
                ctx.arc(cx, cy, radius, startAngle, endAngle);
                ctx.lineWidth = arcWidth;
                ctx.strokeStyle = zone.color;
                ctx.stroke();
            }
        }

        // 3. Draw tick marks around the arc
        const tickCount = 10;
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        for (let i = 0; i <= tickCount; i++) {
            const angle = Math.PI + (i / tickCount) * Math.PI;
            // ticks on the inner edge of the arc
            const innerR = radius - arcWidth / 2;
            const outerR = innerR - (maxRadius * 0.05); // tick length
            
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
            ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
            ctx.stroke();
        }

        this._renderedPoints = [];

        // 4. Draw needles
        const values = this.dataset.values || (this.dataset.data ? this.dataset.data : []);
        const datasetColor = this.dataset.color || '#374151';
        
        for (let i = 0; i < values.length; i++) {
            let val = values[i];
            if (typeof val === 'object' && val !== null) {
                val = val.y !== undefined ? val.y : val.value;
            }
            
            // Animate value based on progress
            const targetVal = min + (val - min) * progress;
            const clampedVal = Math.max(min, Math.min(max, targetVal));
            const angle = Math.PI + ((clampedVal - min) / range) * Math.PI;

            // Store for hit testing (even though it returns null, keeping state is good practice)
            this._renderedPoints.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius,
                value: val
            });

            ctx.save();
            
            // Needle shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Needle
            const needleLen = radius - arcWidth / 2 - (maxRadius * 0.05);
            const needleBase = maxRadius * 0.06;

            ctx.translate(cx, cy);
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, -needleBase / 2);
            ctx.lineTo(needleLen, 0);
            ctx.lineTo(0, needleBase / 2);
            ctx.closePath();
            
            ctx.fillStyle = datasetColor;
            ctx.fill();
            
            ctx.restore();
        }

        // 5. Draw center circle (hub)
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#1f2937';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = '#f9fafb';
        ctx.fill();

        // 6. Draw value text below the arc
        if (showValue && values.length > 0) {
            let displayVal = values[values.length - 1]; // Use last value in array
            if (typeof displayVal === 'object' && displayVal !== null) {
                displayVal = displayVal.y !== undefined ? displayVal.y : displayVal.value;
            }
            
            const rawVal = displayVal;
            if (valueFormat && typeof valueFormat === 'function') {
                displayVal = valueFormat(displayVal);
            } else {
                displayVal = Math.round(displayVal).toString();
            }
            
            // Animated value for visual smoothness
            let animatedDisplayVal = min + (rawVal - min) * progress;
            if (valueFormat && typeof valueFormat === 'function') {
                animatedDisplayVal = valueFormat(animatedDisplayVal);
            } else {
                animatedDisplayVal = Math.round(animatedDisplayVal).toString();
            }
            
            ctx.font = `bold ${Math.max(14, Math.min(36, maxRadius * 0.12))}px sans-serif`;
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(animatedDisplayVal, cx, cy + maxRadius * 0.08);
        }

        ctx.restore();
    }

    drawHover() {
        // No-op for gauge
    }

    hitTest() {
        // Gauge doesn't need hit testing
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.GaugeSeries = GaugeSeries;


// ============================================================
// src/render/series/CandlestickSeries.js
// ============================================================

/**
 * Candlestick/OHLC Series Renderer
 * For financial stock price data (Open, High, Low, Close).
 */
class CandlestickSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            bullishColor: '#10b981',
            bearishColor: '#ef4444',
            wickWidth: 1.5,
            bodyWidth: 0.6,
            visible: true
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedBars = [];
    }

    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name || 'OHLC',
            color: this.options.bullishColor,
            visible: this.visible,
            datasetIndex: this.options.datasetIndex
        }];
    }

    getBounds() {
        if (!this.dataset || !this.visible || !this.dataset.ohlc) return { minY: 0, maxY: 100 };
        let minY = Infinity, maxY = -Infinity;
        for (const pt of this.dataset.ohlc) {
            if (pt.low < minY) minY = pt.low;
            if (pt.high > maxY) maxY = pt.high;
        }
        if (!isFinite(minY)) return { minY: 0, maxY: 100 };
        return { minY, maxY };
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || !this.dataset.ohlc || this.dataset.ohlc.length === 0) return;

        const ohlc = this.dataset.ohlc;
        const count = ohlc.length;
        const bandWidth = xScale.getBandWidth ? xScale.getBandWidth() : (plotArea.width / count);
        const bodyWidth = bandWidth * this.options.bodyWidth;
        const halfBody = bodyWidth / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(plotArea.left, plotArea.top, plotArea.width, plotArea.height);
        ctx.clip();

        this._renderedBars = [];

        for (let i = 0; i < count; i++) {
            const pt = ohlc[i];
            if (!pt) continue;

            const x = Math.round(xScale.getPixel(i)) + 0.5;
            const yHigh = yScale.getPixel(pt.high);
            const yLow = yScale.getPixel(pt.low);
            const yOpen = yScale.getPixel(pt.open);
            const yClose = yScale.getPixel(pt.close);

            const isBullish = pt.close >= pt.open;
            const color = isBullish ? this.options.bullishColor : this.options.bearishColor;

            // Animate from center
            const center = (yOpen + yClose) / 2;
            const aOpen = center + (yOpen - center) * progress;
            const aClose = center + (yClose - center) * progress;
            const aHigh = center + (yHigh - center) * progress;
            const aLow = center + (yLow - center) * progress;

            // Draw wick (thin line from high to low)
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = this.options.wickWidth;
            ctx.moveTo(x, aHigh);
            ctx.lineTo(x, aLow);
            ctx.stroke();

            // Draw body (rectangle between open and close)
            const bodyTop = Math.min(aOpen, aClose);
            const bodyHeight = Math.max(1, Math.abs(aOpen - aClose));

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x - halfBody, bodyTop, bodyWidth, bodyHeight);
            ctx.globalAlpha = 1.0;

            // Body border
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - halfBody, bodyTop, bodyWidth, bodyHeight);

            // Doji indicator (cross when open ≈ close)
            if (Math.abs(pt.open - pt.close) < 0.01) {
                ctx.beginPath();
                ctx.moveTo(x - halfBody, center);
                ctx.lineTo(x + halfBody, center);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            this._renderedBars.push({
                index: i,
                x: x - halfBody,
                y: bodyTop,
                width: bodyWidth,
                height: bodyHeight,
                value: pt.close,
                ohlc: pt,
                isBullish
            });
        }

        ctx.restore();
    }

    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedBars) return;
        const bar = this._renderedBars.find(b => b.index === activeIndex);
        if (!bar) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bar.x - 2, bar.y - 2, bar.width + 4, bar.height + 4);
        ctx.restore();
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedBars) return null;

        for (const bar of this._renderedBars) {
            const padding = 5;
            if (mouseX >= bar.x - padding && mouseX <= bar.x + bar.width + padding &&
                mouseY >= bar.y - padding && mouseY <= bar.y + bar.height + padding) {
                return {
                    index: bar.index,
                    x: bar.x + bar.width / 2,
                    y: bar.y,
                    value: bar.ohlc,
                    seriesName: this.dataset.name || 'OHLC',
                    color: bar.isBullish ? this.options.bullishColor : this.options.bearishColor
                };
            }
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.CandlestickSeries = CandlestickSeries;


// ============================================================
// src/render/series/FunnelSeries.js
// ============================================================

class FunnelSeries {
    constructor(chart, options) {
        this.chart = chart;
        this.options = Object.assign({
            gapBetweenSections: 2,
            neckWidth: 0.3,
            showLabels: true,
            labelPosition: 'center',
            visible: true
        }, options);
        
        this._colors = [];
        this._hiddenSlices = new Set();
        this._hoverIndex = -1;
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedSlices = [];
    }

    setData(dataset) {
        this.dataset = dataset;
        this._colors = [];
        const numItems = (this.dataset.values || []).length;
        
        // Use per-item colors from data if available, otherwise auto-generate
        for (let i = 0; i < numItems; i++) {
            if (dataset.pointColors && dataset.pointColors[i]) {
                this._colors.push(dataset.pointColors[i]);
            } else if (window.CZ && window.CZ.ColorUtils) {
                this._colors.push(window.CZ.ColorUtils.getSeriesColor(i));
            } else {
                const fallbackColors = ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949'];
                this._colors.push(fallbackColors[i % fallbackColors.length]);
            }
        }
    }

    getLegendItems() {
        if (!this.dataset || !this.dataset.values) return [];
        
        const labels = this.chart.normalizedData && this.chart.normalizedData.labels 
            ? this.chart.normalizedData.labels 
            : [];
        const items = [];
        
        for (let i = 0; i < this.dataset.values.length; i++) {
            const label = labels[i] || `Item ${i + 1}`;
            items.push({
                name: label,
                color: this._colors[i],
                visible: !this._hiddenSlices.has(i),
                datasetIndex: i
            });
        }
        
        return items;
    }

    getBounds() {
        // Radial/custom layout does not use cartesian bounds
        return null;
    }

    setHoverIndex(index) {
        this._hoverIndex = index;
    }

    draw(ctx, plotArea, xScale, yScale, progress = 1) {
        if (!this.options.visible || !this.dataset || !this.dataset.values || this.dataset.values.length === 0) return;

        const values = this.dataset.values;
        const labels = this.chart.normalizedData && this.chart.normalizedData.labels ? this.chart.normalizedData.labels : [];
        const numSections = values.length;
        
        let visibleCount = 0;
        let maxValue = 0;
        
        for (let i = 0; i < numSections; i++) {
            if (!this._hiddenSlices.has(i)) {
                visibleCount++;
                if (values[i] > maxValue) {
                    maxValue = values[i];
                }
            }
        }
        
        if (visibleCount === 0 || maxValue === 0) return;
        
        const maxWidth = plotArea.width * 0.8;
        const totalHeight = plotArea.height;
        const gap = this.options.gapBetweenSections;
        const sectionHeight = (totalHeight - gap * (visibleCount - 1)) / visibleCount;
        
        const centerX = plotArea.left + plotArea.width / 2;
        // Slide from top based on progress
        let currentY = plotArea.top + totalHeight * (1 - progress); 
        
        this._renderedSlices = [];
        
        let visibleIndex = 0;
        
        for (let i = 0; i < numSections; i++) {
            if (this._hiddenSlices.has(i)) continue;
            
            const value = values[i];
            const topWidthRatio = value / maxValue;
            
            let nextValue = 0;
            // Find next visible value
            for (let j = i + 1; j < numSections; j++) {
                if (!this._hiddenSlices.has(j)) {
                    nextValue = values[j];
                    break;
                }
            }
            
            let bottomWidthRatio = nextValue > 0 ? (nextValue / maxValue) : this.options.neckWidth;
            if (visibleIndex === visibleCount - 1) {
                // Last section: taper to neckWidth but never wider than the top
                bottomWidthRatio = Math.min(this.options.neckWidth, topWidthRatio * 0.3);
            }
            // Never make bottom wider than top (prevents inverted trapezoid)
            bottomWidthRatio = Math.min(bottomWidthRatio, topWidthRatio);
            
            const topWidth = maxWidth * topWidthRatio;
            const bottomWidth = maxWidth * bottomWidthRatio;
            
            const isHovered = i === this._hoverIndex;
            const scale = isHovered ? 1.05 : 1;
            
            const renderTopWidth = topWidth * scale;
            const renderBottomWidth = bottomWidth * scale;
            
            const topLeft = { x: centerX - renderTopWidth / 2, y: currentY };
            const topRight = { x: centerX + renderTopWidth / 2, y: currentY };
            const bottomLeft = { x: centerX - renderBottomWidth / 2, y: currentY + sectionHeight };
            const bottomRight = { x: centerX + renderBottomWidth / 2, y: currentY + sectionHeight };
            
            const poly = [topLeft, topRight, bottomRight, bottomLeft];
            this._renderedSlices.push({ index: i, poly, value });
            
            ctx.save();
            
            // Legend hover highlight: dim non-highlighted sections
            const highlightIdx = this._highlightSlice !== undefined ? this._highlightSlice : -1;
            const isDimmed = highlightIdx >= 0 && i !== highlightIdx;
            ctx.globalAlpha = progress * (isDimmed ? 0.15 : 1.0);
            
            if (isHovered) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 5;
            }
            
            ctx.beginPath();
            ctx.moveTo(topLeft.x, topLeft.y);
            ctx.lineTo(topRight.x, topRight.y);
            ctx.lineTo(bottomRight.x, bottomRight.y);
            ctx.lineTo(bottomLeft.x, bottomLeft.y);
            ctx.closePath();
            
            const color = this._colors[i];
            const grad = ctx.createLinearGradient(topLeft.x, topLeft.y, topRight.x, topLeft.y);
            grad.addColorStop(0, this._adjustColor(color, -30));
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, this._adjustColor(color, -30));
            
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.restore();
            
            if (this.options.showLabels) {
                ctx.save();
                ctx.globalAlpha = progress * (isDimmed ? 0.15 : 1.0);
                const label = labels[i] || `Item ${i + 1}`;
                const total = values.reduce((sum, val, idx) => sum + (this._hiddenSlices.has(idx) ? 0 : val), 0);
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                const text = percent;
                
                // Auto-size font to fit within the section
                const avgWidth = (topWidth + bottomWidth) / 2;
                const fontSize = Math.max(10, Math.min(14, avgWidth * 0.12, sectionHeight * 0.5));
                
                // Skip text if section is too small to display it
                const textFits = avgWidth > 30 && sectionHeight > 16 && fontSize >= 10;
                
                if (textFits) {
                    ctx.fillStyle = isHovered ? '#000' : '#333';
                    ctx.font = isHovered ? `bold ${fontSize}px Arial, sans-serif` : `${fontSize}px Arial, sans-serif`;
                    
                    const yCenter = currentY + sectionHeight / 2;
                    
                    if (this.options.labelPosition === 'center') {
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#ffffff';
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = 4;
                        ctx.fillText(text, centerX, yCenter);
                    } else {
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        const xRight = centerX + maxWidth / 2 + 15;
                        ctx.fillText(text, xRight, yCenter);
                        
                        ctx.beginPath();
                        const edgeX = centerX + (topWidth + bottomWidth) / 4;
                        ctx.moveTo(edgeX, yCenter);
                        ctx.lineTo(xRight - 5, yCenter);
                        ctx.strokeStyle = '#999999';
                        ctx.stroke();
                    }
                }
                
                ctx.restore();
            }
            
            currentY += sectionHeight + gap;
            visibleIndex++;
        }
    }

    _adjustColor(color, amount) {
        if (!color) return '#000000';
        
        let r, g, b;
        
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 3) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else if (color.startsWith('rgb')) {
            const parts = color.match(/[\d.]+/g);
            if (!parts || parts.length < 3) return color;
            r = parseInt(parts[0]);
            g = parseInt(parts[1]);
            b = parseInt(parts[2]);
        } else {
            return color;
        }

        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    animateSliceToggle(index, onComplete) {
        if (this._hiddenSlices.has(index)) {
            this._hiddenSlices.delete(index);
        } else {
            this._hiddenSlices.add(index);
        }
        
        if (this.chart && typeof this.chart.render === 'function') {
            this.chart.render();
        }
        
        if (onComplete) onComplete();
    }

    drawHover() {
        // No-op - hover is handled via setHoverIndex + main draw function
    }

    hitTest(mouseX, mouseY) {
        if (!this._renderedSlices) return null;
        
        for (const slice of this._renderedSlices) {
            const poly = slice.poly;
            let inside = false;
            
            // Ray-casting algorithm
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i].x, yi = poly[i].y;
                const xj = poly[j].x, yj = poly[j].y;
                
                const intersect = ((yi > mouseY) !== (yj > mouseY))
                    && (mouseX < (xj - xi) * (mouseY - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            
            if (inside) {
                const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
                return {
                    series: this,
                    index: slice.index,
                    value: slice.value,
                    datasetIndex: slice.index,
                    x: slice.poly[0] ? (slice.poly[0].x + slice.poly[1].x) / 2 : 0,
                    y: slice.poly[0] ? (slice.poly[0].y + slice.poly[2].y) / 2 : 0,
                    label: labels[slice.index] || ('Section ' + (slice.index + 1)),
                    seriesName: labels[slice.index] || ('Section ' + (slice.index + 1)),
                    color: this._colors[slice.index] || '#000'
                };
            }
        }
        
        return null;
    }
}

if (typeof window !== 'undefined') {
    window.CZ = window.CZ || {};
    window.CZ.FunnelSeries = FunnelSeries;
}


// ============================================================
// src/render/series/HeatmapSeries.js
// ============================================================

class HeatmapSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            colorScale: ['#f0fdf4', '#10b981'],
            cellPadding: 2,
            showValues: true,
            borderRadius: 2,
            visible: true,
            datasetIndex: 0
        }, options);
        
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedCells = [];
    }

    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name || `Dataset ${this.options.datasetIndex + 1}`,
            color: this.options.colorScale[1],
            visible: this.visible,
            datasetIndex: this.options.datasetIndex
        }];
    }

    getBounds() {
        if (!this.options.visible || !this.dataset || !this.dataset.values || this.dataset.values.length === 0) {
            return null;
        }
        
        let min = Infinity;
        let max = -Infinity;
        
        for (let i = 0; i < this.dataset.values.length; i++) {
            const val = this.dataset.values[i];
            if (val !== null && val !== undefined && !isNaN(val)) {
                if (val < min) min = val;
                if (val > max) max = val;
            }
        }
        
        if (min === Infinity) return null;
        
        return { minY: 0, maxY: max };
    }

    _hexToRgb(hex) {
        let h = hex.replace(/^#/, '');
        if (h.length === 3) {
            h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        }
        const num = parseInt(h, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    _interpolateColor(colorScale, t) {
        t = Math.max(0, Math.min(1, t));
        
        // Support multi-stop color scales
        if (Array.isArray(colorScale)) {
            const n = colorScale.length;
            if (n === 0) return '#000000';
            if (n === 1) return colorScale[0];
            
            // Find which segment t falls into
            const segment = t * (n - 1);
            const i = Math.min(Math.floor(segment), n - 2);
            const localT = segment - i;
            
            return this._lerpColor(colorScale[i], colorScale[i + 1], localT);
        }
        
        return colorScale;
    }

    _lerpColor(color1, color2, t) {
        const c1 = this._hexToRgb(color1);
        const c2 = this._hexToRgb(color2);
        
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    _getContrastYIQ(hexcolor) {
        if (!hexcolor) return '#000000';
        let r, g, b;
        if (hexcolor.startsWith('rgb')) {
            const match = hexcolor.match(/\d+/g);
            if (match && match.length >= 3) {
                r = parseInt(match[0], 10);
                g = parseInt(match[1], 10);
                b = parseInt(match[2], 10);
            } else {
                return '#000000';
            }
        } else {
            const rgb = this._hexToRgb(hexcolor);
            r = rgb.r; g = rgb.g; b = rgb.b;
        }
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        // Only the first visible heatmap series draws all rows
        const allHeatmap = this.chart.series.filter(s => s instanceof HeatmapSeries);
        const firstVisible = allHeatmap.find(s => s.visible);
        if (!firstVisible || firstVisible !== this) return;
        
        const allSeries = allHeatmap.filter(s => s.visible);
        if (allSeries.length === 0) return;
        
        const numRows = allSeries.length;
        const labels = this.chart.normalizedData ? this.chart.normalizedData.labels : [];
        const numCols = labels.length || Math.max(...allSeries.map(s => (s.dataset.values ? s.dataset.values.length : 0)));
        
        if (numCols === 0 || numRows === 0) return;

        const cellWidth = plotArea.width / numCols;
        const cellHeight = plotArea.height / numRows;
        
        let globalMin = Infinity;
        let globalMax = -Infinity;
        
        for (let s of allSeries) {
            if (s.dataset && s.dataset.values) {
                for (let val of s.dataset.values) {
                    if (val !== null && val !== undefined && !isNaN(val)) {
                        if (val < globalMin) globalMin = val;
                        if (val > globalMax) globalMax = val;
                    }
                }
            }
        }
        
        if (globalMin === Infinity) return;
        if (globalMax === globalMin) globalMax = globalMin + 1;
        
        this._renderedCells = [];
        const pad = this.options.cellPadding;
        const radius = this.options.borderRadius;
        
        const colorScale = this.options.colorScale;
        
        ctx.save();
        
        // Draw Y axis title if provided (rotated vertically)
        const yAxisOpts = this.chart.options && this.chart.options.yAxis;
        if (yAxisOpts && yAxisOpts.title) {
            ctx.save();
            ctx.fillStyle = yAxisOpts.titleColor || '#6b7280';
            ctx.font = yAxisOpts.titleFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const tx = 14;
            const ty = plotArea.top + plotArea.height / 2;
            ctx.translate(tx, ty);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(yAxisOpts.title, 0, 0);
            ctx.restore();
        }
        
        // Draw row labels on Y axis
        ctx.fillStyle = '#666666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        // Determine highlight state
        const highlightRow = this._highlightSlice !== undefined ? this._highlightSlice : -1;
        
        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const series = allSeries[rowIndex];
            const name = series.dataset.name || `Row ${rowIndex + 1}`;
            const cy = plotArea.top + rowIndex * cellHeight + cellHeight / 2;
            const seriesIdx = series.options.datasetIndex !== undefined ? series.options.datasetIndex : rowIndex;
            
            // Dim label if another row is highlighted
            ctx.globalAlpha = (highlightRow >= 0 && seriesIdx !== highlightRow) ? 0.15 : 1.0;
            ctx.fillText(name, plotArea.left - 10, cy);
        }
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.rect(plotArea.left, plotArea.top, plotArea.width, plotArea.height);
        ctx.clip();
        
        const baseAlpha = progress !== undefined ? progress : 1;
        
        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const series = allSeries[rowIndex];
            const values = series.dataset.values || [];
            const seriesIdx = series.options.datasetIndex !== undefined ? series.options.datasetIndex : rowIndex;
            
            // Apply row highlight dimming
            const rowAlpha = (highlightRow >= 0 && seriesIdx !== highlightRow) ? 0.15 : 1.0;
            
            for (let colIndex = 0; colIndex < numCols; colIndex++) {
                const val = values[colIndex];
                if (val === null || val === undefined || isNaN(val)) continue;
                
                const t = (val - globalMin) / (globalMax - globalMin);
                const color = this._interpolateColor(colorScale, t);
                
                const cellX = plotArea.left + colIndex * cellWidth;
                const cellY = plotArea.top + rowIndex * cellHeight;
                
                const w = cellWidth - pad * 2;
                const h = cellHeight - pad * 2;
                const cx = cellX + pad;
                const cy = cellY + pad;
                
                if (w <= 0 || h <= 0) continue;
                
                ctx.globalAlpha = baseAlpha * rowAlpha;
                
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(cx, cy, w, h, radius);
                } else {
                    ctx.moveTo(cx + radius, cy);
                    ctx.lineTo(cx + w - radius, cy);
                    ctx.quadraticCurveTo(cx + w, cy, cx + w, cy + radius);
                    ctx.lineTo(cx + w, cy + h - radius);
                    ctx.quadraticCurveTo(cx + w, cy + h, cx + w - radius, cy + h);
                    ctx.lineTo(cx + radius, cy + h);
                    ctx.quadraticCurveTo(cx, cy + h, cx, cy + h - radius);
                    ctx.lineTo(cx, cy + radius);
                    ctx.quadraticCurveTo(cx, cy, cx + radius, cy);
                }
                ctx.fillStyle = color;
                ctx.fill();
                
                this._renderedCells.push({
                    x: cx,
                    y: cy,
                    width: w,
                    height: h,
                    value: val,
                    datasetName: series.dataset.name || `Row ${rowIndex + 1}`,
                    colName: labels[colIndex] || `Col ${colIndex + 1}`,
                    color: color
                });
                
                if (this.options.showValues) {
                    ctx.fillStyle = this._getContrastYIQ(color);
                    ctx.font = '12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        val.toString(), 
                        cx + w / 2, 
                        cy + h / 2,
                        w
                    );
                }
            }
        }
        ctx.globalAlpha = 1.0;
        
        ctx.restore();
    }

    drawHover(ctx, hitInfo) {
        if (!hitInfo || !hitInfo.cell) return;
        
        const cell = hitInfo.cell;
        
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(cell.x, cell.y, cell.width, cell.height, this.options.borderRadius);
        } else {
            ctx.rect(cell.x, cell.y, cell.width, cell.height);
        }
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        ctx.restore();
    }

    hitTest(mouseX, mouseY, plotArea) {
        if (!this.options.visible) return null;
        if (this.options.datasetIndex > 0) return null; 
        
        for (let i = 0; i < this._renderedCells.length; i++) {
            const cell = this._renderedCells[i];
            if (mouseX >= cell.x && mouseX <= cell.x + cell.width &&
                mouseY >= cell.y && mouseY <= cell.y + cell.height) {
                
                return {
                    series: this,
                    cell: cell,
                    value: cell.value,
                    datasetName: cell.datasetName,
                    label: cell.colName,
                    tooltipText: `${cell.datasetName} - ${cell.colName}: ${cell.value}`,
                    color: cell.color
                };
            }
        }
        
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.HeatmapSeries = HeatmapSeries;


// ============================================================
// src/interaction/HitTest.js
// ============================================================

(function(CZ) {
    /**
     * Hit testing utilities for finding data points near mouse.
     */
    class HitTester {
        /**
         * @param {Object} chart - Reference to the chart instance
         */
        constructor(chart) {
            this.chart = chart;
        }

        /**
         * Finds the single nearest data point to the given mouse coordinates.
         * @param {number} mouseX 
         * @param {number} mouseY 
         * @returns {Object|null} Nearest hit result or null
         */
        findNearest(mouseX, mouseY) {
            if (!this.chart || !this.chart.series) return null;
            
            let nearest = null;
            let minDistance = Infinity;

            const plotArea = this.chart.plotArea;
            const xScale = this.chart.scales.x;
            const yScale = this.chart.scales.y;

            // For cartesian charts, check bounds. For radial, skip bounds check.
            if (!this.chart.isRadial) {
                if (mouseX < plotArea.left - 10 || mouseX > plotArea.right + 10 || 
                    mouseY < plotArea.top - 10 || mouseY > plotArea.bottom + 10) {
                    return null;
                }
            }

            for (let i = 0; i < this.chart.series.length; i++) {
                const series = this.chart.series[i];
                if (!series.visible) continue;

                const hit = series.hitTest(mouseX, mouseY, plotArea, xScale, yScale);
                if (hit) {
                    const dx = mouseX - hit.x;
                    const dy = mouseY - hit.y;
                    const distance = dx * dx + dy * dy;

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearest = { ...hit, datasetIndex: i, series: series };
                    }
                }
            }

            return nearest;
        }

        /**
         * Finds all series values at the nearest x-index (for shared tooltip).
         * @param {number} mouseX 
         * @param {number} mouseY 
         * @returns {Object|null} Shared hit result or null
         */
        findAll(mouseX, mouseY) {
            if (!this.chart || !this.chart.series) return null;

            const nearest = this.findNearest(mouseX, mouseY);
            if (!nearest) return null;
            if (nearest.index === undefined && nearest.index !== 0) return null;

            const items = [];
            let label = nearest.label;

            // For radial charts (pie/donut/funnel/gauge), return single item
            if (this.chart.isRadial && this.chart.type !== 'radar') {
                items.push({
                    seriesName: nearest.label || nearest.seriesName || 'Value',
                    value: nearest.value,
                    color: nearest.color || '#000'
                });
                return {
                    index: nearest.index,
                    label: label || '',
                    x: nearest.x,
                    items: items
                };
            }

            // For candlestick, show OHLC values as separate rows
            if (this.chart.type === 'candlestick') {
                const series = this.chart.series[0];
                if (series && series._renderedBars) {
                    const bar = series._renderedBars.find(b => b.index === nearest.index);
                    if (bar && bar.ohlc) {
                        const ohlc = bar.ohlc;
                        const bullColor = series.options.bullishColor || '#10b981';
                        const bearColor = series.options.bearishColor || '#ef4444';
                        const color = ohlc.close >= ohlc.open ? bullColor : bearColor;
                        items.push({ seriesName: 'Open', value: ohlc.open, color });
                        items.push({ seriesName: 'High', value: ohlc.high, color });
                        items.push({ seriesName: 'Low', value: ohlc.low, color });
                        items.push({ seriesName: 'Close', value: ohlc.close, color });
                    }
                }
                if (!label && this.chart.normalizedData && this.chart.normalizedData.labels) {
                    label = this.chart.normalizedData.labels[nearest.index];
                }
                return {
                    index: nearest.index,
                    label: label || '',
                    x: nearest.x,
                    items: items
                };
            }

            // For cartesian/radar charts, gather all series values at the same index
            for (let i = 0; i < this.chart.series.length; i++) {
                const series = this.chart.series[i];
                if (!series.visible) continue;

                const dataset = series.dataset;
                if (dataset && dataset.values && dataset.values[nearest.index] !== undefined) {
                    const val = dataset.values[nearest.index];
                    // Skip object values (e.g. OHLC) — they need special handling above
                    if (typeof val === 'object' && val !== null) continue;
                    items.push({
                        seriesName: dataset.name || ('Series ' + (i + 1)),
                        value: val,
                        color: dataset.color || '#000'
                    });
                }
            }

            if (items.length === 0) {
                // Fallback: use nearest hit data directly
                items.push({
                    seriesName: nearest.seriesName || 'Value',
                    value: nearest.value,
                    color: nearest.color || '#000'
                });
            }

            // Get label from normalizedData
            if (!label && this.chart.normalizedData && this.chart.normalizedData.labels) {
                label = this.chart.normalizedData.labels[nearest.index];
            }

            return {
                index: nearest.index,
                label: label || (nearest.x != null ? String(nearest.x) : ''),
                x: nearest.x,
                items: items
            };
        }
    }

    CZ.HitTester = HitTester;
})(window.CZ = window.CZ || {});


// ============================================================
// src/interaction/Tooltip.js
// ============================================================

(function(CZ) {
    /**
     * DOM-based tooltip with edge collision detection.
     * Rendered on document.body to avoid container clipping.
     */
    class Tooltip {
        /**
         * @param {HTMLElement} tooltipLayer - Reference element for positioning
         * @param {Object} options - Tooltip options
         */
        constructor(tooltipLayer, options = {}) {
            this.refElement = tooltipLayer;
            this.options = options;
            
            // Create tooltip on document.body to avoid overflow clipping
            this.element = document.createElement('div');
            this.element.className = 'cz-tooltip';
            this.element.style.position = 'fixed';
            this.element.style.top = '0';
            this.element.style.left = '0';
            this.element.style.opacity = '0';
            this.element.style.pointerEvents = 'none';
            this.element.style.zIndex = '99999';
            this.element.style.transition = 'opacity 0.15s ease-out';
            document.body.appendChild(this.element);
        }

        /**
         * Displays the tooltip near the hit point.
         */
        show(hitData, containerWidth, containerHeight, mouseX, mouseY) {
            if (!hitData || !hitData.items || hitData.items.length === 0) {
                this.hide();
                return;
            }

            // Build HTML
            if (this.options.formatter && typeof this.options.formatter === 'function') {
                this.element.innerHTML = this.options.formatter(hitData);
            } else {
                let html = '<div class="cz-tooltip-content">';
                if (hitData.label) {
                    html += '<div class="cz-tooltip-title">' + hitData.label + '</div>';
                }
                
                hitData.items.forEach(item => {
                    const val = item.value !== undefined && item.value !== null ? item.value : '';
                    const formattedVal = typeof val === 'number' ? val.toLocaleString() : val;
                    html += '<div class="cz-tooltip-row">';
                    html += '<span class="cz-tooltip-dot" style="background-color:' + item.color + '"></span>';
                    html += '<span class="cz-tooltip-label">' + item.seriesName + '</span>';
                    html += '<span class="cz-tooltip-value">' + formattedVal + '</span>';
                    html += '</div>';
                });
                html += '</div>';
                this.element.innerHTML = html;
            }

            // Make visible to measure dimensions
            this.element.style.opacity = '1';
            
            // Get canvas position on screen
            const canvasRect = this.refElement.getBoundingClientRect();
            const absX = canvasRect.left + mouseX;
            const absY = canvasRect.top + mouseY;

            // Measure tooltip
            const tooltipRect = this.element.getBoundingClientRect();
            const tw = tooltipRect.width;
            const th = tooltipRect.height;

            // Viewport bounds
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Position with offset
            let left = absX + 15;
            let top = absY - 10;

            // Collision: right edge
            if (left + tw > vw - 8) {
                left = absX - tw - 15;
            }
            // Collision: left edge
            if (left < 8) {
                left = 8;
            }
            // Collision: bottom
            if (top + th > vh - 8) {
                top = absY - th - 10;
            }
            // Collision: top
            if (top < 8) {
                top = 8;
            }

            this.element.style.transform = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
        }

        hide() {
            this.element.style.opacity = '0';
        }

        destroy() {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
    }

    CZ.Tooltip = Tooltip;
})(window.CZ = window.CZ || {});


// ============================================================
// src/interaction/Legend.js
// ============================================================

(function(CZ) {
    /**
     * Interactive legend component with hover highlight support.
     */
    class Legend {
        constructor(legendContainer, chart, options = {}) {
            this.container = legendContainer;
            this.chart = chart;
            this.options = options;
            this.items = [];
            
            this.container.classList.add('cz-legend');

            this._onClick = this._onClick.bind(this);
            this._onMouseOver = this._onMouseOver.bind(this);
            this._onMouseOut = this._onMouseOut.bind(this);

            this.container.addEventListener('click', this._onClick);
            this.container.addEventListener('mouseover', this._onMouseOver);
            this.container.addEventListener('mouseout', this._onMouseOut);
        }

        render(items) {
            this.items = items;
            this.container.innerHTML = '';

            items.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'cz-legend-item';
                if (item.visible === false) {
                    div.classList.add('cz-legend-disabled');
                }
                div.setAttribute('data-index', item.datasetIndex !== undefined ? item.datasetIndex : index);

                const swatch = document.createElement('span');
                swatch.className = 'cz-legend-swatch';
                swatch.style.backgroundColor = item.color;

                const label = document.createElement('span');
                label.className = 'cz-legend-label';
                label.textContent = item.name;

                div.appendChild(swatch);
                div.appendChild(label);
                this.container.appendChild(div);
            });
        }

        update(items) {
            this.items = items;
            const children = this.container.children;
            
            items.forEach((item, index) => {
                const datasetIndex = item.datasetIndex !== undefined ? item.datasetIndex : index;
                let el = null;
                for (let i = 0; i < children.length; i++) {
                    if (parseInt(children[i].getAttribute('data-index'), 10) === datasetIndex) {
                        el = children[i];
                        break;
                    }
                }
                if (el) {
                    if (item.visible === false) {
                        el.classList.add('cz-legend-disabled');
                    } else {
                        el.classList.remove('cz-legend-disabled');
                    }
                }
            });
        }

        _onClick(e) {
            const itemEl = e.target.closest('.cz-legend-item');
            if (!itemEl) return;
            const index = parseInt(itemEl.getAttribute('data-index'), 10);
            if (isNaN(index)) return;

            // Bounce animation on swatch
            const swatch = itemEl.querySelector('.cz-legend-swatch');
            if (swatch) {
                swatch.classList.remove('cz-bounce');
                // Force reflow to restart animation
                void swatch.offsetWidth;
                swatch.classList.add('cz-bounce');
                swatch.addEventListener('animationend', () => {
                    swatch.classList.remove('cz-bounce');
                }, { once: true });
            }

            // Reset highlight on click to prevent flash/flicker during toggle animation.
            // (mouseover fires alongside click, setting highlight which dims other slices)
            if (this.chart.highlightSeries) {
                this.chart.highlightSeries(-1);
            }

            if (this.chart.toggleSeries) {
                this.chart.toggleSeries(index);
            }
        }

        /** Highlight hovered series, blur others */
        _onMouseOver(e) {
            const itemEl = e.target.closest('.cz-legend-item');
            if (!itemEl) return;
            const index = parseInt(itemEl.getAttribute('data-index'), 10);
            if (isNaN(index)) return;
            if (this.chart.highlightSeries) {
                this.chart.highlightSeries(index);
            }
        }

        /** Reset highlight */
        _onMouseOut(e) {
            // Only fire when mouse leaves the legend container entirely
            const related = e.relatedTarget;
            if (related && this.container.contains(related)) return;
            if (this.chart.highlightSeries) {
                this.chart.highlightSeries(-1);
            }
        }

        destroy() {
            this.container.removeEventListener('click', this._onClick);
            this.container.removeEventListener('mouseover', this._onMouseOver);
            this.container.removeEventListener('mouseout', this._onMouseOut);
            this.container.innerHTML = '';
        }
    }

    CZ.Legend = Legend;
})(window.CZ = window.CZ || {});


// ============================================================
// src/interaction/Crosshair.js
// ============================================================

(function(CZ) {
    // Depends on: CZ.MathUtils.crispCoord
    const crispCoord = (CZ.MathUtils && CZ.MathUtils.crispCoord) 
        ? CZ.MathUtils.crispCoord 
        : (x) => Math.round(x) + 0.5;

    /**
     * Crosshair lines that follow mouse on overlay canvas.
     */
    class Crosshair {
        /**
         * @param {Object} options - Crosshair options
         */
        constructor(options = {}) {
            this.options = Object.assign({
                color: 'rgba(156, 163, 175, 0.4)',
                lineWidth: 1,
                dashArray: [4, 4],
                mode: 'x' // 'x', 'y', 'both'
            }, options);
        }

        /**
         * Draws crosshair on the overlay context.
         * @param {CanvasRenderingContext2D} ctx 
         * @param {number} mouseX 
         * @param {number} mouseY 
         * @param {Object} plotArea 
         * @param {number} snappedX - Optional X coordinate to snap to
         */
        draw(ctx, mouseX, mouseY, plotArea, snappedX) {
            // Check if inside plotArea
            if (mouseX < plotArea.left || mouseX > plotArea.right || 
                mouseY < plotArea.top || mouseY > plotArea.bottom) {
                return;
            }

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = this.options.color;
            ctx.lineWidth = this.options.lineWidth;
            
            if (this.options.dashArray && this.options.dashArray.length > 0) {
                ctx.setLineDash(this.options.dashArray);
            }

            // Draw vertical line
            if (this.options.mode === 'x' || this.options.mode === 'both') {
                // snappedX from hit test is already crisp (Math.round + 0.5),
                // so use it directly to avoid double-rounding offset
                const x = snappedX !== undefined ? snappedX : crispCoord(mouseX);
                if (x >= plotArea.left && x <= plotArea.right) {
                    ctx.moveTo(x, plotArea.top);
                    ctx.lineTo(x, plotArea.bottom);
                }
            }

            // Draw horizontal line
            if (this.options.mode === 'y' || this.options.mode === 'both') {
                const y = crispCoord(mouseY);
                if (y >= plotArea.top && y <= plotArea.bottom) {
                    ctx.moveTo(plotArea.left, y);
                    ctx.lineTo(plotArea.right, y);
                }
            }

            ctx.stroke();
            ctx.restore();
        }

        /**
         * Clears the overlay canvas
         * @param {CanvasRenderingContext2D} ctx 
         * @param {number} canvasWidth 
         * @param {number} canvasHeight 
         */
        clear(ctx, canvasWidth, canvasHeight) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
    }

    CZ.Crosshair = Crosshair;
})(window.CZ = window.CZ || {});


// ============================================================
// src/interaction/ZoomPan.js
// ============================================================

(function(CZ) {
    /**
     * Zoom and pan interaction handler.
     */
    class ZoomPan {
        /**
         * @param {Object} chart - Chart instance
         * @param {HTMLElement} canvas - Event target (overlay canvas)
         * @param {Object} options - Zoom/Pan options
         */
        constructor(chart, canvas, options = {}) {
            this.chart = chart;
            this.canvas = canvas;
            this.options = Object.assign({
                enabled: true,
                minPoints: 3
            }, options);

            this._zoomStart = 0;
            this._zoomEnd = 1; // Normalized max
            this.dataLength = 0;

            this._isPanning = false;
            this._panStartX = 0;
            this._startZoomRange = { start: 0, end: 1 };

            this._callbacks = [];

            this._onWheel = this._onWheel.bind(this);
            this._onPointerDown = this._onPointerDown.bind(this);
            this._onPointerMove = this._onPointerMove.bind(this);
            this._onPointerUp = this._onPointerUp.bind(this);
            this._onDoubleClick = this._onDoubleClick.bind(this);

            if (this.options.enabled) {
                this.enable();
            }
        }

        /**
         * Setup zoom range based on data length.
         * @param {number} length 
         */
        init(length) {
            this.dataLength = length;
            this._zoomStart = 0;
            this._zoomEnd = length - 1;
        }

        enable() {
            this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
            this.canvas.addEventListener('pointerdown', this._onPointerDown);
            window.addEventListener('pointermove', this._onPointerMove);
            window.addEventListener('pointerup', this._onPointerUp);
            this.canvas.addEventListener('dblclick', this._onDoubleClick);
        }

        disable() {
            this.canvas.removeEventListener('wheel', this._onWheel);
            this.canvas.removeEventListener('pointerdown', this._onPointerDown);
            window.removeEventListener('pointermove', this._onPointerMove);
            window.removeEventListener('pointerup', this._onPointerUp);
            this.canvas.removeEventListener('dblclick', this._onDoubleClick);
        }

        _onWheel(e) {
            e.preventDefault();
            
            if (this.dataLength <= this.options.minPoints) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Determine zoom center relative to plot area
            const plotArea = this.chart.plotArea;
            if (mouseX < plotArea.left || mouseX > plotArea.right) return;

            const ratio = (mouseX - plotArea.left) / plotArea.width;
            
            // Zoom factor
            const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
            
            const currentRange = this._zoomEnd - this._zoomStart;
            let newRange = currentRange * zoomFactor;

            // Constrain zoom
            const minRange = Math.min(this.options.minPoints, this.dataLength - 1);
            if (newRange < minRange) newRange = minRange;
            if (newRange > this.dataLength - 1) newRange = this.dataLength - 1;

            // Calculate new start/end
            let newStart = this._zoomStart + (currentRange - newRange) * ratio;
            let newEnd = newStart + newRange;

            // Clamp to bounds
            if (newStart < 0) {
                newStart = 0;
                newEnd = newStart + newRange;
            }
            if (newEnd > this.dataLength - 1) {
                newEnd = this.dataLength - 1;
                newStart = newEnd - newRange;
            }

            this._zoomStart = newStart;
            this._zoomEnd = newEnd;

            this._notify();
        }

        _onPointerDown(e) {
            this._isPanning = true;
            this._panStartX = e.clientX;
            this._startZoomRange = { start: this._zoomStart, end: this._zoomEnd };
            this.canvas.style.cursor = 'grabbing';
        }

        _onPointerMove(e) {
            if (!this._isPanning) return;

            const dx = e.clientX - this._panStartX;
            const plotArea = this.chart.plotArea;
            
            // Pixels to data points ratio
            const currentRange = this._startZoomRange.end - this._startZoomRange.start;
            const pointsPerPixel = currentRange / plotArea.width;
            
            const shift = dx * pointsPerPixel;

            let newStart = this._startZoomRange.start - shift;
            let newEnd = this._startZoomRange.end - shift;

            // Constrain pan
            if (newStart < 0) {
                newStart = 0;
                newEnd = currentRange;
            }
            if (newEnd > this.dataLength - 1) {
                newEnd = this.dataLength - 1;
                newStart = newEnd - currentRange;
            }

            this._zoomStart = newStart;
            this._zoomEnd = newEnd;

            this._notify();
        }

        _onPointerUp(e) {
            if (this._isPanning) {
                this._isPanning = false;
                this.canvas.style.cursor = 'default';
            }
        }

        _onDoubleClick(e) {
            this.reset();
        }

        /**
         * Returns current visible range indices.
         * @returns {Object} { start, end }
         */
        getVisibleRange() {
            return {
                start: Math.max(0, Math.floor(this._zoomStart)),
                end: Math.min(this.dataLength - 1, Math.ceil(this._zoomEnd))
            };
        }

        reset() {
            this._zoomStart = 0;
            this._zoomEnd = Math.max(0, this.dataLength - 1);
            this._notify();
        }

        onZoomChange(callback) {
            this._callbacks.push(callback);
        }

        _notify() {
            this.chart.emit && this.chart.emit('zoom', this.getVisibleRange());
            this._callbacks.forEach(cb => cb(this.getVisibleRange()));
        }
    }

    CZ.ZoomPan = ZoomPan;
})(window.CZ = window.CZ || {});


// ============================================================
// src/plugins/PluginManager.js
// ============================================================

(function(CZ) {
    /**
     * Plugin lifecycle manager.
     */
    class PluginManager {
        /**
         * @param {Object} chart - Reference to the chart instance
         */
        constructor(chart) {
            this.chart = chart;
            this.plugins = [];
        }

        /**
         * Adds a plugin to the manager and calls its install method.
         * @param {Object} plugin 
         */
        register(plugin) {
            if (!plugin || !plugin.name) {
                console.warn('Plugin must have a name property.');
                return;
            }

            // Check if already registered
            const exists = this.plugins.find(p => p.name === plugin.name);
            if (exists) {
                console.warn(`Plugin ${plugin.name} is already registered.`);
                return;
            }

            this.plugins.push(plugin);

            if (typeof plugin.install === 'function') {
                plugin.install(this.chart);
            }
        }

        /**
         * Removes a plugin by name.
         * @param {string} pluginName 
         */
        unregister(pluginName) {
            const idx = this.plugins.findIndex(p => p.name === pluginName);
            if (idx !== -1) {
                const plugin = this.plugins[idx];
                if (typeof plugin.uninstall === 'function') {
                    plugin.uninstall(this.chart);
                }
                this.plugins.splice(idx, 1);
            }
        }

        /**
         * Calls a hook method on all registered plugins.
         * If any plugin returns false, the hook chain stops and returns false.
         * @param {string} hookName 
         * @param  {...any} args 
         * @returns {boolean} true if all succeeded, false if any aborted
         */
        hook(hookName, ...args) {
            for (let i = 0; i < this.plugins.length; i++) {
                const plugin = this.plugins[i];
                if (typeof plugin[hookName] === 'function') {
                    const result = plugin[hookName](this.chart, ...args);
                    if (result === false) {
                        return false;
                    }
                }
            }
            return true;
        }
    }

    CZ.PluginManager = PluginManager;
})(window.CZ = window.CZ || {});


// ============================================================
// src/plugins/builtins/ThresholdLine.js
// ============================================================

(function(CZ) {
    // Depends on: CZ.MathUtils.crispCoord
    const crispCoord = (CZ.MathUtils && CZ.MathUtils.crispCoord) 
        ? CZ.MathUtils.crispCoord 
        : (x) => Math.round(x) + 0.5;

    /**
     * Built-in plugin for horizontal threshold/target lines
     */
    const ThresholdLinePlugin = {
        name: 'thresholdLine',
        afterSeriesDraw(chart, ctx) {
            const thresholds = chart.options.thresholds; // array of { value, color, label, dashArray }
            if (!thresholds || !thresholds.length) return;
            
            const plotArea = chart.plotArea;
            const yScale = chart.scales.y;
            
            thresholds.forEach(t => {
                const y = crispCoord(yScale.getPixel(t.value));
                if (y < plotArea.top || y > plotArea.bottom) return;
                
                ctx.save();
                ctx.beginPath();
                if (ctx.setLineDash) {
                    ctx.setLineDash(t.dashArray || [6, 4]);
                }
                ctx.strokeStyle = t.color || '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.moveTo(plotArea.left, y);
                ctx.lineTo(plotArea.right, y);
                ctx.stroke();
                
                if (t.label) {
                    ctx.fillStyle = t.color || '#ef4444';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(t.label, plotArea.right - 4, y - 4);
                }
                ctx.restore();
            });
        }
    };

    // Export to CZ plugins namespace
    CZ.Plugins = CZ.Plugins || {};
    CZ.Plugins.ThresholdLine = ThresholdLinePlugin;
})(window.CZ = window.CZ || {});


// ============================================================
// src/plugins/builtins/Watermark.js
// ============================================================

(function(CZ) {
    /**
     * Built-in plugin for background watermark text
     */
    const WatermarkPlugin = {
        name: 'watermark',
        beforeDraw(chart, ctx) {
            const watermark = chart.options.watermark; // { text, color, font, opacity }
            if (!watermark || !watermark.text) return;
            const plotArea = chart.plotArea;
            
            ctx.save();
            ctx.globalAlpha = watermark.opacity || 0.06;
            ctx.font = watermark.font || 'bold 48px sans-serif';
            ctx.fillStyle = watermark.color || '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(watermark.text, plotArea.left + plotArea.width / 2, plotArea.top + plotArea.height / 2);
            ctx.restore();
        }
    };

    // Export to CZ plugins namespace
    CZ.Plugins = CZ.Plugins || {};
    CZ.Plugins.Watermark = WatermarkPlugin;
})(window.CZ = window.CZ || {});


// ============================================================
// src/core/Chart.js
// ============================================================

(function(CZ) {

  /**
   * Chart type to series renderer mapping
   */
  const SERIES_MAP = {
    line: 'LineSeries',
    bar: 'BarSeries',
    horizontalBar: 'HorizontalBarSeries',
    area: 'LineSeries',      // area is line with fill=true
    pie: 'PieSeries',
    donut: 'PieSeries',      // donut is pie with innerRadius
    scatter: 'ScatterSeries',
    radar: 'RadarSeries',
    gauge: 'GaugeSeries',
    candlestick: 'CandlestickSeries',
    funnel: 'FunnelSeries',
    heatmap: 'HeatmapSeries'
  };

  /** Chart types that use radial (non-cartesian) layout */
  const RADIAL_TYPES = ['pie', 'donut', 'radar', 'gauge', 'funnel'];

  /** Global plugin registry */
  const _globalPlugins = [];

  /**
   * czChart — Main chart coordinator class.
   * Orchestrates data normalization, scale calculation, rendering, and interaction.
   */
  class Chart extends CZ.EventEmitter {
    /**
     * @param {string|HTMLElement} target - CSS selector or DOM element
     * @param {Object} config - Chart configuration
     */
    constructor(target, config = {}) {
      super();

      // Inject styles once
      if (CZ.injectStyles) CZ.injectStyles();

      // Resolve container
      this.container = typeof target === 'string'
        ? document.querySelector(target)
        : target;

      if (!this.container) {
        throw new Error('czChart: Container element not found: ' + target);
      }

      this.container.classList.add('cz-chart-container');

      // Store raw config
      this._rawConfig = config;

      // Merge options with defaults
      this.options = CZ.mergeDefaults(config, CZ.DEFAULTS);

      // Apply theme if specified
      this._applyTheme(config.theme);

      // Chart type
      this.type = config.type || 'line';
      this.isRadial = RADIAL_TYPES.includes(this.type);

      // Internal state
      this.series = [];
      this.normalizedData = null;
      this.plotArea = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
      this.scales = { x: null, y: null };
      this._width = 0;
      this._height = 0;
      this._destroyed = false;
      this._activeHit = null;

      // Initialize subsystems
      this._initRenderer();
      this._initPlugins();
      this._initInteraction();

      // Initialize viewport (triggers initial resize + render)
      this.viewport = new CZ.Viewport(this.container, (w, h) => {
        this._onResize(w, h);
      });

      // Load data
      if (config.data) {
        this._loadData(config.data);
      }
    }

    // =========================================================================
    // Static Factory
    // =========================================================================

    /**
     * Create a new chart instance (declarative shorthand)
     * @param {string|HTMLElement} target
     * @param {Object} config
     * @returns {Chart}
     */
    static create(target, config) {
      return new Chart(target, config);
    }

    /**
     * Register a global plugin
     * @param {Object} plugin
     */
    static use(plugin) {
      if (plugin && !_globalPlugins.includes(plugin)) {
        _globalPlugins.push(plugin);
      }
    }

    // =========================================================================
    // Theme
    // =========================================================================

    /** @private */
    _applyTheme(themeName) {
      if (!themeName) return;

      let theme = null;
      if (themeName === 'dark' && CZ.DarkTheme) {
        theme = CZ.DarkTheme;
      } else if (themeName === 'light' && CZ.LightTheme) {
        theme = CZ.LightTheme;
      } else if (typeof themeName === 'object') {
        theme = themeName;
      }

      if (!theme) return;

      // Apply theme colors to options
      if (theme.background) {
        this.container.style.background = theme.background;
      }
      if (theme.gridColor) {
        this.options.xAxis.gridColor = theme.gridColor;
        this.options.yAxis.gridColor = theme.gridColor;
      }
      if (theme.axisLineColor) {
        this.options.xAxis.lineColor = theme.axisLineColor;
        this.options.yAxis.lineColor = theme.axisLineColor;
      }
      if (theme.axisLabelColor) {
        this.options.xAxis.labelColor = theme.axisLabelColor;
        this.options.yAxis.labelColor = theme.axisLabelColor;
        this.options.xAxis.tickColor = theme.axisLabelColor;
        this.options.yAxis.tickColor = theme.axisLabelColor;
      }
      if (theme.crosshairColor) {
        this.options.crosshair.color = theme.crosshairColor;
      }
      this._theme = theme;
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    /** @private */
    _initRenderer() {
      this.renderer = new CZ.LayeredRenderer(this.container);
    }

    /** @private */
    _initPlugins() {
      this.pluginManager = new CZ.PluginManager(this);

      // Register global plugins
      _globalPlugins.forEach(p => this.pluginManager.register(p));

      // Register instance plugins
      if (this._rawConfig.plugins) {
        this._rawConfig.plugins.forEach(p => this.pluginManager.register(p));
      }

      // Register built-in plugins
      if (CZ.ThresholdLinePlugin) this.pluginManager.register(CZ.ThresholdLinePlugin);
      if (CZ.WatermarkPlugin) this.pluginManager.register(CZ.WatermarkPlugin);

      this.pluginManager.hook('init');
    }

    /** @private */
    _initInteraction() {
      const mainCanvas = this.renderer.getMainCanvas();

      // Tooltip
      if (this.options.tooltip.enabled) {
        this.tooltip = new CZ.Tooltip(
          mainCanvas,  // Reference element for positioning
          this.options.tooltip
        );
      }

      // Legend
      if (this.options.legend.show) {
        this.legend = new CZ.Legend(
          this.renderer.getLegendContainer(),
          this,
          this.options.legend
        );
      }

      // Crosshair
      if (this.options.crosshair.enabled) {
        this.crosshair = new CZ.Crosshair(this.options.crosshair);
      }

      // HitTester
      this.hitTester = new CZ.HitTester(this);

      // ZoomPan
      if (this.options.zoom.enabled) {
        this.zoomPan = new CZ.ZoomPan(this, mainCanvas, this.options.zoom);
        this.zoomPan.enable();
        this.zoomPan.onZoomChange(() => {
          this._render();
        });
      }

      // Mouse events on main canvas
      this._onMouseMove = this._handleMouseMove.bind(this);
      this._onMouseLeave = this._handleMouseLeave.bind(this);
      this._onClick = this._handleClick.bind(this);

      mainCanvas.addEventListener('mousemove', this._onMouseMove);
      mainCanvas.addEventListener('mouseleave', this._onMouseLeave);
      mainCanvas.addEventListener('click', this._onClick);

      // Touch events
      mainCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this._handleMouseMove(touch);
      }, { passive: false });
      mainCanvas.addEventListener('touchend', () => this._handleMouseLeave());
    }

    // =========================================================================
    // Data Loading
    // =========================================================================

    /** @private */
    async _loadData(data) {
      this.pluginManager.hook('beforeData', data);

      // Check if data is a URL to fetch
      let resolvedData = data;
      if (CZ.Fetcher) {
        resolvedData = await CZ.Fetcher.fetch(data);
      }

      // Normalize data
      this.normalizedData = CZ.Normalizer.normalize(resolvedData, {
        x: this._rawConfig.x,
        y: this._rawConfig.y,
        series: this._rawConfig.seriesNames,
        colors: this._rawConfig.colors
      });

      this.pluginManager.hook('afterData', this.normalizedData);

      // Create series renderers
      this._createSeries();

      // Initial render
      this._render(true);
    }

    /** @private */
    _createSeries() {
      this.series = [];

      if (!this.normalizedData || !this.normalizedData.datasets) return;

      const seriesClass = SERIES_MAP[this.type];
      if (!seriesClass || !CZ[seriesClass]) {
        throw new Error('czChart: Unknown chart type "' + this.type + '"');
      }

      const seriesOptions = this._getSeriesOptions();

      // Count bar datasets for grouped positioning
      let barCount = 0;
      if (this.type === 'bar' || this.type === 'horizontalBar') {
        barCount = this.normalizedData.datasets.length;
      }

      this.normalizedData.datasets.forEach((dataset, index) => {
        const SeriesConstructor = CZ[seriesClass];
        const instance = new SeriesConstructor(this, {
          ...seriesOptions,
          color: dataset.color,
          datasetIndex: index
        });

        // For scatter, convert normalized data to {points: [{x, y}]} format
        if (this.type === 'scatter') {
          const labels = this.normalizedData.labels;
          const scatterDataset = {
            ...dataset,
            points: dataset.values.map((yVal, i) => ({
              x: parseFloat(labels[i]) || i,
              y: yVal
            }))
          };
          instance.setData(scatterDataset);
        } else if (this.type === 'candlestick') {
          // For candlestick, merge all 4 datasets (open,high,low,close) into one
          // Only first series instance draws; skip creating additional ones
          if (index > 0) return; // skip — handled by first instance

          const datasets = this.normalizedData.datasets;
          const len = datasets[0] ? datasets[0].values.length : 0;
          const ohlcData = [];
          for (let j = 0; j < len; j++) {
            ohlcData.push({
              open:  datasets[0] ? datasets[0].values[j] : 0,
              high:  datasets[1] ? datasets[1].values[j] : 0,
              low:   datasets[2] ? datasets[2].values[j] : 0,
              close: datasets[3] ? datasets[3].values[j] : 0
            });
          }
          instance.setData({
            name: 'OHLC',
            ohlc: ohlcData,
            color: seriesOptions.bullishColor || '#10b981'
          });
        } else {
          instance.setData(dataset);
        }

        // For grouped bars (vertical and horizontal), set position info
        if ((this.type === 'bar' || this.type === 'horizontalBar') && instance.setDatasetIndex) {
          instance.setDatasetIndex(index, barCount);
        }

        this.series.push(instance);
      });

      // Update legend
      this._updateLegend();
    }

    /** @private */
    _getSeriesOptions() {
      const opts = {};

      switch (this.type) {
        case 'line':
          Object.assign(opts, this.options.series);
          break;
        case 'area':
          Object.assign(opts, this.options.series, { fill: true });
          break;
        case 'bar':
          Object.assign(opts, this.options.bar);
          break;
        case 'horizontalBar':
          Object.assign(opts, this.options.horizontalBar || this.options.bar);
          break;
        case 'pie':
          Object.assign(opts, this.options.pie);
          break;
        case 'donut':
          Object.assign(opts, this.options.pie, { innerRadius: this.options.pie.innerRadius || 0.6 });
          break;
        case 'scatter':
          Object.assign(opts, this.options.scatter);
          break;
        case 'radar':
          Object.assign(opts, this.options.radar);
          break;
        case 'gauge':
          Object.assign(opts, this.options.gauge || {});
          break;
        case 'candlestick':
          Object.assign(opts, this.options.candlestick || {});
          break;
        case 'funnel':
          Object.assign(opts, this.options.funnel || {});
          break;
        case 'heatmap':
          Object.assign(opts, this.options.heatmap || {});
          break;
        default:
          Object.assign(opts, this.options.series);
      }

      return opts;
    }

    // =========================================================================
    // Layout & Scale Computation
    // =========================================================================

    /** @private */
    _computeLayout() {
      this.pluginManager.hook('beforeLayout');

      const padding = this.options.padding;
      const ctx = this.renderer.getMainContext();

      // _width / _height already exclude legend (handled by LayeredRenderer flex layout)
      let left = padding.left;
      let top = padding.top;
      let right = this._width - padding.right;
      let bottom = this._height - padding.bottom;

      // For cartesian charts, compute axis label space
      if (!this.isRadial && this.options.yAxis.show) {
        // Measure Y axis label width
        const yAxisWidth = this._measureYAxisWidth(ctx);
        left += yAxisWidth + 8;
      }

      if (!this.isRadial && this.options.xAxis.show) {
        bottom -= 28; // space for x-axis labels
      }

      this.plotArea = {
        left: left,
        top: top,
        right: right,
        bottom: bottom,
        width: right - left,
        height: bottom - top
      };

      this.pluginManager.hook('afterLayout', this.plotArea);
    }

    /** @private */
    _measureYAxisWidth(ctx) {
      if (!this.scales.y || !this.scales.y.getTicks) return 40;

      ctx.save();
      ctx.font = this.options.yAxis.labelFont;
      let maxWidth = 0;

      const ticks = this.scales.y.getTicks();
      ticks.forEach(tick => {
        const label = tick.label !== undefined ? tick.label : String(tick.value || '');
        const w = ctx.measureText(label).width;
        if (w > maxWidth) maxWidth = w;
      });

      ctx.restore();
      return Math.ceil(maxWidth) + 4;
    }

    /** @private */
    _computeScales() {
      if (this.isRadial || !this.normalizedData) return;

      // Heatmap handles its own grid layout, skip normal scale computation
      if (this.type === 'heatmap') {
        // Create minimal scales that the heatmap series can use
        this.scales.x = new CZ.CategoryScale({ maxTicks: this.options.xAxis.maxTicks });
        this.scales.x.configure(this.normalizedData.labels, this.plotArea.left, this.plotArea.right);
        // No Y scale needed — heatmap series draws its own row labels
        this.scales.y = null;
        return;
      }

      // Horizontal Bar: SWAP axes — X = Linear (values), Y = Category (labels)
      if (this.type === 'horizontalBar') {
        // Y axis = categories (labels)
        this.scales.y = new CZ.CategoryScale({ maxTicks: this.options.yAxis.maxTicks });
        this.scales.y.configure(this.normalizedData.labels, this.plotArea.top, this.plotArea.bottom);

        // X axis = values (linear)
        let minX = 0, maxX = -Infinity;
        this.series.forEach(s => {
          if (!s.visible) return;
          const bounds = s.getBounds();
          if (bounds) {
            if (bounds.minY < minX) minX = bounds.minY;
            if (bounds.maxY > maxX) maxX = bounds.maxY;
          }
        });
        if (!isFinite(maxX) || maxX <= 0) maxX = 100;
        if (this.options.xAxis.beginAtZero !== false) minX = Math.min(0, minX);

        const xFormat = this.options.xAxis.format || (val => {
          if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
          if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'K';
          if (Number.isInteger(val)) return val.toString();
          return val.toFixed(1);
        });

        this.scales.x = new CZ.LinearScale({
          beginAtZero: this.options.xAxis.beginAtZero !== false,
          maxTicks: this.options.xAxis.maxTicks,
          format: xFormat
        });
        this.scales.x.configure(minX, maxX, this.plotArea.left, this.plotArea.right);

        this._recomputeLayoutWithScales();
        return;
      }

      // X Scale
      if (this.type === 'scatter') {
        // Scatter: both axes are linear, get X bounds from scatter data
        let minX = Infinity, maxX = -Infinity;
        this.series.forEach(s => {
          if (!s.visible) return;
          const bounds = s.getBounds();
          if (bounds) {
            if (bounds.minX < minX) minX = bounds.minX;
            if (bounds.maxX > maxX) maxX = bounds.maxX;
          }
        });
        if (!isFinite(minX)) { minX = 0; maxX = 100; }

        this.scales.x = new CZ.LinearScale({
          maxTicks: this.options.xAxis.maxTicks,
          format: (val) => Number.isInteger(val) ? val.toString() : val.toFixed(1)
        });
        this.scales.x.configure(minX, maxX, this.plotArea.left, this.plotArea.right);
      } else if (this.normalizedData.xType === 'category') {
        this.scales.x = new CZ.CategoryScale({
          maxTicks: this.options.xAxis.maxTicks
        });
        this.scales.x.configure(
          this.normalizedData.labels,
          this.plotArea.left,
          this.plotArea.right
        );
      } else if (this.normalizedData.xType === 'time') {
        this.scales.x = new CZ.TimeScale({
          maxTicks: this.options.xAxis.maxTicks
        });
        this.scales.x.configure(
          this.normalizedData.labels,
          this.plotArea.left,
          this.plotArea.right
        );
      } else {
        this.scales.x = new CZ.LinearScale({
          maxTicks: this.options.xAxis.maxTicks
        });
        const labels = this.normalizedData.labels.map(Number);
        this.scales.x.configure(
          Math.min(...labels),
          Math.max(...labels),
          this.plotArea.left,
          this.plotArea.right
        );
      }

      // Y Scale — compute bounds from all visible series
      let minY = Infinity, maxY = -Infinity;
      this.series.forEach(s => {
        if (!s.visible) return;
        const bounds = s.getBounds();
        if (bounds) {
          if (bounds.minY < minY) minY = bounds.minY;
          if (bounds.maxY > maxY) maxY = bounds.maxY;
        }
      });

      if (!isFinite(minY)) { minY = 0; maxY = 100; }

      const yFormat = this.options.yAxis.format || (val => {
        if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'K';
        if (Number.isInteger(val)) return val.toString();
        return val.toFixed(1);
      });

      this.scales.y = new CZ.LinearScale({
        beginAtZero: this.type === 'scatter' ? false : this.options.yAxis.beginAtZero,
        maxTicks: this.options.yAxis.maxTicks,
        format: yFormat
      });

      // Y axis is inverted (top = high value, bottom = low value)
      this.scales.y.configure(minY, maxY, this.plotArea.bottom, this.plotArea.top);

      // Recompute layout with actual Y-axis label width
      this._recomputeLayoutWithScales();
    }

    /** @private */
    _recomputeLayoutWithScales() {
      const ctx = this.renderer.getMainContext();
      const actualYWidth = this._measureYAxisWidth(ctx);
      const newLeft = this.options.padding.left + actualYWidth + 8;

      if (Math.abs(newLeft - this.plotArea.left) > 2) {
        this.plotArea.left = newLeft;
        this.plotArea.width = this.plotArea.right - this.plotArea.left;

        // Reconfigure X scale with updated plot area
        if (this.scales.x && this.scales.x.configure) {
          if (this.type === 'horizontalBar') {
            // HorizontalBar: X is LinearScale (values), reconfigure with value bounds
            let minX = 0, maxX = -Infinity;
            this.series.forEach(s => {
              if (!s.visible) return;
              const bounds = s.getBounds();
              if (bounds) {
                if (bounds.minY < minX) minX = bounds.minY;
                if (bounds.maxY > maxX) maxX = bounds.maxY;
              }
            });
            if (!isFinite(maxX) || maxX <= 0) maxX = 100;
            this.scales.x.configure(minX, maxX, this.plotArea.left, this.plotArea.right);
          } else if (this.normalizedData.xType === 'category' || this.normalizedData.xType === 'time') {
            this.scales.x.configure(
              this.normalizedData.labels,
              this.plotArea.left,
              this.plotArea.right
            );
          } else {
            const labels = this.normalizedData.labels.map(Number);
            this.scales.x.configure(
              Math.min(...labels),
              Math.max(...labels),
              this.plotArea.left,
              this.plotArea.right
            );
          }
        }

        // For horizontalBar, also reconfigure Y category scale with updated plot area
        if (this.type === 'horizontalBar' && this.scales.y && this.scales.y.configure) {
          this.scales.y.configure(this.normalizedData.labels, this.plotArea.top, this.plotArea.bottom);
        }
      }
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    /** @private */
    _render(animate = false) {
      if (this._destroyed || !this.normalizedData) return;

      const ctx = this.renderer.getMainContext();

      // Compute layout and scales
      this._computeLayout();
      this._computeScales();

      // Clear canvas
      this.renderer.clearMain();
      this.renderer.clearOverlay();

      this.pluginManager.hook('beforeDraw', ctx);

      // Draw background (theme)
      if (this._theme && this._theme.background) {
        ctx.save();
        ctx.fillStyle = this._theme.background;
        ctx.fillRect(0, 0, this._width, this._height);
        ctx.restore();
      }

      // Draw grid and axes (cartesian only)
      if (!this.isRadial) {
        if (CZ.Grid && this.scales.y) {
          const grid = new CZ.Grid(this.options);
          grid.draw(ctx, this.plotArea, this.scales.x, this.scales.y, this.options);
        }
        this.pluginManager.hook('afterGridDraw', ctx);

        if (CZ.Axis) {
          const axis = new CZ.Axis(this.options);
          axis.drawXAxis(ctx, this.plotArea, this.scales.x, this.options.xAxis);
          if (this.scales.y) {
            axis.drawYAxis(ctx, this.plotArea, this.scales.y, this.options.yAxis);
          }
        }
      }

      // Draw series
      const highlightIdx = this._highlightIndex !== undefined ? this._highlightIndex : -1;
      const isPieDonut = (this.type === 'pie' || this.type === 'donut' || this.type === 'funnel' || this.type === 'heatmap');

      const drawSeries = (progress) => {
        ctx.save();
        this.series.forEach((s, si) => {
          if (!s.visible) return;

          // Apply highlight dimming
          if (highlightIdx >= 0) {
            if (isPieDonut) {
              // For pie/donut, pass highlight index to the series
              s._highlightSlice = highlightIdx;
            } else {
              // For cartesian, dim non-highlighted series
              const seriesIdx = s.options && s.options.datasetIndex !== undefined ? s.options.datasetIndex : si;
              ctx.globalAlpha = (seriesIdx === highlightIdx) ? 1.0 : 0.15;
            }
          } else {
            ctx.globalAlpha = 1.0;
            if (isPieDonut) s._highlightSlice = -1;
          }

          s.draw(ctx, this.plotArea, this.scales.x, this.scales.y, progress);
        });
        ctx.globalAlpha = 1.0;
        ctx.restore();
        this.pluginManager.hook('afterSeriesDraw', ctx);
        this.pluginManager.hook('afterDraw', ctx);
      };

      // Animate or draw immediately
      if (animate && this.options.animation.enabled) {
        const animator = new CZ.Animator();
        animator.animate((progress) => {
          // Redraw from grid on each frame
          this.renderer.clearMain();

          if (this._theme && this._theme.background) {
            ctx.save();
            ctx.fillStyle = this._theme.background;
            ctx.fillRect(0, 0, this._width, this._height);
            ctx.restore();
          }

          if (!this.isRadial) {
            if (CZ.Grid && this.scales.y) {
              const grid = new CZ.Grid(this.options);
              grid.draw(ctx, this.plotArea, this.scales.x, this.scales.y, this.options);
            }
            if (CZ.Axis) {
              const axis = new CZ.Axis(this.options);
              axis.drawXAxis(ctx, this.plotArea, this.scales.x, this.options.xAxis);
              if (this.scales.y) {
                axis.drawYAxis(ctx, this.plotArea, this.scales.y, this.options.yAxis);
              }
            }
          }

          drawSeries(progress);
        }, this.options.animation.duration, this.options.animation.easing);
      } else {
        drawSeries(1);
      }
    }

    // =========================================================================
    // Interaction Handlers
    // =========================================================================

    /** @private */
    _handleMouseMove(e) {
      if (this._destroyed || !this.normalizedData) return;

      const rect = this.renderer.getMainCanvas().getBoundingClientRect();
      const mouseX = (e.clientX || e.pageX) - rect.left;
      const mouseY = (e.clientY || e.pageY) - rect.top;

      // Hit test
      const hitAll = this.hitTester.findAll(mouseX, mouseY);
      const hitNearest = this.hitTester.findNearest(mouseX, mouseY);

      // Clear overlay
      this.renderer.clearOverlay();
      const overlayCtx = this.renderer.getOverlayContext();

      const newHoverIndex = hitNearest ? hitNearest.index : -1;
      const isPieDonut = (this.type === 'pie' || this.type === 'donut' || this.type === 'funnel');

      if (hitNearest) {
        // Crosshair (cartesian only)
        if (this.crosshair && !this.isRadial) {
          this.crosshair.draw(overlayCtx, mouseX, mouseY, this.plotArea, hitNearest.x);
        }

        // For pie/donut: set hover index and re-render main canvas
        if (isPieDonut) {
          const prevHoverIndex = this._pieHoverIndex !== undefined ? this._pieHoverIndex : -1;
          if (newHoverIndex !== prevHoverIndex) {
            this._pieHoverIndex = newHoverIndex;
            this.series.forEach(s => {
              if (s.setHoverIndex) s.setHoverIndex(newHoverIndex);
            });
            this._render(false);
          }
        } else {
          // For other charts: draw hover effects on overlay canvas
          // Find which series has the point closest to the mouse cursor (by Y distance)
          // so we can draw it LAST (on top of overlapping points)
          let closestSeries = null;
          let closestDist = Infinity;
          for (const s of this.series) {
            if (!s.visible || !s.drawHover || !s._renderedPoints) continue;
            const pt = s._renderedPoints.find(p => p.index === hitNearest.index);
            if (pt) {
              const dy = Math.abs(mouseY - pt.y);
              if (dy < closestDist) {
                closestDist = dy;
                closestSeries = s;
              }
            }
          }

          // Draw non-closest series first, then closest series last (on top)
          this.series.forEach(s => {
            if (!s.visible || !s.drawHover || s === closestSeries) return;
            s.drawHover(overlayCtx, this.plotArea, this.scales.x, this.scales.y, hitNearest.index);
          });
          if (closestSeries) {
            // Erase the area around the closest point to guarantee it appears fully on top
            const closestPt = closestSeries._renderedPoints.find(p => p.index === hitNearest.index);
            if (closestPt) {
              overlayCtx.save();
              overlayCtx.globalCompositeOperation = 'destination-out';
              overlayCtx.beginPath();
              overlayCtx.arc(closestPt.x, closestPt.y, 12, 0, Math.PI * 2);
              overlayCtx.fill();
              overlayCtx.restore();
            }
            closestSeries.drawHover(overlayCtx, this.plotArea, this.scales.x, this.scales.y, hitNearest.index);
          }
        }

        this._activeHit = hitNearest;
        this.emit('hover', hitNearest);
        this.pluginManager.hook('onHover', hitNearest);
      } else {
        // No hit — clear hover state
        if (isPieDonut && this._pieHoverIndex !== -1) {
          this._pieHoverIndex = -1;
          this.series.forEach(s => {
            if (s.setHoverIndex) s.setHoverIndex(-1);
          });
          this._render(false);
        }
        this._activeHit = null;
      }

      // Cursor: pointer only when mouse is close to a data point
      const canvas = this.renderer.getMainCanvas();
      let isOverPoint = false;
      if (hitNearest) {
        const dx = mouseX - hitNearest.x;
        const dy = mouseY - hitNearest.y;
        isOverPoint = Math.sqrt(dx * dx + dy * dy) < 10;
      }
      canvas.style.cursor = isOverPoint ? 'pointer' : '';

      // Tooltip
      if (this.tooltip && this.options.tooltip.enabled) {
        if (hitAll && hitAll.items && hitAll.items.length > 0) {
          this.tooltip.show(hitAll, this._width, this._height, mouseX, mouseY);
        } else {
          this.tooltip.hide();
        }
      }
    }

    /** @private */
    _handleMouseLeave() {
      if (this._destroyed) return;
      this.renderer.clearOverlay();
      if (this.tooltip) this.tooltip.hide();

      // Reset pie/donut hover
      if ((this.type === 'pie' || this.type === 'donut') && this._pieHoverIndex !== -1) {
        this._pieHoverIndex = -1;
        this.series.forEach(s => {
          if (s.setHoverIndex) s.setHoverIndex(-1);
        });
        this._render(false);
      }

      this._activeHit = null;
    }

    /** @private */
    _handleClick(e) {
      if (this._destroyed) return;
      
      // Toggle point selection on line/area/scatter/radar/bar/horizontalBar/candlestick charts
      if (this.type === 'line' || this.type === 'area' || this.type === 'scatter' || this.type === 'radar' || this.type === 'bar' || this.type === 'horizontalBar' || this.type === 'candlestick') {
        const rect = this.renderer.getMainCanvas().getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Use _activeHit if available, otherwise do our own hit test
        const hit = this._activeHit || this.hitTester.findNearest(mx, my);
        if (!hit) return;

        let bestSeries = null;
        let bestDist = Infinity;
        for (const s of this.series) {
          if (!s.togglePoint || !s.visible) continue;
          // Check rendered points (line/scatter/radar) or rendered bars (bar)
          const points = s._renderedPoints || [];
          const bars = s._renderedBars || [];
          for (const pt of points) {
            if (pt.index !== hit.index) continue;
            const d = Math.sqrt((mx - pt.x) ** 2 + (my - pt.y) ** 2);
            if (d < bestDist) {
              bestDist = d;
              bestSeries = s;
            }
          }
          for (const bar of bars) {
            if (bar.index !== hit.index) continue;
            const cx = bar.x + bar.width / 2;
            const cy = bar.y;
            const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
            if (d < bestDist) {
              bestDist = d;
              bestSeries = s;
            }
          }
        }
        if (bestSeries && bestDist <= 30) {
          bestSeries.togglePoint(hit.index);
          // Bounce animation loop handles re-rendering
        }
      }

      this.emit('click', this._activeHit);
      this.pluginManager.hook('onClick', this._activeHit);
    }

    // =========================================================================
    // Resize
    // =========================================================================

    /** @private */
    _onResize(width, height) {
      if (this._destroyed) return;

      // Viewport may not be assigned yet during initial construction
      const dpr = this.viewport ? this.viewport.getDpr() : (window.devicePixelRatio || 1);
      this.renderer.resize(width, height, dpr);

      // Use actual canvas size (excludes legend height)
      const canvasSize = this.renderer.getCanvasSize();
      this._width = canvasSize.width || width;
      this._height = canvasSize.height || height;

      if (this.pluginManager) {
        this.pluginManager.hook('onResize', this._width, this._height);
      }

      if (this.normalizedData) {
        this._render(false);
      }
    }

    // =========================================================================
    // Legend
    // =========================================================================

    /** @private */
    _updateLegend() {
      if (!this.legend) return;

      let items = [];
      if (this.isRadial && this.type !== 'radar') {
        // For pie/donut, legend items are data points
        if (this.series[0] && this.series[0].getLegendItems) {
          items = this.series[0].getLegendItems();
        }
      } else {
        // For cartesian/radar, legend items are series
        this.series.forEach(s => {
          items = items.concat(s.getLegendItems());
        });
      }

      this.legend.render(items);
    }

    /**
     * Toggle series visibility (called by Legend)
     * @param {number} index - Dataset index
     */
    toggleSeries(index) {
      // For pie/donut/funnel, toggle individual data points with animation
      if ((this.type === 'pie' || this.type === 'donut' || this.type === 'funnel') && this.series[0]) {
        const pie = this.series[0];
        if (!pie._hiddenSlices) pie._hiddenSlices = new Set();
        const wasHidden = pie._hiddenSlices.has(index);
        
        // Update legend immediately for responsive feel
        this._updateLegend();
        
        // Animate the slice in/out
        pie.animateSliceToggle(index, () => {
          this._updateLegend();
        });
        
        this.emit('legendToggle', { index, visible: wasHidden });
        return;
      }

      // For cartesian charts, toggle series visibility
      if (this.series[index]) {
        this.series[index].visible = !this.series[index].visible;

        // For bar charts, recalculate grouped positions so visible bars
        // redistribute evenly (no empty gaps)
        if (this.type === 'bar' || this.type === 'horizontalBar') {
          this._recalcBarPositions();
        }

        this._updateLegend();
        this._render(true);
        this.emit('legendToggle', { index, visible: this.series[index].visible });
      }
    }

    /**
     * Recalculate bar dataset indices based on visible series only.
     * This ensures bars redistribute evenly when one is hidden.
     * @private
     */
    _recalcBarPositions() {
      let visibleIndex = 0;
      const visibleCount = this.series.filter(s => s.visible).length;
      this.series.forEach(s => {
        if (s.setDatasetIndex) {
          if (s.visible) {
            s.setDatasetIndex(visibleIndex, visibleCount);
            visibleIndex++;
          } else {
            // Keep original index but set totalDatasets to visibleCount
            s.setDatasetIndex(0, visibleCount);
          }
        }
      });
    }

    /**
     * Highlight a specific series (dim all others).
     * Pass -1 to reset all to normal.
     * @param {number} index - Series/slice index to highlight, or -1 to reset
     */
    highlightSeries(index) {
      this._highlightIndex = index;
      this._render(false);
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Replace all data and re-render
     * @param {*} data - New data in any supported format
     */
    setData(data) {
      this._rawConfig.data = data;
      this._loadData(data);
    }

    /**
     * Add a line series (composable API)
     * @param {Object} options - Series options
     * @returns {Object} Series instance
     */
    addLineSeries(options = {}) {
      return this._addSeries('LineSeries', options);
    }

    /**
     * Add a bar series (composable API)
     * @param {Object} options - Series options
     * @returns {Object} Series instance
     */
    addBarSeries(options = {}) {
      return this._addSeries('BarSeries', options);
    }

    /** @private */
    _addSeries(seriesClassName, options) {
      const SeriesConstructor = CZ[seriesClassName];
      if (!SeriesConstructor) {
        throw new Error('czChart: Series type not found: ' + seriesClassName);
      }

      const instance = new SeriesConstructor(this, options);
      this.series.push(instance);

      // Return a proxy with convenient methods
      return {
        setData: (data) => {
          const normalized = CZ.Normalizer.normalize(data, {
            x: options.x,
            y: options.y
          });
          if (normalized.datasets && normalized.datasets[0]) {
            instance.setData(normalized.datasets[0]);
          }
          this.normalizedData = this.normalizedData || normalized;
          this._render(true);
        },
        append: (point) => {
          // For real-time streaming
          if (instance.dataset) {
            if (typeof point === 'object') {
              instance.dataset.values.push(point.y || point.value);
              if (this.normalizedData) {
                this.normalizedData.labels.push(point.x || point.label || '');
              }
            } else {
              instance.dataset.values.push(point);
            }
            this._render(false);
          }
        },
        hide: () => { instance.visible = false; this._render(false); },
        show: () => { instance.visible = true; this._render(false); },
        instance: instance
      };
    }

    /**
     * Force re-render
     */
    update() {
      this._render(false);
    }

    /**
     * Manual resize trigger
     */
    resize() {
      if (this.viewport) this.viewport.resize();
    }

    /**
     * Export chart as image
     * @param {string} format - 'png' or 'jpeg'
     * @param {number} quality - JPEG quality (0-1)
     * @returns {string} Data URL
     */
    toImage(format = 'png', quality = 0.92) {
      const canvas = this.renderer.getMainCanvas();
      return canvas.toDataURL('image/' + format, quality);
    }

    /**
     * Download chart as image
     * @param {string} filename
     * @param {string} format
     */
    downloadImage(filename = 'chart', format = 'png') {
      const dataUrl = this.toImage(format);
      const link = document.createElement('a');
      link.download = filename + '.' + format;
      link.href = dataUrl;
      link.click();
    }

    /**
     * Destroy chart and cleanup all resources
     */
    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;

      // Remove event listeners
      const mainCanvas = this.renderer.getMainCanvas();
      mainCanvas.removeEventListener('mousemove', this._onMouseMove);
      mainCanvas.removeEventListener('mouseleave', this._onMouseLeave);
      mainCanvas.removeEventListener('click', this._onClick);

      // Destroy subsystems
      if (this.tooltip) this.tooltip.destroy();
      if (this.legend) this.legend.destroy();
      if (this.zoomPan) this.zoomPan.disable();
      if (this.viewport) this.viewport.destroy();
      if (this.renderer) this.renderer.destroy();

      this.pluginManager.hook('destroy');

      // Clear references
      this.series = [];
      this.normalizedData = null;
      this.container.classList.remove('cz-chart-container');

      this.removeAllListeners();
      this.emit('destroy');
    }
  }

  CZ.Chart = Chart;

})(window.CZ = window.CZ || {});


// ============================================================
// src/index.js
// ============================================================

/**
 * czChart — Lightweight, Data-Driven Chart Library
 * Version: 1.0.0
 * License: MIT
 * 
 * Single entry point. This file is used by the build script
 * to define the load order for concatenation into cz-chart.min.js.
 * 
 * Global namespace: window.czChart
 */
// After all CZ.* modules are loaded, expose the public API
(function(global) {
  var CZ = global.CZ;

  /**
   * czChart public API
   */
  var czChart = {
    /** Library version */
    version: '1.0.0',

    /**
     * Create a new chart (declarative mode)
     * @param {string|HTMLElement} target - CSS selector or DOM element
     * @param {Object} config - Chart configuration
     * @returns {CZ.Chart} Chart instance
     * 
     * @example
     * czChart.create('#myChart', {
     *   type: 'line',
     *   data: [
     *     { month: 'Jan', sales: 100 },
     *     { month: 'Feb', sales: 200 }
     *   ],
     *   x: 'month',
     *   y: 'sales'
     * });
     */
    create: function(target, config) {
      return new CZ.Chart(target, config);
    },

    /**
     * Register a global plugin (applied to all charts)
     * @param {Object} plugin - Plugin object with lifecycle hooks
     */
    use: function(plugin) {
      CZ.Chart.use(plugin);
    },

    /**
     * Available themes
     */
    themes: {
      light: CZ.LightTheme,
      dark: CZ.DarkTheme
    },

    /**
     * Built-in plugins
     */
    plugins: {
      ThresholdLine: CZ.ThresholdLinePlugin,
      Watermark: CZ.WatermarkPlugin
    },

    /**
     * Easing functions (for reference/custom use)
     */
    Easing: CZ.Easing,

    /**
     * Direct access to internal classes (advanced usage)
     */
    _internal: CZ
  };

  // Expose globally
  global.czChart = czChart;

  // Also support: new czChart(target, config) pattern
  // by making czChart callable as a constructor-like function
  // (but we keep the .create() as primary API)

})(typeof window !== 'undefined' ? window : this);


})(typeof window !== "undefined" ? window : this);
