import { error } from "../utils/log";

type HttpMethod = "POST" | "GET";

interface HttpRequestCallback {
  onError(response: GM.Response<undefined>): void;
  onSuccess(response: GM.Response<undefined>): void;
}

interface HttpRequestAdditionalParameters {
  anonymous?: boolean;
  fetch?: boolean;
}

abstract class AbstractHttpRequest {
  protected headers: Map<string, string>;
  protected httpMethod: HttpMethod;
  protected url: string;
  protected timeout: number;
  protected responseType: XMLHttpRequestResponseType;
  protected additionalParameters: HttpRequestAdditionalParameters;

  public constructor(
    url: string,
    responseType: XMLHttpRequestResponseType,
    additionalParameters: HttpRequestAdditionalParameters = null
  ) {
    this.url = url;
    this.httpMethod = "POST";
    this.headers = new Map<string, string>();
    this.timeout = 15000;
    this.responseType = responseType;
    this.additionalParameters = {
      anonymous: true,
      fetch: true,
      ...additionalParameters,
    };
  }

  public addHeader(key: string, value: string) {
    this.headers.set(key, value);
    return this;
  }
  public setHttpMethod(httpMethod: HttpMethod) {
    this.httpMethod = httpMethod;
    return this;
  }

  protected abstract getData(): any;

  public execute(callback: HttpRequestCallback) {
    const data = this.getData();

    const details: GM.Request<undefined> = {
      url: this.url,
      method: this.httpMethod,
      headers: Object.fromEntries(this.headers),
      data: data ? JSON.stringify(data) : null,
      timeout: this.timeout,
      responseType: this.responseType,

      onerror: callback.onError,
      onload: callback.onSuccess,
      // TODO: ontimeout
      onabort: callback.onError,
      ontimeout: callback.onError,

      ...this.additionalParameters,
    };

    GM.xmlHttpRequest(details);
  }

  public executeAsync() {
    const promise = new Promise<GM.Response<undefined>>((resolve, reject) => {
      this.execute({
        onError: reject,
        onSuccess: resolve,
      });
    });
    promise.catch(error);
    return promise;
  }
}

export class HttpRequest extends AbstractHttpRequest {
  protected body: any;

  public constructor(
    url: string,
    method: HttpMethod = "GET",
    responseType: XMLHttpRequestResponseType,
    additionalParameters: HttpRequestAdditionalParameters = null
  ) {
    super(url, responseType, additionalParameters);
    this.httpMethod = method;
  }

  public setBody(body: any) {
    this.body = body;
  }

  protected getData() {
    return this.body;
  }
}
