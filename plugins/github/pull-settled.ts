import type { CheckInfo } from './pull-checks';
import type { PullInfo } from './pull-info';
import type { Known } from './pull-known';

// What settling looks at: the pull request's read and its Checks' read.
type Read = { pull: Known<PullInfo>; checks?: Known<CheckInfo[]> };

const endedStages = new Set<string | undefined>(['merged', 'closed']);

const ended = ({ pull }: Read): boolean => endedStages.has(pull.data?.stage);

const isRunning = ({ state }: CheckInfo): boolean => state === 'running';

const running = ({ checks }: Read): boolean =>
  (checks?.data ?? []).some(isRunning);

/*
 * A merged or closed pull request whose Checks have all reported cannot change, so a Slot never asks GitHub for it
 * again, and its last good read is shown as it is, never as stale. A later read that failed does not unsettle it: each
 * such failure would otherwise ask again on every draw, and a spent rate limit fails every read. A closed one that
 * GitHub reopens is read again only by a sync that is not a Slot's ask.
 */
export const settled = (read: Read): boolean => ended(read) && !running(read);
