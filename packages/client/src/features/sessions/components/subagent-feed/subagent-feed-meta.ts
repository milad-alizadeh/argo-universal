import type { Subagent } from '@repo/contracts';
import { formatElapsed } from '#lib/generic/format-elapsed';
import { subagentElapsedMs } from '../subagent-list/subagent-format';

const finishedLabel = (subagent: Subagent): string =>
  subagent.stopReason === 'cancelled' ? 'Cancelled' : 'Finished';

const stateLabel = (subagent: Subagent): string =>
  subagent.state === 'idle' ? finishedLabel(subagent) : 'Running';

/*
 * The Feed's meta line: what the Subagent is doing and for how long. It counts up while the
 * Subagent runs and settles on its final duration; a Subagent waiting on you names that instead.
 */
export function subagentFeedMeta(subagent: Subagent, now: number): string {
  if (subagent.state === 'requires_action') return 'Needs input';

  const elapsed = subagentElapsedMs(subagent, now);
  const label = stateLabel(subagent);

  return elapsed === null ? label : `${label} · ${formatElapsed(elapsed)}`;
}
