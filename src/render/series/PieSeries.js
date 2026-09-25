'use strict';

/**
 * Pie and Donut Series Renderer
 * Supports hover explode effect and padAngle gaps between slices.
 */
class PieSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            innerRadius: 0,
            startAngle: -90,
            padAngle: 2,
            cornerRadius: 0,
            visible: true,
            showLabels: true,
            labelFormat: 'percent'
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedSlices = [];
        this._colors = [];
        this._hoverIndex = -1;  // Track which slice is hovered
    }

    setData(dataset) {
        this.dataset = dataset;
        this._colors = [];
        if (dataset && dataset.values) {
            for (let i = 0; i < dataset.values.length; i++) {
                if (dataset.colors && dataset.colors[i]) {
                    this._colors.push(dataset.colors[i]);
                } else if (window.CZ && window.CZ.ColorUtils) {
                    this._colors.push(window.CZ.ColorUtils.getSeriesColor(i));
                } else {
                    this._colors.push(dataset.color || '#3b82f6');
                }
            }
        }
    }

    getLegendItems() {
        if (!this.dataset || !this.dataset.values) return [];
        const labels = this.chart.normalizedData ? this.chart.normalizedData.labels : [];
        return this.dataset.values.map((val, i) => ({
            name: labels[i] || ('Item ' + (i + 1)),
            color: this._colors[i] || '#000',
            visible: !(this._hiddenSlices && this._hiddenSlices.has(i)),
            index: i,
            datasetIndex: i,
            series: this
        }));
    }

    getBounds() {
        return null;
    }

    /**
     * Set which slice is currently hovered (-1 = none)
     */
    setHoverIndex(index) {
        this._hoverIndex = index;
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || !this.dataset.values || this.dataset.values.length === 0) return;

        const cx = plotArea.left + plotArea.width / 2;
        const cy = plotArea.top + plotArea.height / 2;
        const radius = Math.min(plotArea.width, plotArea.height) / 2 * 0.82;
        const innerRadius = radius * this.options.innerRadius;

        let startAngleRad = (this.options.startAngle * Math.PI) / 180;

        // Calculate total excluding hidden slices
        let total = 0;
        for (let i = 0; i < this.dataset.values.length; i++) {
            if (this._hiddenSlices && this._hiddenSlices.has(i)) continue;
            total += this.dataset.values[i] || 0;
        }
        if (total === 0) return;

        this._renderedSlices = [];
        const values = this.dataset.values;
        const labels = this.chart.normalizedData ? this.chart.normalizedData.labels : [];
        const explodeOffset = 12;

        ctx.save();
        
        // Clip to plot area to prevent shadow bleeding
        ctx.beginPath();
        ctx.rect(plotArea.left - 5, plotArea.top - 5, plotArea.width + 10, plotArea.height + 10);
        ctx.clip();

        // First pass: draw non-hovered slices
        let angle = startAngleRad;
        const hlSlice = this._highlightSlice !== undefined ? this._highlightSlice : -1;

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (!value || value <= 0) continue;
            if (this._hiddenSlices && this._hiddenSlices.has(i)) continue;

            const fraction = value / total;
            const sliceAngle = fraction * Math.PI * 2 * progress;
            const endAngle = angle + sliceAngle;
            const color = this._colors[i] || '#3b82f6';
            const isHovered = (i === this._hoverIndex);

            this._renderedSlices.push({
                index: i,
                cx, cy,
                radius, innerRadius,
                startAngleRad: angle,
                endAngleRad: endAngle,
                value, fraction, color,
                label: labels[i] || ('Item ' + (i + 1))
            });

            // Skip hovered slice in first pass (draw it on top later)
            if (!isHovered) {
                // Apply highlight dimming per slice
                ctx.globalAlpha = (hlSlice >= 0 && hlSlice !== i) ? 0.2 : 1.0;
                this._drawSlice(ctx, cx, cy, radius, innerRadius, angle, endAngle, color, 0, 0);
                ctx.globalAlpha = 1.0;
            }

            angle = endAngle;
        }

        // Draw white gaps between slices
        if (this.options.padAngle > 0 && values.length > 1) {
            const bgColor = this._getBackgroundColor();
            ctx.strokeStyle = bgColor;
            ctx.lineWidth = this.options.padAngle;
            for (const slice of this._renderedSlices) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(
                    cx + Math.cos(slice.startAngleRad) * (radius + 1),
                    cy + Math.sin(slice.startAngleRad) * (radius + 1)
                );
                ctx.stroke();
                // Also draw inner-to-outer line at end of each slice
                if (innerRadius > 0) {
                    ctx.beginPath();
                    ctx.moveTo(
                        cx + Math.cos(slice.startAngleRad) * innerRadius,
                        cy + Math.sin(slice.startAngleRad) * innerRadius
                    );
                    ctx.lineTo(
                        cx + Math.cos(slice.startAngleRad) * radius,
                        cy + Math.sin(slice.startAngleRad) * radius
                    );
                    ctx.stroke();
                }
            }
        }

        // Second pass: draw hovered slice ON TOP with explode + shadow
        if (this._hoverIndex >= 0) {
            const hSlice = this._renderedSlices.find(s => s.index === this._hoverIndex);
            if (hSlice) {
                const midAngle = (hSlice.startAngleRad + hSlice.endAngleRad) / 2;
                const dx = Math.cos(midAngle) * explodeOffset;
                const dy = Math.sin(midAngle) * explodeOffset;

                // Shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 16;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 4;

                // Draw exploded slice
                this._drawSlice(
                    ctx, cx, cy,
                    radius + 2, innerRadius,
                    hSlice.startAngleRad, hSlice.endAngleRad,
                    hSlice.color,
                    dx, dy
                );

                // White edge highlight
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(cx + dx, cy + dy, radius + 2, hSlice.startAngleRad, hSlice.endAngleRad);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Draw labels
        if (this.options.showLabels && progress >= 1) {
            this._drawLabels(ctx, cx, cy, radius, innerRadius, total);
        }

        ctx.restore();
    }

    /** @private */
    _drawSlice(ctx, cx, cy, outerR, innerR, startAngle, endAngle, fillColor, offsetX, offsetY) {
        ctx.beginPath();
        ctx.arc(cx + offsetX, cy + offsetY, outerR, startAngle, endAngle);
        if (innerR > 0) {
            ctx.arc(cx + offsetX, cy + offsetY, innerR, endAngle, startAngle, true);
        } else {
            ctx.lineTo(cx + offsetX, cy + offsetY);
        }
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    /** @private */
    _getBackgroundColor() {
        if (this.chart && this.chart._theme && this.chart._theme.background) {
            return this.chart._theme.background;
        }
        return '#ffffff';
    }

    /** @private */
    _drawLabels(ctx, cx, cy, radius, innerRadius, total) {
        ctx.save();
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const slice of this._renderedSlices) {
            if (slice.fraction < 0.04) continue;

            const midAngle = (slice.startAngleRad + slice.endAngleRad) / 2;
            const isHovered = (slice.index === this._hoverIndex);
            const explodeOff = isHovered ? 12 : 0;
            const labelR = innerRadius > 0
                ? (innerRadius + radius) / 2
                : radius * 0.65;
            const lx = cx + Math.cos(midAngle) * (labelR + explodeOff);
            const ly = cy + Math.sin(midAngle) * (labelR + explodeOff);

            let text = '';
            if (this.options.labelFormat === 'percent') {
                text = Math.round(slice.fraction * 100) + '%';
            } else if (this.options.labelFormat === 'value') {
                text = String(slice.value);
            } else {
                text = slice.label;
            }

            ctx.fillStyle = '#fff';
            ctx.fillText(text, lx, ly);
        }
        ctx.restore();
    }

    /**
     * Pie hover is handled by re-rendering the main canvas (not overlay).
     * This method is intentionally minimal — the actual effect is in draw().
     */
    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        // No-op: pie hover is handled via setHoverIndex + main canvas re-render
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedSlices) return null;

        for (let slice of this._renderedSlices) {
            const dx = mouseX - slice.cx;
            const dy = mouseY - slice.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= slice.innerRadius && dist <= slice.radius) {
                let angle = Math.atan2(dy, dx);
                if (angle < 0) angle += Math.PI * 2;

                let start = slice.startAngleRad % (Math.PI * 2);
                let end = slice.endAngleRad % (Math.PI * 2);
                if (start < 0) start += Math.PI * 2;
                if (end < 0) end += Math.PI * 2;

                let inSlice = false;
                if (start <= end) {
                    inSlice = angle >= start && angle <= end;
                } else {
                    inSlice = angle >= start || angle <= end;
                }

                if (inSlice) {
                    return {
                        index: slice.index,
                        x: mouseX,
                        y: mouseY,
                        value: slice.value,
                        seriesName: this.dataset.name,
                        color: slice.color,
                        label: slice.label
                    };
                }
            }
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.PieSeries = PieSeries;
