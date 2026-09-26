'use strict';

(function(CZ) {
    class BoxPlotSeries {
        constructor(chart, options = {}) {
            this.chart = chart;
            this.options = Object.assign({
                visible: true,
                datasetIndex: 0,
                boxWidthRatio: 0.5,
                medianColor: null,
                medianWidth: 2,
                whiskerColor: '#666666',
                whiskerWidth: 1,
                capWidth: 0.3
            }, options);
            this.visible = this.options.visible;
            this.dataset = null;
            this._boxes = [];
        }

        setData(dataset) {
            this.dataset = dataset;
            this._boxData = [];

            // Try to get boxData from dataset
            if (dataset.boxData) {
                this._boxData = dataset.boxData;
                return;
            }

            // Try to compute from rawData
            const rawData = this.chart.normalizedData && this.chart.normalizedData.rawData;
            if (Array.isArray(rawData)) {
                this._boxData = rawData.map(d => {
                    if (d && typeof d === 'object') {
                        return {
                            min: parseFloat(d.min) || 0,
                            q1: parseFloat(d.q1) || 0,
                            median: parseFloat(d.median) || 0,
                            q3: parseFloat(d.q3) || 0,
                            max: parseFloat(d.max) || 0
                        };
                    }
                    return null;
                }).filter(Boolean);
            }
        }

        getBounds() {
            if (!this._boxData || this._boxData.length === 0) return { minY: 0, maxY: 0 };
            let minY = Infinity, maxY = -Infinity;
            for (const b of this._boxData) {
                if (b.min < minY) minY = b.min;
                if (b.max > maxY) maxY = b.max;
            }
            const pad = (maxY - minY) * 0.05;
            return { minY: minY - pad, maxY: maxY + pad };
        }

        getLegendItems() {
            return [{
                name: this.dataset ? this.dataset.name : 'Box Plot',
                color: this.dataset ? this.dataset.color : '#3b82f6',
                visible: this.visible,
                datasetIndex: this.options.datasetIndex
            }];
        }

        _hexToRgba(hex, alpha) {
            if (!hex || !hex.startsWith('#')) return `rgba(59, 130, 246, ${alpha})`;
            let h = hex.replace(/^#/, '');
            if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
            const num = parseInt(h, 16);
            const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        draw(ctx, plotArea, xScale, yScale, progress) {
            if (!this.visible || !this._boxData || this._boxData.length === 0) return;

            const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
            const bandWidth = xScale.getBandWidth();
            const boxWidth = bandWidth * this.options.boxWidthRatio;
            const capHalf = boxWidth * this.options.capWidth;
            const color = this.dataset.color || '#3b82f6';
            const medianColor = this.options.medianColor || color;

            this._boxes = [];

            ctx.save();
            ctx.globalAlpha = progress;

            for (let i = 0; i < this._boxData.length; i++) {
                const d = this._boxData[i];
                const cx = xScale.getPixel(i);
                const x = cx - boxWidth / 2;

                const yMin = yScale.getPixel(d.min);
                const yQ1 = yScale.getPixel(d.q1);
                const yMedian = yScale.getPixel(d.median);
                const yQ3 = yScale.getPixel(d.q3);
                const yMax = yScale.getPixel(d.max);

                // Whisker: min to Q1
                ctx.beginPath();
                ctx.strokeStyle = this.options.whiskerColor;
                ctx.lineWidth = this.options.whiskerWidth;
                ctx.moveTo(cx, yQ1);
                ctx.lineTo(cx, yMax); // max is above Q3 (smaller pixel Y)
                ctx.moveTo(cx, yQ3);
                ctx.lineTo(cx, yMin); // min is below Q1 (larger pixel Y)
                ctx.stroke();

                // Caps
                ctx.beginPath();
                ctx.moveTo(cx - capHalf, yMax);
                ctx.lineTo(cx + capHalf, yMax);
                ctx.moveTo(cx - capHalf, yMin);
                ctx.lineTo(cx + capHalf, yMin);
                ctx.stroke();

                // Box (Q1 to Q3)
                const boxTop = Math.min(yQ1, yQ3);
                const boxHeight = Math.abs(yQ3 - yQ1);
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, boxTop, boxWidth, boxHeight, 3);
                } else {
                    ctx.rect(x, boxTop, boxWidth, boxHeight);
                }
                ctx.fillStyle = this._hexToRgba(color, 0.3);
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Median line
                ctx.beginPath();
                ctx.moveTo(x, yMedian);
                ctx.lineTo(x + boxWidth, yMedian);
                ctx.strokeStyle = medianColor;
                ctx.lineWidth = this.options.medianWidth;
                ctx.stroke();

                this._boxes.push({
                    index: i,
                    x, y: boxTop, w: boxWidth, h: boxHeight,
                    cx, yMin, yQ1, yMedian, yQ3, yMax,
                    data: d, color,
                    label: labels[i] || `Box ${i + 1}`
                });
            }

            ctx.restore();
        }

        drawHover(ctx, plotArea, xScale, yScale, index) {
            const box = this._boxes.find(b => b.index === index);
            if (!box) return;

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.25)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(box.x, box.y, box.w, box.h, 3);
            } else {
                ctx.rect(box.x, box.y, box.w, box.h);
            }
            ctx.fillStyle = this._hexToRgba(box.color, 0.5);
            ctx.fill();
            ctx.strokeStyle = box.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        hitTest(mouseX, mouseY) {
            if (!this._boxes) return null;
            for (const box of this._boxes) {
                // Check within box width and whisker range (min to max)
                const inX = mouseX >= box.x && mouseX <= box.x + box.w;
                const inY = mouseY >= Math.min(box.yMax, box.yMin) && mouseY <= Math.max(box.yMax, box.yMin);
                if (inX && inY) {
                    return {
                        series: this,
                        index: box.index,
                        value: box.data.median,
                        x: box.cx, y: box.y,
                        label: box.label,
                        seriesName: this.dataset.name,
                        color: box.color,
                        datasetIndex: this.options.datasetIndex
                    };
                }
            }
            return null;
        }
    }

    if (typeof window !== 'undefined') {
        window.CZ = window.CZ || {};
        window.CZ.BoxPlotSeries = BoxPlotSeries;
    }
})((typeof window !== 'undefined' ? (window.CZ = window.CZ || {}) : {}));
