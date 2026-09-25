'use strict';

(function(CZ) {
    /**
     * Dark theme preset
     */
    const DarkTheme = {
        name: 'dark',
        background: '#111827',
        textColor: '#e5e7eb',
        gridColor: 'rgba(255, 255, 255, 0.06)',
        axisLineColor: '#374151',
        axisLabelColor: '#9ca3af',
        tooltipBackground: 'rgba(31, 41, 55, 0.95)',
        tooltipTextColor: '#ffffff',
        crosshairColor: 'rgba(156, 163, 175, 0.3)',
        legendTextColor: '#d1d5db',
        palette: ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#818cf8', '#2dd4bf', '#fb7185']
    };

    CZ.Themes = CZ.Themes || {};
    CZ.Themes.Dark = DarkTheme;
})(window.CZ = window.CZ || {});
