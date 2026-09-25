'use strict';

(function(CZ) {
  // Depends on: CZ.MathUtils.niceNum, CZ.MathUtils.calculateNiceScale

  class LinearScale {
    constructor(options = {}) {
      this.options = options;
      this.beginAtZero = options.beginAtZero || false;
      this.maxTicks = options.maxTicks || 10;
      this.format = options.format || (val => val.toString());
      this._min = 0;
      this._max = 0;
      this._pixelStart = 0;
      this._pixelEnd = 0;
      this._tickSpacing = 0;
      this._ticks = [];
    }

    configure(dataMin, dataMax, pixelStart, pixelEnd) {
      this._pixelStart = pixelStart;
      this._pixelEnd = pixelEnd;

      if (this.beginAtZero && dataMin > 0) {
        dataMin = 0;
      }

      if (dataMin === dataMax) {
        dataMin -= 1;
        dataMax += 1;
      }

      if (CZ.MathUtils && CZ.MathUtils.calculateNiceScale) {
        const scale = CZ.MathUtils.calculateNiceScale(dataMin, dataMax, this.maxTicks);
        this._min = scale.min;
        this._max = scale.max;
        this._tickSpacing = scale.tickSpacing;
      } else {
        // Fallback if MathUtils is not yet loaded
        this._min = dataMin;
        this._max = dataMax;
        this._tickSpacing = (this._max - this._min) / this.maxTicks;
      }

      this._ticks = [];
      for (let v = this._min; v <= this._max + 1e-10; v += this._tickSpacing) {
        this._ticks.push({
          value: v,
          label: this.format(v),
          pixel: this.getPixel(v)
        });
      }
    }

    getPixel(value) {
      const range = this._max - this._min;
      if (range === 0) return this._pixelStart;
      const normalized = (value - this._min) / range;
      return this._pixelStart + normalized * (this._pixelEnd - this._pixelStart);
    }

    getValue(pixel) {
      const pixelRange = this._pixelEnd - this._pixelStart;
      if (pixelRange === 0) return this._min;
      const normalized = (pixel - this._pixelStart) / pixelRange;
      return this._min + normalized * (this._max - this._min);
    }

    getTicks() {
      return this._ticks;
    }
  }

  class CategoryScale {
    constructor(options = {}) {
      this.options = options;
      this.maxTicks = options.maxTicks || 0;
      this._labels = [];
      this._pixelStart = 0;
      this._pixelEnd = 0;
      this._ticks = [];
      this._bandWidth = 0;
    }

    configure(labels, pixelStart, pixelEnd) {
      this._labels = labels;
      this._pixelStart = pixelStart;
      this._pixelEnd = pixelEnd;
      
      const count = this._labels.length;
      const pixelRange = this._pixelEnd - this._pixelStart;
      this._bandWidth = count > 0 ? pixelRange / count : 0;

      this._ticks = [];
      let step = 1;
      if (this.maxTicks > 0 && count > this.maxTicks) {
        step = Math.ceil(count / this.maxTicks);
      }

      for (let i = 0; i < count; i += step) {
        this._ticks.push({
          value: i,
          label: this._labels[i],
          pixel: this.getPixel(i)
        });
      }
    }

    getPixel(index) {
      return this._pixelStart + (index + 0.5) * this._bandWidth;
    }

    getPixelRange(index) {
      const start = this._pixelStart + index * this._bandWidth;
      return {
        start: start,
        end: start + this._bandWidth,
        width: this._bandWidth
      };
    }

    getValue(pixel) {
      const normalized = pixel - this._pixelStart;
      const index = Math.floor(normalized / this._bandWidth);
      return Math.max(0, Math.min(this._labels.length - 1, index));
    }

    getTicks() {
      return this._ticks;
    }

    getBandWidth() {
      return this._bandWidth;
    }
  }

  class TimeScale extends LinearScale {
    constructor(options = {}) {
      super(options);
    }

    configure(dates, pixelStart, pixelEnd) {
      const timestamps = dates.map(d => new Date(d).getTime());
      let min = Math.min(...timestamps);
      let max = Math.max(...timestamps);
      
      if (min === max) {
        min -= 86400000;
        max += 86400000;
      }

      super.configure(min, max, pixelStart, pixelEnd);

      // Reformat ticks as dates
      const range = this._max - this._min;
      this._ticks = this._ticks.map(t => ({
        ...t,
        label: this.formatDate(t.value, range)
      }));
    }

    formatDate(timestamp, range) {
      const date = new Date(timestamp);
      if (range < 60000) return date.getSeconds() + 's';
      if (range < 3600000) return date.getMinutes() + 'm';
      if (range < 86400000) return date.getHours() + ':00';
      if (range < 2592000000) return date.getDate() + '/' + (date.getMonth() + 1);
      if (range < 31536000000) return (date.getMonth() + 1) + '/' + date.getFullYear();
      return date.getFullYear().toString();
    }
  }

  CZ.LinearScale = LinearScale;
  CZ.CategoryScale = CategoryScale;
  CZ.TimeScale = TimeScale;

  CZ.createScale = function(type, options) {
    if (type === 'time') return new TimeScale(options);
    if (type === 'category') return new CategoryScale(options);
    return new LinearScale(options);
  };

})(window.CZ = window.CZ || {});
