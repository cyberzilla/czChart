'use strict';

(function(CZ) {

  /**
   * Chart type to series renderer mapping
   */
  const SERIES_MAP = {
    line: 'LineSeries',
    bar: 'BarSeries',
    horizontalBar: 'HorizontalBarSeries',
    area: 'LineSeries',      // area is line with fill=true
    pie: 'PieSeries',
    donut: 'PieSeries',      // donut is pie with innerRadius
    scatter: 'ScatterSeries',
    radar: 'RadarSeries',
    gauge: 'GaugeSeries',
    candlestick: 'CandlestickSeries',
    funnel: 'FunnelSeries',
    heatmap: 'HeatmapSeries',
    waterfall: 'WaterfallSeries',
    bubble: 'BubbleSeries',
    treemap: 'TreemapSeries',
    boxplot: 'BoxPlotSeries',
    polar: 'PolarSeries'
  };

  /** Chart types that use radial (non-cartesian) layout */
  const RADIAL_TYPES = ['pie', 'donut', 'radar', 'gauge', 'funnel', 'treemap', 'polar'];

  /** Global plugin registry */
  const _globalPlugins = [];

  /**
   * czChart — Main chart coordinator class.
   * Orchestrates data normalization, scale calculation, rendering, and interaction.
   */
  class Chart extends CZ.EventEmitter {
    /**
     * @param {string|HTMLElement} target - CSS selector or DOM element
     * @param {Object} config - Chart configuration
     */
    constructor(target, config = {}) {
      super();

      // Inject styles once
      if (CZ.injectStyles) CZ.injectStyles();

      // Resolve container
      this.container = typeof target === 'string'
        ? document.querySelector(target)
        : target;

      if (!this.container) {
        throw new Error('czChart: Container element not found: ' + target);
      }

      this.container.classList.add('cz-chart-container');

      // Store raw config
      this._rawConfig = config;

      // Merge options with defaults
      this.options = CZ.mergeDefaults(config, CZ.DEFAULTS);

      // Apply theme if specified
      this._applyTheme(config.theme);

      // Chart type
      this.type = config.type || 'line';
      this.isRadial = RADIAL_TYPES.includes(this.type);

      // Internal state
      this.series = [];
      this.normalizedData = null;
      this.plotArea = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
      this.scales = { x: null, y: null };
      this._width = 0;
      this._height = 0;
      this._destroyed = false;
      this._activeHit = null;

      // Initialize subsystems
      this._initRenderer();
      this._initPlugins();
      this._initInteraction();

      // Initialize viewport (triggers initial resize + render)
      this.viewport = new CZ.Viewport(this.container, (w, h) => {
        this._onResize(w, h);
      });

      // Load data
      if (config.data) {
        this._loadData(config.data);
      }
    }

    // =========================================================================
    // Static Factory
    // =========================================================================

    /**
     * Create a new chart instance (declarative shorthand)
     * @param {string|HTMLElement} target
     * @param {Object} config
     * @returns {Chart}
     */
    static create(target, config) {
      return new Chart(target, config);
    }

    /**
     * Register a global plugin
     * @param {Object} plugin
     */
    static use(plugin) {
      if (plugin && !_globalPlugins.includes(plugin)) {
        _globalPlugins.push(plugin);
      }
    }

    // =========================================================================
    // Theme
    // =========================================================================

    /** @private */
    _applyTheme(themeName) {
      if (!themeName) return;

      let theme = null;
      if (themeName === 'dark' && CZ.DarkTheme) {
        theme = CZ.DarkTheme;
      } else if (themeName === 'light' && CZ.LightTheme) {
        theme = CZ.LightTheme;
      } else if (typeof themeName === 'object') {
        theme = themeName;
      }

      if (!theme) return;

      // Apply theme colors to options
      if (theme.background) {
        this.container.style.background = theme.background;
      }
      if (theme.gridColor) {
        this.options.xAxis.gridColor = theme.gridColor;
        this.options.yAxis.gridColor = theme.gridColor;
      }
      if (theme.axisLineColor) {
        this.options.xAxis.lineColor = theme.axisLineColor;
        this.options.yAxis.lineColor = theme.axisLineColor;
      }
      if (theme.axisLabelColor) {
        this.options.xAxis.labelColor = theme.axisLabelColor;
        this.options.yAxis.labelColor = theme.axisLabelColor;
        this.options.xAxis.tickColor = theme.axisLabelColor;
        this.options.yAxis.tickColor = theme.axisLabelColor;
      }
      if (theme.crosshairColor) {
        this.options.crosshair.color = theme.crosshairColor;
      }
      this._theme = theme;
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    /** @private */
    _initRenderer() {
      this.renderer = new CZ.LayeredRenderer(this.container);
    }

    /** @private */
    _initPlugins() {
      this.pluginManager = new CZ.PluginManager(this);

      // Register global plugins
      _globalPlugins.forEach(p => this.pluginManager.register(p));

      // Register instance plugins
      if (this._rawConfig.plugins) {
        this._rawConfig.plugins.forEach(p => this.pluginManager.register(p));
      }

      // Register built-in plugins
      if (CZ.ThresholdLinePlugin) this.pluginManager.register(CZ.ThresholdLinePlugin);
      if (CZ.WatermarkPlugin) this.pluginManager.register(CZ.WatermarkPlugin);

      this.pluginManager.hook('init');
    }

    /** @private */
    _initInteraction() {
      const mainCanvas = this.renderer.getMainCanvas();

      // Tooltip
      if (this.options.tooltip.enabled) {
        this.tooltip = new CZ.Tooltip(
          mainCanvas,  // Reference element for positioning
          this.options.tooltip
        );
      }

      // Legend
      if (this.options.legend.show) {
        this.legend = new CZ.Legend(
          this.renderer.getLegendContainer(),
          this,
          this.options.legend
        );
      }

      // Crosshair
      if (this.options.crosshair.enabled) {
        this.crosshair = new CZ.Crosshair(this.options.crosshair);
      }

      // HitTester
      this.hitTester = new CZ.HitTester(this);

      // ZoomPan
      if (this.options.zoom.enabled) {
        this.zoomPan = new CZ.ZoomPan(this, mainCanvas, this.options.zoom);
        this.zoomPan.enable();
        this.zoomPan.onZoomChange(() => {
          this._render();
        });
      }

      // Mouse events on main canvas
      this._onMouseMove = this._handleMouseMove.bind(this);
      this._onMouseLeave = this._handleMouseLeave.bind(this);
      this._onClick = this._handleClick.bind(this);

      mainCanvas.addEventListener('mousemove', this._onMouseMove);
      mainCanvas.addEventListener('mouseleave', this._onMouseLeave);
      mainCanvas.addEventListener('click', this._onClick);

      // Touch events
      mainCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this._handleMouseMove(touch);
      }, { passive: false });
      mainCanvas.addEventListener('touchend', () => this._handleMouseLeave());
    }

    // =========================================================================
    // Data Loading
    // =========================================================================

    /** @private */
    async _loadData(data) {
      this.pluginManager.hook('beforeData', data);

      // Check if data is a URL to fetch
      let resolvedData = data;
      if (CZ.Fetcher) {
        resolvedData = await CZ.Fetcher.fetch(data);
      }

      // Normalize data
      this.normalizedData = CZ.Normalizer.normalize(resolvedData, {
        x: this._rawConfig.x,
        y: this._rawConfig.y,
        series: this._rawConfig.seriesNames,
        colors: this._rawConfig.colors
      });

      this.pluginManager.hook('afterData', this.normalizedData);

      // Create series renderers
      this._createSeries();

      // Re-measure after legend is populated (legend now has items, taking height)
      if (this.viewport) {
        const rect = this.container.getBoundingClientRect();
        this._onResize(rect.width, rect.height);
      }

      // Initial render
      this._render(true);
    }

    /** @private */
    _createSeries() {
      this.series = [];

      if (!this.normalizedData || !this.normalizedData.datasets) return;

      const seriesClass = SERIES_MAP[this.type];
      if (!seriesClass || !CZ[seriesClass]) {
        throw new Error('czChart: Unknown chart type "' + this.type + '"');
      }

      const seriesOptions = this._getSeriesOptions();

      // Count bar datasets for grouped positioning
      let barCount = 0;
      if (this.type === 'bar' || this.type === 'horizontalBar') {
        barCount = this.normalizedData.datasets.length;
      }

      this.normalizedData.datasets.forEach((dataset, index) => {
        const SeriesConstructor = CZ[seriesClass];
        const instance = new SeriesConstructor(this, {
          ...seriesOptions,
          color: dataset.color,
          datasetIndex: index
        });

        // For scatter, convert normalized data to {points: [{x, y}]} format
        if (this.type === 'scatter') {
          const labels = this.normalizedData.labels;
          const scatterDataset = {
            ...dataset,
            points: dataset.values.map((yVal, i) => ({
              x: parseFloat(labels[i]) || i,
              y: yVal
            }))
          };
          instance.setData(scatterDataset);
        } else if (this.type === 'candlestick') {
          // For candlestick, merge all 4 datasets (open,high,low,close) into one
          // Only first series instance draws; skip creating additional ones
          if (index > 0) return; // skip — handled by first instance

          const datasets = this.normalizedData.datasets;
          const len = datasets[0] ? datasets[0].values.length : 0;
          const ohlcData = [];
          for (let j = 0; j < len; j++) {
            ohlcData.push({
              open:  datasets[0] ? datasets[0].values[j] : 0,
              high:  datasets[1] ? datasets[1].values[j] : 0,
              low:   datasets[2] ? datasets[2].values[j] : 0,
              close: datasets[3] ? datasets[3].values[j] : 0
            });
          }
          instance.setData({
            name: 'OHLC',
            ohlc: ohlcData,
            color: seriesOptions.bullishColor || '#10b981'
          });
        } else if (this.type === 'boxplot') {
          // Merge 5 datasets (min, q1, median, q3, max) into boxData
          if (index > 0) return;

          const datasets = this.normalizedData.datasets;
          const len = datasets[0] ? datasets[0].values.length : 0;
          const boxData = [];
          for (let j = 0; j < len; j++) {
            boxData.push({
              min:    datasets[0] ? datasets[0].values[j] : 0,
              q1:     datasets[1] ? datasets[1].values[j] : 0,
              median: datasets[2] ? datasets[2].values[j] : 0,
              q3:     datasets[3] ? datasets[3].values[j] : 0,
              max:    datasets[4] ? datasets[4].values[j] : 0
            });
          }
          instance.setData({
            name: 'Box Plot',
            boxData: boxData,
            color: seriesOptions.color || dataset.color || '#3b82f6'
          });
        } else if (this.type === 'bubble') {
          // Bubble: use first y field for Y values, pass sizes from rawData
          const labels = this.normalizedData.labels;
          const bubbleDataset = {
            ...dataset,
            points: dataset.values.map((yVal, i) => ({
              x: parseFloat(labels[i]) || i,
              y: yVal
            }))
          };
          instance.setData(bubbleDataset);
        } else {
          instance.setData(dataset);
        }

        // For grouped bars (vertical and horizontal), set position info
        if ((this.type === 'bar' || this.type === 'horizontalBar') && instance.setDatasetIndex) {
          instance.setDatasetIndex(index, barCount);
        }

        this.series.push(instance);
      });

      // Update legend
      this._updateLegend();
    }

    /** @private */
    _getSeriesOptions() {
      const opts = {};

      switch (this.type) {
        case 'line':
          Object.assign(opts, this.options.series);
          break;
        case 'area':
          Object.assign(opts, this.options.series, { fill: true });
          break;
        case 'bar':
          Object.assign(opts, this.options.bar);
          break;
        case 'horizontalBar':
          Object.assign(opts, this.options.horizontalBar || this.options.bar);
          break;
        case 'pie':
          Object.assign(opts, this.options.pie);
          break;
        case 'donut':
          Object.assign(opts, this.options.pie, { innerRadius: this.options.pie.innerRadius || 0.6 });
          break;
        case 'scatter':
          Object.assign(opts, this.options.scatter);
          break;
        case 'radar':
          Object.assign(opts, this.options.radar);
          break;
        case 'gauge':
          Object.assign(opts, this.options.gauge || {});
          break;
        case 'candlestick':
          Object.assign(opts, this.options.candlestick || {});
          break;
        case 'funnel':
          Object.assign(opts, this.options.funnel || {});
          break;
        case 'heatmap':
          Object.assign(opts, this.options.heatmap || {});
          break;
        case 'waterfall':
          Object.assign(opts, this.options.waterfall || {});
          break;
        case 'bubble':
          Object.assign(opts, this.options.bubble || {});
          break;
        case 'treemap':
          Object.assign(opts, this.options.treemap || {});
          break;
        case 'boxplot':
          Object.assign(opts, this.options.boxplot || {});
          break;
        case 'polar':
          Object.assign(opts, this.options.polar || {});
          break;
        default:
          Object.assign(opts, this.options.series);
      }

      return opts;
    }

    // =========================================================================
    // Layout & Scale Computation
    // =========================================================================

    /** @private */
    _computeLayout() {
      this.pluginManager.hook('beforeLayout');

      const padding = this.options.padding;
      const ctx = this.renderer.getMainContext();

      // _width / _height already exclude legend (handled by LayeredRenderer flex layout)
      let left = padding.left;
      let top = padding.top;
      let right = this._width - padding.right;
      let bottom = this._height - padding.bottom;

      // For cartesian charts, compute axis label space
      if (!this.isRadial && this.options.yAxis.show) {
        // Measure Y axis label width
        const yAxisWidth = this._measureYAxisWidth(ctx);
        left += yAxisWidth + 8;
        if (this.options.yAxis.title) {
          left += 18; // space for y-axis title
        }
      }

      if (!this.isRadial && this.options.xAxis.show) {
        bottom -= 28; // space for x-axis labels
        if (this.options.xAxis.title) {
          bottom -= 20; // space for x-axis title
        }
      }

      // For radial charts, add extra bottom padding to prevent canvas clipping
      if (this.isRadial) {
        bottom -= 10;
      }

      this.plotArea = {
        left: left,
        top: top,
        right: right,
        bottom: bottom,
        width: right - left,
        height: bottom - top
      };

      this.pluginManager.hook('afterLayout', this.plotArea);
    }

    /** @private */
    _measureYAxisWidth(ctx) {
      if (!this.scales.y || !this.scales.y.getTicks) return 40;

      ctx.save();
      ctx.font = this.options.yAxis.labelFont;
      let maxWidth = 0;

      const ticks = this.scales.y.getTicks();
      ticks.forEach(tick => {
        const label = tick.label !== undefined ? tick.label : String(tick.value || '');
        const w = ctx.measureText(label).width;
        if (w > maxWidth) maxWidth = w;
      });

      ctx.restore();
      return Math.ceil(maxWidth) + 4;
    }

    /** @private */
    _computeScales() {
      if (this.isRadial || !this.normalizedData) return;

      // Heatmap handles its own grid layout, skip normal scale computation
      if (this.type === 'heatmap') {
        // Create minimal scales that the heatmap series can use
        this.scales.x = new CZ.CategoryScale({ maxTicks: this.options.xAxis.maxTicks });
        this.scales.x.configure(this.normalizedData.labels, this.plotArea.left, this.plotArea.right);
        // No Y scale needed — heatmap series draws its own row labels
        this.scales.y = null;
        return;
      }

      // Horizontal Bar: SWAP axes — X = Linear (values), Y = Category (labels)
      if (this.type === 'horizontalBar') {
        // Y axis = categories (labels)
        this.scales.y = new CZ.CategoryScale({ maxTicks: this.options.yAxis.maxTicks });
        this.scales.y.configure(this.normalizedData.labels, this.plotArea.top, this.plotArea.bottom);

        // X axis = values (linear)
        let minX = 0, maxX = -Infinity;
        this.series.forEach(s => {
          if (!s.visible) return;
          const bounds = s.getBounds();
          if (bounds) {
            if (bounds.minY < minX) minX = bounds.minY;
            if (bounds.maxY > maxX) maxX = bounds.maxY;
          }
        });
        if (!isFinite(maxX) || maxX <= 0) maxX = 100;
        if (this.options.xAxis.beginAtZero !== false) minX = Math.min(0, minX);

        const xFormat = this.options.xAxis.format || (val => {
          if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
          if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'K';
          if (Number.isInteger(val)) return val.toString();
          return val.toFixed(1);
        });

        this.scales.x = new CZ.LinearScale({
          beginAtZero: this.options.xAxis.beginAtZero !== false,
          maxTicks: this.options.xAxis.maxTicks,
          format: xFormat
        });
        this.scales.x.configure(minX, maxX, this.plotArea.left, this.plotArea.right);

        this._recomputeLayoutWithScales();
        return;
      }

      // X Scale
      if (this.type === 'scatter' || this.type === 'bubble') {
        // Scatter: both axes are linear, get X bounds from scatter data
        let minX = Infinity, maxX = -Infinity;
        this.series.forEach(s => {
          if (!s.visible) return;
          const bounds = s.getBounds();
          if (bounds) {
            if (bounds.minX < minX) minX = bounds.minX;
            if (bounds.maxX > maxX) maxX = bounds.maxX;
          }
        });
        if (!isFinite(minX)) { minX = 0; maxX = 100; }

        this.scales.x = new CZ.LinearScale({
          maxTicks: this.options.xAxis.maxTicks,
          format: (val) => Number.isInteger(val) ? val.toString() : val.toFixed(1)
        });
        this.scales.x.configure(minX, maxX, this.plotArea.left, this.plotArea.right);
      } else if (this.normalizedData.xType === 'category') {
        this.scales.x = new CZ.CategoryScale({
          maxTicks: this.options.xAxis.maxTicks
        });
        this.scales.x.configure(
          this.normalizedData.labels,
          this.plotArea.left,
          this.plotArea.right
        );
      } else if (this.normalizedData.xType === 'time') {
        this.scales.x = new CZ.TimeScale({
          maxTicks: this.options.xAxis.maxTicks
        });
        this.scales.x.configure(
          this.normalizedData.labels,
          this.plotArea.left,
          this.plotArea.right
        );
      } else {
        this.scales.x = new CZ.LinearScale({
          maxTicks: this.options.xAxis.maxTicks
        });
        const labels = this.normalizedData.labels.map(Number);
        this.scales.x.configure(
          Math.min(...labels),
          Math.max(...labels),
          this.plotArea.left,
          this.plotArea.right
        );
      }

      // Y Scale — compute bounds from all visible series
      let minY = Infinity, maxY = -Infinity;
      this.series.forEach(s => {
        if (!s.visible) return;
        const bounds = s.getBounds();
        if (bounds) {
          if (bounds.minY < minY) minY = bounds.minY;
          if (bounds.maxY > maxY) maxY = bounds.maxY;
        }
      });

      if (!isFinite(minY)) { minY = 0; maxY = 100; }

      const yFormat = this.options.yAxis.format || (val => {
        if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'K';
        if (Number.isInteger(val)) return val.toString();
        return val.toFixed(1);
      });

      this.scales.y = new CZ.LinearScale({
        beginAtZero: this.type === 'scatter' ? false : this.options.yAxis.beginAtZero,
        maxTicks: this.options.yAxis.maxTicks,
        format: yFormat
      });

      // Y axis is inverted (top = high value, bottom = low value)
      this.scales.y.configure(minY, maxY, this.plotArea.bottom, this.plotArea.top);

      // Recompute layout with actual Y-axis label width
      this._recomputeLayoutWithScales();
    }

    /** @private */
    _recomputeLayoutWithScales() {
      const ctx = this.renderer.getMainContext();
      const actualYWidth = this._measureYAxisWidth(ctx);
      const newLeft = this.options.padding.left + actualYWidth + 8;

      if (Math.abs(newLeft - this.plotArea.left) > 2) {
        this.plotArea.left = newLeft;
        this.plotArea.width = this.plotArea.right - this.plotArea.left;

        // Reconfigure X scale with updated plot area
        if (this.scales.x && this.scales.x.configure) {
          if (this.type === 'horizontalBar') {
            // HorizontalBar: X is LinearScale (values), reconfigure with value bounds
            let minX = 0, maxX = -Infinity;
            this.series.forEach(s => {
              if (!s.visible) return;
              const bounds = s.getBounds();
              if (bounds) {
                if (bounds.minY < minX) minX = bounds.minY;
                if (bounds.maxY > maxX) maxX = bounds.maxY;
              }
            });
            if (!isFinite(maxX) || maxX <= 0) maxX = 100;
            this.scales.x.configure(minX, maxX, this.plotArea.left, this.plotArea.right);
          } else if (this.type === 'scatter' || this.type === 'bubble') {
            // Scatter/Bubble: X is LinearScale, reconfigure with value bounds
            let minX = Infinity, maxX = -Infinity;
            this.series.forEach(s => {
              if (!s.visible) return;
              const bounds = s.getBounds();
              if (bounds) {
                if (bounds.minX < minX) minX = bounds.minX;
                if (bounds.maxX > maxX) maxX = bounds.maxX;
              }
            });
            if (!isFinite(minX)) { minX = 0; maxX = 100; }
            this.scales.x.configure(minX, maxX, this.plotArea.left, this.plotArea.right);
          } else if (this.normalizedData.xType === 'category' || this.normalizedData.xType === 'time') {
            this.scales.x.configure(
              this.normalizedData.labels,
              this.plotArea.left,
              this.plotArea.right
            );
          } else {
            const labels = this.normalizedData.labels.map(Number);
            this.scales.x.configure(
              Math.min(...labels),
              Math.max(...labels),
              this.plotArea.left,
              this.plotArea.right
            );
          }
        }

        // For horizontalBar, also reconfigure Y category scale with updated plot area
        if (this.type === 'horizontalBar' && this.scales.y && this.scales.y.configure) {
          this.scales.y.configure(this.normalizedData.labels, this.plotArea.top, this.plotArea.bottom);
        }
      }
    }

    // =========================================================================
    // Rendering
    // =========================================================================

    /** @private */
    _render(animate = false) {
      if (this._destroyed || !this.normalizedData) return;

      const ctx = this.renderer.getMainContext();

      // Compute layout and scales
      this._computeLayout();
      this._computeScales();

      // Clear canvas
      this.renderer.clearMain();
      this.renderer.clearOverlay();

      this.pluginManager.hook('beforeDraw', ctx);

      // Draw background (theme)
      if (this._theme && this._theme.background) {
        ctx.save();
        ctx.fillStyle = this._theme.background;
        ctx.fillRect(0, 0, this._width, this._height);
        ctx.restore();
      }

      // Draw grid and axes (cartesian only)
      if (!this.isRadial) {
        if (CZ.Grid && this.scales.y) {
          const grid = new CZ.Grid(this.options);
          grid.draw(ctx, this.plotArea, this.scales.x, this.scales.y, this.options);
        }
        this.pluginManager.hook('afterGridDraw', ctx);

        if (CZ.Axis) {
          const axis = new CZ.Axis(this.options);
          axis.drawXAxis(ctx, this.plotArea, this.scales.x, this.options.xAxis);
          if (this.scales.y) {
            axis.drawYAxis(ctx, this.plotArea, this.scales.y, this.options.yAxis);
          }
        }
      }

      // Draw series
      const highlightIdx = this._highlightIndex !== undefined ? this._highlightIndex : -1;
      const isPieDonut = (this.type === 'pie' || this.type === 'donut' || this.type === 'funnel' || this.type === 'heatmap' || this.type === 'treemap' || this.type === 'polar');

      const drawSeries = (progress) => {
        ctx.save();
        this.series.forEach((s, si) => {
          if (!s.visible) return;

          // Apply highlight dimming
          if (highlightIdx >= 0) {
            if (isPieDonut) {
              // For pie/donut, pass highlight index to the series
              s._highlightSlice = highlightIdx;
            } else {
              // For cartesian, dim non-highlighted series
              const seriesIdx = s.options && s.options.datasetIndex !== undefined ? s.options.datasetIndex : si;
              ctx.globalAlpha = (seriesIdx === highlightIdx) ? 1.0 : 0.15;
            }
          } else {
            ctx.globalAlpha = 1.0;
            if (isPieDonut) s._highlightSlice = -1;
          }

          s.draw(ctx, this.plotArea, this.scales.x, this.scales.y, progress);
        });
        ctx.globalAlpha = 1.0;
        ctx.restore();
        this.pluginManager.hook('afterSeriesDraw', ctx);
        this.pluginManager.hook('afterDraw', ctx);
      };

      // Animate or draw immediately
      if (animate && this.options.animation.enabled) {
        const animator = new CZ.Animator();
        animator.animate((progress) => {
          // Redraw from grid on each frame
          this.renderer.clearMain();

          if (this._theme && this._theme.background) {
            ctx.save();
            ctx.fillStyle = this._theme.background;
            ctx.fillRect(0, 0, this._width, this._height);
            ctx.restore();
          }

          if (!this.isRadial) {
            if (CZ.Grid && this.scales.y) {
              const grid = new CZ.Grid(this.options);
              grid.draw(ctx, this.plotArea, this.scales.x, this.scales.y, this.options);
            }
            if (CZ.Axis) {
              const axis = new CZ.Axis(this.options);
              axis.drawXAxis(ctx, this.plotArea, this.scales.x, this.options.xAxis);
              if (this.scales.y) {
                axis.drawYAxis(ctx, this.plotArea, this.scales.y, this.options.yAxis);
              }
            }
          }

          drawSeries(progress);
        }, this.options.animation.duration, this.options.animation.easing);
      } else {
        drawSeries(1);
      }
    }

    // =========================================================================
    // Interaction Handlers
    // =========================================================================

    /** @private */
    _handleMouseMove(e) {
      if (this._destroyed || !this.normalizedData) return;

      const rect = this.renderer.getMainCanvas().getBoundingClientRect();
      const mouseX = (e.clientX || e.pageX) - rect.left;
      const mouseY = (e.clientY || e.pageY) - rect.top;

      // Hit test
      const hitAll = this.hitTester.findAll(mouseX, mouseY);
      const hitNearest = this.hitTester.findNearest(mouseX, mouseY);

      // Clear overlay
      this.renderer.clearOverlay();
      const overlayCtx = this.renderer.getOverlayContext();

      const newHoverIndex = hitNearest ? hitNearest.index : -1;
      const isPieDonut = (this.type === 'pie' || this.type === 'donut' || this.type === 'funnel' || this.type === 'treemap' || this.type === 'polar');

      if (hitNearest) {
        // Crosshair (cartesian only)
        if (this.crosshair && !this.isRadial) {
          this.crosshair.draw(overlayCtx, mouseX, mouseY, this.plotArea, hitNearest.x);
        }

        // For pie/donut: set hover index and re-render main canvas
        if (isPieDonut) {
          const prevHoverIndex = this._pieHoverIndex !== undefined ? this._pieHoverIndex : -1;
          if (newHoverIndex !== prevHoverIndex) {
            this._pieHoverIndex = newHoverIndex;
            this.series.forEach(s => {
              if (s.setHoverIndex) s.setHoverIndex(newHoverIndex);
            });
            this._render(false);
          }
        } else {
          // For other charts: draw hover effects on overlay canvas
          // Find which series has the point closest to the mouse cursor (by Y distance)
          // so we can draw it LAST (on top of overlapping points)
          let closestSeries = null;
          let closestDist = Infinity;
          for (const s of this.series) {
            if (!s.visible || !s.drawHover || !s._renderedPoints) continue;
            const pt = s._renderedPoints.find(p => p.index === hitNearest.index);
            if (pt) {
              const dy = Math.abs(mouseY - pt.y);
              if (dy < closestDist) {
                closestDist = dy;
                closestSeries = s;
              }
            }
          }

          // Draw non-closest series first, then closest series last (on top)
          this.series.forEach(s => {
            if (!s.visible || !s.drawHover || s === closestSeries) return;
            s.drawHover(overlayCtx, this.plotArea, this.scales.x, this.scales.y, hitNearest.index);
          });
          if (closestSeries) {
            // Erase the area around the closest point to guarantee it appears fully on top
            const closestPt = closestSeries._renderedPoints.find(p => p.index === hitNearest.index);
            if (closestPt) {
              overlayCtx.save();
              overlayCtx.globalCompositeOperation = 'destination-out';
              overlayCtx.beginPath();
              overlayCtx.arc(closestPt.x, closestPt.y, 12, 0, Math.PI * 2);
              overlayCtx.fill();
              overlayCtx.restore();
            }
            closestSeries.drawHover(overlayCtx, this.plotArea, this.scales.x, this.scales.y, hitNearest.index);
          }
        }

        this._activeHit = hitNearest;
        this.emit('hover', hitNearest);
        this.pluginManager.hook('onHover', hitNearest);
      } else {
        // No hit — clear hover state
        if (isPieDonut && this._pieHoverIndex !== -1) {
          this._pieHoverIndex = -1;
          this.series.forEach(s => {
            if (s.setHoverIndex) s.setHoverIndex(-1);
          });
          this._render(false);
        }
        this._activeHit = null;
      }

      // Cursor: pointer only when mouse is close to a data point
      const canvas = this.renderer.getMainCanvas();
      let isOverPoint = false;
      if (hitNearest) {
        const dx = mouseX - hitNearest.x;
        const dy = mouseY - hitNearest.y;
        isOverPoint = Math.sqrt(dx * dx + dy * dy) < 10;
      }
      canvas.style.cursor = isOverPoint ? 'pointer' : '';

      // Tooltip
      if (this.tooltip && this.options.tooltip.enabled) {
        if (hitAll && hitAll.items && hitAll.items.length > 0) {
          this.tooltip.show(hitAll, this._width, this._height, mouseX, mouseY);
        } else {
          this.tooltip.hide();
        }
      }
    }

    /** @private */
    _handleMouseLeave() {
      if (this._destroyed) return;
      this.renderer.clearOverlay();
      if (this.tooltip) this.tooltip.hide();

      // Reset pie/donut hover
      if ((this.type === 'pie' || this.type === 'donut') && this._pieHoverIndex !== -1) {
        this._pieHoverIndex = -1;
        this.series.forEach(s => {
          if (s.setHoverIndex) s.setHoverIndex(-1);
        });
        this._render(false);
      }

      this._activeHit = null;
    }

    /** @private */
    _handleClick(e) {
      if (this._destroyed) return;
      
      // Toggle point selection on line/area/scatter/radar/bar/horizontalBar/candlestick charts
      if (this.type === 'line' || this.type === 'area' || this.type === 'scatter' || this.type === 'radar' || this.type === 'bar' || this.type === 'horizontalBar' || this.type === 'candlestick') {
        const rect = this.renderer.getMainCanvas().getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Use _activeHit if available, otherwise do our own hit test
        const hit = this._activeHit || this.hitTester.findNearest(mx, my);
        if (!hit) return;

        let bestSeries = null;
        let bestDist = Infinity;
        for (const s of this.series) {
          if (!s.togglePoint || !s.visible) continue;
          // Check rendered points (line/scatter/radar) or rendered bars (bar)
          const points = s._renderedPoints || [];
          const bars = s._renderedBars || [];
          for (const pt of points) {
            if (pt.index !== hit.index) continue;
            const d = Math.sqrt((mx - pt.x) ** 2 + (my - pt.y) ** 2);
            if (d < bestDist) {
              bestDist = d;
              bestSeries = s;
            }
          }
          for (const bar of bars) {
            if (bar.index !== hit.index) continue;
            const cx = bar.x + bar.width / 2;
            const cy = bar.y;
            const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
            if (d < bestDist) {
              bestDist = d;
              bestSeries = s;
            }
          }
        }
        if (bestSeries && bestDist <= 30) {
          bestSeries.togglePoint(hit.index);
          // Bounce animation loop handles re-rendering
        }
      }

      this.emit('click', this._activeHit);
      this.pluginManager.hook('onClick', this._activeHit);
    }

    // =========================================================================
    // Resize
    // =========================================================================

    /** @private */
    _onResize(width, height) {
      if (this._destroyed) return;

      // Viewport may not be assigned yet during initial construction
      const dpr = this.viewport ? this.viewport.getDpr() : (window.devicePixelRatio || 1);
      this.renderer.resize(width, height, dpr);

      // Use actual canvas size (excludes legend height)
      const canvasSize = this.renderer.getCanvasSize();
      this._width = canvasSize.width || width;
      this._height = canvasSize.height || height;

      if (this.pluginManager) {
        this.pluginManager.hook('onResize', this._width, this._height);
      }

      if (this.normalizedData) {
        this._render(false);
      }
    }

    // =========================================================================
    // Legend
    // =========================================================================

    /** @private */
    _updateLegend() {
      if (!this.legend) return;

      let items = [];
      if (this.isRadial && this.type !== 'radar') {
        // For pie/donut, legend items are data points
        if (this.series[0] && this.series[0].getLegendItems) {
          items = this.series[0].getLegendItems();
        }
      } else {
        // For cartesian/radar, legend items are series
        this.series.forEach(s => {
          items = items.concat(s.getLegendItems());
        });
      }

      this.legend.render(items);
    }

    /**
     * Toggle series visibility (called by Legend)
     * @param {number} index - Dataset index
     */
    toggleSeries(index) {
      // For pie/donut/funnel/treemap/polar, toggle individual data points with animation
      if ((this.type === 'pie' || this.type === 'donut' || this.type === 'funnel' || this.type === 'treemap' || this.type === 'polar') && this.series[0]) {
        const pie = this.series[0];
        if (!pie._hiddenSlices) pie._hiddenSlices = new Set();
        const wasHidden = pie._hiddenSlices.has(index);
        
        // Update legend immediately for responsive feel
        this._updateLegend();
        
        // Animate the slice in/out
        pie.animateSliceToggle(index, () => {
          this._updateLegend();
        });
        
        this.emit('legendToggle', { index, visible: wasHidden });
        return;
      }

      // For cartesian charts, toggle series visibility
      if (this.series[index]) {
        this.series[index].visible = !this.series[index].visible;

        // For bar charts, recalculate grouped positions so visible bars
        // redistribute evenly (no empty gaps)
        if (this.type === 'bar' || this.type === 'horizontalBar') {
          this._recalcBarPositions();
        }

        this._updateLegend();
        this._render(true);
        this.emit('legendToggle', { index, visible: this.series[index].visible });
      }
    }

    /**
     * Recalculate bar dataset indices based on visible series only.
     * This ensures bars redistribute evenly when one is hidden.
     * @private
     */
    _recalcBarPositions() {
      let visibleIndex = 0;
      const visibleCount = this.series.filter(s => s.visible).length;
      this.series.forEach(s => {
        if (s.setDatasetIndex) {
          if (s.visible) {
            s.setDatasetIndex(visibleIndex, visibleCount);
            visibleIndex++;
          } else {
            // Keep original index but set totalDatasets to visibleCount
            s.setDatasetIndex(0, visibleCount);
          }
        }
      });
    }

    /**
     * Highlight a specific series (dim all others).
     * Pass -1 to reset all to normal.
     * @param {number} index - Series/slice index to highlight, or -1 to reset
     */
    highlightSeries(index) {
      this._highlightIndex = index;
      this._render(false);
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Replace all data and re-render
     * @param {*} data - New data in any supported format
     */
    setData(data) {
      this._rawConfig.data = data;
      this._loadData(data);
    }

    /**
     * Add a line series (composable API)
     * @param {Object} options - Series options
     * @returns {Object} Series instance
     */
    addLineSeries(options = {}) {
      return this._addSeries('LineSeries', options);
    }

    /**
     * Add a bar series (composable API)
     * @param {Object} options - Series options
     * @returns {Object} Series instance
     */
    addBarSeries(options = {}) {
      return this._addSeries('BarSeries', options);
    }

    /** @private */
    _addSeries(seriesClassName, options) {
      const SeriesConstructor = CZ[seriesClassName];
      if (!SeriesConstructor) {
        throw new Error('czChart: Series type not found: ' + seriesClassName);
      }

      const instance = new SeriesConstructor(this, options);
      this.series.push(instance);

      // Return a proxy with convenient methods
      return {
        setData: (data) => {
          const normalized = CZ.Normalizer.normalize(data, {
            x: options.x,
            y: options.y
          });
          if (normalized.datasets && normalized.datasets[0]) {
            instance.setData(normalized.datasets[0]);
          }
          this.normalizedData = this.normalizedData || normalized;
          this._render(true);
        },
        append: (point) => {
          // For real-time streaming
          if (instance.dataset) {
            if (typeof point === 'object') {
              instance.dataset.values.push(point.y || point.value);
              if (this.normalizedData) {
                this.normalizedData.labels.push(point.x || point.label || '');
              }
            } else {
              instance.dataset.values.push(point);
            }
            this._render(false);
          }
        },
        hide: () => { instance.visible = false; this._render(false); },
        show: () => { instance.visible = true; this._render(false); },
        instance: instance
      };
    }

    /**
     * Force re-render
     */
    update() {
      this._render(false);
    }

    /**
     * Manual resize trigger
     */
    resize() {
      if (this.viewport) this.viewport.resize();
    }

    /**
     * Export chart as image
     * @param {string} format - 'png' or 'jpeg'
     * @param {number} quality - JPEG quality (0-1)
     * @returns {string} Data URL
     */
    toImage(format = 'png', quality = 0.92) {
      const canvas = this.renderer.getMainCanvas();
      return canvas.toDataURL('image/' + format, quality);
    }

    /**
     * Download chart as image
     * @param {string} filename
     * @param {string} format
     */
    downloadImage(filename = 'chart', format = 'png') {
      const dataUrl = this.toImage(format);
      const link = document.createElement('a');
      link.download = filename + '.' + format;
      link.href = dataUrl;
      link.click();
    }

    /**
     * Destroy chart and cleanup all resources
     */
    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;

      // Remove event listeners
      const mainCanvas = this.renderer.getMainCanvas();
      mainCanvas.removeEventListener('mousemove', this._onMouseMove);
      mainCanvas.removeEventListener('mouseleave', this._onMouseLeave);
      mainCanvas.removeEventListener('click', this._onClick);

      // Destroy subsystems
      if (this.tooltip) this.tooltip.destroy();
      if (this.legend) this.legend.destroy();
      if (this.zoomPan) this.zoomPan.disable();
      if (this.viewport) this.viewport.destroy();
      if (this.renderer) this.renderer.destroy();

      this.pluginManager.hook('destroy');

      // Clear references
      this.series = [];
      this.normalizedData = null;
      this.container.classList.remove('cz-chart-container');

      this.removeAllListeners();
      this.emit('destroy');
    }
  }

  CZ.Chart = Chart;

})(window.CZ = window.CZ || {});
