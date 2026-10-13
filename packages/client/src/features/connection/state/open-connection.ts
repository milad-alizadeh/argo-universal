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

function settleOnAttempt(
  connection: ConnectionActor,
  settle: { resolve: () => void; reject: (cause: unknown) => void },
): Subscription[] {
  return [
    connection.on('connection.attemptAllowed', () => settle.resolve()),
    connection.subscribe({
      error: settle.reject,
      complete: () => settle.reject(closedError()),
    }),
  ];
}

// Resolves once the machine allows the attempt, and rejects once the machine stops.
function waitForAttempt(connection: ConnectionActor): Promise<void> {
  if (connection.getSnapshot().status !== 'active')
    return Promise.reject(closedError());
  const subscriptions: Subscription[] = [];

  return new Promise<void>((resolve, reject) => {
    subscriptions.push(...settleOnAttempt(connection, { resolve, reject }));
    connection.send({ type: 'connection.attemptRequested' });
  }).finally(() => {
    for (const subscription of subscriptions) subscription.unsubscribe();
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

// Filled once the Connection machine exists, after the tRPC client that needs it.
type CreatedConnection = { connection?: ConnectionActor };

// The App's Connection to the Server: a tRPC client whose WebSocket opens only when the Connection machine allows it.
export function openConnection(
  serverUrl: string,
  queryClient: QueryClient,
): OpenConnection {
  const created: CreatedConnection = {};

  const trpc = createTRPCClient(serverUrl, async () => {
    // wsClient asks for its first URL while it is built, before the Connection machine below exists.
    await Promise.resolve();

    if (!created.connection)
      throw new Error('The Connection machine was not created');
    await waitForAttempt(created.connection);
  });

  const connection = startConnection(trpc.webSocketClient, queryClient);
  created.connection = connection;

  return openedConnection(connection, trpc);
}
