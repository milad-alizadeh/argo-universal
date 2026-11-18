import type { LinkRead } from './pull-changes';
import { withData, type Known } from './pull-known';
import type { OpenReads } from './pull-open-reads';
import type { PullKey } from './pull-store';

type Read = LinkRead<PullKey>;

// What the record keeps of a pull request only while it is Open: its auto-merge, its repository's merge settings, its review comments and the signed-in account.
export type OpenKept = OpenReads;

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

const endedOf = ({ pull }: Read): boolean =>
  pull.data !== undefined && pull.data.stage !== 'open';

const autoMergeOf = (
  next: OpenKept['autoMerge'],
  before: OpenKept['autoMerge'],
): Pick<OpenKept, 'autoMerge'> => {
  const autoMerge = keepOne(next, before);

  return autoMerge ? { autoMerge } : {};
};

const settingsOf = (
  next: OpenKept['settings'],
  before: OpenKept['settings'],
): Pick<OpenKept, 'settings'> => {
  const settings = keepOne(next, before);

  return settings ? { settings } : {};
};

const commentsOf = (
  next: OpenKept['comments'],
  before: OpenKept['comments'],
): Pick<OpenKept, 'comments'> => {
  const comments = keepOne(next, before);

  return comments ? { comments } : {};
};

const viewerOf = (
  next: OpenKept['viewer'],
  before: OpenKept['viewer'],
): Pick<OpenKept, 'viewer'> => {
  const viewer = keepOne(next, before);

  return viewer ? { viewer } : {};
};

const standsOf = (kept: OpenKept, read: Read): OpenKept => ({
  ...autoMergeOf(read.autoMerge, kept.autoMerge),
  ...settingsOf(read.settings, kept.settings),
  ...commentsOf(read.comments, kept.comments),
  ...viewerOf(read.viewer, kept.viewer),
});

/*
 * A Merged or Closed pull request keeps neither; a read that failed outright says nothing of the stage, so what was
 * kept stands.
 */
export const openOf = (kept: OpenKept | undefined, read: Read): OpenKept =>
  endedOf(read) ? {} : standsOf(kept ?? {}, read);
