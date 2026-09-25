'use strict';

window.CZ = window.CZ || {};

/**
 * Lightweight pub/sub EventEmitter
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Register a listener
     * @param {string} event 
     * @param {Function} callback 
     * @returns {Function} unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        return () => this.off(event, callback);
    }

    /**
     * Remove a listener
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event
     * @param {string} event 
     * @param  {...any} args 
     */
    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(...args));
    }

    /**
     * Listen only once
     * @param {string} event 
     * @param {Function} callback 
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback(...args);
        };
        this.on(event, onceWrapper);
    }

    /**
     * Remove all listeners
     * @param {string} [event] 
     */
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}

window.CZ.EventEmitter = EventEmitter;
