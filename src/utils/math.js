'use strict';

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
