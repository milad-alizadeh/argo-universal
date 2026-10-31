import type { Connection } from '#features/connection';
import type { HeldServer } from './open-server-connections';

export interface TestConnection extends HeldServer {
  url: string;
  closed: () => boolean;
  lose: () => void;
}

// Where a test's Servers answer: a name rather than an address, so no test leans on one computer's network.
export const testServerUrl = (host: string, port = 4000): string =>
  `ws://${host}:${port}`;

interface LinkState {
  reachable: boolean;
  listeners: Set<() => void>;
}

const testLink = (link: LinkState): Connection => ({
  state: () => (link.reachable ? 'open' : 'offline'),
  subscribe: (listener) => {
    link.listeners.add(listener);

    return () => void link.listeners.delete(listener);
  },
  nextAttempt: () => Promise.resolve(),
  watch: () => {},
  foreground: () => {},
  retry: () => {},
  stop: () => {},
});

// A Connection to nowhere: held, closed, read for its state and listened to, which is all the stores do with a real one.
export function testConnection(url: string): TestConnection {
  const link: LinkState = { reachable: true, listeners: new Set() };
  let open = true;

  return {
    url,
    connection: testLink(link),
    closed: () => !open,
    // The Server stops answering, as a Server that is switched off does.
    lose: () => lose(link),
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
