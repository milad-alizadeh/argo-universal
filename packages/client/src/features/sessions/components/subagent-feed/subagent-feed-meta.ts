import type { Subagent } from '@repo/contracts';
import { formatElapsed } from '#lib/generic/format-elapsed';
import {
  subagentElapsedMs,
  subagentStateLabel,
} from '../subagent-list/subagent-format';

/*
 * The Feed's meta line: what the Subagent is doing and for how long. It counts up while the
 * Subagent runs and settles on its final duration; a Subagent waiting on you names that instead.
 */
export function subagentFeedMeta(subagent: Subagent, now: number): string {
  const label = subagentStateLabel(subagent);

  // A Subagent waiting on you names that alone; the others count their time.
  if (subagent.state === 'requires_action') return label;

  const elapsed = subagentElapsedMs(subagent, now);

  return elapsed === null ? label : `${label} · ${formatElapsed(elapsed)}`;
}
