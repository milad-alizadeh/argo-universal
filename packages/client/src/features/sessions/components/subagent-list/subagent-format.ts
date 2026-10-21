import type { Subagent } from '@repo/contracts';
import { formatElapsed } from '@repo/kit/format-elapsed';

const thousand = 1_000;

function tokensLabel(tokens: number | null): string {
  if (tokens === null) return '— tokens';

  if (tokens < thousand) return `${tokens} tokens`;

  return `${Number((tokens / thousand).toFixed(1))}k tokens`;
}

// How long the Subagent has been working, or how long it took once it finished.
export function subagentElapsedMs(
  subagent: Subagent,
  now: number,
): number | null {
  if (subagent.state === 'idle') return subagent.durationMs;

  if (subagent.startedAt === null) return null;

  return now - subagent.startedAt;
}

const finishedLabel = (subagent: Subagent): string =>
  subagent.stopReason === 'cancelled' ? 'Cancelled' : 'Finished';

// What the Subagent is doing, in a word: the list row and the Feed's meta line both name it.
export function subagentStateLabel(subagent: Subagent): string {
  if (subagent.state === 'requires_action') return 'Needs input';

  return subagent.state === 'idle' ? finishedLabel(subagent) : 'Running';
}

const modelLabel = (subagent: Subagent): string =>
  subagent.model ?? 'Unknown model';

function durationLabel(subagent: Subagent, now: number): string {
  const elapsed = subagentElapsedMs(subagent, now);

  return elapsed === null ? '—' : formatElapsed(elapsed);
}

function finishedSupporting(subagent: Subagent, duration: string): string {
  const label = subagentStateLabel(subagent);

  if (subagent.stopReason === 'cancelled') return `${label} · ${duration}`;

  return [label, duration, tokensLabel(subagent.tokens)].join(' · ');
}

export function subagentSupporting(subagent: Subagent, now: number): string {
  if (subagent.state === 'requires_action')
    return `${modelLabel(subagent)} · ${subagentStateLabel(subagent)}`;

  const duration = durationLabel(subagent, now);

  if (subagent.state === 'idle') return finishedSupporting(subagent, duration);

  return [modelLabel(subagent), duration, tokensLabel(subagent.tokens)].join(
    ' · ',
  );
}
