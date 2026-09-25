'use strict';

(function(CZ) {
    /**
     * Zoom and pan interaction handler.
     */
    class ZoomPan {
        /**
         * @param {Object} chart - Chart instance
         * @param {HTMLElement} canvas - Event target (overlay canvas)
         * @param {Object} options - Zoom/Pan options
         */
        constructor(chart, canvas, options = {}) {
            this.chart = chart;
            this.canvas = canvas;
            this.options = Object.assign({
                enabled: true,
                minPoints: 3
            }, options);

            this._zoomStart = 0;
            this._zoomEnd = 1; // Normalized max
            this.dataLength = 0;

            this._isPanning = false;
            this._panStartX = 0;
            this._startZoomRange = { start: 0, end: 1 };

            this._callbacks = [];

            this._onWheel = this._onWheel.bind(this);
            this._onPointerDown = this._onPointerDown.bind(this);
            this._onPointerMove = this._onPointerMove.bind(this);
            this._onPointerUp = this._onPointerUp.bind(this);
            this._onDoubleClick = this._onDoubleClick.bind(this);

            if (this.options.enabled) {
                this.enable();
            }
        }

        /**
         * Setup zoom range based on data length.
         * @param {number} length 
         */
        init(length) {
            this.dataLength = length;
            this._zoomStart = 0;
            this._zoomEnd = length - 1;
        }

        enable() {
            this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
            this.canvas.addEventListener('pointerdown', this._onPointerDown);
            window.addEventListener('pointermove', this._onPointerMove);
            window.addEventListener('pointerup', this._onPointerUp);
            this.canvas.addEventListener('dblclick', this._onDoubleClick);
        }

        disable() {
            this.canvas.removeEventListener('wheel', this._onWheel);
            this.canvas.removeEventListener('pointerdown', this._onPointerDown);
            window.removeEventListener('pointermove', this._onPointerMove);
            window.removeEventListener('pointerup', this._onPointerUp);
            this.canvas.removeEventListener('dblclick', this._onDoubleClick);
        }

        _onWheel(e) {
            e.preventDefault();
            
            if (this.dataLength <= this.options.minPoints) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Determine zoom center relative to plot area
            const plotArea = this.chart.plotArea;
            if (mouseX < plotArea.left || mouseX > plotArea.right) return;

            const ratio = (mouseX - plotArea.left) / plotArea.width;
            
            // Zoom factor
            const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
            
            const currentRange = this._zoomEnd - this._zoomStart;
            let newRange = currentRange * zoomFactor;

            // Constrain zoom
            const minRange = Math.min(this.options.minPoints, this.dataLength - 1);
            if (newRange < minRange) newRange = minRange;
            if (newRange > this.dataLength - 1) newRange = this.dataLength - 1;

            // Calculate new start/end
            let newStart = this._zoomStart + (currentRange - newRange) * ratio;
            let newEnd = newStart + newRange;

            // Clamp to bounds
            if (newStart < 0) {
                newStart = 0;
                newEnd = newStart + newRange;
            }
            if (newEnd > this.dataLength - 1) {
                newEnd = this.dataLength - 1;
                newStart = newEnd - newRange;
            }

            this._zoomStart = newStart;
            this._zoomEnd = newEnd;

            this._notify();
        }

        _onPointerDown(e) {
            this._isPanning = true;
            this._panStartX = e.clientX;
            this._startZoomRange = { start: this._zoomStart, end: this._zoomEnd };
            this.canvas.style.cursor = 'grabbing';
        }

        _onPointerMove(e) {
            if (!this._isPanning) return;

            const dx = e.clientX - this._panStartX;
            const plotArea = this.chart.plotArea;
            
            // Pixels to data points ratio
            const currentRange = this._startZoomRange.end - this._startZoomRange.start;
            const pointsPerPixel = currentRange / plotArea.width;
            
            const shift = dx * pointsPerPixel;

            let newStart = this._startZoomRange.start - shift;
            let newEnd = this._startZoomRange.end - shift;

            // Constrain pan
            if (newStart < 0) {
                newStart = 0;
                newEnd = currentRange;
            }
            if (newEnd > this.dataLength - 1) {
                newEnd = this.dataLength - 1;
                newStart = newEnd - currentRange;
            }

            this._zoomStart = newStart;
            this._zoomEnd = newEnd;

            this._notify();
        }

        _onPointerUp(e) {
            if (this._isPanning) {
                this._isPanning = false;
                this.canvas.style.cursor = 'default';
            }
        }

        _onDoubleClick(e) {
            this.reset();
        }

        /**
         * Returns current visible range indices.
         * @returns {Object} { start, end }
         */
        getVisibleRange() {
            return {
                start: Math.max(0, Math.floor(this._zoomStart)),
                end: Math.min(this.dataLength - 1, Math.ceil(this._zoomEnd))
            };
        }

        reset() {
            this._zoomStart = 0;
            this._zoomEnd = Math.max(0, this.dataLength - 1);
            this._notify();
        }

        onZoomChange(callback) {
            this._callbacks.push(callback);
        }

        _notify() {
            this.chart.emit && this.chart.emit('zoom', this.getVisibleRange());
            this._callbacks.forEach(cb => cb(this.getVisibleRange()));
        }
    }

    CZ.ZoomPan = ZoomPan;
})(window.CZ = window.CZ || {});
