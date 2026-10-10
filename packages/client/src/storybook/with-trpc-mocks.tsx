import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
import type * as React from 'react';
import { type ComponentType, type ReactNode, useState } from 'react';
import type { ConnectionState } from '../features/connection/state/context';
import { TRPCProvider } from '../features/connection/trpc/context';
import { ConnectionStatePreview } from '../mocks/connection-state-preview';
import { type Fixtures, trpcMockLink } from '../mocks/trpc-mock-link';

// Typed by shape, so web and on-device Storybook can both use it as a decorator.
interface StoryContext {
  id: string;
  parameters: { trpc?: Fixtures; connection?: ConnectionState };
}

// Story decorator: serves `parameters.trpc` fixtures through the mock link (ADR 0010), on a Connection held in `parameters.connection`.
export function withTrpcMocks(
  Story: ComponentType,
  context: StoryContext,
): React.JSX.Element {
  if (!context.parameters.trpc) return <Story />;
  return (
    <TrpcMocks
      key={context.id}
      fixtures={context.parameters.trpc}
      connectionState={context.parameters.connection ?? 'open'}
    >
      <Story />
    </TrpcMocks>
  );
}

export function TrpcMocks({
  fixtures,
  connectionState,
  children,
}: {
  fixtures: Fixtures;
  connectionState: ConnectionState;
  children: ReactNode;
}): React.JSX.Element {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [client] = useState(() =>
    createTRPCClient({ links: [trpcMockLink(fixtures)] }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        <ConnectionStatePreview state={connectionState}>
          {children}
        </ConnectionStatePreview>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
