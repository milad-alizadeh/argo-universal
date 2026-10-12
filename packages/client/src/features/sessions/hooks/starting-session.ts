import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { StartingFeed } from '../state/starting-feed';

const startingKey = (sessionId: string): [string, string] => [
  'starting-session',
  sessionId,
];

// New Session hands its shown first prompt to the Session page it opens.
export function handOverStartingFeed(
  client: QueryClient,
  sessionId: string,
  starting: StartingFeed,
): void {
  client.setQueryData(startingKey(sessionId), starting);
}

// The first prompt New Session handed over, until the Session's own Feed has loaded.
export function useStartingFeed(
  sessionId: string,
  feedLoaded: boolean,
): StartingFeed | undefined {
  const client = useQueryClient();
  useEffect(() => {
    if (feedLoaded) client.removeQueries({ queryKey: startingKey(sessionId) });
  }, [client, sessionId, feedLoaded]);
  return client.getQueryData<StartingFeed>(startingKey(sessionId));
}
