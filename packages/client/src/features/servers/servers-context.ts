import { createContext, useContext } from 'react';
import type { AppServer } from './app-server';

export interface AppServers {
  servers: readonly AppServer[];
  lookingAt: string;
  look: (id: string) => void;
}

export const ServersContext = createContext<AppServers | null>(null);

// The App's list of Servers and the one it is showing, from AppProviders.
export function useAppServers(): AppServers {
  const servers = useContext(ServersContext);

  if (!servers) throw new Error('useAppServers needs AppProviders');

  return servers;
}
