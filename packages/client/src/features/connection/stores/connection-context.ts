import { createContext, useContext } from 'react';
import type { Connection } from './connection';

export const ConnectionContext = createContext<Connection | null>(null);

// The App's Connection, from AppProviders or a story's mock.
export function useConnection(): Connection {
  const connection = useContext(ConnectionContext);

  if (!connection) throw new Error('useConnection needs AppProviders');

  return connection;
}
