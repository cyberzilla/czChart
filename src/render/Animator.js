'use strict';

(function(CZ) {
  const Easing = {
    linear: t => t,
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutElastic: t => { const p = 0.3; return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1; },
    easeOutBounce: t => { 
      if (t < 1 / 2.75) return 7.5625 * t * t; 
      else if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75; 
      else if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375; 
      else return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375; 
    }
  };

  class Animator {
    constructor() {
      this._rafId = null;
      this._isAnimating = false;
    }

    get isAnimating() {
      return this._isAnimating;
    }

    animate(renderCallback, duration = 500, easingName = 'easeOutCubic') {
      this.stop();

      if (duration <= 0) {
        renderCallback(1);
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        this._isAnimating = true;
        const startTime = performance.now();
        const easingFunc = Easing[easingName] || Easing.linear;

        const tick = (currentTime) => {
          const elapsed = currentTime - startTime;
          let progress = elapsed / duration;

          if (progress >= 1) {
            progress = 1;
            renderCallback(easingFunc(progress));
            this._isAnimating = false;
            resolve();
          } else {
            renderCallback(easingFunc(progress));
            this._rafId = requestAnimationFrame(tick);
          }
        };

        this._rafId = requestAnimationFrame(tick);
      });
    }

    stop() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      this._isAnimating = false;
    }
  }

  CZ.Easing = Easing;
  CZ.Animator = Animator;
})(window.CZ = window.CZ || {});
