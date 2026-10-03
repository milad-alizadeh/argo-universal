import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpApp } from './http-app';
import { createRequestGuard } from './request-guard';

const host = '127.0.0.1:7337';
const blobBytes = new TextEncoder().encode('blob content');
const blobId = createHash('sha256').update(blobBytes).digest('hex');

let home: string;
let app: ReturnType<typeof createHttpApp>;

const send = (path: string, init: RequestInit = {}) =>
  app.request(path, { ...init, headers: { host, ...init.headers } });

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'server-http-app-'));
  mkdirSync(join(home, 'blobs'));
  writeFileSync(join(home, 'blobs', blobId), blobBytes);
  app = createHttpApp({
    guard: createRequestGuard(7337),
    blobsFolder: join(home, 'blobs'),
    version: '1.2.3',
    startedAt: '2026-10-03T12:00:00.000Z',
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(home, { recursive: true, force: true });
});

describe('http app', () => {
  it('answers /health with the version and start time', async () => {
    const response = await send('/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({
      ok: true,
      version: '1.2.3',
      startedAt: '2026-10-03T12:00:00.000Z',
    });
  });

  it('streams a blob with its length', async () => {
    const response = await send(`/blobs/${blobId}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'application/octet-stream',
    );
    expect(response.headers.get('content-length')).toBe(
      String(blobBytes.byteLength),
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(blobBytes);
  });

  it('answers 404 for an unknown blob id without counting it', async () => {
    const response = await send(`/blobs/${'0'.repeat(64)}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each(['abc', blobId.toUpperCase(), '..%2F..%2Fargo.db'])(
    'answers 404 for the malformed blob id %s and counts it',
    async (id) => {
      const response = await send(`/blobs/${id}`);
      expect(response.status).toBe(404);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(/^worker: rejected blob id .* #1$/),
      );
    },
  );

  it.each(['POST', 'HEAD', 'PUT', 'DELETE'])(
    'answers 405 to %s with Allow: GET',
    async (method) => {
      const response = await send('/health', { method });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET');
    },
  );

  it('answers 404 for an unknown path', async () => {
    const response = await send('/trpc');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('answers 403 to another Host and counts it', async () => {
    const response = await app.request('/health', {
      headers: { host: 'evil.example:7337' },
    });
    expect(response.status).toBe(403);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'worker: rejected Host "evil.example:7337" #1',
    );
  });
});
