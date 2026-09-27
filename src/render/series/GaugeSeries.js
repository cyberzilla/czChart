'use strict';

class GaugeSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            min: 0,
            max: 100,
            arcWidth: 0.12,
            zones: [
                { min: 0, max: 50, color: '#10b981' },
                { min: 50, max: 75, color: '#f59e0b' },
                { min: 75, max: 100, color: '#ef4444' }
            ],
            showValue: true,
            valueFormat: null,
            visible: true
        }, options);
        
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedPoints = [];
    }

    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset || !this.options.visible) {
            return [];
        }
        
        return [{
            name: this.dataset.name || 'Gauge',
            color: this.dataset.color || '#333',
            visible: this.options.visible,
            datasetIndex: this.dataset.index || 0
        }];
    }

    getBounds() {
        return null;
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.visible || !this.dataset) return;

        const { min, max, zones, arcWidth: arcWidthRatio, showValue, valueFormat } = this.options;
        const range = max - min;
        
        // Layout
        const cx = plotArea.left + plotArea.width / 2;
        const cy = plotArea.top + plotArea.height * 0.92;
        const maxRadius = Math.min(plotArea.width / 2 - 4, plotArea.height * 0.85);
        const arcWidth = maxRadius * arcWidthRatio;
        const radius = maxRadius - arcWidth / 2;
        const innerR = radius - arcWidth / 2;

        ctx.save();

        // ── 1. Background arc (rounded ends) ──
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
        ctx.lineWidth = arcWidth;
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineCap = 'round';
        ctx.stroke();

        // ── 2. Colored zone arcs ──
        if (zones && zones.length > 0) {
            for (let z = 0; z < zones.length; z++) {
                const zone = zones[z];
                const zMin = Math.max(min, zone.min);
                const zMax = Math.min(max, zone.max);
                if (zMin >= zMax) continue;

                const sa = Math.PI + ((zMin - min) / range) * Math.PI;
                const ea = Math.PI + ((zMax - min) / range) * Math.PI;

                ctx.beginPath();
                ctx.arc(cx, cy, radius, sa, ea);
                ctx.lineWidth = arcWidth;
                ctx.strokeStyle = zone.color;
                ctx.lineCap = 'butt';
                ctx.stroke();
            }

            // Cap the two arc endpoints with filled circles matching first/last zone color
            const capR = arcWidth / 2;
            // Left endpoint (start of arc = angle π)
            const leftX = cx + Math.cos(Math.PI) * radius;
            const leftY = cy + Math.sin(Math.PI) * radius;
            ctx.beginPath();
            ctx.arc(leftX, leftY, capR, 0, Math.PI * 2);
            ctx.fillStyle = zones[0].color;
            ctx.fill();

            // Right endpoint (end of arc = angle 0/2π)
            const rightX = cx + Math.cos(0) * radius;
            const rightY = cy + Math.sin(0) * radius;
            ctx.beginPath();
            ctx.arc(rightX, rightY, capR, 0, Math.PI * 2);
            ctx.fillStyle = zones[zones.length - 1].color;
            ctx.fill();
        }

        // ── 3. Tick marks — major (with numbers) + minor ──
        const majorCount = 10;
        const minorPerMajor = 5;
        const totalTicks = majorCount * minorPerMajor;

        for (let i = 0; i <= totalTicks; i++) {
            const angle = Math.PI + (i / totalTicks) * Math.PI;
            const isMajor = (i % minorPerMajor === 0);

            const tickLen = isMajor ? maxRadius * 0.08 : maxRadius * 0.04;
            const tickWidth = isMajor ? 2.5 : 1;
            const startR = innerR;
            const endR = startR - tickLen;

            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
            ctx.lineTo(cx + Math.cos(angle) * endR, cy + Math.sin(angle) * endR);
            ctx.lineWidth = tickWidth;
            ctx.strokeStyle = isMajor ? '#374151' : '#9ca3af';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Numbers at major ticks
            if (isMajor) {
                const tickVal = min + (i / totalTicks) * range;
                const labelR = startR - tickLen - maxRadius * 0.06;
                const lx = cx + Math.cos(angle) * labelR;
                const ly = cy + Math.sin(angle) * labelR;

                const fontSize = Math.max(9, Math.min(14, maxRadius * 0.065));
                ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
                ctx.fillStyle = '#374151';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(Math.round(tickVal).toString(), lx, ly);
            }
        }

        // ── 4. Value display — large centered number ──
        const values = this.dataset.values || (this.dataset.data ? this.dataset.data : []);

        if (showValue && values.length > 0) {
            let displayVal = values[values.length - 1];
            if (typeof displayVal === 'object' && displayVal !== null) {
                displayVal = displayVal.y !== undefined ? displayVal.y : displayVal.value;
            }

            const rawVal = displayVal;
            let animatedVal = min + (rawVal - min) * progress;
            let animatedDisplayVal;
            if (valueFormat && typeof valueFormat === 'function') {
                animatedDisplayVal = valueFormat(animatedVal);
            } else {
                animatedDisplayVal = Math.round(animatedVal).toString();
            }

            const valueFontSize = Math.max(18, Math.min(48, maxRadius * 0.24));
            const valueY = cy - maxRadius * 0.28;

            ctx.font = `bold ${valueFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(animatedDisplayVal, cx, valueY);

            // Label below value
            const labelText = this.dataset.name || '';
            if (labelText) {
                const labelFontSize = Math.max(9, Math.min(14, maxRadius * 0.07));
                ctx.font = `500 ${labelFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
                ctx.fillStyle = '#9ca3af';
                ctx.fillText(labelText, cx, valueY + valueFontSize * 0.65);
            }
        }

        this._renderedPoints = [];

        // ── 5. Needle ──
        const datasetColor = this.dataset.color || '#ef4444';
        
        for (let i = 0; i < values.length; i++) {
            let val = values[i];
            if (typeof val === 'object' && val !== null) {
                val = val.y !== undefined ? val.y : val.value;
            }

            const targetVal = min + (val - min) * progress;
            const clampedVal = Math.max(min, Math.min(max, targetVal));
            const angle = Math.PI + ((clampedVal - min) / range) * Math.PI;

            this._renderedPoints.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius,
                value: val
            });

            ctx.save();

            // Needle shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 2;

            const needleLen = innerR - maxRadius * 0.13;  // tip stops before tick numbers
            const baseR = maxRadius * 0.045;               // rounded base radius

            ctx.translate(cx, cy);
            ctx.rotate(angle);

            // ── Teardrop needle: rounded base → smooth taper → sharp tip ──
            ctx.beginPath();
            // Left semicircle of the base (tail side)
            ctx.arc(0, 0, baseR, -Math.PI / 2, Math.PI / 2, true);
            // Bezier curve: bottom-base → sharp tip
            ctx.bezierCurveTo(
                needleLen * 0.3, baseR * 0.45,
                needleLen * 0.65, 1.2,
                needleLen, 0
            );
            // Bezier curve: sharp tip → top-base
            ctx.bezierCurveTo(
                needleLen * 0.65, -1.2,
                needleLen * 0.3, -baseR * 0.45,
                0, -baseR
            );
            ctx.closePath();

            // Gradient fill for depth
            const grad = ctx.createLinearGradient(0, -baseR, 0, baseR);
            grad.addColorStop(0, datasetColor);
            grad.addColorStop(0.45, datasetColor);
            grad.addColorStop(0.55, window.CZ && window.CZ.ColorUtils
                ? window.CZ.ColorUtils.withAlpha(datasetColor, 0.7) : datasetColor);
            grad.addColorStop(1, datasetColor);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.restore();
        }

        // ── 6. Pivot hub (layered circles for depth) ──
        const hubR = maxRadius * 0.05;
        
        // Shadow ring
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
        ctx.fillStyle = '#374151';
        ctx.fill();
        ctx.restore();

        // Mid ring
        ctx.beginPath();
        ctx.arc(cx, cy, hubR * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = '#1f2937';
        ctx.fill();

        // Center highlight
        ctx.beginPath();
        ctx.arc(cx, cy, hubR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#d1d5db';
        ctx.fill();

        ctx.restore();
    }

    drawHover() {
        // No-op for gauge
    }

    hitTest() {
        // Gauge doesn't need hit testing
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.GaugeSeries = GaugeSeries;
