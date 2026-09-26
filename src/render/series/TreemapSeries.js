'use strict';

class TreemapSeries {
    constructor(chart, options = {}) {
        this.chart = chart;
        this.options = Object.assign({
            visible: true,
            datasetIndex: 0
        }, options);
        this.visible = this.options.visible;
        this.dataset = null;
        this._hiddenSlices = new Set();
        this._highlightSlice = null;
        this._rects = [];
    }

    setData(dataset) {
        this.dataset = dataset;
        this._colors = [];
        for (let i = 0; i < dataset.values.length; i++) {
            if (dataset.pointColors && dataset.pointColors[i]) {
                this._colors.push(dataset.pointColors[i]);
            } else {
                this._colors.push(window.CZ.ColorUtils.getSeriesColor(i));
            }
        }
    }

    getBounds() {
        return null;
    }

    getLegendItems() {
        if (!this.dataset || !this.dataset.values) return [];
        const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
        return this.dataset.values.map((v, i) => ({
            name: labels[i] || `Item ${i}`,
            color: this._colors[i],
            visible: !this._hiddenSlices.has(i),
            datasetIndex: i
        }));
    }

    animateSliceToggle(index, onComplete) {
        if (this._hiddenSlices.has(index)) {
            this._hiddenSlices.delete(index);
        } else {
            this._hiddenSlices.add(index);
        }
        if (typeof onComplete === 'function') onComplete();
    }

    draw(ctx, plotArea, xScale, yScale, progress = 1) {
        if (!this.visible || !this.dataset || !this.dataset.values) return;

        const labels = (this.chart.normalizedData && this.chart.normalizedData.labels) || [];
        
        let total = 0;
        const items = [];
        for (let i = 0; i < this.dataset.values.length; i++) {
            if (this._hiddenSlices.has(i)) continue;
            let val = this.dataset.values[i];
            if (val > 0) {
                total += val;
                items.push({
                    index: i,
                    value: val,
                    label: labels[i] || `Item ${i}`,
                    color: this._colors[i]
                });
            }
        }

        if (total === 0) return;

        // Sort values descending for squarified layout
        items.sort((a, b) => b.value - a.value);

        // Compute squarified treemap layout — edge-to-edge
        this._rects = [];
        const fullW = parseFloat(ctx.canvas.style.width) || plotArea.width;
        const fullH = parseFloat(ctx.canvas.style.height) || plotArea.height;
        this._squarify(items, [], {
            x: 0,
            y: 0,
            w: fullW,
            h: fullH
        }, total);

        const R = 8;
        const T = 2; // tolerance for edge detection

        ctx.save();

        // Draw rects — corner rects get per-corner border-radius
        for (let i = 0; i < this._rects.length; i++) {
            const rect = this._rects[i];
            const gap = 1;
            const rx = rect.x + gap;
            const ry = rect.y + gap;
            const rw = Math.max(0, rect.w - gap * 2);
            const rh = Math.max(0, rect.h - gap * 2);
            if (rw <= 0 || rh <= 0) continue;

            const animW = rw * progress;
            const animH = rh * progress;
            const cxr = rx + rw / 2;
            const cyr = ry + rh / 2;
            const currentX = cxr - animW / 2;
            const currentY = cyr - animH / 2;
            if (animW <= 0 || animH <= 0) continue;

            let alpha = 1;
            if (this._highlightSlice >= 0 && this._highlightSlice !== rect.index) {
                alpha = 0.15;
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = rect.color;

            // Detect which edges this rect touches
            const atLeft = rect.x <= T;
            const atRight = (rect.x + rect.w) >= fullW - T;
            const atTop = rect.y <= T;
            const atBottom = (rect.y + rect.h) >= fullH - T;

            // Per-corner radii: [top-left, top-right, bottom-right, bottom-left]
            const tl = (atTop && atLeft) ? R : 0;
            const tr = (atTop && atRight) ? R : 0;
            const br = (atBottom && atRight) ? R : 0;
            const bl = (atBottom && atLeft) ? R : 0;

            if (tl || tr || br || bl) {
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(currentX, currentY, animW, animH, [tl, tr, br, bl]);
                } else {
                    // Fallback: manual per-corner arcs
                    const x = currentX, y = currentY, w = animW, h = animH;
                    ctx.moveTo(x + tl, y);
                    ctx.lineTo(x + w - tr, y);
                    if (tr) ctx.arc(x + w - tr, y + tr, tr, -Math.PI/2, 0);
                    else ctx.lineTo(x + w, y);
                    ctx.lineTo(x + w, y + h - br);
                    if (br) ctx.arc(x + w - br, y + h - br, br, 0, Math.PI/2);
                    else ctx.lineTo(x + w, y + h);
                    ctx.lineTo(x + bl, y + h);
                    if (bl) ctx.arc(x + bl, y + h - bl, bl, Math.PI/2, Math.PI);
                    else ctx.lineTo(x, y + h);
                    ctx.lineTo(x, y + tl);
                    if (tl) ctx.arc(x + tl, y + tl, tl, Math.PI, Math.PI*1.5);
                    else ctx.lineTo(x, y);
                    ctx.closePath();
                }
                ctx.fill();
            } else {
                ctx.fillRect(currentX, currentY, animW, animH);
            }

            if (animW >= 40 && animH >= 20) {
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(rect.label, cxr, cyr - 6);
                ctx.font = '11px sans-serif';
                ctx.fillText(rect.value.toString(), cxr, cyr + 8);
            }
        }

        ctx.restore();
    }

