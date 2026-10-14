import { useEffect } from 'react';
import { useConnection } from '#features/connection';

export function useLoginReconnect(clear: () => void): void {
  const connection = useConnection();
  useEffect(() => {
    let previous = connection.getSnapshot().value.link;

    const subscription = connection.subscribe((snapshot) => {
      const state = snapshot.value.link;

      if (previous === state) return;
      previous = state;

      if (state === 'open') clear();
    });

    return (): void => subscription.unsubscribe();
  }, [connection, clear]);
}
