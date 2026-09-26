'use strict';

(function(CZ) {
    class WaterfallSeries {
        constructor(chart, options = {}) {
            this.chart = chart;
            this.options = Object.assign({
                visible: true,
                datasetIndex: 0,
                positiveColor: '#10b981',
                negativeColor: '#ef4444',
                totalColor: '#3b82f6',
                connectorColor: '#94a3b8',
                connectorWidth: 1,
                borderRadius: 4,
                barWidthRatio: 0.6,
                showConnectors: true,
                totalIndexes: null // auto-detect or [index1, index2]
            }, options);
            this.visible = this.options.visible;
            this.dataset = null;
            this._bars = [];
        }

        setData(dataset) {
            this.dataset = dataset;
        }

        getBounds() {
            if (!this.dataset || !this.dataset.values) return { minY: 0, maxY: 0 };
            const values = this.dataset.values;
            const totals = this._getTotalIndexes(values);
            let runningTotal = 0;
            let minY = 0, maxY = 0;

            for (let i = 0; i < values.length; i++) {
                if (totals.has(i)) {
                    // Total bar goes from 0 to runningTotal
                    minY = Math.min(minY, 0, runningTotal);
                    maxY = Math.max(maxY, 0, runningTotal);
                } else {
                    const prev = runningTotal;
                    runningTotal += values[i];
                    minY = Math.min(minY, prev, runningTotal);
                    maxY = Math.max(maxY, prev, runningTotal);
                }
            }
            return { minY, maxY };
        }

        _getTotalIndexes(values) {
            if (this.options.totalIndexes) {
                return new Set(this.options.totalIndexes);
            }
            // Auto-detect: last item is total if it roughly equals sum of previous
            const set = new Set();
            if (values.length > 1) {
                const sum = values.slice(0, -1).reduce((a, b) => a + b, 0);
                if (Math.abs(values[values.length - 1] - sum) < 0.01) {
                    set.add(values.length - 1);
                }
            }
            return set;
        }

        getLegendItems() {
            return [{
                name: this.dataset ? this.dataset.name : 'Waterfall',
                color: this.options.totalColor,
                visible: this.visible,
                datasetIndex: this.options.datasetIndex
            }];
        }

        draw(ctx, plotArea, xScale, yScale, progress) {
            if (!this.visible || !this.dataset || !this.dataset.values) return;

            const values = this.dataset.values;
            const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
            const totals = this._getTotalIndexes(values);
            const bandWidth = xScale.getBandWidth();
            const barWidth = bandWidth * this.options.barWidthRatio;
            const radius = this.options.borderRadius;

            this._bars = [];
            let runningTotal = 0;

            ctx.save();
            ctx.globalAlpha = progress;

            for (let i = 0; i < values.length; i++) {
                const val = values[i];
                const cx = xScale.getPixel(i);
                let barTop, barBottom, color;

                if (totals.has(i)) {
                    // Total bar: from 0 to runningTotal
                    barTop = yScale.getPixel(Math.max(0, runningTotal));
                    barBottom = yScale.getPixel(Math.min(0, runningTotal));
                    color = this.options.totalColor;
                } else {
                    const prevTotal = runningTotal;
                    runningTotal += val;
                    barTop = yScale.getPixel(Math.max(prevTotal, runningTotal));
                    barBottom = yScale.getPixel(Math.min(prevTotal, runningTotal));
                    color = val >= 0 ? this.options.positiveColor : this.options.negativeColor;
                }

                // Support custom colors
                if (this.dataset.pointColors && this.dataset.pointColors[i]) {
                    color = this.dataset.pointColors[i];
                }

                const x = cx - barWidth / 2;
                const y = barTop;
                const w = barWidth;
                const h = Math.max(1, barBottom - barTop);

                // Draw bar
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, w, h, radius);
                } else {
                    ctx.rect(x, y, w, h);
                }
                ctx.fillStyle = color;
                ctx.fill();

                this._bars.push({
                    index: i,
                    x, y, w, h, color,
                    value: val,
                    runningTotal: totals.has(i) ? runningTotal : runningTotal,
                    isTotal: totals.has(i),
                    label: labels[i] || `Item ${i + 1}`
                });

                // Draw connector line to next bar
                if (this.options.showConnectors && i < values.length - 1 && !totals.has(i)) {
                    const nextCx = xScale.getPixel(i + 1);
                    const connectorY = yScale.getPixel(runningTotal);
                    ctx.beginPath();
                    ctx.setLineDash([3, 3]);
                    ctx.strokeStyle = this.options.connectorColor;
                    ctx.lineWidth = this.options.connectorWidth;
                    ctx.moveTo(cx + barWidth / 2, connectorY);
                    ctx.lineTo(nextCx - barWidth / 2, connectorY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            ctx.restore();
        }

        drawHover(ctx, plotArea, xScale, yScale, index) {
            if (!this._bars || !this._bars[index]) return;
            const bar = this._bars[index];
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 3;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bar.x, bar.y, bar.w, bar.h, this.options.borderRadius);
            } else {
                ctx.rect(bar.x, bar.y, bar.w, bar.h);
            }
            ctx.fillStyle = bar.color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.stroke();
            ctx.restore();
        }

        hitTest(mouseX, mouseY) {
            if (!this._bars) return null;
            for (const bar of this._bars) {
                if (mouseX >= bar.x && mouseX <= bar.x + bar.w &&
                    mouseY >= bar.y && mouseY <= bar.y + bar.h) {
                    return {
                        series: this,
                        index: bar.index,
                        value: bar.value,
                        x: bar.x + bar.w / 2,
                        y: bar.y,
                        label: bar.label,
                        seriesName: this.dataset.name,
                        color: bar.color,
                        datasetIndex: this.options.datasetIndex
                    };
                }
            }
            return null;
        }
    }

    if (typeof window !== 'undefined') {
        window.CZ = window.CZ || {};
        window.CZ.WaterfallSeries = WaterfallSeries;
    }
})((typeof window !== 'undefined' ? (window.CZ = window.CZ || {}) : {}));
