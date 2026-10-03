import type { QueryClient } from '@tanstack/react-query';
import { type ActorRefFrom, createActor, type InspectionEvent } from 'xstate';
import { createTRPCClient } from '../trpc/create-trpc-client';
import { connectionMachine } from './machine';

export type ConnectionActor = ActorRefFrom<typeof connectionMachine>;
export type ConnectionInspection = (inspection: InspectionEvent) => void;

// Resolves once the machine allows the attempt, and rejects once the machine stops.
function waitForAttempt(connection: ConnectionActor) {
  return new Promise<void>((resolve, reject) => {
    if (connection.getSnapshot().status !== 'active') {
      reject(new Error('The Connection is closed'));
      return;
    }
    const allowed = connection.on('connection.attemptAllowed', () => {
      settled();
      resolve();
    });
    const stopped = connection.subscribe({
      complete: () => {
        settled();
        reject(new Error('The Connection is closed'));
      },
    });
    const settled = () => {
      allowed.unsubscribe();
      stopped.unsubscribe();
    };
    connection.send({ type: 'connection.attemptRequested' });
  });
}

// The App's Connection to the Server: a tRPC client whose WebSocket opens only when the Connection machine allows it.
export function openConnection(
  serverUrl: string,
  queryClient: QueryClient,
  inspect?: ConnectionInspection,
) {
  let connection: ConnectionActor | undefined;
  const trpc = createTRPCClient(async () => {
    // wsClient asks for its first URL while it is built, before `connection` below exists.
    await Promise.resolve();
    if (!connection) throw new Error('The Connection machine was not created');
    await waitForAttempt(connection);
    return serverUrl;
  });
  const started = createActor(connectionMachine, {
    inspect,
    input: { webSocketClient: trpc.webSocketClient, queryClient },
  }).start();
  connection = started;
  return {
    client: trpc.client,
    connection: started,
    close: async () => {
      started.stop();
      await trpc.close();
    },
  };
}
