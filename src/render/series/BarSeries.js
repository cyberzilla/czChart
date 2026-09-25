'use strict';

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
            datasetIndex: this.datasetIndex,
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
            
            const drawX = Math.round(xPos);
            const drawY = Math.round(currentY);
            const drawW = Math.max(1, Math.round(barWidth));
            const drawH = Math.round(barHeight);

            this._renderedBars.push({
                index: i,
                x: drawX,
                y: value >= 0 ? drawY : zeroY,
                width: drawW,
                height: Math.abs(drawH),
                value: value
            });

            if (this.options.borderRadius > 0) {
                this._roundedRect(ctx, drawX, value >= 0 ? drawY : zeroY, drawW, value >= 0 ? drawH : -drawH, this.options.borderRadius);
            } else {
                ctx.fillRect(drawX, value >= 0 ? drawY : zeroY, drawW, value >= 0 ? drawH : -drawH);
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

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedBars) return null;

        for (let bar of this._renderedBars) {
            const isInside = mouseX >= bar.x && mouseX <= bar.x + bar.width &&
                             mouseY >= (bar.value >= 0 ? bar.y : bar.y - bar.height) && 
                             mouseY <= (bar.value >= 0 ? bar.y + bar.height : bar.y);
            
            if (isInside) {
                return {
                    index: bar.index,
                    x: bar.x + bar.width / 2,
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
