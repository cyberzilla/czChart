'use strict';

window.CZ = window.CZ || {};

window.CZ.Styles = {
    /**
     * Inject self-contained CSS styles into document head
     */
    injectStyles() {
        if (document.getElementById('cz-chart-styles')) {
            return;
        }

        const css = `
.cz-chart-container { position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; user-select: none; }
.cz-tooltip { position: absolute; pointer-events: none; opacity: 0; transition: opacity 0.15s ease-out, transform 0.1s ease-out; z-index: 100; will-change: transform; top: 0; left: 0; }
.cz-tooltip-content { background: #111827; color: #fff; border-radius: 6px; padding: 6px 10px; font-size: 12px; line-height: 1.4; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap; position: relative; }
.cz-tooltip-title { color: #9ca3af; margin-bottom: 4px; font-size: 11px; font-weight: 600; }
.cz-tooltip-row { display: flex; align-items: center; gap: 6px; }
.cz-tooltip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.cz-tooltip-label { color: #d1d5db; }
.cz-tooltip-value { font-weight: 600; color: #fff; margin-left: auto; }
.cz-tooltip-arrow { position: absolute; width: 10px; height: 10px; background: #111827; transform: rotate(45deg); }
.cz-tooltip-arrow-left { left: -5px; top: 50%; margin-top: -5px; }
.cz-tooltip-arrow-right { right: -5px; top: 50%; margin-top: -5px; }
.cz-tooltip-arrow-bottom { bottom: -5px; left: 50%; margin-left: -5px; }
.cz-tooltip-arrow-top { top: -5px; left: 50%; margin-left: -5px; }
.cz-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 16px; padding: 8px 4px; font-size: 12px; line-height: 1; }
.cz-legend-item { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity 0.2s; text-decoration: none; padding: 2px 0; }
.cz-legend-item:hover { opacity: 0.75; }
.cz-legend-item.cz-legend-disabled { opacity: 0.3; }
.cz-legend-swatch { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; display: inline-block; }
.cz-legend-label { color: #374151; text-decoration: none; }
.cz-crosshair-label { position: absolute; background: #1f2937; color: #fff; padding: 2px 6px; font-size: 10px; border-radius: 3px; pointer-events: none; }
@keyframes cz-bounce { 0% { transform: scale(1); } 30% { transform: scale(1.6); } 50% { transform: scale(0.85); } 70% { transform: scale(1.15); } 85% { transform: scale(0.97); } 100% { transform: scale(1); } }
.cz-legend-swatch.cz-bounce { animation: cz-bounce 0.4s ease-out; }
`;

        const style = document.createElement('style');
        style.id = 'cz-chart-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }
};

// Convenience alias for CZ.injectStyles()
window.CZ.injectStyles = function() { window.CZ.Styles.injectStyles(); };
