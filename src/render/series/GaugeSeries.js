'use strict';

class GaugeSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            min: 0,
            max: 100,
            arcWidth: 0.15,
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
        
        // Calculate center and radius
        const cx = plotArea.left + plotArea.width / 2;
        const cy = plotArea.top + plotArea.height * 0.85; // Move center up slightly to fit value text
        const maxRadius = Math.min(plotArea.width / 2, plotArea.height * 0.8);
        const arcWidth = maxRadius * arcWidthRatio;
        const radius = maxRadius - arcWidth / 2;

        ctx.save();

        // 1. Draw background arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 0);
        ctx.lineWidth = arcWidth;
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineCap = 'butt';
        ctx.stroke();

        // 2. Draw colored zones
        if (zones && zones.length > 0) {
            for (const zone of zones) {
                // Clamp zones to min/max
                const zoneMin = Math.max(min, zone.min);
                const zoneMax = Math.min(max, zone.max);
                if (zoneMin >= zoneMax) continue;

                const startAngle = Math.PI + ((zoneMin - min) / range) * Math.PI;
                const endAngle = Math.PI + ((zoneMax - min) / range) * Math.PI;
                
                ctx.beginPath();
                ctx.arc(cx, cy, radius, startAngle, endAngle);
                ctx.lineWidth = arcWidth;
                ctx.strokeStyle = zone.color;
                ctx.stroke();
            }
        }

        // 3. Draw tick marks around the arc
        const tickCount = 10;
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        for (let i = 0; i <= tickCount; i++) {
            const angle = Math.PI + (i / tickCount) * Math.PI;
            // ticks on the inner edge of the arc
            const innerR = radius - arcWidth / 2;
            const outerR = innerR - (maxRadius * 0.05); // tick length
            
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
            ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
            ctx.stroke();
        }

        this._renderedPoints = [];

        // 4. Draw needles
        const values = this.dataset.values || (this.dataset.data ? this.dataset.data : []);
        const datasetColor = this.dataset.color || '#374151';
        
        for (let i = 0; i < values.length; i++) {
            let val = values[i];
            if (typeof val === 'object' && val !== null) {
                val = val.y !== undefined ? val.y : val.value;
            }
            
            // Animate value based on progress
            const targetVal = min + (val - min) * progress;
            const clampedVal = Math.max(min, Math.min(max, targetVal));
            const angle = Math.PI + ((clampedVal - min) / range) * Math.PI;

            // Store for hit testing (even though it returns null, keeping state is good practice)
            this._renderedPoints.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius,
                value: val
            });

            ctx.save();
            
            // Needle shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Needle
            const needleLen = radius - arcWidth / 2 - (maxRadius * 0.05);
            const needleBase = maxRadius * 0.06;

            ctx.translate(cx, cy);
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, -needleBase / 2);
            ctx.lineTo(needleLen, 0);
            ctx.lineTo(0, needleBase / 2);
            ctx.closePath();
            
            ctx.fillStyle = datasetColor;
            ctx.fill();
            
            ctx.restore();
        }

        // 5. Draw center circle (hub)
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#1f2937';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = '#f9fafb';
        ctx.fill();

        // 6. Draw value text below the arc
        if (showValue && values.length > 0) {
            let displayVal = values[values.length - 1]; // Use last value in array
            if (typeof displayVal === 'object' && displayVal !== null) {
                displayVal = displayVal.y !== undefined ? displayVal.y : displayVal.value;
            }
            
            const rawVal = displayVal;
            if (valueFormat && typeof valueFormat === 'function') {
                displayVal = valueFormat(displayVal);
            } else {
                displayVal = Math.round(displayVal).toString();
            }
            
            // Animated value for visual smoothness
            let animatedDisplayVal = min + (rawVal - min) * progress;
            if (valueFormat && typeof valueFormat === 'function') {
                animatedDisplayVal = valueFormat(animatedDisplayVal);
            } else {
                animatedDisplayVal = Math.round(animatedDisplayVal).toString();
            }
            
            ctx.font = `bold ${Math.max(14, Math.min(36, maxRadius * 0.12))}px sans-serif`;
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(animatedDisplayVal, cx, cy + maxRadius * 0.08);
        }

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
