# czChart

**Lightweight, data-driven chart library for the web.**  
Zero dependencies. Single `<script>` tag. ~195 KB minified.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

## ✨ Features

- **19 Chart Types** — Line, Bar, Area, Spline, Area-Spline, Pie, Donut, Scatter, Radar, Gauge, Candlestick, Funnel, Heatmap, Waterfall, Bubble, Treemap, BoxPlot, Polar, Horizontal Bar
- **Mixed/Combo Charts** — Combine different chart types (line + bar, area + spline, etc.) in one chart
- **Data-Driven** — Auto-detect data types from JSON, CSV, or API URL
- **Zero Dependencies** — Pure vanilla JavaScript, no npm required
- **Plug & Play** — Single `<script>` tag, no build tools needed
- **Smart Colors** — 20 maximally distinct palette colors + golden angle algorithm for unlimited series
- **Smart Numbers** — Auto-abbreviation (K/M/B/T) with locale support (Indonesian: rb/jt/M/T)
- **Interactive** — Tooltips with arrow + 4-way auto-positioning, crosshair, legend toggle, zoom/pan, click events
- **Responsive** — Auto-resize with ResizeObserver + HiDPI/Retina support
- **Animated** — Smooth entry animations with data points following the line
- **Themeable** — Built-in light/dark themes + custom theming
- **Plugin System** — Extensible lifecycle hooks for custom features
- **Export** — Save chart as PNG/JPEG image

## 🚀 Quick Start

### CDN / Download

```html
<script src="dist/cz-chart.js"></script>
```

### 3-Line Chart

```html
<div id="myChart" style="width:600px; height:400px;"></div>
<script>
czChart.create('#myChart', {
    type: 'line',
    data: [
        { month: 'Jan', revenue: 4200, cost: 2800 },
        { month: 'Feb', revenue: 5100, cost: 3200 },
        { month: 'Mar', revenue: 4800, cost: 2900 },
        { month: 'Apr', revenue: 6300, cost: 3500 }
    ],
    x: 'month',
    y: ['revenue', 'cost']
});
</script>
```

That's it! czChart will:
- ✅ Auto-detect `month` as X-axis (category)
- ✅ Create 2 series from `revenue` and `cost`
- ✅ Assign distinct colors automatically
- ✅ Render with smooth animation (points follow the line)
- ✅ Show tooltip with arrow on hover
- ✅ Format numbers smartly (5000 → 5K)

## 📊 Chart Types

### Line Chart
```javascript
czChart.create('#chart', {
    type: 'line',
    data: [...],
    x: 'date',
    y: ['revenue', 'cost'],
    series: { smooth: true, pointRadius: 3 }
});
```

### Spline Chart
```javascript
// Line with smooth curves (c3.js compatible)
czChart.create('#chart', {
    type: 'spline',
    data: [...],
    x: 'month',
    y: ['sales', 'target']
});
```

### Area Chart
```javascript
czChart.create('#chart', {
    type: 'area',   // Line with gradient fill, supports negative values
    data: [...],
    series: { smooth: true }
});
```

### Area-Spline Chart
```javascript
// Area with smooth curves
czChart.create('#chart', {
    type: 'area-spline',
    data: [...],
    x: 'date',
    y: ['pageviews', 'sessions']
});
```

### Bar Chart
```javascript
czChart.create('#chart', {
    type: 'bar',
    data: [...],
    x: 'quarter',
    y: ['north', 'south'],
    bar: { borderRadius: 6, gap: 0.25 }
});
```

### Horizontal Bar Chart
```javascript
czChart.create('#chart', {
    type: 'horizontalBar',
    data: [...],
    x: 'department',
    y: 'headcount'
});
```

### Pie & Donut Chart
```javascript
// Pie
czChart.create('#chart', { type: 'pie', data: [...] });

// Donut (pie with inner radius)
czChart.create('#chart', { type: 'donut', data: [...] });
```

### Scatter Plot
```javascript
czChart.create('#chart', {
    type: 'scatter',
    data: [...],
    x: 'height',
    y: 'weight',
    scatter: { pointRadius: 6, pointShape: 'circle' }
});
```

### Bubble Chart
```javascript
czChart.create('#chart', {
    type: 'bubble',
    data: [...],
    x: 'gdp',
    y: 'lifeExpectancy',
    size: 'population'
});
```

### Radar Chart
```javascript
czChart.create('#chart', {
    type: 'radar',
    data: [...],
    x: 'skill',
    y: ['player_a', 'player_b'],
    radar: { gridType: 'polygon', fillOpacity: 0.2 }
});
```

### Gauge Chart
```javascript
// Speedometer-style with needle, ticks, and colored zones
czChart.create('#chart', {
    type: 'gauge',
    data: [{ value: 72 }],
    gauge: { min: 0, max: 100, zones: [
        { min: 0, max: 50, color: '#10b981' },
        { min: 50, max: 80, color: '#f59e0b' },
        { min: 80, max: 100, color: '#ef4444' }
    ]}
});
```

