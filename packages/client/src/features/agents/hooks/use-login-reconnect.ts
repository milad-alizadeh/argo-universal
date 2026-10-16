import { useEffect } from 'react';
import { useConnection } from '#features/connection';

export function useLoginReconnect(clear: () => void): void {
  const connection = useConnection();
  useEffect(() => {
    let previous = connection.state();

    return connection.subscribe(() => {
      const state = connection.state();

      if (previous === state) return;
      previous = state;

      if (state === 'open') clear();
    });
  }, [connection, clear]);
}
