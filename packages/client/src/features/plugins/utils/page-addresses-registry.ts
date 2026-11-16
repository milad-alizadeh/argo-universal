import type {
  LiveAnswer,
  LiveRequest,
} from '@repo/contracts/plugins/page-live';
import type { QueryClient } from '@tanstack/react-query';
import { PageAddresses } from './page-addresses';
import type { DrawPage } from './tree-draws';

// The part of the Connection's tRPC client (not the Connection itself) the Page addresses use.
export interface PagePluginsClient {
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

/*
 * One PageAddresses per QueryClient and Connection, keyed by the tRPC client itself: its `plugins` proxies are not
 * identity-stable, and `useTRPCClient()` returns the one the provider was given. Global per module, so the Page
 * addresses outlive a test: a test that needs isolation builds `new PageAddresses` or a fresh QueryClient.
 */
const registry = new WeakMap<
  QueryClient,
  WeakMap<PagePluginsClient, PageAddresses>
>();

function addressesOver(
  queryClient: QueryClient,
  { plugins: { draw, live } }: PagePluginsClient,
): PageAddresses {
  return new PageAddresses(queryClient, draw.query, (request, onAnswer) => {
    const subscription = live.subscribe(request, { onData: onAnswer });

    return () => subscription.unsubscribe();
  });
}

function connectionsOf(
  queryClient: QueryClient,
): WeakMap<PagePluginsClient, PageAddresses> {
  const known = registry.get(queryClient);

  if (known) return known;

  const created = new WeakMap<PagePluginsClient, PageAddresses>();

  registry.set(queryClient, created);

  return created;
}

// The App's one PageAddresses for the connected Server, so a stale mark reaches the draws every Page has in flight.
export function pageAddressesFor(
  queryClient: QueryClient,
  client: PagePluginsClient,
): PageAddresses {
  const connections = connectionsOf(queryClient);
  const known = connections.get(client);

  if (known) return known;

  const created = addressesOver(queryClient, client);

  connections.set(client, created);

  return created;
}
