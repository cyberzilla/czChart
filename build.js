/**
 * czChart Build Script
 * Concatenates all source files into a single dist/cz-chart.js bundle.
 * Run: node build.js
 */
const fs = require('fs');
const path = require('path');

// Files in dependency order (important!)
const FILES = [
  // 1. Utilities (no dependencies)
  'src/utils/math.js',
  'src/utils/color.js',
  'src/utils/dom.js',
  'src/styles.js',

  // 2. Core helpers
  'src/core/EventEmitter.js',
  'src/core/Defaults.js',
  'src/core/State.js',

  // 3. Data layer
  'src/data/Normalizer.js',
  'src/data/Scale.js',
  'src/data/Fetcher.js',

  // 4. Themes
  'src/themes/light.js',
  'src/themes/dark.js',

  // 5. Render infrastructure
  'src/render/Viewport.js',
  'src/render/Animator.js',
  'src/render/Grid.js',
  'src/render/Axis.js',
  'src/render/LayeredRenderer.js',

  // 6. Series renderers
  'src/render/series/LineSeries.js',
  'src/render/series/BarSeries.js',
  'src/render/series/HorizontalBarSeries.js',
  'src/render/series/PieSeries.js',
  'src/render/series/ScatterSeries.js',
  'src/render/series/RadarSeries.js',
  'src/render/series/GaugeSeries.js',
  'src/render/series/CandlestickSeries.js',
  'src/render/series/FunnelSeries.js',
  'src/render/series/HeatmapSeries.js',

  // 7. Interaction
  'src/interaction/HitTest.js',
  'src/interaction/Tooltip.js',
  'src/interaction/Legend.js',
  'src/interaction/Crosshair.js',
  'src/interaction/ZoomPan.js',

  // 8. Plugins
  'src/plugins/PluginManager.js',
  'src/plugins/builtins/ThresholdLine.js',
  'src/plugins/builtins/Watermark.js',

  // 9. Main coordinator (depends on everything above)
  'src/core/Chart.js',

  // 10. Public API entry (must be last)
  'src/index.js'
];

const BANNER = `/*!
 * czChart v1.0.0 — Lightweight, Data-Driven Chart Library
 * (c) ${new Date().getFullYear()} CyberZilla
 * Released under the MIT License
 * Built: ${new Date().toISOString()}
 */
`;

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Concatenate all files
let bundle = BANNER + '\n(function(global) {\n"use strict";\n\n';

let fileCount = 0;
let totalSize = 0;

FILES.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ MISSING: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Remove individual 'use strict' declarations (we have a global one)
  content = content.replace(/^'use strict';\s*/gm, '');

  bundle += `\n// ============================================================\n`;
  bundle += `// ${file}\n`;
  bundle += `// ============================================================\n\n`;
  bundle += content + '\n';

  fileCount++;
  totalSize += content.length;
  console.log(`  ✓ ${file} (${(content.length / 1024).toFixed(1)} KB)`);
});

bundle += '\n})(typeof window !== "undefined" ? window : this);\n';

// Write unminified bundle
const outputPath = path.join(distDir, 'cz-chart.js');
fs.writeFileSync(outputPath, bundle, 'utf8');

// Simple minification (remove comments and extra whitespace)
let minified = bundle
  // Remove multi-line comments (but keep the banner)
  .replace(/\/\*(?!\!)[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '')
  // Remove single-line comments
  .replace(/\/\/(?!.*============).*$/gm, '')
  // Remove lines that are only the file separator comments
  .replace(/\/\/ =+\n\/\/ src\/.*\n\/\/ =+\n/g, '\n')
  // Collapse multiple blank lines
  .replace(/\n{3,}/g, '\n\n')
  // Remove leading whitespace on lines (basic)
  .replace(/^[ \t]+/gm, '');

const minOutputPath = path.join(distDir, 'cz-chart.min.js');
fs.writeFileSync(minOutputPath, minified, 'utf8');

console.log(`\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  📦 Bundle: ${fileCount} files`);
console.log(`  📄 dist/cz-chart.js     → ${(bundle.length / 1024).toFixed(1)} KB`);
console.log(`  📄 dist/cz-chart.min.js → ${(minified.length / 1024).toFixed(1)} KB`);
console.log(`  ✅ Build complete!`);
