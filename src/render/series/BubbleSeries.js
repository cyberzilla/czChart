'use strict';

(function(CZ) {
    class BubbleSeries {
        constructor(chart, options = {}) {
            this.chart = chart;
            this.options = Object.assign({
                visible: true,
                datasetIndex: 0,
                minRadius: 5,
                maxRadius: 40,
                fillAlpha: 0.6,
                sizeKey: 'size',
                borderWidth: 2
            }, options);
            this.visible = this.options.visible;
            this.dataset = null;
            this._bubbles = [];
            this._sizes = [];
        }

        setData(dataset) {
            this.dataset = dataset;
            this._sizes = [];

            // Extract sizes from raw data
            const rawData = this.chart.normalizedData && this.chart.normalizedData.rawData;
            if (Array.isArray(rawData)) {
                const sizeKey = this.options.sizeKey;
                this._sizes = rawData.map(d => (d && typeof d === 'object') ? (parseFloat(d[sizeKey]) || 0) : 0);
            }
        }

        getBounds() {
            if (!this.dataset || !this.dataset.values) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
            const values = this.dataset.values;
            const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
            
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < values.length; i++) {
                const x = parseFloat(labels[i]) || i;
                const y = values[i];
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
            if (minX === Infinity) return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
            const padY = (maxY - minY) * 0.1;
            const padX = (maxX - minX) * 0.1;
            return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
        }

        getLegendItems() {
            return [{
                name: this.dataset ? this.dataset.name : 'Bubble',
                color: this.dataset ? this.dataset.color : '#000',
                visible: this.visible,
                datasetIndex: this.options.datasetIndex
            }];
        }

        _getRadius(sizeVal) {
            if (this._sizes.length === 0) return this.options.minRadius;
            const sizeMin = Math.min(...this._sizes.filter(s => s > 0));
            const sizeMax = Math.max(...this._sizes);
            if (sizeMax === sizeMin) return (this.options.minRadius + this.options.maxRadius) / 2;
            const t = (sizeVal - sizeMin) / (sizeMax - sizeMin);
            // Scale by area (square root) for perceptual accuracy
            return this.options.minRadius + Math.sqrt(t) * (this.options.maxRadius - this.options.minRadius);
        }

        _hexToRgba(hex, alpha) {
            let h = hex.replace(/^#/, '');
            if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
            const num = parseInt(h, 16);
            const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        _resolveColor(color) {
            if (!color) return '#3b82f6';
            if (color.startsWith('#')) return color;
            if (color.startsWith('rgb')) {
                const m = color.match(/\d+/g);
                if (m && m.length >= 3) {
                    return '#' + [m[0],m[1],m[2]].map(v => parseInt(v).toString(16).padStart(2,'0')).join('');
                }
            }
            return color;
        }

        draw(ctx, plotArea, xScale, yScale, progress) {
            if (!this.visible || !this.dataset || !this.dataset.values) return;

            const values = this.dataset.values;
            const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
            const baseColor = this._resolveColor(this.dataset.color || '#3b82f6');

            this._bubbles = [];

            ctx.save();

            for (let i = 0; i < values.length; i++) {
                const xVal = parseFloat(labels[i]) || i;
                const yVal = values[i];
                const sizeVal = this._sizes[i] || 0;

                const px = xScale.getPixel(xVal);
                const py = yScale.getPixel(yVal);
                const r = Math.max(0, this._getRadius(sizeVal) * progress);

                if (px < plotArea.left - r || px > plotArea.right + r) continue;
                if (py < plotArea.top - r || py > plotArea.bottom + r) continue;

                const color = (this.dataset.pointColors && this.dataset.pointColors[i])
                    ? this._resolveColor(this.dataset.pointColors[i])
                    : baseColor;

                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fillStyle = this._hexToRgba(color, this.options.fillAlpha);
                ctx.fill();
                ctx.lineWidth = this.options.borderWidth;
                ctx.strokeStyle = color;
                ctx.stroke();

                this._bubbles.push({
                    index: i, x: px, y: py, r, color,
                    value: yVal, size: sizeVal,
                    label: labels[i] || `Point ${i + 1}`
                });
            }

            ctx.restore();
        }

        drawHover(ctx, plotArea, xScale, yScale, index) {
            const bubble = this._bubbles.find(b => b.index === index);
            if (!bubble) return;

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.r * 1.1, 0, Math.PI * 2);
            ctx.fillStyle = this._hexToRgba(bubble.color, 0.8);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = bubble.color;
            ctx.stroke();
            ctx.restore();
        }

        hitTest(mouseX, mouseY) {
            if (!this._bubbles) return null;
            // Check from last (top) to first
            for (let i = this._bubbles.length - 1; i >= 0; i--) {
                const b = this._bubbles[i];
                const dx = mouseX - b.x;
                const dy = mouseY - b.y;
                if (dx * dx + dy * dy <= b.r * b.r) {
                    return {
                        series: this,
                        index: b.index,
                        value: b.value,
                        x: b.x, y: b.y,
                        label: b.label,
                        seriesName: this.dataset.name,
                        color: b.color,
                        datasetIndex: this.options.datasetIndex
                    };
                }
            }
            return null;
        }
    }

    if (typeof window !== 'undefined') {
        window.CZ = window.CZ || {};
        window.CZ.BubbleSeries = BubbleSeries;
    }
})((typeof window !== 'undefined' ? (window.CZ = window.CZ || {}) : {}));
