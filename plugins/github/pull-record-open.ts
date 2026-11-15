import type { LinkRead } from './pull-changes';
import { withData, type Known } from './pull-known';
import type { PullKey } from './pull-store';

type Read = LinkRead<PullKey>;

// What the record keeps of a pull request only while it is Open: its auto-merge and its repository's merge settings.
export type OpenKept = Pick<Read, 'autoMerge' | 'settings'>;

const failureOf = (
  failure: Known<unknown>['failure'],
): Pick<Known<unknown>, 'failure'> => (failure ? { failure } : {});

// The last good answer stays beside a failure, as it does for Checks.
const lastOf = <Value>(
  next: Known<Value>,
  before: Known<Value> | undefined,
): Known<Value> => ({
  ...withData(next.data ?? before?.data),
  ...failureOf(next.failure),
});

const dataOnly = <Value>(
  kept: Known<Value> | undefined,
): Known<Value> | undefined =>
  kept?.data === undefined ? undefined : { data: kept.data };

const keepOne = <Value>(
  next: Known<Value> | undefined,
  before: Known<Value> | undefined,
): Known<Value> | undefined => (next ? lastOf(next, before) : dataOnly(before));

const autoMergeOf = (
  autoMerge: OpenKept['autoMerge'],
): Pick<OpenKept, 'autoMerge'> => (autoMerge ? { autoMerge } : {});

const settingsOf = (
  settings: OpenKept['settings'],
): Pick<OpenKept, 'settings'> => (settings ? { settings } : {});

const endedOf = ({ pull }: Read): boolean =>
  pull.data !== undefined && pull.data.stage !== 'open';

const standsOf = (kept: OpenKept | undefined, read: Read): OpenKept => ({
  ...autoMergeOf(keepOne(read.autoMerge, kept?.autoMerge)),
  ...settingsOf(keepOne(read.settings, kept?.settings)),
});

/*
 * A Merged or Closed pull request keeps neither; a read that failed outright says nothing of the stage, so what was
 * kept stands.
 */
export const openOf = (kept: OpenKept | undefined, read: Read): OpenKept =>
  endedOf(read) ? {} : standsOf(kept, read);
