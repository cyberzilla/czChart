'use strict';

(function(CZ) {
  class LayeredRenderer {
    constructor(container) {
      this.container = container;
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';

      // 1. Legend Container (above canvases in DOM flow for 'top' position)
      this.legendContainer = document.createElement('div');
      this.legendContainer.style.position = 'relative';
      this.legendContainer.style.zIndex = '5';

      // 2. Canvas Wrapper (holds both canvases and tooltip)
      this.canvasWrapper = document.createElement('div');
      this.canvasWrapper.style.position = 'relative';
      this.canvasWrapper.style.flex = '1';
      this.canvasWrapper.style.minHeight = '0';

      // 3. Main Canvas
      this.mainCanvas = document.createElement('canvas');
      this.mainCanvas.style.display = 'block';
      this.mainCanvas.style.width = '100%';
      this.mainCanvas.style.height = '100%';

      // 4. Overlay Canvas
      this.overlayCanvas = document.createElement('canvas');
      this.overlayCanvas.style.position = 'absolute';
      this.overlayCanvas.style.top = '0';
      this.overlayCanvas.style.left = '0';
      this.overlayCanvas.style.pointerEvents = 'none';

      // 5. Tooltip Layer
      this.tooltipLayer = document.createElement('div');
      this.tooltipLayer.style.position = 'absolute';
      this.tooltipLayer.style.top = '0';
      this.tooltipLayer.style.left = '0';
      this.tooltipLayer.style.width = '100%';
      this.tooltipLayer.style.height = '100%';
      this.tooltipLayer.style.pointerEvents = 'none';
      this.tooltipLayer.style.zIndex = '10';
      this.tooltipLayer.style.overflow = 'visible';

      // Set container to flex column so legend and canvas share space
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';

      // Assemble DOM
      this.canvasWrapper.appendChild(this.mainCanvas);
      this.canvasWrapper.appendChild(this.overlayCanvas);
      this.canvasWrapper.appendChild(this.tooltipLayer);
      this.container.appendChild(this.legendContainer);
      this.container.appendChild(this.canvasWrapper);

      this.mainCtx = this.mainCanvas.getContext('2d');
      this.overlayCtx = this.overlayCanvas.getContext('2d');
    }

    getMainContext() { return this.mainCtx; }
    getOverlayContext() { return this.overlayCtx; }
    getTooltipLayer() { return this.tooltipLayer; }
    getLegendContainer() { return this.legendContainer; }
    getMainCanvas() { return this.mainCanvas; }
    getOverlayCanvas() { return this.overlayCanvas; }

    clearMain() {
      if (this.mainCanvas.width && this.mainCanvas.height) {
        this.mainCtx.save();
        this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCtx.restore();
      }
    }

    clearOverlay() {
      if (this.overlayCanvas.width && this.overlayCanvas.height) {
        this.overlayCtx.save();
        this.overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        this.overlayCtx.restore();
      }
    }

    resize(width, height, dpr) {
      // Measure legend height
      const legendH = this.legendContainer.offsetHeight || 0;
      const canvasH = height - legendH;

      this.canvasWrapper.style.width = width + 'px';
      this.canvasWrapper.style.height = canvasH + 'px';

      this.mainCanvas.width = width * dpr;
      this.mainCanvas.height = canvasH * dpr;
      this.mainCanvas.style.width = width + 'px';
      this.mainCanvas.style.height = canvasH + 'px';
      this.mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.overlayCanvas.width = width * dpr;
      this.overlayCanvas.height = canvasH * dpr;
      this.overlayCanvas.style.width = width + 'px';
      this.overlayCanvas.style.height = canvasH + 'px';
      this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Store logical canvas dimensions for Chart
      this._canvasWidth = width;
      this._canvasHeight = canvasH;
    }

    getCanvasSize() {
      return { width: this._canvasWidth || 0, height: this._canvasHeight || 0 };
    }

    destroy() {
      // Reset container styles
      this.container.style.display = '';
      this.container.style.flexDirection = '';

      if (this.container.contains(this.canvasWrapper)) this.container.removeChild(this.canvasWrapper);
      if (this.container.contains(this.legendContainer)) this.container.removeChild(this.legendContainer);
    }
  }

  CZ.LayeredRenderer = LayeredRenderer;
})(window.CZ = window.CZ || {});
