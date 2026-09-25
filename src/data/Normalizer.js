'use strict';

(function(CZ) {
  // Depends on: CZ.ColorUtils.getSeriesColor

  /**
   * Universal data normalizer that converts various data formats into the internal format.
   */
  class Normalizer {
    /**
     * Main entry point to normalize data
     * @param {*} input Raw data input
     * @param {Object} options Normalization options
     * @returns {Object} Normalized data
     */
    static normalize(input, options = {}) {
      let data = input;
      if (typeof input === 'string') {
        data = this.parseCSV(input, options);
      }

      let labels = [];
      let datasets = [];
      let xKey = options.x;
      let yKeys = options.y ? (Array.isArray(options.y) ? options.y : [options.y]) : [];
      let xType = 'category';

      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
          // Array of objects
          const keys = Object.keys(data[0]);
          if (!xKey) {
            const xRegex = /^(date|time|timestamp|x|label|name|category|month|year|day)$/i;
            xKey = keys.find(k => xRegex.test(k));
          }
          if (yKeys.length === 0) {
            yKeys = keys.filter(k => k !== xKey && typeof data[0][k] === 'number');
            if (yKeys.length === 0) {
              // fallback to any non-x keys
              yKeys = keys.filter(k => k !== xKey);
            }
          }

          if (xKey) {
            labels = data.map(d => d[xKey]);
            xType = data.length > 0 ? this.detectType(data[0][xKey]) : 'category';
          } else {
            labels = data.map((d, i) => i.toString());
            xType = 'linear';
          }

          yKeys.forEach((yKey, index) => {
            const color = (options.colors && options.colors[index]) || 
                          (CZ.ColorUtils ? CZ.ColorUtils.getSeriesColor(index) : '#000000');
            
            // Extract per-point colors from data if 'color' key exists
            const hasPointColors = data.some(d => d.color !== undefined);
            const pointColors = hasPointColors ? data.map(d => d.color || null) : null;

            datasets.push({
              name: (options.series && options.series[index]) || yKey,
              values: data.map(d => parseFloat(d[yKey]) || 0),
              color: color,
              pointColors: pointColors,
              ...options.seriesOptions
            });
          });
        } else {
          // Primitive Array
          labels = data.map((d, i) => i.toString());
          xType = 'linear';
          const color = (options.colors && options.colors[0]) || 
                        (CZ.ColorUtils ? CZ.ColorUtils.getSeriesColor(0) : '#000000');
          datasets.push({
            name: (options.series && options.series[0]) || 'Series 1',
            values: data.map(d => parseFloat(d) || 0),
            color: color,
            ...options.seriesOptions
          });
        }
      } else if (typeof data === 'object' && data !== null) {
        // Columnar Object
        xKey = options.x || 'x';
        if (data[xKey] && Array.isArray(data[xKey])) {
          labels = data[xKey];
          xType = labels.length > 0 ? this.detectType(labels[0]) : 'category';
        }

        yKeys = options.y ? (Array.isArray(options.y) ? options.y : [options.y]) : Object.keys(data).filter(k => k !== xKey && Array.isArray(data[k]));
        
        yKeys.forEach((yKey, index) => {
          if (Array.isArray(data[yKey])) {
            const color = (options.colors && options.colors[index]) || 
                          (CZ.ColorUtils ? CZ.ColorUtils.getSeriesColor(index) : '#000000');
            datasets.push({
              name: (options.series && options.series[index]) || yKey,
              values: data[yKey].map(d => parseFloat(d) || 0),
              color: color,
              ...options.seriesOptions
            });
          }
        });

        if (labels.length === 0 && datasets.length > 0) {
          labels = datasets[0].values.map((_, i) => i.toString());
          xType = 'linear';
        }
      }

      return {
        labels,
        datasets,
        xType,
        rawData: input
      };
    }

    /**
     * Parses a CSV string to normalized format
     * @param {string} csvString 
     * @param {Object} options 
     */
    static parseCSV(csvString, options = {}) {
      const lines = csvString.trim().split('\n');
      if (lines.length === 0) return [];

      const headers = lines[0].split(',').map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, index) => {
          let val = row[index];
          if (val !== undefined) {
            const numVal = Number(val);
            obj[h] = isNaN(numVal) ? val : numVal;
          }
        });
        data.push(obj);
      }

      return data;
    }

    /**
     * Detects type of data value
     * @param {*} sampleValue 
     * @returns {string} 'time', 'linear', or 'category'
     */
    static detectType(sampleValue) {
      if (typeof sampleValue === 'number') return 'linear';
      if (this.isDateString(sampleValue) || sampleValue instanceof Date) return 'time';
      return 'category';
    }

    /**
     * Checks if string is a valid date
     * @param {string} str 
     * @returns {boolean}
     */
    static isDateString(str) {
      if (typeof str !== 'string') return false;
      if (str.length < 8) return false;  // Too short to be a real date
      if (!isNaN(Number(str))) return false; // purely numeric
      // Only accept ISO-like patterns: YYYY-MM-DD, YYYY/MM/DD, or ISO 8601
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) return true;
      if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) return true;
      return false;
    }
  }

  CZ.Normalizer = Normalizer;
})(window.CZ = window.CZ || {});
