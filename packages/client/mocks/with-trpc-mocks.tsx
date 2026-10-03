import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
import { type ComponentType, type ReactNode, useState } from 'react';
import { TRPCProvider } from '../src/trpc/context';
import { type Fixtures, trpcMockLink } from './trpc-mock-link';

// Typed by shape, so web and on-device Storybook can both use it as a decorator.
interface StoryContext {
  id: string;
  parameters: { trpc?: Fixtures };
}

// Story decorator: serves `parameters.trpc` fixtures through the mock link (ADR 0010).
export function withTrpcMocks(Story: ComponentType, context: StoryContext) {
  return (
    <TrpcMocks key={context.id} fixtures={context.parameters.trpc ?? {}}>
      <Story />
    </TrpcMocks>
  );
}

function TrpcMocks({
  fixtures,
  children,
}: {
  fixtures: Fixtures;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [client] = useState(() =>
    createTRPCClient({ links: [trpcMockLink(fixtures)] }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
