'use strict';

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

        // Selected points — hollow ring + center dot
        if (this._selectedPoints.size > 0) {
            ctx.save();
            const bgColor = this._getBackgroundColor();
            for (const pt of this._renderedPoints) {
                if (!this._selectedPoints.has(pt.index)) continue;
                const r = 8;

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
     * Toggle a data point selection
     */
    togglePoint(index) {
        if (this._selectedPoints.has(index)) {
            this._selectedPoints.delete(index);
        } else {
            this._selectedPoints.add(index);
        }
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
