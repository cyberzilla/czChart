'use strict';

(function(CZ) {
    // Depends on: CZ.MathUtils.crispCoord
    const crispCoord = (CZ.MathUtils && CZ.MathUtils.crispCoord) 
        ? CZ.MathUtils.crispCoord 
        : (x) => Math.round(x) + 0.5;

    /**
     * Built-in plugin for horizontal threshold/target lines
     */
    const ThresholdLinePlugin = {
        name: 'thresholdLine',
        afterSeriesDraw(chart, ctx) {
            const thresholds = chart.options.thresholds; // array of { value, color, label, dashArray }
            if (!thresholds || !thresholds.length) return;
            
            const plotArea = chart.plotArea;
            const yScale = chart.scales.y;
            
            thresholds.forEach(t => {
                const y = crispCoord(yScale.getPixel(t.value));
                if (y < plotArea.top || y > plotArea.bottom) return;
                
                ctx.save();
                ctx.beginPath();
                if (ctx.setLineDash) {
                    ctx.setLineDash(t.dashArray || [6, 4]);
                }
                ctx.strokeStyle = t.color || '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.moveTo(plotArea.left, y);
                ctx.lineTo(plotArea.right, y);
                ctx.stroke();
                
                if (t.label) {
                    ctx.fillStyle = t.color || '#ef4444';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(t.label, plotArea.right - 4, y - 4);
                }
                ctx.restore();
            });
        }
    };

    // Export to CZ plugins namespace
    CZ.Plugins = CZ.Plugins || {};
    CZ.Plugins.ThresholdLine = ThresholdLinePlugin;
})(window.CZ = window.CZ || {});
