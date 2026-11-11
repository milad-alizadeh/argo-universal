import type { PluginQuery } from '@repo/contracts/plugins/argo-calls';
import type { DrawnFor, QueryOrigin } from './plugin-data';
import type { QueryRead } from './query-types';

// A Loader's read holds its Page address, and a background pass, which holds none, reads fresh.
export const drawnRead = (
  drawn: DrawnFor,
  fresh: boolean | undefined,
): QueryRead => ({
  ...drawn,
  fresh: fresh === true || drawn.holder === undefined,
});

// A named read that names its Project is kept for it, whatever Project the draw or the Slot asking runs for.
export const projectOf = (
  query: PluginQuery,
  fallback: string | undefined,
): string | undefined =>
  query.api === 'read' ? (query.projectId ?? fallback) : fallback;

// Code outside a draw, such as a Slot's provider, reads only a named Query: the one the pages' entries are shared through.
export function refuseOutside(
  { drawn }: QueryOrigin,
  query: PluginQuery,
): void {
  if (!drawn && query.api !== 'read')
    throw new Error('Code outside a draw reads only a named Query');
}
