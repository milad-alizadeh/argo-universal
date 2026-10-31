import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer, type VerifyClientCallbackAsync } from 'ws';
import {
  admitAs,
  createRpcContext,
  identityOf,
  serverDeviceIdentity,
} from '../rpc';
import type { ServerListener } from './network-listener';
import type { RequestGuard } from './request-guard';
import type { AppRouter } from './router';

const forbiddenStatus = 403;

export interface HttpConnectionsInput {
  readonly requests: Server;
  readonly router: AppRouter;
  readonly guard: RequestGuard;
  readonly listener: ServerListener;
}

export function connectWebSockets(
  input: HttpConnectionsInput,
): () => Promise<void> {
  // Attached after listen: ws re-emits the server's 'error', so a failed listen would throw from it.
  const webSocketServer = createWebSocketServer(input);

  const handler = applyWSSHandler({
    wss: webSocketServer,
    router: input.router,
    createContext: ({ req, info }) =>
      createRpcContext(req.socket, info.connectionParams),
    keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5000 },
  });

  return closeConnections({ handler, webSocketServer, input });
}

type HttpConnections = {
  handler: ReturnType<typeof applyWSSHandler>;
  webSocketServer: WebSocketServer;
  input: HttpConnectionsInput;
};

function closeConnections({
  handler,
  webSocketServer,
  input,
}: HttpConnections): () => Promise<void> {
  // The front door waits for upgraded sockets, so the WebSocket clients go first.
  return async (): Promise<void> => {
    handler.broadcastReconnectNotification();

    for (const client of webSocketServer.clients) client.terminate();
    webSocketServer.close();
    const closed = input.listener.close();
    // The close would otherwise wait out the keep-alive timeout of an HTTP socket that turns idle later.
    input.requests.closeAllConnections();
    await closed;
  };
}

export function admitClose(
  commandAdmission: AbortController,
  closeConnections: () => Promise<void>,
): () => Promise<void> {
  let closing: Promise<void> | undefined;

  return (): Promise<void> => {
    commandAdmission.abort();
    closing ??= closeConnections();

    return closing;
  };
}

function createWebSocketServer({
  requests,
  guard,
}: HttpConnectionsInput): WebSocketServer {
  const webSocketServer = new WebSocketServer({
    server: requests,
    verifyClient: verifyUpgrade(guard),
  });

  // ws forwards the HTTP server's 'error' here, and an emitter with no listener throws it: a listen that fails after start-up (the switch moving the bind) must reach the caller that awaits it instead.
  webSocketServer.on('error', (error): void => {
    guard.report('Server error', error.message);
  });

  return webSocketServer;
}

/*
 * A WebSocket is this computer's own App or nothing: a browser attaches `Origin` to every upgrade, so an upgrade the allowlist takes came from a page on this computer, and one from a page elsewhere is refused whatever name it dialled (ADR-0045).
 * That is what admits the Connection as the Server Device, in place of the address it came from (#1696).
 */
function verifyUpgrade(guard: RequestGuard): VerifyClientCallbackAsync {
  return ({ req }, callback): void => {
    const allowed = guard.allowsUpgrade(req.headers.origin);

    if (allowed) admitUpgrade(req.socket);
    callback(allowed, forbiddenStatus, 'Forbidden');
  };
}

// A Connection that proved a Device at the handshake keeps that identity: an upgrade inside a channel never widens it to the Server Device.
function admitUpgrade(socket: Socket): void {
  if (!identityOf(socket)) admitAs(socket, serverDeviceIdentity);
}
