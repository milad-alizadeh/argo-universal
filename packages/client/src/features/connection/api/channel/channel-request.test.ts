import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { nodeRandomBytes } from '../../../../../mocks/node-channel-platform';
import { textBytes } from './bytes';
import { channelRequest } from './channel-request';
import type { HttpRequest } from './http-exchange';

const WebRequest = Request;

// The `Request` a phone has: React Native's polyfill, which throws this when asked for a form's bytes.
class PhoneRequest extends WebRequest {
  private readonly form: boolean;

  public constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    this.form = init?.body instanceof FormData;
  }

  public override async arrayBuffer(): Promise<ArrayBuffer> {
    if (this.form) throw new Error('could not read FormData body as blob');

    return super.arrayBuffer();
  }
}

beforeEach(() => {
  vi.stubGlobal('Request', PhoneRequest);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// The one file the Server reads from the request's bytes.
async function uploadedFile(request: HttpRequest): Promise<File> {
  const read = new WebRequest('https://argo.channel/', {
    method: request.method,
    headers: request.headers,
    body: request.body && new Uint8Array(request.body),
  });

  const [file, ...others] = (await read.formData()).getAll('file');

  if (!(file instanceof File) || others.length > 0)
    throw new Error('The Server read no single file');

  return file;
}

const upload = (form: FormData): Promise<HttpRequest> =>
  channelRequest(
    '/trpc/blob.upload',
    { method: 'POST', body: form },
    nodeRandomBytes,
  );

it('writes a form on a phone, whose Request cannot read one', async () => {
  const form = new FormData();
  form.set('file', new Blob(['png'], { type: 'image/png' }), 'my "image".png');

  const request = await upload(form);
  const file = await uploadedFile(request);

  expect(request).toMatchObject({ method: 'POST', path: '/trpc/blob.upload' });
  expect(file).toMatchObject({ name: 'my "image".png', type: 'image/png' });
  expect(await file.text()).toBe('png');
});

it("writes a file's bytes as they are when they look like a boundary", async () => {
  const content = '--\r\n----ArgoFormBoundary\r\n--';
  const form = new FormData();
  form.set('file', new Blob([content]), 'notes.txt');

  const file = await uploadedFile(await upload(form));

  expect(await file.text()).toBe(content);
});

it('still reads a body that is not a form through Request', async () => {
  const request = await channelRequest(
    '/trpc/system.info?batch=1',
    { method: 'POST', body: 'text', headers: { 'x-argo': 'yes' } },
    nodeRandomBytes,
  );

  expect(request).toMatchObject({
    path: '/trpc/system.info?batch=1',
    headers: { 'x-argo': 'yes' },
    body: textBytes('text'),
  });
});
