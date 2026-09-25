'use strict';

(function(CZ) {
    // Depends on: CZ.MathUtils.crispCoord
    const crispCoord = (CZ.MathUtils && CZ.MathUtils.crispCoord) 
        ? CZ.MathUtils.crispCoord 
        : (x) => Math.round(x) + 0.5;

    /**
     * Crosshair lines that follow mouse on overlay canvas.
     */
    class Crosshair {
        /**
         * @param {Object} options - Crosshair options
         */
        constructor(options = {}) {
            this.options = Object.assign({
                color: 'rgba(156, 163, 175, 0.4)',
                lineWidth: 1,
                dashArray: [4, 4],
                mode: 'x' // 'x', 'y', 'both'
            }, options);
        }

        /**
         * Draws crosshair on the overlay context.
         * @param {CanvasRenderingContext2D} ctx 
         * @param {number} mouseX 
         * @param {number} mouseY 
         * @param {Object} plotArea 
         * @param {number} snappedX - Optional X coordinate to snap to
         */
        draw(ctx, mouseX, mouseY, plotArea, snappedX) {
            // Check if inside plotArea
            if (mouseX < plotArea.left || mouseX > plotArea.right || 
                mouseY < plotArea.top || mouseY > plotArea.bottom) {
                return;
            }

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = this.options.color;
            ctx.lineWidth = this.options.lineWidth;
            
            if (this.options.dashArray && this.options.dashArray.length > 0) {
                ctx.setLineDash(this.options.dashArray);
            }

            // Draw vertical line
            if (this.options.mode === 'x' || this.options.mode === 'both') {
                const x = crispCoord(snappedX !== undefined ? snappedX : mouseX);
                if (x >= plotArea.left && x <= plotArea.right) {
                    ctx.moveTo(x, plotArea.top);
                    ctx.lineTo(x, plotArea.bottom);
                }
            }

            // Draw horizontal line
            if (this.options.mode === 'y' || this.options.mode === 'both') {
                const y = crispCoord(mouseY);
                if (y >= plotArea.top && y <= plotArea.bottom) {
                    ctx.moveTo(plotArea.left, y);
                    ctx.lineTo(plotArea.right, y);
                }
            }

            ctx.stroke();
            ctx.restore();
        }

        /**
         * Clears the overlay canvas
         * @param {CanvasRenderingContext2D} ctx 
         * @param {number} canvasWidth 
         * @param {number} canvasHeight 
         */
        clear(ctx, canvasWidth, canvasHeight) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
    }

    CZ.Crosshair = Crosshair;
})(window.CZ = window.CZ || {});
