'use strict';

(function(CZ) {
    /**
     * Plugin lifecycle manager.
     */
    class PluginManager {
        /**
         * @param {Object} chart - Reference to the chart instance
         */
        constructor(chart) {
            this.chart = chart;
            this.plugins = [];
        }

        /**
         * Adds a plugin to the manager and calls its install method.
         * @param {Object} plugin 
         */
        register(plugin) {
            if (!plugin || !plugin.name) {
                console.warn('Plugin must have a name property.');
                return;
            }

            // Check if already registered
            const exists = this.plugins.find(p => p.name === plugin.name);
            if (exists) {
                console.warn(`Plugin ${plugin.name} is already registered.`);
                return;
            }

            this.plugins.push(plugin);

            if (typeof plugin.install === 'function') {
                plugin.install(this.chart);
            }
        }

        /**
         * Removes a plugin by name.
         * @param {string} pluginName 
         */
        unregister(pluginName) {
            const idx = this.plugins.findIndex(p => p.name === pluginName);
            if (idx !== -1) {
                const plugin = this.plugins[idx];
                if (typeof plugin.uninstall === 'function') {
                    plugin.uninstall(this.chart);
                }
                this.plugins.splice(idx, 1);
            }
        }

        /**
         * Calls a hook method on all registered plugins.
         * If any plugin returns false, the hook chain stops and returns false.
         * @param {string} hookName 
         * @param  {...any} args 
         * @returns {boolean} true if all succeeded, false if any aborted
         */
        hook(hookName, ...args) {
            for (let i = 0; i < this.plugins.length; i++) {
                const plugin = this.plugins[i];
                if (typeof plugin[hookName] === 'function') {
                    const result = plugin[hookName](this.chart, ...args);
                    if (result === false) {
                        return false;
                    }
                }
            }
            return true;
        }
    }

    CZ.PluginManager = PluginManager;
})(window.CZ = window.CZ || {});
