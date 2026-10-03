import { createReadStream } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { z } from 'zod';

export interface HttpRoutesOptions {
  blobsFolder: string;
  version: string;
  startedAt: string;
}

// A blob id is the sha256 of its content.
const BlobId = z.string().regex(/^[0-9a-f]{64}$/);
const blobPath = /^\/blobs\/([^/]+)$/;

const sendJson = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

// Plain HTTP serves only /health and /blobs/:id (ADR 0002); tRPC runs over the WebSocket.
export function createHttpRoutes(options: HttpRoutesOptions) {
  return (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }
    if (url.pathname === '/health') {
      sendJson(response, 200, {
        ok: true,
        version: options.version,
        startedAt: options.startedAt,
      });
      return;
    }
    const blobId = BlobId.safeParse(url.pathname.match(blobPath)?.[1]);
    if (!blobId.success) {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }
    const stream = createReadStream(join(options.blobsFolder, blobId.data));
    stream.once('open', () => {
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      stream.pipe(response);
    });
    stream.once('error', (error: NodeJS.ErrnoException) => {
      if (response.headersSent) response.destroy(error);
      else if (error.code === 'ENOENT')
        sendJson(response, 404, { error: 'Not found' });
      else sendJson(response, 500, { error: 'Could not read blob' });
    });
  };
}
