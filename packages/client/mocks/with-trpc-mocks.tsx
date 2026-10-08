import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
import type * as React from 'react';
import { type ComponentType, type ReactNode, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import type { ConnectionState } from '../src/connection/context';
import { BlobUrlContext } from '../src/trpc/blob-url';
import { TRPCProvider } from '../src/trpc/context';
import { ConnectionStatePreview } from './connection-state-preview';
import { recordedImageUrl } from './feed-message-mock';
import { type Fixtures, trpcMockLink } from './trpc-mock-link';

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
          <BlobUrlContext.Provider value={recordedImageUrl}>
            {/* As in the App, so screens that follow the keyboard find it. */}
            <KeyboardProvider>{children}</KeyboardProvider>
          </BlobUrlContext.Provider>
        </ConnectionStatePreview>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
