'use strict';

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
