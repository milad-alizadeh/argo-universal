import type {
  LiveAnswer,
  LiveRequest,
} from '@repo/contracts/plugins/page-live';
import type { QueryClient } from '@tanstack/react-query';
import { PageAddresses } from './page-addresses';
import type { DrawPage } from './tree-draws';

// The part of the Connection's tRPC client the Page addresses use.
export interface PageConnection {
  plugins: {
    draw: { query: DrawPage };
    live: {
      subscribe: (
        request: LiveRequest,
        handlers: { onData: (answer: LiveAnswer) => void },
      ) => { unsubscribe: () => void };
    };
  };
}

// One PageAddresses per QueryClient and Connection, keyed by the tRPC client itself: its `plugins` proxies are not identity-stable.
const registry = new WeakMap<
  QueryClient,
  WeakMap<PageConnection, PageAddresses>
>();

function addressesOver(
  queryClient: QueryClient,
  { plugins: { draw, live } }: PageConnection,
): PageAddresses {
  return new PageAddresses(queryClient, draw.query, (request, onAnswer) => {
    const subscription = live.subscribe(request, { onData: onAnswer });

    return () => subscription.unsubscribe();
  });
}

// The App's one PageAddresses for the connected Server, so a stale mark reaches the draws every Page has in flight.
export function pageAddressesFor(
  queryClient: QueryClient,
  connection: PageConnection,
): PageAddresses {
  const connections = registry.get(queryClient) ?? new WeakMap();

  registry.set(queryClient, connections);

  const addresses =
    connections.get(connection) ?? addressesOver(queryClient, connection);

  connections.set(connection, addresses);

  return addresses;
}
