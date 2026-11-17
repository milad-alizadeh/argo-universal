import type { LinkRead } from './pull-changes';
import { withData, type Known } from './pull-known';
import {
  openReadKeys,
  type OpenReadKey,
  type OpenReads,
} from './pull-open-reads';
import type { PullKey } from './pull-store';

type Read = LinkRead<PullKey>;

// What the record keeps of a pull request only while it is Open: its auto-merge, its repository's merge settings and its review comments.
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

const standsOf = (kept: OpenKept, read: Read): OpenKept => {
  const stands: OpenKept = {};

  const keep = <Key extends OpenReadKey>(key: Key): void => {
    const one = keepOne<unknown>(read[key], kept[key]);

    if (one) Object.assign(stands, { [key]: one });
  };

  for (const key of openReadKeys) keep(key);

  return stands;
};

/*
 * A Merged or Closed pull request keeps neither; a read that failed outright says nothing of the stage, so what was
 * kept stands.
 */
export const openOf = (kept: OpenKept | undefined, read: Read): OpenKept =>
  endedOf(read) ? {} : standsOf(kept ?? {}, read);
