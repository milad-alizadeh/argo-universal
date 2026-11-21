import type { HttpRequest } from './http-exchange';
import { multipartBody } from './multipart-body';

// Nothing is ever fetched from this name; it only gives a path somewhere to be relative to.
const channelBase = 'https://argo.channel';

const absolute = (input: RequestInfo | URL): string =>
  new URL(input instanceof Request ? input.url : input, channelBase).href;

/*
 * A `fetch` call as the bytes a channel carries. `Request` reads every body but a form: React Native's cannot read one as bytes, so a form is written here and left out of the `Request`.
 */
export async function channelRequest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  randomBytes: (length: number) => Uint8Array,
): Promise<HttpRequest> {
  const form =
    init?.body instanceof FormData
      ? await multipartBody(init.body, randomBytes)
      : undefined;

  const request = new Request(
    absolute(input),
    form ? { ...init, body: undefined } : init,
  );

  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers);

  return {
    method: request.method,
    path: url.pathname + url.search,
    headers: form ? { ...headers, 'content-type': form.contentType } : headers,
    body: form?.bytes ?? new Uint8Array(await request.arrayBuffer()),
  };
}
