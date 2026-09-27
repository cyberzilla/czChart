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

            // Hide tooltip immediately on scroll
            this._onScroll = () => { this.hide(); };
            window.addEventListener('scroll', this._onScroll, { passive: true, capture: true });
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
                html += '<div class="cz-tooltip-arrow"></div>';
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
            this.element.style.opacity = '0.95';
            
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

            const gap = 12;
            const margin = 8;
            let left, top, arrowClass;
            const align = this.options.align || 'auto';

            const placeRight  = () => { left = absX + gap; top = absY - th / 2; arrowClass = 'cz-tooltip-arrow-left'; };
            const placeLeft   = () => { left = absX - tw - gap; top = absY - th / 2; arrowClass = 'cz-tooltip-arrow-right'; };
            const placeTop    = () => { left = absX - tw / 2; top = absY - th - gap; arrowClass = 'cz-tooltip-arrow-bottom'; };
            const placeBottom = () => { left = absX - tw / 2; top = absY + gap; arrowClass = 'cz-tooltip-arrow-top'; };

            if (align === 'right')       { placeRight(); }
            else if (align === 'left')   { placeLeft(); }
            else if (align === 'top')    { placeTop(); }
            else if (align === 'bottom') { placeBottom(); }
            else {
                // Auto: pick best direction based on available space
                const spaceRight = vw - absX - gap;
                const spaceLeft = absX - gap;
                const spaceTop = absY - gap;
                const spaceBottom = vh - absY - gap;

                if (spaceRight >= tw + margin) { placeRight(); }
                else if (spaceLeft >= tw + margin) { placeLeft(); }
                else if (spaceTop >= th + margin) { placeTop(); }
                else { placeBottom(); }
            }

            // Clamp to viewport edges
            if (left + tw > vw - margin) left = vw - tw - margin;
            if (left < margin) left = margin;
            if (top + th > vh - margin) top = vh - th - margin;
            if (top < margin) top = margin;

            this.element.style.transform = 'translate3d(' + left + 'px, ' + top + 'px, 0)';

            // Update arrow direction
            const arrow = this.element.querySelector('.cz-tooltip-arrow');
            if (arrow) {
                arrow.className = 'cz-tooltip-arrow ' + arrowClass;
            }
        }

        hide() {
            this.element.style.opacity = '0';
        }

        destroy() {
            window.removeEventListener('scroll', this._onScroll, { capture: true });
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
    }

    CZ.Tooltip = Tooltip;
})(window.CZ = window.CZ || {});
