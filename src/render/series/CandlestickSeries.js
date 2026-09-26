'use strict';

/**
 * Candlestick/OHLC Series Renderer
 * For financial stock price data (Open, High, Low, Close).
 */
class CandlestickSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            bullishColor: '#10b981',
            bearishColor: '#ef4444',
            wickWidth: 1.5,
            bodyWidth: 0.6,
            visible: true
        }, options);
        this.dataset = null;
        this.visible = this.options.visible;
        this._renderedBars = [];
    }

    setData(dataset) {
        this.dataset = dataset;
    }

    getLegendItems() {
        if (!this.dataset) return [];
        return [{
            name: this.dataset.name || 'OHLC',
            color: this.options.bullishColor,
            visible: this.visible,
            datasetIndex: this.options.datasetIndex
        }];
    }

    getBounds() {
        if (!this.dataset || !this.visible || !this.dataset.ohlc) return { minY: 0, maxY: 100 };
        let minY = Infinity, maxY = -Infinity;
        for (const pt of this.dataset.ohlc) {
            if (pt.low < minY) minY = pt.low;
            if (pt.high > maxY) maxY = pt.high;
        }
        if (!isFinite(minY)) return { minY: 0, maxY: 100 };
        return { minY, maxY };
    }

    draw(ctx, plotArea, xScale, yScale, progress) {
        if (!this.dataset || !this.visible || !this.dataset.ohlc || this.dataset.ohlc.length === 0) return;

        const ohlc = this.dataset.ohlc;
        const count = ohlc.length;
        const bandWidth = xScale.getBandWidth ? xScale.getBandWidth() : (plotArea.width / count);
        const bodyWidth = bandWidth * this.options.bodyWidth;
        const halfBody = bodyWidth / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(plotArea.left, plotArea.top, plotArea.width, plotArea.height);
        ctx.clip();

        this._renderedBars = [];

        for (let i = 0; i < count; i++) {
            const pt = ohlc[i];
            if (!pt) continue;

            const x = Math.round(xScale.getPixel(i)) + 0.5;
            const yHigh = yScale.getPixel(pt.high);
            const yLow = yScale.getPixel(pt.low);
            const yOpen = yScale.getPixel(pt.open);
            const yClose = yScale.getPixel(pt.close);

            const isBullish = pt.close >= pt.open;
            const color = isBullish ? this.options.bullishColor : this.options.bearishColor;

            // Animate from center
            const center = (yOpen + yClose) / 2;
            const aOpen = center + (yOpen - center) * progress;
            const aClose = center + (yClose - center) * progress;
            const aHigh = center + (yHigh - center) * progress;
            const aLow = center + (yLow - center) * progress;

            // Draw wick (thin line from high to low)
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = this.options.wickWidth;
            ctx.moveTo(x, aHigh);
            ctx.lineTo(x, aLow);
            ctx.stroke();

            // Draw body (rectangle between open and close)
            const bodyTop = Math.min(aOpen, aClose);
            const bodyHeight = Math.max(1, Math.abs(aOpen - aClose));

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x - halfBody, bodyTop, bodyWidth, bodyHeight);
            ctx.globalAlpha = 1.0;

            // Body border
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - halfBody, bodyTop, bodyWidth, bodyHeight);

            // Doji indicator (cross when open ≈ close)
            if (Math.abs(pt.open - pt.close) < 0.01) {
                ctx.beginPath();
                ctx.moveTo(x - halfBody, center);
                ctx.lineTo(x + halfBody, center);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            this._renderedBars.push({
                index: i,
                x: x - halfBody,
                y: bodyTop,
                width: bodyWidth,
                height: bodyHeight,
                value: pt.close,
                ohlc: pt,
                isBullish
            });
        }

        ctx.restore();
    }

    drawHover(ctx, plotArea, xScale, yScale, activeIndex) {
        if (!this.visible || !this._renderedBars) return;
        const bar = this._renderedBars.find(b => b.index === activeIndex);
        if (!bar) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bar.x - 2, bar.y - 2, bar.width + 4, bar.height + 4);
        ctx.restore();
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._renderedBars) return null;

        for (const bar of this._renderedBars) {
            const padding = 5;
            if (mouseX >= bar.x - padding && mouseX <= bar.x + bar.width + padding &&
                mouseY >= bar.y - padding && mouseY <= bar.y + bar.height + padding) {
                return {
                    index: bar.index,
                    x: bar.x + bar.width / 2,
                    y: bar.y,
                    value: bar.ohlc,
                    seriesName: this.dataset.name || 'OHLC',
                    color: bar.isBullish ? this.options.bullishColor : this.options.bearishColor
                };
            }
        }
        return null;
    }
}

window.CZ = window.CZ || {};
window.CZ.CandlestickSeries = CandlestickSeries;
