import type { QueryClient } from '@tanstack/react-query';
import { type ActorRefFrom, createActor, type Subscription } from 'xstate';
import {
  createTRPCClient,
  type ServerClient,
} from '../trpc/create-trpc-client';
import { connectionMachine } from './machine';

export interface OpenConnection {
  client: ServerClient['client'];
  connection: ReturnType<typeof createActor<typeof connectionMachine>>;
  close: () => Promise<void>;
}

export type ConnectionActor = ActorRefFrom<typeof connectionMachine>;

const closedError = (): Error => new Error('The Connection is closed');

function rejectOnStop(
  connection: ConnectionActor,
  settled: PromiseWithResolvers<void>,
): Subscription {
  return connection.subscribe({
    error: settled.reject,
    complete: () => settled.reject(closedError()),
  });
}

// Resolves once the machine allows the attempt, and rejects once the machine stops.
function waitForAttempt(connection: ConnectionActor): Promise<void> {
  if (connection.getSnapshot().status !== 'active')
    return Promise.reject(closedError());
  const settled = Promise.withResolvers<void>();
  const allowed = connection.on('connection.attemptAllowed', () =>
    settled.resolve(),
  );
  const stopped = rejectOnStop(connection, settled);
  connection.send({ type: 'connection.attemptRequested' });
  return settled.promise.finally(() => {
    allowed.unsubscribe();
    stopped.unsubscribe();
  });
}

function startConnection(
  webSocketClient: ServerClient['webSocketClient'],
  queryClient: QueryClient,
): OpenConnection['connection'] {
  return createActor(connectionMachine, {
    input: { webSocketClient, queryClient },
  }).start();
}

function openedConnection(
  connection: OpenConnection['connection'],
  trpc: ServerClient,
): OpenConnection {
  return {
    client: trpc.client,
    connection,
    close: async () => {
      connection.stop();
      await trpc.close();
    },
  };
}

// The App's Connection to the Server: a tRPC client whose WebSocket opens only when the Connection machine allows it.
export function openConnection(
  serverUrl: string,
  queryClient: QueryClient,
): OpenConnection {
  // wsClient asks for its first URL while it is built, before the Connection machine exists.
  const created = Promise.withResolvers<ConnectionActor>();
  const trpc = createTRPCClient(serverUrl, async () =>
    waitForAttempt(await created.promise),
  );
  const connection = startConnection(trpc.webSocketClient, queryClient);
  created.resolve(connection);
  return openedConnection(connection, trpc);
}
