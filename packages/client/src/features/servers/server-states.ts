import { useContext, useMemo, useSyncExternalStore } from 'react';
import { ServerConnectionsContext } from './server-connections';
import { type ServerStates, ServerStatesStore } from './server-states-store';

/*
 * Every Server's state for the list: a Server with no Connection — none has been opened for it, because this Device
 * has no address for it — is absent, which reads as unreachable.
 */
export function useAppServerStates(): ServerStates {
  const connections = useContext(ServerConnectionsContext);

  const store = useMemo(
    () => new ServerStatesStore(connections),
    [connections],
  );

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
