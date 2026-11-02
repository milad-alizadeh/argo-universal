import type { IncomingMessage, Server } from 'node:http';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer, type VerifyClientCallbackAsync } from 'ws';
import { createRpcContext, type RpcContext } from '../rpc';
import type { ServerListener } from './network-listener';
import { provenIdentity } from './proven-caller';
import { bearerToken, type RequestGuard } from './request-guard';
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
      connectionContext(input.guard, req, info.connectionParams),
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

// A browser attaches `Origin` to every upgrade, so a page elsewhere is refused at the handshake whatever name it dialled (ADR-0045). The upgrade admits nobody: the address it arrived on proves nothing (#1696).
function verifyUpgrade(guard: RequestGuard): VerifyClientCallbackAsync {
  return ({ req }, callback): void => {
    callback(
      guard.allowsHandshake(req.headers.origin),
      forbiddenStatus,
      'Forbidden',
    );
  };
}

/*
 * Who the Connection is, decided once its parameters have arrived, which is the first point at which a caller with no page of its own can have shown a token (ADR-0044).
 * A Connection that proved a paired Device at the handshake keeps that Device; one that proved nothing reaches no procedure, so a caller that sends neither an Origin this Server serves nor a token the Server issued is served nothing.
 */
function connectionContext(
  guard: RequestGuard,
  request: IncomingMessage,
  params: Record<string, string | undefined> | null | undefined,
): RpcContext {
  const token = bearerToken(request.headers) ?? params?.['token'];

  const identity = provenIdentity(request.socket, (): boolean =>
    guard.allowsConnection({ origin: request.headers.origin, token }),
  );

  return { ...createRpcContext(request.socket, params, identity), token };
}
