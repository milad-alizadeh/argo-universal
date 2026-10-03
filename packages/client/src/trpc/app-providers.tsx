import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { TRPCProvider } from './context';
import { createTRPCClient } from './create-trpc-client';

export interface AppProvidersProps {
  serverUrl: string;
  children: ReactNode;
}

type Connection = ReturnType<typeof createTRPCClient>;

// One QueryClient and one Connection for the App's lifetime; give it a new key to switch Servers.
export function AppProviders({ serverUrl, children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [connection, setConnection] = useState<Connection | null>(null);

  // An effect owns the Connection, so unmounting closes it and StrictMode's remount opens a fresh one.
  useEffect(() => {
    const opened = createTRPCClient(serverUrl);
    setConnection(opened);
    return () => {
      void opened.close();
    };
  }, [serverUrl]);

  if (!connection) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={connection.client} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
