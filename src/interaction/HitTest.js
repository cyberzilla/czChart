'use strict';

(function(CZ) {
    /**
     * Hit testing utilities for finding data points near mouse.
     */
    class HitTester {
        /**
         * @param {Object} chart - Reference to the chart instance
         */
        constructor(chart) {
            this.chart = chart;
        }

        /**
         * Finds the single nearest data point to the given mouse coordinates.
         * @param {number} mouseX 
         * @param {number} mouseY 
         * @returns {Object|null} Nearest hit result or null
         */
        findNearest(mouseX, mouseY) {
            if (!this.chart || !this.chart.series) return null;
            
            let nearest = null;
            let minDistance = Infinity;

            const plotArea = this.chart.plotArea;
            const xScale = this.chart.scales.x;
            const yScale = this.chart.scales.y;

            // For cartesian charts, check bounds. For radial, skip bounds check.
            if (!this.chart.isRadial) {
                if (mouseX < plotArea.left - 10 || mouseX > plotArea.right + 10 || 
                    mouseY < plotArea.top - 10 || mouseY > plotArea.bottom + 10) {
                    return null;
                }
            }

            for (let i = 0; i < this.chart.series.length; i++) {
                const series = this.chart.series[i];
                if (!series.visible) continue;

                const hit = series.hitTest(mouseX, mouseY, plotArea, xScale, yScale);
                if (hit) {
                    const dx = mouseX - hit.x;
                    const dy = mouseY - hit.y;
                    const distance = dx * dx + dy * dy;

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearest = { ...hit, datasetIndex: i, series: series };
                    }
                }
            }

            return nearest;
        }

        /**
         * Finds all series values at the nearest x-index (for shared tooltip).
         * @param {number} mouseX 
         * @param {number} mouseY 
         * @returns {Object|null} Shared hit result or null
         */
        findAll(mouseX, mouseY) {
            if (!this.chart || !this.chart.series) return null;

            const nearest = this.findNearest(mouseX, mouseY);
            if (!nearest) return null;
            if (nearest.index === undefined && nearest.index !== 0) return null;

            const items = [];
            let label = nearest.label;

            // For radial charts (pie/donut/funnel/gauge), return single item
            if (this.chart.isRadial && this.chart.type !== 'radar') {
                items.push({
                    seriesName: nearest.label || nearest.seriesName || 'Value',
                    value: nearest.value,
                    color: nearest.color || '#000'
                });
                return {
                    index: nearest.index,
                    label: label || '',
                    x: nearest.x,
                    items: items
                };
            }

            // For candlestick, show OHLC values as separate rows
            if (this.chart.type === 'candlestick') {
                const series = this.chart.series[0];
                if (series && series._renderedBars) {
                    const bar = series._renderedBars.find(b => b.index === nearest.index);
                    if (bar && bar.ohlc) {
                        const ohlc = bar.ohlc;
                        const bullColor = series.options.bullishColor || '#10b981';
                        const bearColor = series.options.bearishColor || '#ef4444';
                        const color = ohlc.close >= ohlc.open ? bullColor : bearColor;
                        items.push({ seriesName: 'Open', value: ohlc.open, color });
                        items.push({ seriesName: 'High', value: ohlc.high, color });
                        items.push({ seriesName: 'Low', value: ohlc.low, color });
                        items.push({ seriesName: 'Close', value: ohlc.close, color });
                    }
                }
                if (!label && this.chart.normalizedData && this.chart.normalizedData.labels) {
                    label = this.chart.normalizedData.labels[nearest.index];
                }
                return {
                    index: nearest.index,
                    label: label || '',
                    x: nearest.x,
                    items: items
                };
            }

            // For cartesian/radar charts, gather all series values at the same index
            for (let i = 0; i < this.chart.series.length; i++) {
                const series = this.chart.series[i];
                if (!series.visible) continue;

                const dataset = series.dataset;
                if (dataset && dataset.values && dataset.values[nearest.index] !== undefined) {
                    const val = dataset.values[nearest.index];
                    // Skip object values (e.g. OHLC) — they need special handling above
                    if (typeof val === 'object' && val !== null) continue;
                    items.push({
                        seriesName: dataset.name || ('Series ' + (i + 1)),
                        value: val,
                        color: dataset.color || '#000'
                    });
                }
            }

            if (items.length === 0) {
                // Fallback: use nearest hit data directly
                items.push({
                    seriesName: nearest.seriesName || 'Value',
                    value: nearest.value,
                    color: nearest.color || '#000'
                });
            }

            // Get label from normalizedData
            if (!label && this.chart.normalizedData && this.chart.normalizedData.labels) {
                label = this.chart.normalizedData.labels[nearest.index];
            }

            return {
                index: nearest.index,
                label: label || (nearest.x != null ? String(nearest.x) : ''),
                x: nearest.x,
                items: items
            };
        }
    }

    CZ.HitTester = HitTester;
})(window.CZ = window.CZ || {});
