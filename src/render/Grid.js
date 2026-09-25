'use strict';

(function(CZ) {
  class Grid {
    constructor(options = {}) {
      this.options = options;
    }

    draw(ctx, plotArea, xScale, yScale, options = {}) {
      ctx.save();

      const xOpts = options.xAxis || {};
      const yOpts = options.yAxis || {};
      const crispCoord = CZ.MathUtils ? CZ.MathUtils.crispCoord : (v) => Math.round(v) + 0.5;

      // Horizontal grid lines (Y ticks) — dashed, subtle
      if (yOpts.gridLines !== false && yScale) {
        const gridColor = yOpts.gridColor || 'rgba(0,0,0,0.08)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();

        const yTicks = yScale.getTicks();
        yTicks.forEach(tick => {
          const y = crispCoord(tick.pixel);
          if (y > plotArea.top && y < plotArea.bottom) {
            ctx.moveTo(plotArea.left, y);
            ctx.lineTo(plotArea.right, y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Vertical grid lines (X ticks) — off by default, subtle if enabled
      if (xOpts.gridLines === true && xScale) {
        const gridColor = xOpts.gridColor || 'rgba(0,0,0,0.05)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();

        const xTicks = xScale.getTicks();
        xTicks.forEach(tick => {
          const x = crispCoord(tick.pixel);
          if (x > plotArea.left && x < plotArea.right) {
            ctx.moveTo(x, plotArea.top);
            ctx.lineTo(x, plotArea.bottom);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // L-shape axis border: left + bottom (solid)
      const borderColor = yOpts.lineColor || xOpts.lineColor || '#d1d5db';
      ctx.beginPath();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;

      const left = crispCoord(plotArea.left);
      const bottom = crispCoord(plotArea.bottom);
      const top = crispCoord(plotArea.top);
      const right = crispCoord(plotArea.right);

      // Left axis line
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      // Bottom axis line
      ctx.lineTo(right, bottom);
      ctx.stroke();

      // Tick at top-left corner (top of Y axis)
      ctx.beginPath();
      ctx.moveTo(left - 4, top);
      ctx.lineTo(left, top);
      ctx.stroke();

      // Tick at bottom-right corner (end of X axis)
      ctx.beginPath();
      ctx.moveTo(right, bottom);
      ctx.lineTo(right, bottom + 4);
      ctx.stroke();

      // Tick at origin (bottom-left corner)
      ctx.beginPath();
      ctx.moveTo(left - 4, bottom);
      ctx.lineTo(left, bottom);
      ctx.moveTo(left, bottom);
      ctx.lineTo(left, bottom + 4);
      ctx.stroke();

      // Small tick marks on Y axis
      if (yOpts.show !== false && yScale) {
        ctx.beginPath();
        ctx.strokeStyle = borderColor;
        const yTicks = yScale.getTicks();
        yTicks.forEach(tick => {
          const y = crispCoord(tick.pixel);
          if (y >= plotArea.top && y <= plotArea.bottom) {
            ctx.moveTo(left - 4, y);
            ctx.lineTo(left, y);
          }
        });
        ctx.stroke();
      }

      // Small tick marks on X axis
      if (xOpts.show !== false && xScale) {
        ctx.beginPath();
        ctx.strokeStyle = borderColor;
        const xTicks = xScale.getTicks();
        xTicks.forEach(tick => {
          const x = crispCoord(tick.pixel);
          if (x >= plotArea.left && x <= plotArea.right) {
            ctx.moveTo(x, bottom);
            ctx.lineTo(x, bottom + 4);
          }
        });
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  CZ.Grid = Grid;
})(window.CZ = window.CZ || {});