### Candlestick Chart
```javascript
czChart.create('#chart', {
    type: 'candlestick',
    data: [...],  // { date, open, high, low, close }
    x: 'date'
});
```

### Funnel Chart
```javascript
czChart.create('#chart', {
    type: 'funnel',
    data: [
        { stage: 'Visitors', count: 10000 },
        { stage: 'Leads', count: 5000 },
        { stage: 'Sales', count: 1200 }
    ],
    x: 'stage',
    y: 'count'
});
```

### Heatmap Chart
```javascript
czChart.create('#chart', {
    type: 'heatmap',
    data: [...],  // { row, col, value }
    x: 'col',
    y: 'row'
});
```

### Waterfall Chart
```javascript
czChart.create('#chart', {
    type: 'waterfall',
    data: [...],
    x: 'item',
    y: 'amount'
});
```

### Treemap Chart
```javascript
czChart.create('#chart', {
    type: 'treemap',
    data: [
        { name: 'Electronics', value: 5000 },
        { name: 'Clothing', value: 3200 },
        { name: 'Food', value: 2100 }
    ],
    x: 'name',
    y: 'value'
});
```

### Box Plot Chart
```javascript
czChart.create('#chart', {
    type: 'boxplot',
    data: [...],
    x: 'group',
    y: 'values'
});
```

### Polar Chart
```javascript
czChart.create('#chart', {
    type: 'polar',
    data: [...],
    x: 'category',
    y: 'value'
});
```

### Mixed / Combo Chart
```javascript
// Combine different chart types in one chart
czChart.create('#chart', {
    type: 'bar',  // default type
    types: {
        revenue: 'bar',
        trend: 'spline',
        target: 'line'
    },
    data: [...],
    x: 'month',
    y: ['revenue', 'trend', 'target']
});
```

## 📦 Data Formats

czChart accepts multiple data formats — pass data as-is, it figures out the rest.

### JSON Array of Objects (Most Common)
```javascript
data: [
    { date: '2024-01', sales: 100 },
    { date: '2024-02', sales: 200 }
]
```

### Simple Array
```javascript
data: [10, 45, 30, 70, 60, 85]
```

### CSV String
```javascript
data: "product,Q1,Q2,Q3\nLaptop,120,150,180\nPhone,200,180,220"
```

### API URL (Fetch)
```javascript
data: 'https://api.example.com/sales.json'
```

### Random Colors
```javascript
// Colors change on every page load, but stay maximally distinct
data: [
    { category: 'A', value: 100, color: 'random' },
    { category: 'B', value: 200, color: 'random' }
]
```

## 🔢 Number Formatting

Numbers are automatically abbreviated on axes:

| Value | Display |
|-------|---------|
| 500 | `500` |
| 5000 | `5K` |
| 1500 | `1.5K` |
| 2000000 | `2M` |
| 3500000000 | `3.5B` |
| 1000000000000 | `1T` |

### Indonesian Locale
```javascript
czChart.create('#chart', {
    numberAbbr: {
        thousands: 'rb',   // 5rb
        millions: 'jt',    // 2jt
        billions: 'M',     // 1M (miliar)
        trillions: 'T'     // 1T (triliun)
    },
    ...
});
```

Numbers below 1000 automatically use `toLocaleString()` for locale-aware thousand separators (`.` for Indonesian, `,` for English).

## 🎨 Colors

### Default Palette
20 maximally distinct colors, ordered so adjacent colors always have high contrast:

```
🔵 #3b82f6  🔴 #ef4444  🟢 #22c55e  🟡 #f59e0b  🟣 #8b5cf6
🩵 #06b6d4  🟠 #f97316  🌊 #14b8a6  🌹 #e11d48  🍀 #84cc16
...and 10 more
```

### Custom Colors
```javascript
czChart.create('#chart', {
    colors: ['#e74c3c', '#3498db', '#2ecc71'],
    ...
});
```

### Unlimited Series
When more than 20 series exist, colors are generated using the **golden angle algorithm** (137.5° spacing) to guarantee maximum visual distinction.

## 🎨 Themes

```javascript
// Dark theme
czChart.create('#chart', { theme: 'dark', ... });

// Light theme (default)
czChart.create('#chart', { theme: 'light', ... });
```

## 💬 Tooltip

### Positioning
```javascript
czChart.create('#chart', {
    tooltip: {
        align: 'auto'  // auto, right, left, top, bottom
    },
    ...
});
```

| Align | Behavior |
|-------|----------|
| `auto` | Smart — picks best direction based on viewport space |
| `right` | Always right of cursor |
| `left` | Always left of cursor |
| `top` | Always above cursor |
| `bottom` | Always below cursor |

Features:
- Arrow pointer with seamless rotated-square technique
- Auto-hides on scroll
- Semi-transparent with uniform opacity (no double-layer artifacts)
- Shared mode shows all series values at once

## ⚡ Interactivity

