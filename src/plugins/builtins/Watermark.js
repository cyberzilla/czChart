'use strict';

(function(CZ) {
    /**
     * Built-in plugin for background watermark text
     */
    const WatermarkPlugin = {
        name: 'watermark',
        beforeDraw(chart, ctx) {
            const watermark = chart.options.watermark; // { text, color, font, opacity }
            if (!watermark || !watermark.text) return;
            const plotArea = chart.plotArea;
            
            ctx.save();
            ctx.globalAlpha = watermark.opacity || 0.06;
            ctx.font = watermark.font || 'bold 48px sans-serif';
            ctx.fillStyle = watermark.color || '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(watermark.text, plotArea.left + plotArea.width / 2, plotArea.top + plotArea.height / 2);
            ctx.restore();
        }
    };

    // Export to CZ plugins namespace
    CZ.Plugins = CZ.Plugins || {};
    CZ.Plugins.Watermark = WatermarkPlugin;
})(window.CZ = window.CZ || {});
