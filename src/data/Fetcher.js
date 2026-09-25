'use strict';

(function(CZ) {
  class Fetcher {
    /**
     * Fetch data from URL or return as-is
     * @param {string|*} urlOrData 
     * @param {Object} options 
     * @returns {Promise<*>}
     */
    static async fetch(urlOrData, options = {}) {
      if (typeof urlOrData === 'string' && (urlOrData.startsWith('http') || urlOrData.startsWith('/'))) {
        try {
          let data;
          if (urlOrData.endsWith('.csv')) {
            data = await this.fetchCSV(urlOrData, options);
          } else {
            data = await this.fetchJSON(urlOrData, options);
          }

          if (options.transform && typeof options.transform === 'function') {
            return options.transform(data);
          }
          return data;
        } catch (error) {
          console.error('CZChart Fetcher Error:', error);
          throw new Error(`Failed to fetch data from ${urlOrData}: ${error.message}`);
        }
      }
      return Promise.resolve(urlOrData);
    }

    static async fetchJSON(url, options = {}) {
      const response = await fetch(url, { headers: options.headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    }

    static async fetchCSV(url, options = {}) {
      const response = await fetch(url, { headers: options.headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    }
  }

  CZ.Fetcher = Fetcher;
})(window.CZ = window.CZ || {});
