'use strict';

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
        
        // Generate colors for each section
        for (let i = 0; i < numItems; i++) {
            if (window.CZ && window.CZ.ColorUtils) {
                this._colors.push(window.CZ.ColorUtils.getSeriesColor(i));
            } else {
                // Fallback basic colors
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
            if (bottomWidthRatio < this.options.neckWidth) {
                bottomWidthRatio = this.options.neckWidth;
            }
            if (visibleIndex === visibleCount - 1) {
                bottomWidthRatio = this.options.neckWidth;
            }
            
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
            ctx.globalAlpha = progress;
            
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
                ctx.globalAlpha = progress;
                const label = labels[i] || `Item ${i + 1}`;
                const total = values.reduce((sum, val, idx) => sum + (this._hiddenSlices.has(idx) ? 0 : val), 0);
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                const text = `${label} (${percent})`;
                
                ctx.fillStyle = isHovered ? '#000' : '#333';
                ctx.font = isHovered ? 'bold 12px Arial, sans-serif' : '12px Arial, sans-serif';
                
                const yCenter = currentY + sectionHeight / 2;
                
                if (this.options.labelPosition === 'center') {
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#ffffff';
                    
                    // Simple text shadow for better contrast
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;
                    ctx.fillText(text, centerX, yCenter);
                } else {
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    const xRight = centerX + maxWidth / 2 + 15;
                    ctx.fillText(text, xRight, yCenter);
                    
                    // Connecting line
                    ctx.beginPath();
                    const edgeX = centerX + (topWidth + bottomWidth) / 4; // approximate edge
                    ctx.moveTo(edgeX, yCenter);
                    ctx.lineTo(xRight - 5, yCenter);
                    ctx.strokeStyle = '#999999';
                    ctx.stroke();
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
                return {
                    series: this,
                    index: slice.index,
                    value: slice.value,
                    datasetIndex: slice.index
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
