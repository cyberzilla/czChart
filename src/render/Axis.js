'use strict';

(function(CZ) {
  class Axis {
    constructor(options = {}) {
      this.options = options;
    }

    /**
     * Draw X-axis labels below the plot area
     */
    drawXAxis(ctx, plotArea, scale, options = {}) {
      if (options.show === false) return;

      ctx.save();
      const ticks = scale.getTicks();
      const labelColor = options.labelColor || '#6b7280';
      const labelFont = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const rotation = options.rotation || 0;

      ctx.fillStyle = labelColor;
      ctx.font = labelFont;
      ctx.textAlign = rotation ? 'right' : 'center';
      ctx.textBaseline = 'top';

      let lastRightEdge = -Infinity;
      const minGap = 8;

      ticks.forEach(tick => {
        const x = tick.pixel;
        if (x < plotArea.left - 5 || x > plotArea.right + 5) return;

        const textWidth = ctx.measureText(tick.label).width;

        // Smart overlap prevention
        if (!rotation && (x - textWidth / 2) < lastRightEdge + minGap) return;

        ctx.save();
        ctx.translate(x, plotArea.bottom + 10);
        if (rotation) {
          ctx.rotate(-rotation * Math.PI / 180);
        }
        ctx.fillText(String(tick.label), 0, 0);
        ctx.restore();

        lastRightEdge = x + textWidth / 2;
      });

      // Draw X-axis title if provided
      if (options.title) {
        ctx.fillStyle = options.titleColor || '#6b7280';
        ctx.font = options.titleFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          options.title,
          plotArea.left + plotArea.width / 2,
          plotArea.bottom + 30
        );
      }

      ctx.restore();
    }

    /**
     * Draw Y-axis labels to the left of the plot area
     */
    drawYAxis(ctx, plotArea, scale, options = {}) {
      if (options.show === false) return;

      ctx.save();
      const ticks = scale.getTicks();
      const labelColor = options.labelColor || '#6b7280';
      const labelFont = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      ctx.fillStyle = labelColor;
      ctx.font = labelFont;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      ticks.forEach(tick => {
        const y = tick.pixel;
        if (y >= plotArea.top - 5 && y <= plotArea.bottom + 5) {
          ctx.fillText(String(tick.label), plotArea.left - 10, y);
        }
      });

      // Draw Y-axis title if provided (rotated vertically)
      if (options.title) {
        ctx.save();
        ctx.fillStyle = options.titleColor || '#6b7280';
        ctx.font = options.titleFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const cx = 14;
        const cy = plotArea.top + plotArea.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(options.title, 0, 0);
        ctx.restore();
      }

      ctx.restore();
    }

    /**
     * Measure the width needed for Y-axis labels + title
     */
    measureYAxisWidth(ctx, scale, options = {}) {
      ctx.save();
      ctx.font = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const ticks = scale.getTicks();
      let maxWidth = 0;
      ticks.forEach(tick => {
        const width = ctx.measureText(String(tick.label)).width;
        if (width > maxWidth) maxWidth = width;
      });
      ctx.restore();

      let totalWidth = maxWidth + 16;
      // Add space for title
      if (options.title) {
        totalWidth += 18;
      }
      return totalWidth;
    }

    /**
     * Measure the height needed for X-axis labels + title
     */
    measureXAxisHeight(ctx, scale, options = {}) {
      const rotation = options.rotation || 0;

      if (!rotation) {
        let height = 28;
        if (options.title) height += 20;
        return height;
      }

      ctx.save();
      ctx.font = options.labelFont || '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const ticks = scale.getTicks();
      let maxWidth = 0;
      ticks.forEach(tick => {
        const width = ctx.measureText(String(tick.label)).width;
        if (width > maxWidth) maxWidth = width;
      });
      ctx.restore();

      let height = Math.sin(rotation * Math.PI / 180) * maxWidth + 16;
      if (options.title) height += 20;
      return height;
    }
  }

  CZ.Axis = Axis;
})(window.CZ = window.CZ || {});
