import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { ConnectionContext } from '../connection/context';
import {
  type ConnectionInspection,
  openConnection,
} from '../connection/open-connection';
import { TRPCProvider } from './context';

export interface AppProvidersProps {
  serverUrl: string;
  children: ReactNode;
  inspect?: ConnectionInspection;
}

type Connection = ReturnType<typeof openConnection>;

// One QueryClient and one Connection for the App's lifetime; give it a new key to switch Servers.
export function AppProviders({
  serverUrl,
  children,
  inspect,
}: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [connection, setConnection] = useState<Connection | null>(null);

  // An effect owns the Connection, so unmounting closes it and StrictMode's remount opens a fresh one.
  useEffect(() => {
    const opened = openConnection(serverUrl, queryClient, inspect);
    setConnection(opened);
    return () => {
      void opened.close();
    };
  }, [serverUrl, queryClient, inspect]);

  if (!connection) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={connection.client} queryClient={queryClient}>
        <ConnectionContext.Provider value={connection.connection}>
          {children}
        </ConnectionContext.Provider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