### Event Listeners
```javascript
const chart = czChart.create('#chart', { ... });

chart.on('click', (point) => {
    console.log('Clicked:', point.label, point.value);
});

chart.on('hover', (point) => {
    console.log('Hovering:', point.seriesName);
});
```

### Zoom & Pan
```javascript
czChart.create('#chart', {
    zoom: { enabled: true, mode: 'x' },
    ...
});
```

### Export
```javascript
const chart = czChart.create('#chart', { ... });
chart.downloadImage('my-chart', 'png');
```

## 🔌 Plugin System

```javascript
const myPlugin = {
    name: 'highlight',
    afterSeriesDraw(chart, ctx) {
        // Custom drawing after series
    },
    onClick(chart, point) {
        // React to clicks
    }
};

czChart.use(myPlugin); // Global
// or per chart:
czChart.create('#chart', { plugins: [myPlugin], ... });
```

### Built-in Plugins

**Threshold Line** — horizontal target/reference lines:
```javascript
czChart.create('#chart', {
    thresholds: [
        { value: 75, color: '#ef4444', label: 'Target' }
    ],
    ...
});
```

**Watermark** — background text:
```javascript
czChart.create('#chart', {
    watermark: { text: 'DRAFT', opacity: 0.05 },
    ...
});
```

## ⚙️ Full Options

```javascript
czChart.create('#chart', {
    // ── Chart Type ──────────────────────────────────────
    type: 'line',
    // line, spline, area, area-spline, bar, horizontalBar,
    // pie, donut, scatter, bubble, radar, gauge, candlestick,
    // funnel, heatmap, waterfall, treemap, boxplot, polar

    // ── Mixed/Combo Chart ───────────────────────────────
    types: {                    // Per-dataset type override
        revenue: 'bar',
        trend: 'spline'
    },

    // ── Data ────────────────────────────────────────────
    data: [...],
    x: 'column_name',          // X-axis key (auto-detected if omitted)
    y: ['col1', 'col2'],       // Y-axis key(s) (auto-detected if omitted)

    // ── Colors ──────────────────────────────────────────
    colors: ['#3b82f6', ...],  // Custom color palette

    // ── Number Formatting ───────────────────────────────
    numberAbbr: {
        thousands: 'K',        // 'rb' for Indonesian
        millions: 'M',         // 'jt' for Indonesian
        billions: 'B',         // 'M' for Indonesian (miliar)
        trillions: 'T'         // 'T' for Indonesian
    },

    // ── Theme ───────────────────────────────────────────
    theme: 'light',            // 'light', 'dark', or custom object

    // ── Animation ───────────────────────────────────────
    animation: { enabled: true, duration: 500, easing: 'easeOutCubic' },

    // ── Axes ────────────────────────────────────────────
    xAxis: {
        show: true,
        gridLines: false,
        maxTicks: 0,
        rotation: 0,
        title: null             // e.g. 'Month'
    },
    yAxis: {
        show: true,
        gridLines: true,
        beginAtZero: true,
        maxTicks: 6,
        format: null,           // Custom format function: (val) => '...'
        title: null             // e.g. 'Revenue (USD)'
    },

    // ── Tooltip ─────────────────────────────────────────
    tooltip: {
        enabled: true,
        shared: true,           // Show all series values
        align: 'auto'           // auto, right, left, top, bottom
    },

    // ── Legend ───────────────────────────────────────────
    legend: { show: true, position: 'top' },  // top, bottom

    // ── Crosshair ───────────────────────────────────────
    crosshair: { enabled: true },

    // ── Zoom ────────────────────────────────────────────
    zoom: { enabled: false, mode: 'x' },  // x, y, xy

    // ── Series (line/area/spline) ───────────────────────
    series: {
        lineWidth: 1.5,
        pointRadius: 2.5,
        pointHoverRadius: 8,
        smooth: false,
        fill: false,
        fillOpacity: 0.15
    },

    // ── Bar ─────────────────────────────────────────────
    bar: { borderRadius: 4, gap: 0.2, groupGap: 0.1 },

    // ── Pie / Donut ─────────────────────────────────────
    pie: {
        innerRadius: 0,         // >0 for donut
        padAngle: 0.02,
        cornerRadius: 0,
        startAngle: -90,
        showLabels: true,
        labelFormat: 'percent'  // percent, value, name
    },

    // ── Scatter ─────────────────────────────────────────
    scatter: { pointRadius: 5, pointShape: 'circle' },

    // ── Radar ───────────────────────────────────────────
    radar: { gridType: 'polygon', fillOpacity: 0.2, pointRadius: 3 },

    // ── Padding ─────────────────────────────────────────
    padding: { top: 20, right: 20, bottom: 20, left: 20 }
});
```

## 🏗️ Build

```bash
node build.js
```

Outputs:
- `dist/cz-chart.js` — Unminified (~298 KB)
- `dist/cz-chart.min.js` — Minified (~195 KB)

## 📄 License

MIT © CyberZilla
