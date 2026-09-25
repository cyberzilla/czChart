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
            labelFormat: 'percent',
            animationStyle: 'bounce' // 'bounce' = drop-in, 'grow' = radius scale
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedSlices = [];
        this._colors = [];
        this._hoverIndex = -1;
        this._sliceAnims = new Map(); // index → { type: 'in'|'out', progress: 0-1 }
    }

    setData(dataset) {
        this.dataset = dataset;
        this._colors = [];
        if (dataset && dataset.values) {
            for (let i = 0; i < dataset.values.length; i++) {
                if (dataset.pointColors && dataset.pointColors[i]) {
                    // Per-data-point color from data (e.g. { color: '#ff0000cc' })
                    this._colors.push(dataset.pointColors[i]);
                } else if (dataset.colors && dataset.colors[i]) {
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
        return this.dataset.values.map((val, i) => {
            const isHidden = this._hiddenSlices && this._hiddenSlices.has(i);
            const anim = this._sliceAnims ? this._sliceAnims.get(i) : null;
            const isExiting = anim && anim.type === 'out';
            return {
                name: labels[i] || ('Item ' + (i + 1)),
                color: this._colors[i] || '#000',
                visible: !isHidden && !isExiting,
                index: i,
                datasetIndex: i,
                series: this
            };
        });
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

    /**
     * Animate a slice in or out (toggle with animation)
     * @param {number} index - Slice index
     * @param {Function} onComplete - Callback when animation finishes
     */
    animateSliceToggle(index, onComplete) {
        if (!this._hiddenSlices) this._hiddenSlices = new Set();
        const isHiding = !this._hiddenSlices.has(index);
        const duration = 350; // ms
        const startTime = performance.now();

        // If showing, remove from hidden immediately so it draws during animation
        if (!isHiding) {
            this._hiddenSlices.delete(index);
        }

        this._sliceAnims.set(index, { type: isHiding ? 'out' : 'in', progress: 0 });

        const tick = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            this._sliceAnims.set(index, { type: isHiding ? 'out' : 'in', progress: t });

            // Re-render
            this.chart._render(false);

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                // Animation complete
                this._sliceAnims.delete(index);
                if (isHiding) {
                    this._hiddenSlices.add(index);
                }
                if (onComplete) onComplete();
                this.chart._render(false);
            }
        };
        requestAnimationFrame(tick);
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || !this.dataset.values || this.dataset.values.length === 0) return;

        const cx = plotArea.left + plotArea.width / 2;
        const cy = plotArea.top + plotArea.height / 2;
        const radius = Math.max(0, Math.min(plotArea.width, plotArea.height) / 2 * 0.82);
        const innerRadius = Math.max(0, radius * this.options.innerRadius);

        let startAngleRad = (this.options.startAngle * Math.PI) / 180;

        // Easing helpers for consistent animation (used in total calc AND visual)
        const _easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const _easeInCubic = (t) => t * t * t;

        // Calculate total: animate entering/exiting slices proportionally
        // IMPORTANT: use the same easing curve here as in the visual section
        // so angular redistribution stays perfectly in sync with the visual.
        let total = 0;
        for (let i = 0; i < this.dataset.values.length; i++) {
            const v = this.dataset.values[i] || 0;
            if (v <= 0) continue;
            const anim = this._sliceAnims.get(i);
            if (this._hiddenSlices && this._hiddenSlices.has(i) && !anim) continue;
            if (anim && anim.type === 'out') {
                const easedOut = _easeInCubic(anim.progress);
                total += v * (1 - easedOut);
            } else if (anim && anim.type === 'in') {
                const easedIn = _easeOutCubic(anim.progress);
                total += v * easedIn;
            } else {
                total += v;
            }
        }
        if (total === 0) {
            return;
        }

        this._renderedSlices = [];
        const values = this.dataset.values;
        const labels = this.chart.normalizedData ? this.chart.normalizedData.labels : [];
        const explodeOffset = 6;

        ctx.save();
        
        // Clip to plot area to prevent shadow bleeding
        ctx.beginPath();
        ctx.rect(plotArea.left - 10, plotArea.top - 10, plotArea.width + 20, plotArea.height + 20);
        ctx.clip();

        // Count visible slices for initial animation
        let visibleCount = 0;
        for (let i = 0; i < values.length; i++) {
            if (!values[i] || values[i] <= 0) continue;
            if (this._hiddenSlices && this._hiddenSlices.has(i) && !this._sliceAnims.has(i)) continue;
            visibleCount++;
        }

        // Easing function for initial page-load animation only
        const easeOutBack = (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        const animStyle = this.options.animationStyle || 'bounce';

        // First pass: draw non-hovered slices
        let angle = startAngleRad;
        const hlSlice = this._highlightSlice !== undefined ? this._highlightSlice : -1;
        let visibleIdx = 0;

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (!value || value <= 0) continue;
            
            const anim = this._sliceAnims.get(i);
            const isExiting = anim && anim.type === 'out';
            const isEntering = anim && anim.type === 'in';
            
            // Skip fully hidden (not animating) slices
            if (this._hiddenSlices && this._hiddenSlices.has(i) && !anim) continue;

            // Calculate effective fraction (animate for enter/exit)
            // Use the SAME easing as in total calculation for perfect sync
            let effectiveValue = value;
            if (isExiting) effectiveValue = value * (1 - _easeInCubic(anim.progress));
            if (isEntering) effectiveValue = value * _easeOutCubic(anim.progress);
            
            const fraction = total > 0 ? effectiveValue / total : 0;
            const sliceAngle = fraction * Math.PI * 2;
            const endAngle = angle + sliceAngle;
            const color = this._colors[i] || '#3b82f6';
            const isHovered = (i === this._hoverIndex);

            // Animation state
            let sliceProgress = 1;
            const dropDistance = radius * 0.4;
            let offsetX = 0, offsetY = 0, sliceAlpha = 1;
            let drawRadius = radius, drawInner = innerRadius;

            if (isExiting) {
                // Legend toggle out: smooth fade + angular shrink (in-place, no offset)
                // Angular shrink is handled by effectiveValue above.
                const t = _easeInCubic(anim.progress);
                sliceAlpha = Math.max(0, 1 - t);
            } else if (isEntering) {
                // Legend toggle in: smooth fade + angular grow (in-place, no offset)
                // Angular grow is handled by effectiveValue above.
                const t = _easeOutCubic(anim.progress);
                sliceAlpha = t;
            } else if (progress < 1) {
                // Initial page-load animation (bounce drop-in from outside)
                const sliceStart = visibleIdx / visibleCount;
                const sliceEnd = (visibleIdx + 1) / visibleCount;
                const overlap = 0.3 / visibleCount;
                const adjustedStart = Math.max(0, sliceStart - overlap);
                const wnd = sliceEnd - adjustedStart;
                const localT = (progress - adjustedStart) / wnd;
                sliceProgress = localT <= 0 ? 0 : localT >= 1 ? 1 : easeOutBack(Math.min(1, localT));
                
                if (animStyle === 'bounce') {
                    const midAngle = (angle + endAngle) / 2;
                    offsetX = Math.cos(midAngle) * dropDistance * (1 - sliceProgress);
                    offsetY = Math.sin(midAngle) * dropDistance * (1 - sliceProgress);
                } else {
                    drawRadius = radius * sliceProgress;
                    drawInner = innerRadius * sliceProgress;
                }
                sliceAlpha = Math.min(1, sliceProgress * 1.5);
            }

            this._renderedSlices.push({
                index: i,
                cx, cy,
                radius, innerRadius,
                startAngleRad: angle,
                endAngleRad: endAngle,
                value, fraction, color,
                label: labels[i] || ('Item ' + (i + 1))
            });

            // Skip active slice in first pass
            const hasActiveAnims = this._sliceAnims.size > 0;
            const isActive = isHovered || (!hasActiveAnims && hlSlice >= 0 && hlSlice === i);
            if (!isActive && (sliceProgress > 0 || isExiting || isEntering)) {
                // Don't apply highlight dimming while toggle animations are running
                const applyHighlight = hlSlice >= 0 && !hasActiveAnims;
                ctx.globalAlpha = applyHighlight ? 0.2 * sliceAlpha : sliceAlpha;
                this._drawSlice(ctx, cx, cy, drawRadius, drawInner, angle, endAngle, color, offsetX, offsetY);
                ctx.globalAlpha = 1.0;
            }

            visibleIdx++;
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

        // Second pass: draw active slice ON TOP with grown radius (no translate)
        // Active = hovered via mouse OR highlighted via legend hover (but NOT during toggle animations)
        const hasAnims = this._sliceAnims.size > 0;
        const activeIdx = this._hoverIndex >= 0 ? this._hoverIndex : (!hasAnims && hlSlice >= 0 ? hlSlice : -1);
        const growPx = 6;

        if (activeIdx >= 0 && progress >= 1) {
            const hSlice = this._renderedSlices.find(s => s.index === activeIdx);
            if (hSlice) {
                // Shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                // Draw slice with increased radius (no translate)
                ctx.globalAlpha = 1.0;
                const grownInner = innerRadius > 0 ? Math.max(0, innerRadius - 2) : 0;
                this._drawSlice(
                    ctx, cx, cy,
                    radius + growPx, grownInner,
                    hSlice.startAngleRad, hSlice.endAngleRad,
                    hSlice.color,
                    0, 0
                );

                // White edge highlight
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(cx, cy, radius + growPx, hSlice.startAngleRad, hSlice.endAngleRad);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Draw labels only when fully grown
        if (this.options.showLabels && progress >= 1) {
            this._drawLabels(ctx, cx, cy, radius, innerRadius, total, activeIdx, growPx);
        }

        ctx.restore();
    }

    /** @private */
    _drawSlice(ctx, cx, cy, outerR, innerR, startAngle, endAngle, fillColor, offsetX, offsetY) {
        outerR = Math.max(0, outerR);
        innerR = Math.max(0, innerR);
        if (outerR === 0) return;
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
    _drawLabels(ctx, cx, cy, radius, innerRadius, total, activeIdx, growPx) {
        ctx.save();
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const slice of this._renderedSlices) {
            if (slice.fraction < 0.04) continue;

            const isActive = (slice.index === activeIdx);
            const sliceRadius = isActive ? radius + (growPx || 0) : radius;
            const sliceInner = isActive && innerRadius > 0 ? Math.max(0, innerRadius - 2) : innerRadius;

            const midAngle = (slice.startAngleRad + slice.endAngleRad) / 2;
            const labelR = sliceInner > 0
                ? (sliceInner + sliceRadius) / 2
                : sliceRadius * 0.65;
            const lx = cx + Math.cos(midAngle) * labelR;
            const ly = cy + Math.sin(midAngle) * labelR;

            let text = '';
            if (this.options.labelFormat === 'percent') {
                text = Math.round(slice.fraction * 100) + '%';
            } else if (this.options.labelFormat === 'value') {
                text = String(slice.value);
            } else {
                text = slice.label;
            }

            // Active label slightly bolder
            if (isActive) {
                ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            } else {
                ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
