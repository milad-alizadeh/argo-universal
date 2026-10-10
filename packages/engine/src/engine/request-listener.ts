import type { FileHandle } from 'fs/promises';
import { open } from 'node:fs/promises';
import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'node:http';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { maxBlobUploadBytes } from '@repo/contracts';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { z } from 'zod';
import type { RequestGuard } from './request-guard';
import type { AppRouter } from './router';

export interface RequestListenerOptions {
  guard: RequestGuard;
  blobsFolder: string;
  router: AppRouter;
}

// A blob id is the sha256 of its content, so it cannot name a path outside the blobs folder.
const BlobId = z.string().regex(/^[0-9a-f]{64}$/);
const blobUrlPattern = /^\/blobs\/([^/?]*)(\?.*)?$/;
// 64 KiB.
const multipartHeaderBytes = 65_536;
// The largest upload plus room for its multipart headers; tRPC stops reading a longer body.
const maxBodySize = maxBlobUploadBytes + multipartHeaderBytes;
const httpStatus = {
  ok: 200,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  internalError: 500,
};

const openBlob = (path: string): Promise<void | FileHandle> =>
  open(path).catch((error: NodeJS.ErrnoException): void => {
    if (error.code === 'ENOENT') return;
    throw error;
  });

const answerError = (
  response: ServerResponse,
  status: number,
  error: string,
  headers: Record<string, string> = {},
): void => {
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
): Promise<void> {
  const blobId = BlobId.safeParse(id);
  if (!blobId.success) {
    options.guard.report('blob id', id);
    return answerError(response, httpStatus.notFound, 'Not found');
  }
  const file = await openBlob(join(options.blobsFolder, blobId.data));
  if (!file) return answerError(response, httpStatus.notFound, 'Not found');
  const stats = await file
    .stat()
    .catch(async (error: unknown): Promise<never> => {
      await file.close();
      throw error;
    });
  if (!stats.isFile()) {
    await file.close();
    return answerError(response, httpStatus.notFound, 'Not found');
  }
  response.writeHead(httpStatus.ok, {
    'content-type': 'application/octet-stream',
    'content-length': String(stats.size),
  });
  // The read stream closes the file when it ends or fails.
  await pipeline(file.createReadStream(), response).catch(
    (error: NodeJS.ErrnoException): void => {
      // A client that closes the socket before the end, such as an image scrolled away, is no Engine error.
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
    },
  );
}

// Plain HTTP serves only GET /blobs/:id; every other request is a tRPC call at /trpc/ (ADR 0002).
export function createRequestListener(
  options: RequestListenerOptions,
): RequestListener {
  const { guard } = options;
  const handleTRPC = createHTTPHandler({
    router: options.router,
    basePath: '/trpc/',
    maxBodySize,
  });

  const handleBlob = (
    id: string,
    request: IncomingMessage,
    response: ServerResponse,
  ): void => {
    if (request.method !== 'GET')
      return answerError(
        response,
        httpStatus.methodNotAllowed,
        'Method not allowed',
        { allow: 'GET' },
      );
    streamBlob(options, id, response).catch((error: unknown): void => {
      console.error(`engine: ${String(error)}`);
      if (response.headersSent) response.destroy();
      else answerError(response, httpStatus.internalError, 'Internal error');
    });
  };

  return (request, response): void => {
    if (!guard.allowsRequest({ host: request.headers.host }))
      return answerError(response, httpStatus.forbidden, 'Forbidden');
    const blob = blobUrlPattern.exec(request.url ?? '');
    if (blob) return handleBlob(blob[1] ?? '', request, response);
    const { origin } = request.headers;
    if (!guard.allowsOrigin(origin))
      return answerError(response, httpStatus.forbidden, 'Forbidden');
    // A web App or the desktop app is on another origin, so it may read the answer only with this header.
    if (origin) response.setHeader('access-control-allow-origin', origin);
    // tRPC reads the body itself, by its Content-Type, so nothing here touches it.
    handleTRPC(request, response);
  };
}
