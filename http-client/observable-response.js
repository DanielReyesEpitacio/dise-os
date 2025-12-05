export default class ObservableResponse {

  constructor(executor,responseData = null) {
    this.handlers = {};
    this.anyHandler = null;
    this.loadingStartHandler = null;
    this.loadingEndHandler = null;
    this.timeoutId = null;
    this.retryCount = 0;
    this.maxRetries = 0;

    this.catchHandler = null;
    this.finallyHandler = null;

    this._responsePromise = new Promise((res,rej)=>{
      this._resolvePromise = res;
      this._rejectPromise = rej;
    })

    if (this.loadingStartHandler) this.loadingStartHandler();

    // Guardar executor por si hay retry
    this.retryExecutor = executor;

    executor(this._resolve.bind(this), this._reject.bind(this));
  }

  _safeExecute(callback, data) {
    try {
      callback?.(data);
    } catch (err) {
      this.catchHandler?.(err);
    } finally {
      this.finallyHandler?.();
    }
  }

  _resolve(response) {
    clearTimeout(this.timeoutId);
    const handler = this.handlers[response.status] ||
        (response.status >= 200 && response.status < 300 ? this.handlers['2xx'] : null);

    this._resolvePromise(response);

    if (handler) {
      this._safeExecute(handler, response.data);
    } else if (this.anyHandler) {
      this._safeExecute(this.anyHandler, response);
    } else {
      this.finallyHandler?.(); // Si no hay callback, ejecutar finally igualmente
    }

    if (this.loadingEndHandler) this.loadingEndHandler();
  }

  _reject(error) {
    clearTimeout(this.timeoutId);

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.retryExecutor(this._resolve.bind(this), this._reject.bind(this));
      return;
    }

    this._rejectPromise(error);

    const handler = this.handlers[error.status];
    if (handler) {
      this._safeExecute(handler, error.data);
    } else if (this.anyHandler) {
      this._safeExecute(this.anyHandler, error);
    } else {
      this.finallyHandler?.();
    }

    if (this.loadingEndHandler) this.loadingEndHandler();
  }

  onStatus(status, callback) {
    this.handlers[status] = callback;
    return this;
  }

  onOk(callback) {
    this.handlers['2xx'] = callback;
    return this;
  }

  //Se ejecuta cuando no hay un manejador para la response dada
  onStatusAny(callback) {
    this.anyHandler = callback;
    return this;
  }

  onLoadingStart(callback) {
    this.loadingStartHandler = callback;
    return this;
  }

  onLoadingEnd(callback) {
    this.loadingEndHandler = callback;
    return this;
  }

  timeout(ms) {
    this.timeoutId = setTimeout(() => {
      this._reject({ status: 'timeout', data: { message: 'Timeout' } });
    }, ms);
    return this;
  }

  retry(times) {
    this.maxRetries = times;
    return this;
  }

  catch(callback) {
    this.catchHandler = callback;
    return this;
  }

  finally(callback) {
    this.finallyHandler = callback;
    return this;
  }

  response(){
    return this._responsePromise;
  }

}
