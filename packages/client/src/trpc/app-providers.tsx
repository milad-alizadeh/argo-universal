import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { TRPCProvider } from './context';
import { createTRPCClient } from './create-trpc-client';

export interface AppProvidersProps {
  serverUrl: string;
  children: ReactNode;
}

// One QueryClient and one Connection for the App's lifetime; give it a new key to switch Servers.
export function AppProviders({ serverUrl, children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [{ client }] = useState(() => createTRPCClient(serverUrl));

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
