import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'node:http';
import { maxBlobUploadBytes } from '@repo/contracts';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import type { RpcContext } from '../rpc/connection';
import { handleAsset, type AssetReader } from './asset-response';
import { streamBlob } from './blob-response';
import { answerError, httpStatus, reportHttpFailure } from './http-response';
import type { RequestGuard } from './request-guard';
import type { AppRouter } from './router';

export interface RequestListenerOptions {
  guard: RequestGuard;
  blobsFolder: string;
  router: AppRouter;
  readAsset: AssetReader;
}

const blobUrlPattern = /^\/blobs\/([^/?]*)(\?.*)?$/;

// The largest upload plus 64 KiB for multipart headers; tRPC stops reading a longer body.
const multipartHeaderBytes = 65_536;

const maxBodySize = maxBlobUploadBytes + multipartHeaderBytes;

// Plain HTTP serves only GET /blobs/:id; every other request is a tRPC call at /trpc/ (ADR 0002).
export function createRequestListener(
  options: RequestListenerOptions,
): RequestListener {
  const handleTRPC = createGuardedTrpc(options);

  return (request, response): void => {
    if (
      !options.guard.allowsRequest({
        host: request.headers.host,
        remoteAddress: request.socket.remoteAddress,
      })
    )
      return answerError(response, httpStatus.forbidden, 'Forbidden');
    dispatchRequest({ options, handleTRPC }, request, response);
  };
}

function dispatchRequest(
  sources: { options: RequestListenerOptions; handleTRPC: RequestListener },
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const path = request.url ?? '';

  if (path.startsWith('/plugin-assets/'))
    return handleAsset(sources.options, request, response);
  dispatchCoreRequest(sources, request, response);
}

function dispatchCoreRequest(
  sources: { options: RequestListenerOptions; handleTRPC: RequestListener },
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const blob = blobUrlPattern.exec(request.url ?? '');

  if (blob)
    return handleBlob(
      { ...sources.options, id: matchedBlobId(blob) },
      request,
      response,
    );
  sources.handleTRPC(request, response);
}

function createGuardedTrpc(options: RequestListenerOptions): RequestListener {
  const handleTRPC = createHTTPHandler({
    router: options.router,
    createContext: httpContext,
    basePath: '/trpc/',
    maxBodySize,
  });

  return (request, response): void => {
    const { origin } = request.headers;

    if (!options.guard.allowsOrigin(origin))
      return answerError(response, httpStatus.forbidden, 'Forbidden');

    // A web App or desktop app on another origin may read the answer only with this header.
    if (origin) response.setHeader('access-control-allow-origin', origin);
    handleTRPC(request, response);
  };
}

function handleBlob(
  options: RequestListenerOptions & { id: string },
  request: IncomingMessage,
  response: ServerResponse,
): void {
  if (request.method !== 'GET')
    return answerError(response, httpStatus.methodNotAllowed, {
      message: 'Method not allowed',
      headers: { allow: 'GET' },
    });
  streamBlob(options, options.id, response).catch((cause: unknown): void =>
    reportHttpFailure(response, cause),
  );
}

function matchedBlobId(match: RegExpExecArray): string {
  return match[1] ?? '';
}

function httpContext({ req }: CreateHTTPContextOptions): RpcContext {
  return { token: req.headers.authorization?.replace(/^Bearer /, '') };
}
