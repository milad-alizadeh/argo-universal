import type { RequestListener } from 'node:http';
import { maxBlobUploadBytes } from '@repo/contracts';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { createBlobResponse } from './blob-response';
import { answerError, httpStatus } from './http-response';
import type { RequestGuard } from './request-guard';
import type { AppRouter } from './router';

export interface RequestListenerOptions {
  guard: RequestGuard;
  blobsFolder: string;
  router: AppRouter;
}

const blobUrlPattern = /^\/blobs\/([^/?]*)(\?.*)?$/;
// The largest upload plus 64 KiB for multipart headers.
const multipartHeaderBytes = 65_536;
const maxBodySize = maxBlobUploadBytes + multipartHeaderBytes;

function createTRPCResponse(options: RequestListenerOptions): RequestListener {
  const handleTRPC = createHTTPHandler({
    router: options.router,
    basePath: '/trpc/',
    maxBodySize,
  });
  return (request, response): void => {
    const { origin } = request.headers;
    if (!options.guard.allowsOrigin(origin))
      return answerError(response, httpStatus.forbidden, 'Forbidden');
    // The web App or desktop App may read its cross-origin answer.
    if (origin) response.setHeader('access-control-allow-origin', origin);
    // tRPC reads the body itself by its Content-Type.
    handleTRPC(request, response);
  };
}

const blobPath = (url = ''): RegExpExecArray | null => blobUrlPattern.exec(url);
const blobMatchId = (match: RegExpExecArray): string => match[1] ?? '';

// Plain HTTP serves GET /blobs/:id; other requests go to tRPC (ADR 0002).
export function createRequestListener(
  options: RequestListenerOptions,
): RequestListener {
  const handleBlob = createBlobResponse(options);
  const handleTRPC = createTRPCResponse(options);
  return (request, response): void => {
    if (!options.guard.allowsRequest({ host: request.headers.host }))
      return answerError(response, httpStatus.forbidden, 'Forbidden');
    const blob = blobPath(request.url);
    if (blob) return handleBlob(blobMatchId(blob), request, response);
    handleTRPC(request, response);
  };
}
