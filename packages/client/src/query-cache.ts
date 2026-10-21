import { QueryClient } from '@tanstack/react-query';

const minuteMs = 60_000,
  minutesKept = 30;

const keptFor = minutesKept * minuteMs;

/*
 * The Server's own lists: each is what a list screen waits on before it can draw a row, and each changes
 * far more slowly than a reader moves between pages. React Query drops a query nothing is watching after
 * five minutes, so leaving a page and coming back to it made the screen wait on the Server again; these
 * stay in memory long enough that the second visit draws its rows at once (owner, 2026-10-21).
 *
 * In memory only: nothing is written to the Device, so a cold start loads from the Server as it always did.
 */
const keptQueries: readonly (readonly string[])[] = [
  ['agents', 'servers'],
  ['agents', 'registry'],
  ['projects', 'list'],
  ['system', 'info'],
];

// A kept list is still asked for again on every visit; what it keeps is what the reader sees meanwhile.
export function createQueryClient(): QueryClient {
  const client = new QueryClient();

  for (const path of keptQueries)
    client.setQueryDefaults([path], { gcTime: keptFor });

  return client;
}
