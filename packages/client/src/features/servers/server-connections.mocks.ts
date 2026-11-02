import type {
  Connection,
  ConnectionState,
  ServerEndpoint,
} from '#features/connection';
import { endpointKey, type HeldServer } from './open-server-connections';

export interface TestConnection extends HeldServer {
  url: string;
  closed: () => boolean;
  lose: () => void;
  // The Server answers and says it no longer knows this Device.
  refuse: () => void;
}

// Where a test's Servers answer: a name rather than an address, so no test leans on one computer's network.
export const testServerUrl = (host: string, port = 4000): string =>
  `ws://${host}:${port}`;

interface LinkState {
  reachable: boolean;
  refused: boolean;
  listeners: Set<() => void>;
}

function stateOf(link: LinkState): ConnectionState {
  if (link.refused) return 'not-allowed';

  return link.reachable ? 'open' : 'offline';
}

const testLink = (link: LinkState): Connection => ({
  state: () => stateOf(link),
  subscribe: (listener) => {
    link.listeners.add(listener);

    return () => void link.listeners.delete(listener);
  },
  nextAttempt: () => Promise.resolve(),
  watch: () => {},
  foreground: () => {},
  retry: () => {},
  refuse: () => {},
  stop: () => {},
});

const newLink = (): LinkState => ({
  reachable: true,
  refused: false,
  listeners: new Set(),
});

// A Connection to nowhere: held, closed, read for its state and listened to, which is all the stores do with a real one.
export function testConnection(endpoint: ServerEndpoint): TestConnection {
  const link = newLink();
  let open = true;

  return {
    url: endpointKey(endpoint),
    connection: testLink(link),
    closed: () => !open,
    // The Server stops answering, as a Server that is switched off does.
    lose: () => lose(link),
    refuse: () => refuse(link),
    close: () => {
      open = false;

      return Promise.resolve();
    },
  };
}

function lose(link: LinkState): void {
  link.reachable = false;

  for (const listener of link.listeners) listener();
}

function refuse(link: LinkState): void {
  link.refused = true;

  for (const listener of link.listeners) listener();
}
