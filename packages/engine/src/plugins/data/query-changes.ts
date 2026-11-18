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
const pageShows = (before: PluginDataState, after: PluginDataState): boolean =>
  changed(before.data, after.data) ||
  (before.error !== undefined && after.error === undefined);

/*
 * The start of a failure, which code outside a draw, such as a Slot served the kept answer, drew as good: a Slot that
 * waited saw it, so one served the kept answer hears of it and asks again (#2339).
 */
const startsFailing = (
  before: PluginDataState,
  after: PluginDataState,
): boolean => before.error === undefined && after.error !== undefined;

// What a page, or code outside a draw that read the entry, would draw differently.
export const shows = (
  before: PluginDataState,
  after: PluginDataState,
  readOutside: boolean,
): boolean =>
  pageShows(before, after) || (readOutside && startsFailing(before, after));

// A paged list's page is read only for its draw, so code outside a draw cannot read it again.
const drawOnly = ({ query }: QueryOwner): boolean =>
  query.api === 'read' && query.name === pagedListRead;

// Whether a read made with no draw would be refused, as a paged list's is.
export const unreadable = (
  owner: QueryOwner,
  draw: number | undefined,
): boolean => draw === undefined && drawOnly(owner);

// A paged list that is due waits for the draw that reads it, rather than serving what it kept.
export const waitsForDraw = (owner: QueryOwner, overdue: boolean): boolean =>
  drawOnly(owner) && overdue;
