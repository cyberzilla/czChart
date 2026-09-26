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
