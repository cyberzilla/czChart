'use strict';

window.CZ = window.CZ || {};

const DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    animation: {
        enabled: true,
        duration: 500,
        easing: 'easeOutCubic'
    },
    xAxis: {
        show: true,
        gridLines: false,
        gridColor: 'rgba(0,0,0,0.05)',
        lineColor: '#d1d5db',
        tickColor: '#6b7280',
        labelFont: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        labelColor: '#6b7280',
        maxTicks: 10,
        rotation: 0,
        title: null      // e.g. 'Bulan'
    },
    yAxis: {
        show: true,
        gridLines: true,
        gridColor: 'rgba(0,0,0,0.08)',
        lineColor: '#d1d5db',
        tickColor: '#6b7280',
        labelFont: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        labelColor: '#6b7280',
        maxTicks: 6,
        beginAtZero: true,
        format: null,
        title: null
    },
    tooltip: {
        enabled: true,
        shared: true  // show all series values
    },
    legend: {
        show: true,
        position: 'top'  // top, bottom
    },
    crosshair: {
        enabled: true,
        color: 'rgba(156,163,175,0.4)',
        dashArray: [4, 4],
        lineWidth: 1
    },
    zoom: {
        enabled: false,
        mode: 'x'  // x, y, xy
    },
    series: {
        lineWidth: 1.5,
        pointRadius: 2.5,
        pointHoverRadius: 8,
        smooth: false,
        fill: false,
        fillOpacity: 0.15
    },
    bar: {
        borderRadius: 4,
        gap: 0.2,  // gap ratio between bars
        groupGap: 0.1
    },
    pie: {
        innerRadius: 0,  // 0 for pie, >0 for donut
        padAngle: 0.02,
        cornerRadius: 0,
        startAngle: -90,
        showLabels: true,
        labelFormat: 'percent'  // percent, value, name
    },
    scatter: {
        pointRadius: 5,
        pointShape: 'circle'  // circle, square, triangle, diamond
    },
    radar: {
        gridType: 'polygon',  // polygon, circle
        fillOpacity: 0.2,
        pointRadius: 3
    }
};

/**
 * Check if item is a generic object
 * @param {any} item 
 * @returns {boolean}
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge defaults with user options
 * @param {object} userOptions 
 * @param {object} defaults 
 * @returns {object} merged options
 */
function mergeDefaults(userOptions, defaults) {
    if (!userOptions) return JSON.parse(JSON.stringify(defaults));
    
    const output = Object.assign({}, defaults);
    
    if (isObject(defaults) && isObject(userOptions)) {
        Object.keys(userOptions).forEach(key => {
            if (isObject(userOptions[key])) {
                if (!(key in defaults)) {
                    Object.assign(output, { [key]: userOptions[key] });
                } else {
                    output[key] = mergeDefaults(userOptions[key], defaults[key]);
                }
            } else {
                Object.assign(output, { [key]: userOptions[key] });
            }
        });
    }
    return output;
}

window.CZ.DEFAULTS = DEFAULTS;
window.CZ.mergeDefaults = mergeDefaults;
