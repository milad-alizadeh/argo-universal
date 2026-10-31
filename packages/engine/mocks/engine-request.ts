import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { request, type RequestOptions } from 'node:http';
import { join } from 'node:path';
import { makeResolvedTempFolderSync } from '@repo/mocks/fs/resolved-temp-folder';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { readHttpResponse, type HttpResponse } from './http-response';

export const binaryMime = 'application/octet-stream';

export const infoRoute = '/trpc/system.info';

export const uploadRoute = '/trpc/blob.upload';

export const blobBytes = new TextEncoder().encode('blob content');

export const blobId = createHash('sha256').update(blobBytes).digest('hex');

export const systemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  pid: process.pid,
  name: expect.stringMatching(/\S/),
};

let home: string;

let stopEngine: () => Promise<void>;

let port: number;

let host: string;

interface HttpRequest {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
}

export const sendHttpRequest = (input: HttpRequest): Promise<HttpResponse> =>
  new Promise<HttpResponse>((resolve, reject): void => {
    const outgoing = request(requestOptions(input), (response): void => {
      void readHttpResponse(response).then(resolve, reject);
    });

    outgoing.once('error', reject);
    outgoing.end(input.body);
  });

// Encodes a form the way a browser's fetch does, so the request goes through node:http as bytes.
export async function sendFormRequest(
  requestPath: string,
  formData: FormData,
  origin?: string,
): Promise<HttpResponse> {
  const encoded = encodeForm(formData);

  return sendHttpRequest({
    path: requestPath,
    method: 'POST',
    headers: uploadHeaders(encoded, origin),
    body: new Uint8Array(await encoded.arrayBuffer()),
  });
}

export const createUploadForm = (): FormData => {
  const form = new FormData();
  form.set('file', new File(['file content'], 'notes.txt'));

  return form;
};

beforeEach(async (): Promise<void> => {
  home = makeResolvedTempFolderSync('server-request-listener-');
  mkdirSync(join(home, 'blobs'));
  writeFileSync(join(home, 'blobs', blobId), blobBytes);
  vi.spyOn(console, 'error').mockImplementation((): void => {});

  const started = await startEngineTestHost({ home });
  stopEngine = started.stop;
  port = Number(new URL(started.url).port);
  host = `127.0.0.1:${port}`;
});

afterEach(async (): Promise<void> => {
  await stopEngine();
  rmSync(home, { recursive: true, force: true });
});

// A type alias, not an interface, so it fits the request's string header map.
type UploadHeaders = {
  'content-type': string;
  origin?: string;
};

function uploadHeaders(encoded: Request, origin?: string): UploadHeaders {
  const headers: UploadHeaders = {
    'content-type': encoded.headers.get('content-type') ?? '',
  };

  if (origin) headers.origin = origin;

  return headers;
}

function requestOptions({
  path,
  method = 'GET',
  headers = {},
}: HttpRequest): RequestOptions {
  return {
    host: '127.0.0.1',
    port,
    method,
    path,
    headers: { host, ...headers },
  };
}

function encodeForm(body: FormData): Request {
  return new Request('http://localhost', { method: 'POST', body });
}
