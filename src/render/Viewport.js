'use strict';

(function(CZ) {
  class Viewport {
    constructor(container, onResize) {
      this.container = container;
      this.onResizeCallback = onResize;
      this._width = 0;
      this._height = 0;
      this._dpr = window.devicePixelRatio || 1;
      this._rafId = null;

      this.observer = new ResizeObserver(entries => {
        if (!entries || entries.length === 0) return;
        
        if (this._rafId) {
          cancelAnimationFrame(this._rafId);
        }

        this._rafId = requestAnimationFrame(() => {
          this.resize();
        });
      });

      this.observer.observe(this.container);
      this.resize();
    }

    setupCanvas(canvas, isOverlay) {
      canvas.width = this._width * this._dpr;
      canvas.height = this._height * this._dpr;
      canvas.style.width = this._width + 'px';
      canvas.style.height = this._height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(this._dpr, this._dpr);
    }

    resize() {
      const rect = this.container.getBoundingClientRect();
      let newWidth = rect.width;
      let newHeight = rect.height;

      if (newWidth === 0 || newHeight === 0) {
        // Fallback for hidden tabs or unstyled containers
        newWidth = this.container.clientWidth || 300;
        newHeight = this.container.clientHeight || 150;
      }

      this._dpr = window.devicePixelRatio || 1;

      if (newWidth !== this._width || newHeight !== this._height) {
        this._width = newWidth;
        this._height = newHeight;
        if (this.onResizeCallback) {
          this.onResizeCallback(this._width, this._height);
        }
      }
    }

    getSize() {
      return { width: this._width, height: this._height };
    }

    getDpr() {
      return this._dpr;
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
      }
    }
  }

  CZ.Viewport = Viewport;
})(window.CZ = window.CZ || {});
