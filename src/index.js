/**
 * czChart — Lightweight, Data-Driven Chart Library
 * Version: 1.0.0
 * License: MIT
 * 
 * Single entry point. This file is used by the build script
 * to define the load order for concatenation into cz-chart.min.js.
 * 
 * Global namespace: window.czChart
 */
'use strict';

// After all CZ.* modules are loaded, expose the public API
(function(global) {
  var CZ = global.CZ;

  /**
   * czChart public API
   */
  var czChart = {
    /** Library version */
    version: '1.0.0',

    /**
     * Create a new chart (declarative mode)
     * @param {string|HTMLElement} target - CSS selector or DOM element
     * @param {Object} config - Chart configuration
     * @returns {CZ.Chart} Chart instance
     * 
     * @example
     * czChart.create('#myChart', {
     *   type: 'line',
     *   data: [
     *     { month: 'Jan', sales: 100 },
     *     { month: 'Feb', sales: 200 }
     *   ],
     *   x: 'month',
     *   y: 'sales'
     * });
     */
    create: function(target, config) {
      return new CZ.Chart(target, config);
    },

    /**
     * Register a global plugin (applied to all charts)
     * @param {Object} plugin - Plugin object with lifecycle hooks
     */
    use: function(plugin) {
      CZ.Chart.use(plugin);
    },

    /**
     * Available themes
     */
    themes: {
      light: CZ.LightTheme,
      dark: CZ.DarkTheme
    },

    /**
     * Built-in plugins
     */
    plugins: {
      ThresholdLine: CZ.ThresholdLinePlugin,
      Watermark: CZ.WatermarkPlugin
    },

    /**
     * Easing functions (for reference/custom use)
     */
    Easing: CZ.Easing,

    /**
     * Direct access to internal classes (advanced usage)
     */
    _internal: CZ
  };

  // Expose globally
  global.czChart = czChart;

  // Also support: new czChart(target, config) pattern
  // by making czChart callable as a constructor-like function
  // (but we keep the .create() as primary API)

})(typeof window !== 'undefined' ? window : this);
