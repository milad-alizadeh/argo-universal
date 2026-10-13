import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { sendHttpRequest as sendRequest } from '#mocks/http-client';

const blobBytes = new TextEncoder().encode('blob content');
const blobId = createHash('sha256').update(blobBytes).digest('hex');
let url: string;
const sendHttpRequest = (
  options: Parameters<typeof sendRequest>[1],
): ReturnType<typeof sendRequest> => sendRequest(url, options);

beforeEach(async (): Promise<void> => {
  const started = await startEngineTestHost();
  mkdirSync(started.blobsFolder, { recursive: true });
  writeFileSync(join(started.blobsFolder, blobId), blobBytes);
  url = started.url;
  vi.spyOn(console, 'error').mockImplementation((): void => {});
});

it('streams a blob with its length', async (): Promise<void> => {
  const response = await sendHttpRequest({ path: `/blobs/${blobId}` });
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toBe('application/octet-stream');
  expect(response.headers['content-length']).toBe(String(blobBytes.byteLength));
  expect(response.body).toBe('blob content');
});

it('answers 404 for an unknown blob id without counting it', async (): Promise<void> => {
  const response = await sendHttpRequest({
    path: `/blobs/${'0'.repeat(64)}`,
  });
  expect(response.status).toBe(404);
  expect(JSON.parse(response.body)).toEqual({ error: 'Not found' });
  expect(console.error).not.toHaveBeenCalled();
});

it.each(['abc', blobId.toUpperCase(), '..%2F..%2Fargo.db'])(
  'answers 404 for the malformed blob id %s and counts it',
  async (id): Promise<void> => {
    const response = await sendHttpRequest({ path: `/blobs/${id}` });
    expect(response.status).toBe(404);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^engine: rejected blob id .* #1$/),
    );
  },
);

it.each(['POST', 'HEAD', 'PUT', 'DELETE'])(
  'answers 405 to %s on a blob with Allow: GET',
  async (method): Promise<void> => {
    const response = await sendHttpRequest({
      path: `/blobs/${blobId}`,
      method,
    });
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET');
  },
);

it('answers 405 to a blob POST with a body, and serves the next request', async (): Promise<void> => {
  const response = await sendHttpRequest({
    path: `/blobs/${blobId}`,
    method: 'POST',
    body: '{}',
  });
  expect(response.status).toBe(405);
  expect((await sendHttpRequest({ path: `/blobs/${blobId}` })).status).toBe(
    200,
  );
});
