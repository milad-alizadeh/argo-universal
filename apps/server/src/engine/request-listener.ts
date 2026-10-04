import { open } from 'node:fs/promises';
import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'node:http';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { AnyTRPCRouter, inferRouterContext } from '@trpc/server';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { z } from 'zod';
import type { RequestGuard } from './request-guard';

export interface RequestListenerOptions<Router extends AnyTRPCRouter> {
  guard: RequestGuard;
  blobsFolder: string;
  router: Router;
  createContext: () => inferRouterContext<Router>;
}

// A blob id is the sha256 of its content, so it cannot name a path outside the blobs folder.
const BlobId = z.string().regex(/^[0-9a-f]{64}$/);
const blobUrlPattern = /^\/blobs\/([^/?]*)(\?.*)?$/;

const openBlob = (path: string) =>
  open(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });

const answerError = (
  response: ServerResponse,
  status: number,
  error: string,
  headers: Record<string, string> = {},
) => {
  response.writeHead(status, {
    'content-type': 'application/json',
    ...headers,
  });
  response.end(JSON.stringify({ error }));
};

async function streamBlob(
  options: { guard: RequestGuard; blobsFolder: string },
  id: string,
  response: ServerResponse,
) {
  const blobId = BlobId.safeParse(id);
  if (!blobId.success) {
    options.guard.report('blob id', id);
    return answerError(response, 404, 'Not found');
  }
  const file = await openBlob(join(options.blobsFolder, blobId.data));
  if (!file) return answerError(response, 404, 'Not found');
  const stats = await file.stat().catch(async (error: unknown) => {
    await file.close();
    throw error;
  });
  if (!stats.isFile()) {
    await file.close();
    return answerError(response, 404, 'Not found');
  }
  response.writeHead(200, {
    'content-type': 'application/octet-stream',
    'content-length': String(stats.size),
  });
  // The read stream closes the file when it ends or fails.
  await pipeline(file.createReadStream(), response).catch(
    (error: NodeJS.ErrnoException) => {
      // A client that closes the socket before the end, such as an image scrolled away, is no Engine error.
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
    },
  );
}

// Plain HTTP serves only GET /blobs/:id; every other request is a tRPC call at /trpc/ (ADR 0002).
export function createRequestListener<Router extends AnyTRPCRouter>(
  options: RequestListenerOptions<Router>,
): RequestListener {
  const { guard } = options;
  const handleTRPC = createHTTPHandler({
    router: options.router,
    createContext: options.createContext,
    basePath: '/trpc/',
  });

  const handleBlob = (
    id: string,
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    if (request.method !== 'GET')
      return answerError(response, 405, 'Method not allowed', { allow: 'GET' });
    streamBlob(options, id, response).catch((error: unknown) => {
      console.error(`engine: ${String(error)}`);
      if (response.headersSent) response.destroy();
      else answerError(response, 500, 'Internal error');
    });
  };

  return (request, response) => {
    if (!guard.allowsRequest({ host: request.headers.host }))
      return answerError(response, 403, 'Forbidden');
    const blob = blobUrlPattern.exec(request.url ?? '');
    if (blob) return handleBlob(blob[1] ?? '', request, response);
    const { origin } = request.headers;
    if (!guard.allowsOrigin(origin))
      return answerError(response, 403, 'Forbidden');
    // A web App or the desktop app is on another origin, so it may read the answer only with this header.
    if (origin) response.setHeader('access-control-allow-origin', origin);
    // tRPC reads the body itself, by its Content-Type, so nothing here touches it.
    handleTRPC(request, response);
  };
}
