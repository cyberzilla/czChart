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

        ctx.save();
        ctx.globalAlpha = progress; // Fade in animation
        ctx.fillStyle = this.dataset.color || '#000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;

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

            this._drawShape(ctx, this.options.pointShape, px, py, Math.max(0.1, r));

            this._renderedPoints.push({
                index: i,
                x: px,
                y: py,
                valueX: pt.x,
                valueY: pt.y,
                r: r
            });
        });

        ctx.restore();
    }

    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedPoints) return;
        const pt = this._renderedPoints.find(p => p.index === activeIndex);
        if (!pt) return;

        ctx.save();
        ctx.shadowColor = this.dataset.color || '#000';
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.dataset.color || '#000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        this._drawShape(ctx, this.options.pointShape, pt.x, pt.y, pt.r * 1.5);
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
