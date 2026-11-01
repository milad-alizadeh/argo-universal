import { errorToast } from '@repo/kit/error-toast';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useContext } from 'react';
import {
  ServerConnectionsContext,
  type ServerConnections,
  useAppServers,
} from '#features/servers';

/*
 * Unpairs this Device from one Server. A Server that answers is told, so it deletes this Device and closes its Connection; one that cannot be reached cannot be told, and is only removed from this list.
 * Either way the Server leaves the list once, and a Device that could not be told fails loudly rather than leaving the list wrong.
 */
export function useUnpairServer(id: string, onDone: () => void): () => void {
  const connection = useContext(ServerConnectionsContext).get(id);
  const { remove } = useAppServers();

  const unpair = useMutation({
    mutationFn: () => tellServer(connection),
    onSuccess: () => {
      remove(id);
      onDone();
    },
  });

  useErrorToast(errorToast('Could not unpair from the Server', unpair.error));

  return () => unpair.mutate();
}

async function tellServer(
  connection: ReturnType<ServerConnections['get']>,
): Promise<void> {
  if (connection?.connection.state() === 'open')
    await connection.client.devices.unpairSelf.mutate();
}
