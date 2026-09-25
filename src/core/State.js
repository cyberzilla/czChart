'use strict';

window.CZ = window.CZ || {};

/**
 * Reactive state container
 */
class State {
    /**
     * @param {object} initialState 
     */
    constructor(initialState = {}) {
        this._state = { ...initialState };
        this._watchers = new Map();
        this._batching = false;
        this._pendingChanges = new Set();
    }

    /**
     * Get a state value
     * @param {string} key 
     * @returns {any}
     */
    get(key) {
        return this._state[key];
    }

    /**
     * Set a state value and notify watchers
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
        if (this._state[key] !== value) {
            const oldValue = this._state[key];
            this._state[key] = value;
            
            if (this._batching) {
                this._pendingChanges.add(key);
            } else {
                this._notify(key, value, oldValue);
            }
        }
    }

    /**
     * Watch for changes on a specific key
     * @param {string} key 
     * @param {Function} callback 
     * @returns {Function} unwatch function
     */
    watch(key, callback) {
        if (!this._watchers.has(key)) {
            this._watchers.set(key, new Set());
        }
        this._watchers.get(key).add(callback);
        
        return () => {
            if (this._watchers.has(key)) {
                this._watchers.get(key).delete(callback);
            }
        };
    }

    /**
     * Batch multiple set() calls to notify only once at the end
     * @param {Function} fn 
     */
    batch(fn) {
        this._batching = true;
        
        try {
            fn();
        } finally {
            this._batching = false;
            if (this._pendingChanges.size > 0) {
                this._pendingChanges.forEach(key => {
                    // Provide undefined for old value in batch since it may have changed multiple times
                    this._notify(key, this._state[key], undefined);
                });
                this._pendingChanges.clear();
            }
        }
    }

    /**
     * Notify watchers of a change
     * @param {string} key 
     * @param {any} newValue 
     * @param {any} oldValue 
     * @private
     */
    _notify(key, newValue, oldValue) {
        if (this._watchers.has(key)) {
            this._watchers.get(key).forEach(callback => {
                callback(newValue, oldValue);
            });
        }
    }
}

window.CZ.State = State;
