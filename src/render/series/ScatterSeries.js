'use strict';

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
