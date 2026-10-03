import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
import { type ComponentType, type ReactNode, useState } from 'react';
import {
  ConnectionContext,
  type ConnectionState,
} from '../src/connection/context';
import { TRPCProvider } from '../src/trpc/context';
import { createConnectionStateMock } from './connection-state-mock';
import { type Fixtures, trpcMockLink } from './trpc-mock-link';

// Typed by shape, so web and on-device Storybook can both use it as a decorator.
interface StoryContext {
  id: string;
  parameters: { trpc?: Fixtures; connection?: ConnectionState };
}

// Story decorator: serves `parameters.trpc` fixtures through the mock link (ADR 0010), on a Connection held in `parameters.connection`.
export function withTrpcMocks(Story: ComponentType, context: StoryContext) {
  return (
    <TrpcMocks
      key={context.id}
      fixtures={context.parameters.trpc ?? {}}
      connectionState={context.parameters.connection ?? 'open'}
    >
      <Story />
    </TrpcMocks>
  );
}

function TrpcMocks({
  fixtures,
  connectionState,
  children,
}: {
  fixtures: Fixtures;
  connectionState: ConnectionState;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [client] = useState(() =>
    createTRPCClient({ links: [trpcMockLink(fixtures)] }),
  );
  const [connection] = useState(() =>
    createConnectionStateMock(connectionState),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        <ConnectionContext.Provider value={connection}>
          {children}
        </ConnectionContext.Provider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
