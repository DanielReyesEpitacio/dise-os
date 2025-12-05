/**
 * @typedef {Object} RequestOptions
 * @property {Object} [headers]
 * @property {Object} [params]
 * @property {AbortSignal} [signal]
 */

/**
 * @abstract
 */
class HttpClient {
    /**
     * @param {string} url
     * @param {RequestOptions} [options]
     * @returns {Promise<ObservableResponse>} - Parsed response body
     */
    async get(url, options) {
        throw new Error('Method not implemented.');
    }

    /**
     * @param {string} url
     * @param {any} body
     * @param {RequestOptions} [options]
     * @returns {Promise<ObservableResponse>} - Parsed response body
     */
    async post(url, body, options) {
        throw new Error('Method not implemented.');
    }

    /**
     * @param {string} url
     * @param {any} body
     * @param {RequestOptions} [options]
     * @returns {Promise<ObservableResponse>}
     */
    async put(url, body, options) {
        throw new Error('Method not implemented.');
    }

    /**
     * @param {string} url
     * @param {RequestOptions} [options]
     * @returns {Promise<any>}
     */
    async delete(url, options) {
        throw new Error('Method not implemented.');
    }
}

export default HttpClient;
