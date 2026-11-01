import { useRouter } from 'expo-router';
import { useContext } from 'react';
import type * as React from 'react';
import {
  ServerConnectionsContext,
  useAppServers,
  useAppServerStates,
} from '#features/servers';
import { ServerDetailView, type ServerDetailLoad } from './server-detail-view';
import { useUnpairServer } from './use-unpair-server';

export interface ServerDetailScreenProps {
  serverId: string;
}

// One Server's page: the same list the Servers page reads, narrowed to one row.
export function ServerDetailScreen({
  serverId,
}: ServerDetailScreenProps): React.JSX.Element {
  const back = useLeave();

  return (
    <ServerDetailView
      server={useServerDetail(serverId)}
      onShow={useShow(serverId, back)}
      onTryAgain={useTryAgain(serverId)}
      onPairAgain={usePairAgain()}
      onUnpair={useUnpairServer(serverId, back)}
      onBack={back}
    />
  );
}

function useLeave(): () => void {
  const router = useRouter();

  return () => router.back();
}

function usePairAgain(): () => void {
  const router = useRouter();

  return () => router.push('/settings/servers/add');
}

function useShow(serverId: string, done: () => void): () => void {
  const { look } = useAppServers();

  return () => {
    look(serverId);
    done();
  };
}

function useTryAgain(serverId: string): () => void {
  const connections = useContext(ServerConnectionsContext);

  return () => connections.get(serverId)?.connection.retry();
}

function useServerDetail(serverId: string): ServerDetailLoad {
  const { servers, lookingAt } = useAppServers();
  const state = useAppServerStates().get(serverId) ?? 'unreachable';
  const server = servers.find((entry) => entry.id === serverId);

  if (!server) return { status: 'missing' };

  return {
    status: 'loaded',
    name: server.name,
    serverDevice: server.serverDevice,
    state,
    showing: lookingAt === serverId,
  };
}