    _squarify(children, row, rect, totalVal) {
        if (children.length === 0) {
            if (row.length > 0) {
                this._layoutRow(row, rect, totalVal);
            }
            return;
        }

        const child = children[0];
        const newRow = row.slice();
        newRow.push(child);

        const currentRatio = this._worstRatio(row, rect, totalVal);
        const newRatio = this._worstRatio(newRow, rect, totalVal);

        if (row.length === 0 || newRatio <= currentRatio) {
            children.shift();
            this._squarify(children, newRow, rect, totalVal);
        } else {
            const newRect = this._layoutRow(row, rect, totalVal);
            const rowVal = row.reduce((sum, item) => sum + item.value, 0);
            this._squarify(children, [], newRect, totalVal - rowVal);
        }
    }

    _worstRatio(row, rect, totalVal) {
        if (row.length === 0) return Infinity;
        
        const area = (rect.w * rect.h);
        const rowArea = (row.reduce((sum, item) => sum + item.value, 0) / totalVal) * area;
        
        let minArea = Infinity;
        let maxArea = -Infinity;
        
        row.forEach(item => {
            const itemArea = (item.value / totalVal) * area;
            if (itemArea < minArea) minArea = itemArea;
            if (itemArea > maxArea) maxArea = itemArea;
        });

        const length = Math.max(rect.w, rect.h);
        const rowWidth = rowArea / length;
        
        if (rowWidth === 0) return Infinity;

        return Math.max(
            (rowWidth * rowWidth) / minArea,
            maxArea / (rowWidth * rowWidth)
        );
    }

    _layoutRow(row, rect, totalVal) {
        const area = rect.w * rect.h;
        const rowVal = row.reduce((sum, item) => sum + item.value, 0);
        const rowArea = (rowVal / totalVal) * area;
        
        const isHorizontal = rect.w >= rect.h;
        const rowWidth = isHorizontal ? rowArea / rect.h : rowArea / rect.w;
        
        let x = rect.x;
        let y = rect.y;

        row.forEach(item => {
            const itemArea = (item.value / totalVal) * area;
            let w, h;
            
            if (isHorizontal) {
                w = rowWidth;
                h = itemArea / w;
                this._rects.push({
                    x: x, y: y, w: w, h: h,
                    index: item.index, value: item.value, label: item.label, color: item.color
                });
                y += h;
            } else {
                h = rowWidth;
                w = itemArea / h;
                this._rects.push({
                    x: x, y: y, w: w, h: h,
                    index: item.index, value: item.value, label: item.label, color: item.color
                });
                x += w;
            }
        });

        if (isHorizontal) {
            return { x: rect.x + rowWidth, y: rect.y, w: Math.max(0, rect.w - rowWidth), h: rect.h };
        } else {
            return { x: rect.x, y: rect.y + rowWidth, w: rect.w, h: Math.max(0, rect.h - rowWidth) };
        }
    }

    drawHover(ctx, plotArea, xScale, yScale, index) {
        const rect = this._rects.find(r => r.index === index);
        if (!rect) return;

        const gap = 1;
        const rx = rect.x + gap;
        const ry = rect.y + gap;
        const rw = Math.max(0, rect.w - gap * 2);
        const rh = Math.max(0, rect.h - gap * 2);
        const radius = Math.min(4, rw / 2, rh / 2);

        if (rw <= 0 || rh <= 0) return;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    hitTest(mouseX, mouseY, plotArea, xScale, yScale) {
        if (!this.visible || !this._rects) return null;

        for (let i = 0; i < this._rects.length; i++) {
            const rect = this._rects[i];
            const gap = 1;
            const rx = rect.x + gap;
            const ry = rect.y + gap;
            const rw = rect.w - gap * 2;
            const rh = rect.h - gap * 2;
            
            if (mouseX >= rx && mouseX <= rx + rw &&
                mouseY >= ry && mouseY <= ry + rh) {
                return {
                    x: mouseX,
                    y: mouseY,
                    index: rect.index,
                    value: rect.value,
                    label: rect.label,
                    seriesName: (this.dataset && this.dataset.name) || 'Treemap',
                    color: rect.color
                };
            }
        }
        return null;
    }
}

if (typeof window !== 'undefined') {
    window.CZ = window.CZ || {};
    window.CZ.TreemapSeries = TreemapSeries;
}
