import { useRouter } from 'expo-router';
import { useContext } from 'react';
import type * as React from 'react';
import {
  type AppServerState,
  type ServerHistory,
  ServerConnectionsContext,
  useAppServers,
  useAppServerStates,
  useServerHistory,
} from '#features/servers';
import { ServerDetailView, type ServerDetailLoad } from './server-detail-view';
import { dateLabel, whenLabel } from './server-times';
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
  const history = useServerHistory(serverId);

  if (!server) return { status: 'missing' };

  return {
    status: 'loaded',
    name: server.name,
    serverDevice: server.serverDevice,
    state,
    showing: lookingAt === serverId,
    ...times(server.serverDevice, history, state),
  };
}

const said = (
  at: number | undefined,
  say: (at: number, now: number) => string,
): string | undefined => (at === undefined ? undefined : say(at, Date.now()));

// The own Server is never paired with, so it has neither; a connected Server is reached now.
function times(
  own: boolean,
  history: ServerHistory,
  state: AppServerState,
): Pick<ServerDetailLoad & { status: 'loaded' }, 'lastConnected' | 'paired'> {
  if (own) return {};

  return {
    lastConnected:
      state === 'connected' ? 'Now' : said(history.lastConnectedAt, whenLabel),
    paired: said(history.pairedAt, dateLabel),
  };
}
