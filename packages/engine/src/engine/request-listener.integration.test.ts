import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouterHost } from '#mocks/router';
import { createRequestGuard } from './request-guard';
import { createRequestListener } from './request-listener';
import { appRouter } from './router';

const binaryMime = 'application/octet-stream';

const infoRoute = '/trpc/system.info';
const uploadRoute = '/trpc/blob.upload';

const blobBytes = new TextEncoder().encode('blob content');
const blobId = createHash('sha256').update(blobBytes).digest('hex');

const systemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  pid: process.pid,
  name: expect.stringMatching(/\S/),
};

let home: string;
let server: Server;
let host: string;

interface HttpRequest {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
}

interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

const send = ({
  path,
  method = 'GET',
  headers = {},
  body,
}: HttpRequest): Promise<HttpResponse> =>
  new Promise<HttpResponse>((resolve, reject): void => {
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Server has no TCP address');
    const { port } = address;
    const outgoing = request(
      { host: '127.0.0.1', port, method, path, headers: { host, ...headers } },
      (response): void => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer): number => chunks.push(chunk));
        response.once('end', (): void =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    outgoing.once('error', reject);
    outgoing.end(body);
  });

// Encodes a form the way a browser's fetch does, so the request goes through node:http as bytes.
async function formRequest(
  path: string,
  form: FormData,
  origin?: string,
): Promise<HttpResponse> {
  const encoded = new Request('http://localhost', {
    method: 'POST',
    body: form,
  });
  return send({
    path,
    method: 'POST',
    headers: {
      'content-type': encoded.headers.get('content-type') ?? '',
      ...(origin ? { origin } : {}),
    },
    body: new Uint8Array(await encoded.arrayBuffer()),
  });
}

const uploadForm = (): FormData => {
  const form = new FormData();
  form.set('file', new File(['file content'], 'notes.txt'));
  return form;
};

beforeEach(async (): Promise<void> => {
  home = mkdtempSync(join(tmpdir(), 'server-request-listener-'));
  mkdirSync(join(home, 'blobs'));
  writeFileSync(join(home, 'blobs', blobId), blobBytes);
  vi.spyOn(console, 'error').mockImplementation((): void => {});

  const { context } = createRouterHost({
    blobsFolder: join(home, 'blobs'),
  });
  let listener: ReturnType<typeof createRequestListener> | undefined;
  server = createServer((incoming, outgoing): void | undefined =>
    listener?.(incoming, outgoing),
  );
  await new Promise<void>((resolve): Server =>
    server.listen(0, '127.0.0.1', (): void => resolve()),
  );
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Server has no TCP address');
  const { port } = address;
  host = `127.0.0.1:${port}`;
  listener = createRequestListener({
    guard: createRequestGuard(port),
    blobsFolder: join(home, 'blobs'),
    router: appRouter,
    createContext: () => context,
  });
});

afterEach(async (): Promise<void> => {
  const closed = new Promise((resolve): Server => server.close(resolve));
  // A keep-alive socket that turns idle after close() would hold the server open until its timeout.
  server.closeAllConnections();
  await closed;
  rmSync(home, { recursive: true, force: true });
});

describe('request listener', (): void => {
  it('streams a blob with its length', async (): Promise<void> => {
    const response = await send({ path: `/blobs/${blobId}` });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/octet-stream');
    expect(response.headers['content-length']).toBe(
      String(blobBytes.byteLength),
    );
    expect(response.body).toBe('blob content');
  });

  it('answers 404 for an unknown blob id without counting it', async (): Promise<void> => {
    const response = await send({ path: `/blobs/${'0'.repeat(64)}` });
    expect(response.status).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'Not found' });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each(['abc', blobId.toUpperCase(), '..%2F..%2Fargo.db'])(
    'answers 404 for the malformed blob id %s and counts it',
    async (id): Promise<void> => {
      const response = await send({ path: `/blobs/${id}` });
      expect(response.status).toBe(404);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(/^engine: rejected blob id .* #1$/),
      );
    },
  );

  it.each(['POST', 'HEAD', 'PUT', 'DELETE'])(
    'answers 405 to %s on a blob with Allow: GET',
    async (method): Promise<void> => {
      const response = await send({ path: `/blobs/${blobId}`, method });
      expect(response.status).toBe(405);
      expect(response.headers.allow).toBe('GET');
    },
  );

  it('answers 405 to a blob POST with a body, and serves the next request', async (): Promise<void> => {
    const response = await send({
      path: `/blobs/${blobId}`,
      method: 'POST',
      body: '{}',
    });
    expect(response.status).toBe(405);
    expect((await send({ path: `/blobs/${blobId}` })).status).toBe(200);
  });

  it('answers a tRPC query over HTTP at /trpc/', async (): Promise<void> => {
    const response = await send({ path: infoRoute });
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ result: { data: systemInfo } });
  });

  it('hands an upload body to tRPC unread', async (): Promise<void> => {
    const response = await formRequest(uploadRoute, uploadForm());
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      result: {
        data: {
          blobId:
            'e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c',
          mime: binaryMime,
          bytes: 12,
        },
      },
    });
  });

  it.each(['/health', '/'])(
    'sends %s to tRPC, which finds no procedure',
    async (path): Promise<void> => {
      const response = await send({ path });
      expect(response.status).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: { data: { code: 'NOT_FOUND' } },
      });
    },
  );

  it.each([
    ['the desktop app', 'app://app'],
    ['Expo web on localhost', 'http://localhost:8081'],
  ])(
    'lets %s call tRPC and read the answer',
    async (_name, origin): Promise<void> => {
      const response = await formRequest(uploadRoute, uploadForm(), origin);
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
    },
  );

  it.each(['https://evil.example', 'null'])(
    'refuses a tRPC call from the Origin %s and counts it',
    async (origin): Promise<void> => {
      const response = await formRequest(uploadRoute, uploadForm(), origin);
      expect(response.status).toBe(403);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        `engine: rejected Origin ${JSON.stringify(origin)} #1`,
      );
    },
  );

  it.each([`/blobs/${blobId}`, infoRoute])(
    'answers 403 to %s from another Host and counts it',
    async (path): Promise<void> => {
      const response = await send({
        path,
        headers: { host: 'evil.example:7337' },
      });
      expect(response.status).toBe(403);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        'engine: rejected Host "evil.example:7337" #1',
      );
    },
  );

  it('answers 403 to a Host that is not a plain host and port', async (): Promise<void> => {
    const response = await send({
      path: infoRoute,
      headers: { host: `evil.example@${host}` },
    });
    expect(response.status).toBe(403);
  });
});
