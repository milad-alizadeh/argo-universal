import { type Connection, createConnection } from '../state/connection';
import {
  createTRPCClient,
  type ServerClient,
} from '../trpc/create-trpc-client';

export interface OpenConnection {
  client: ServerClient['client'];
  connection: Connection;
  close: () => Promise<void>;
}

// The App's Connection to the Server: a tRPC client whose WebSocket opens only when the Connection allows each attempt.
export function openConnection(serverUrl: string): OpenConnection {
  const connection = createConnection();
  const trpc = createTRPCClient(serverUrl, connection.nextAttempt);
  connection.watch(trpc.webSocketClient.connectionState);

  return {
    client: trpc.client,
    connection,
    close: async () => {
      connection.stop();
      await trpc.close();
    },
  };
}
