import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from 'node:http';
import { maxBlobUploadBytes } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { createRpcContext, type RpcContext } from '../rpc/connection';
import {
  identityOf,
  serverDeviceIdentity,
  type RpcIdentity,
} from '../rpc/identity';
import { handleAsset, type AssetReader } from './asset-response';
import { streamBlob } from './blob-response';
import { answerError, httpStatus, reportHttpFailure } from './http-response';
import { bearerToken, type RequestGuard } from './request-guard';
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

type Dispatch = {
  options: RequestListenerOptions;
  handleTRPC: RequestListener;
};

/*
 * Serves GET /blobs/:id, Plugin assets and the tRPC calls at /trpc/ (ADR 0002), to a paired Device inside its channel and to the Server Device on loopback (ADR-0045).
 * Nothing is served to a Connection that proved neither. A route that answers bytes refuses it here, since nothing behind the route would; a tRPC call goes to the router with no identity, which no procedure serves, so the refusal comes back in tRPC's own shape (#1696).
 */
export function createRequestListener(
  options: RequestListenerOptions,
): RequestListener {
  const handleTRPC = createTrpcHandler(options);

  return (request, response): void =>
    dispatchRequest({ options, handleTRPC }, request, response);
}

/*
 * A Connection inside a channel proved its Device at the handshake; one on the loopback plain-HTTP door proved nothing by arriving there, because a web page on a name that resolves to this computer arrives there too (#1696).
 * A route that answers bytes therefore asks here, since no procedure behind it would.
 */
function dispatchRequest(
  sources: Dispatch,
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const bytes = bytesRoute(sources.options, request.url ?? '');

  if (!bytes) return sources.handleTRPC(request, response);
  answerBytes(sources.options, bytes, { request, response });
}

function answerBytes(
  options: RequestListenerOptions,
  route: RequestListener,
  { request, response }: { request: IncomingMessage; response: ServerResponse },
): void {
  if (provenIdentity(options, request)) return route(request, response);
  answerError(response, httpStatus.forbidden, 'Forbidden');
}

// The two routes that answer bytes rather than a procedure's result: a Plugin's asset, and a Blob by its id.
function bytesRoute(
  options: RequestListenerOptions,
  path: string,
): RequestListener | undefined {
  if (path.startsWith('/plugin-assets/'))
    return (request, response): void => handleAsset(options, request, response);
  const blob = blobUrlPattern.exec(path);

  if (!blob) return undefined;

  return (request, response): void =>
    handleBlob({ ...options, id: matchedBlobId(blob) }, request, response);
}

function createTrpcHandler(options: RequestListenerOptions): RequestListener {
  const handleTRPC = createHTTPHandler({
    router: options.router,
    createContext: ({ req }: CreateHTTPContextOptions): RpcContext =>
      httpContext(options, req),
    basePath: '/trpc/',
    maxBodySize,
  });

  return (request, response): void => {
    const { origin } = request.headers;

    // A web App or desktop app on an Origin of its own may read the answer only with this header, and only an Origin this Server serves gets it.
    if (origin !== undefined && options.guard.allowsOrigin(origin))
      response.setHeader('access-control-allow-origin', origin);
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

/*
 * The Device this call is from: the one the handshake named, or the Server Device when the request itself proved it.
 * A call that proved neither carries no identity and reaches no procedure (ADR-0045), except that a caller who showed a token the Server does not know is told that instead, as the CLI tells the user.
 */
function httpContext(
  options: RequestListenerOptions,
  request: IncomingMessage,
): RpcContext {
  const token = bearerToken(request.headers);
  const identity = provenIdentity(options, request);

  if (!identity && token !== undefined)
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'An Argo token is required',
    });

  return { ...createRpcContext(request.socket, undefined, identity), token };
}

const provenIdentity = (
  options: RequestListenerOptions,
  request: IncomingMessage,
): RpcIdentity | undefined =>
  identityOf(request.socket) ??
  (options.guard.allowsRequest(request) ? serverDeviceIdentity : undefined);
