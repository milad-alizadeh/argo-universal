import type { Server } from 'node:http';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer, type VerifyClientCallbackAsync } from 'ws';
import { createRpcContext } from '../rpc';
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

// Whose Connection this is was settled at the front door; the upgrade checks only that a web page in a browser is not the one asking (ADR-0045).
function verifyUpgrade(guard: RequestGuard): VerifyClientCallbackAsync {
  return ({ req }, callback): void =>
    callback(
      guard.allowsOrigin(req.headers.origin),
      forbiddenStatus,
      'Forbidden',
    );
}
