'use strict';

(function(CZ) {
    /**
     * DOM-based tooltip with edge collision detection.
     * Rendered on document.body to avoid container clipping.
     */
    class Tooltip {
        /**
         * @param {HTMLElement} tooltipLayer - Reference element for positioning
         * @param {Object} options - Tooltip options
         */
        constructor(tooltipLayer, options = {}) {
            this.refElement = tooltipLayer;
            this.options = options;
            
            // Create tooltip on document.body to avoid overflow clipping
            this.element = document.createElement('div');
            this.element.className = 'cz-tooltip';
            this.element.style.position = 'fixed';
            this.element.style.top = '0';
            this.element.style.left = '0';
            this.element.style.opacity = '0';
            this.element.style.pointerEvents = 'none';
            this.element.style.zIndex = '99999';
            this.element.style.transition = 'opacity 0.15s ease-out';
            document.body.appendChild(this.element);
        }

        /**
         * Displays the tooltip near the hit point.
         */
        show(hitData, containerWidth, containerHeight, mouseX, mouseY) {
            if (!hitData || !hitData.items || hitData.items.length === 0) {
                this.hide();
                return;
            }

            // Build HTML
            if (this.options.formatter && typeof this.options.formatter === 'function') {
                this.element.innerHTML = this.options.formatter(hitData);
            } else {
                let html = '<div class="cz-tooltip-content">';
                if (hitData.label) {
                    html += '<div class="cz-tooltip-title">' + hitData.label + '</div>';
                }
                
                hitData.items.forEach(item => {
                    const val = item.value !== undefined && item.value !== null ? item.value : '';
                    const formattedVal = typeof val === 'number' ? val.toLocaleString() : val;
                    html += '<div class="cz-tooltip-row">';
                    html += '<span class="cz-tooltip-dot" style="background-color:' + item.color + '"></span>';
                    html += '<span class="cz-tooltip-label">' + item.seriesName + '</span>';
                    html += '<span class="cz-tooltip-value">' + formattedVal + '</span>';
                    html += '</div>';
                });
                html += '</div>';
                this.element.innerHTML = html;
            }

            // Make visible to measure dimensions
            this.element.style.opacity = '1';
            
            // Get canvas position on screen
            const canvasRect = this.refElement.getBoundingClientRect();
            const absX = canvasRect.left + mouseX;
            const absY = canvasRect.top + mouseY;

            // Measure tooltip
            const tooltipRect = this.element.getBoundingClientRect();
            const tw = tooltipRect.width;
            const th = tooltipRect.height;

            // Viewport bounds
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Position with offset
            let left = absX + 15;
            let top = absY - 10;

            // Collision: right edge
            if (left + tw > vw - 8) {
                left = absX - tw - 15;
            }
            // Collision: left edge
            if (left < 8) {
                left = 8;
            }
            // Collision: bottom
            if (top + th > vh - 8) {
                top = absY - th - 10;
            }
            // Collision: top
            if (top < 8) {
                top = 8;
            }

            this.element.style.transform = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
        }

        hide() {
            this.element.style.opacity = '0';
        }

        destroy() {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
    }

    CZ.Tooltip = Tooltip;
})(window.CZ = window.CZ || {});
