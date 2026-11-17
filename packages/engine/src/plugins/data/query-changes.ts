import {
  pagedListRead,
  type PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { QueryOwner } from './query-types';

// First answers also wake Slots that timed out while waiting for this entry.
export const changed = (
  before: PluginDataState['data'],
  after: PluginDataState['data'],
): boolean => JSON.stringify(before) !== JSON.stringify(after);

// What a page would draw differently: another answer, or the end of a failure it shows, even for the same answer.
export const shows = (
  before: PluginDataState,
  after: PluginDataState,
): boolean =>
  changed(before.data, after.data) ||
  (before.error !== undefined && after.error === undefined);

// A paged list's page is read only for its draw, so code outside a draw cannot read it again.
export const drawOnly = ({ query }: QueryOwner): boolean =>
  query.api === 'read' && query.name === pagedListRead;

// Whether a read made with no draw would be refused, as a paged list's is.
export const unreadable = (
  owner: QueryOwner,
  draw: number | undefined,
): boolean => draw === undefined && drawOnly(owner);
