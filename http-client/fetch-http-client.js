import HttpClient from "./http-client";
import ObservableResponse from "./observable-response";

export default class FetchHttpClient extends HttpClient {
  constructor(options = {}) {
    super();
    this.interceptors = options.interceptors || [];
  }

  async get(url, options = {}) {
    return this._request('GET', url, null, options);
  }

  async post(url, data, options = {}) {
    return this._request('POST', url, data, options);
  }

  async put(url, data, options = {}) {
    return this._request('PUT', url, data, options);
  }

  async patch(url, data, options = {}) {
    return this._request('PATCH', url, data, options);
  }

  async delete(url, data, options = {}) {
    return this._request('DELETE', url, data, options);
  }

  _applyRequestInterceptors(config) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onRequest === 'function') {
        const result = interceptor.onRequest({ ...config }) || config;

        if (result.headers) {
          config.headers = { ...config.headers, ...result.headers };
        }
        if (result.url) {
          config.url = result.url;
        }
        if (result.body !== undefined) {
          config.body = result.body;
        }

        config = { ...config, ...result };
      }
    }
    return config;
  }

  _applyResponseInterceptors(response) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onResponse === 'function') {
        const result = interceptor.onResponse({ ...response });
        if (result !== undefined) {
          response = result;
        }
      }
    }
    return response;
  }

  _applyRequestErrorInterceptors(error) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onRequestError === 'function') {
        const result = interceptor.onRequestError(error);
        if (result !== undefined) {
          error = result;
        }
      }
    }
    return error;
  }

  _applyResponseErrorInterceptors(error) {
    for (const interceptor of this.interceptors) {
      if (typeof interceptor.onResponseError === 'function') {
        const result = interceptor.onResponseError(error);
        if (result !== undefined) {
          error = result;
        }
      }
    }
    return error;
  }

  _request(method, url, data, options = {}) {
    return new Promise((resolve) => {
      const executor = async (resolveResponse, rejectResponse) => {
        try {
          const defaultHeaders = { 'Accept': 'application/json' };
          let config = {
            method,
            url,
            headers: { ...defaultHeaders, ...(options.headers || {}) },
            body: undefined,
            ...options,
          };

          if (data instanceof FormData) {
            delete config.headers['Content-Type'];
            config.body = data;

          } else if (Object.prototype.toString.call(data) === '[object File]') {
            delete config.headers['Content-Type'];
            config.body = data;

          } else if (data instanceof Blob) {
            delete config.headers['Content-Type'];
            config.body = data;

          } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            delete config.headers['Content-Type'];
            config.body = data;

          } else if (typeof data === 'object' && data !== null) {
            
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(data);

          } else if (typeof data === 'string') {
            config.headers['Content-Type'] = 'text/plain';
            config.body = data;
          }

          // 🔥 Aplicar interceptores de request
          config = this._applyRequestInterceptors(config);

          let response = null;

          if(Object.prototype.toString.call(data) !== '[object File]'){
             response = await fetch(config.url, {
              method: config.method,
              headers: config.headers,
              body: config.body,
              // ...config,
            });
          }else{
             response = await fetch(config.url,{
              method: config.method,
              body: config.body,
            })
          }

          const contentType = response.headers.get('Content-Type') || '';
          let responseData;

          if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
            responseData = await response.json();
          } else if (contentType.includes('text/')) {
            responseData = await response.text();
          } else {
            responseData = await response.blob();
          }

          let payload = {
            status: response.status,
            data: responseData,
          };

          // 🔥 Aplicar interceptores de response
          payload = this._applyResponseInterceptors(payload);
          responseData = payload;
          resolveResponse(payload);

        } catch (error) {
          // 🔥 Aplicar interceptores de error
          error = this._applyRequestErrorInterceptors(error);
          error = this._applyResponseErrorInterceptors(error);

          rejectResponse({
            status: 'network_error',
            data: {
              message: error.message || 'Network error',
            },
          });
        }
      };
      resolve(new ObservableResponse(executor));
    });
  }
}
