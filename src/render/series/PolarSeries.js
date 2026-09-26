'use strict';

(function(CZ) {
    class PolarSeries {
        constructor(chart, options = {}) {
            this.chart = chart;
            this.options = Object.assign({
                visible: true,
                datasetIndex: 0,
                gapAngle: 2, // degrees between sectors
                hoverExtend: 8,
                showGridCircles: true,
                gridCircleCount: 4,
                gridColor: 'rgba(0,0,0,0.08)',
                fillAlpha: 0.7,
                borderWidth: 2,
                borderColor: '#ffffff'
            }, options);
            this.visible = this.options.visible;
            this.dataset = null;
            this._colors = [];
            this._sectors = [];
            this._hiddenSlices = new Set();
            this._hoverIndex = -1;
        }

        setData(dataset) {
            this.dataset = dataset;
            this._colors = [];
            const numItems = (dataset.values || []).length;

            for (let i = 0; i < numItems; i++) {
                if (dataset.pointColors && dataset.pointColors[i]) {
                    this._colors.push(dataset.pointColors[i]);
                } else if (window.CZ && window.CZ.ColorUtils) {
                    this._colors.push(window.CZ.ColorUtils.getSeriesColor(i));
                } else {
                    const fallback = ['#4e79a7','#f28e2c','#e15759','#76b7b2','#59a14f','#edc949'];
                    this._colors.push(fallback[i % fallback.length]);
                }
            }
        }

        getBounds() { return null; }

        setHoverIndex(index) { this._hoverIndex = index; }

        getLegendItems() {
            if (!this.dataset) return [];
            const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
            return this.dataset.values.map((_, i) => ({
                name: labels[i] || `Item ${i + 1}`,
                color: this._colors[i] || '#000',
                visible: !this._hiddenSlices.has(i),
                datasetIndex: i
            }));
        }

        _hexToRgba(hex, alpha) {
            if (!hex) return `rgba(0,0,0,${alpha})`;
            if (hex.startsWith('rgb')) {
                const m = hex.match(/\d+/g);
                if (m) return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`;
            }
            let h = hex.replace(/^#/, '');
            if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
            const num = parseInt(h, 16);
            return `rgba(${(num>>16)&255},${(num>>8)&255},${num&255},${alpha})`;
        }

        draw(ctx, plotArea, xScale, yScale, progress) {
            if (!this.visible || !this.dataset || !this.dataset.values) return;

            const values = this.dataset.values;
            const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
            const centerX = plotArea.left + plotArea.width / 2;
            const centerY = plotArea.top + plotArea.height / 2;
            const maxRadius = Math.max(0, Math.min(plotArea.width, plotArea.height) / 2 - 20);

            // Get visible items
            const visibleIndexes = [];
            for (let i = 0; i < values.length; i++) {
                if (!this._hiddenSlices.has(i)) visibleIndexes.push(i);
            }
            if (visibleIndexes.length === 0) return;

            const visibleValues = visibleIndexes.map(i => values[i]);
            const maxValue = Math.max(...visibleValues);
            if (maxValue === 0) return;

            const gapRad = (this.options.gapAngle * Math.PI / 180);
            const totalGap = gapRad * visibleIndexes.length;
            const sectorAngle = (Math.PI * 2 - totalGap) / visibleIndexes.length;
            const startAngle = -Math.PI / 2;

            // Highlight state
            const highlightIdx = this._highlightSlice !== undefined ? this._highlightSlice : -1;

            ctx.save();

            // Draw grid circles
            if (this.options.showGridCircles) {
                ctx.strokeStyle = this.options.gridColor;
                ctx.lineWidth = 1;
                for (let g = 1; g <= this.options.gridCircleCount; g++) {
                    const r = Math.max(0, (g / this.options.gridCircleCount) * maxRadius);
                    if (r <= 0) continue;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            this._sectors = [];
            let currentAngle = startAngle;

            for (let vi = 0; vi < visibleIndexes.length; vi++) {
                const i = visibleIndexes[vi];
                const value = values[i];
                const ratio = value / maxValue;
                const r = Math.max(0, ratio * maxRadius * progress);

                const color = this._colors[i] || '#3b82f6';

                const isHovered = i === this._hoverIndex;
                const isDimmed = highlightIdx >= 0 && i !== highlightIdx;
                const extend = isHovered ? this.options.hoverExtend : 0;

                // Sector center offset for hover
                const midAngle = currentAngle + sectorAngle / 2;
                const offsetX = isHovered ? Math.cos(midAngle) * extend : 0;
                const offsetY = isHovered ? Math.sin(midAngle) * extend : 0;

                ctx.save();
                ctx.globalAlpha = isDimmed ? 0.15 : 1.0;

                ctx.beginPath();
                ctx.moveTo(centerX + offsetX, centerY + offsetY);
                if (r > 0) {
                    ctx.arc(centerX + offsetX, centerY + offsetY, r, currentAngle, currentAngle + sectorAngle);
                }
                ctx.closePath();

                ctx.fillStyle = this._hexToRgba(color, this.options.fillAlpha);
                ctx.fill();
                ctx.lineWidth = this.options.borderWidth;
                ctx.strokeStyle = this.options.borderColor;
                ctx.stroke();

                this._sectors.push({
                    index: i,
                    startAngle: currentAngle,
                    endAngle: currentAngle + sectorAngle,
                    radius: r,
                    color, value,
                    label: labels[i] || `Item ${i + 1}`
                });

                ctx.restore();

                currentAngle += sectorAngle + gapRad;
            }

            ctx.restore();
        }

        drawHover() {
            // Handled via setHoverIndex + draw
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

        hitTest(mouseX, mouseY) {
            if (!this._sectors || this._sectors.length === 0) return null;

            const plotArea = this.chart.plotArea;
            const centerX = plotArea.left + plotArea.width / 2;
            const centerY = plotArea.top + plotArea.height / 2;

            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let angle = Math.atan2(dy, dx);
            if (angle < -Math.PI / 2) angle += Math.PI * 2;

            for (const s of this._sectors) {
                let start = s.startAngle;
                let end = s.endAngle;
                // Normalize
                if (start < -Math.PI / 2) start += Math.PI * 2;
                if (end < -Math.PI / 2) end += Math.PI * 2;

                const inAngle = (start <= end) ? (angle >= start && angle <= end) :
                    (angle >= start || angle <= end);

                if (dist <= s.radius && inAngle) {
                    return {
                        series: this,
                        index: s.index,
                        value: s.value,
                        x: centerX, y: centerY,
                        label: s.label,
                        seriesName: s.label,
                        color: s.color,
                        datasetIndex: s.index
                    };
                }
            }
            return null;
        }
    }

    if (typeof window !== 'undefined') {
        window.CZ = window.CZ || {};
        window.CZ.PolarSeries = PolarSeries;
    }
})((typeof window !== 'undefined' ? (window.CZ = window.CZ || {}) : {}));
