'use strict';

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
