'use strict';

(function(CZ) {
    /**
     * Light theme preset
     */
    const LightTheme = {
        name: 'light',
        background: '#ffffff',
        textColor: '#374151',
        gridColor: 'rgba(0, 0, 0, 0.06)',
        axisLineColor: '#e5e7eb',
        axisLabelColor: '#6b7280',
        tooltipBackground: 'rgba(17, 24, 39, 0.95)',
        tooltipTextColor: '#ffffff',
        crosshairColor: 'rgba(156, 163, 175, 0.4)',
        legendTextColor: '#374151',
        palette: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48']
    };

    CZ.Themes = CZ.Themes || {};
    CZ.Themes.Light = LightTheme;
})(window.CZ = window.CZ || {});
