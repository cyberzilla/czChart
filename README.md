# czChart

**Lightweight, data-driven chart library for the web.**  
Zero dependencies. Single `<script>` tag. 85 KB minified.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

## ✨ Features

- **8 Chart Types** — Line, Bar, Area, Pie, Donut, Scatter, Radar, Stacked Bar
- **Data-Driven** — Auto-detect data types from JSON, CSV, or API URL
- **Zero Dependencies** — Pure vanilla JavaScript, no npm required
- **Plug & Play** — Single `<script>` tag, no build tools needed
- **Interactive** — Tooltips, crosshair, legend toggle, zoom/pan, click events
- **Responsive** — Auto-resize with ResizeObserver + HiDPI/Retina support
- **Animated** — Smooth entry animations with configurable easing
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
- ✅ Assign colors automatically
- ✅ Render with smooth animation
- ✅ Show tooltip on hover

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

### Area Chart
```javascript
czChart.create('#chart', {
    type: 'area',   // Same as line with fill=true
    data: [...],
    series: { smooth: true }
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

## 🎨 Themes

```javascript
// Dark theme
czChart.create('#chart', { theme: 'dark', ... });

// Light theme (default)
czChart.create('#chart', { theme: 'light', ... });
```

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
    // Chart type
    type: 'line', // line, bar, area, pie, donut, scatter, radar

    // Data
    data: [...],
    x: 'column_name',      // X-axis key (auto-detected if omitted)
    y: ['col1', 'col2'],   // Y-axis key(s) (auto-detected if omitted)

    // Theme
    theme: 'light',  // 'light', 'dark', or custom object

    // Animation
    animation: { enabled: true, duration: 500, easing: 'easeOutCubic' },

    // Axes
    xAxis: { show: true, gridLines: true, maxTicks: 10, rotation: 0 },
    yAxis: { show: true, beginAtZero: true, maxTicks: 6, format: null },

    // Tooltip
    tooltip: { enabled: true, shared: true },

    // Legend
    legend: { show: true, position: 'top' },

    // Crosshair
    crosshair: { enabled: true },

    // Zoom
    zoom: { enabled: false, mode: 'x' },

    // Series options (line/area)
    series: { lineWidth: 2, smooth: false, fill: false, pointRadius: 0 },

    // Bar options
    bar: { borderRadius: 4, gap: 0.2 },

    // Pie/Donut options
    pie: { innerRadius: 0, padAngle: 0.02, startAngle: -90 },

    // Scatter options
    scatter: { pointRadius: 5, pointShape: 'circle' },

    // Radar options
    radar: { gridType: 'polygon', fillOpacity: 0.2 },

    // Padding
    padding: { top: 20, right: 20, bottom: 20, left: 20 }
});
```

## 🏗️ Build

```bash
node build.js
```

Outputs:
- `dist/cz-chart.js` — Unminified (~132 KB)
- `dist/cz-chart.min.js` — Minified (~85 KB)

## 📄 License

MIT © CyberZilla
