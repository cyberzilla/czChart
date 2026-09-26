'use strict';

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
