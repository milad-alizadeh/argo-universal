import type { Subagent } from '@repo/contracts';
import { formatElapsed } from '#lib/generic/format-elapsed';

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

const modelLabel = (subagent: Subagent): string =>
  subagent.model ?? 'Unknown model';

function durationLabel(subagent: Subagent, now: number): string {
  const elapsed = subagentElapsedMs(subagent, now);

  return elapsed === null ? '—' : formatElapsed(elapsed);
}

function finishedSupporting(subagent: Subagent, duration: string): string {
  if (subagent.stopReason === 'cancelled') return `Cancelled · ${duration}`;

  return ['Finished', duration, tokensLabel(subagent.tokens)].join(' · ');
}

export function subagentSupporting(subagent: Subagent, now: number): string {
  if (subagent.state === 'requires_action')
    return `${modelLabel(subagent)} · Needs input`;

  const duration = durationLabel(subagent, now);

  if (subagent.state === 'idle') return finishedSupporting(subagent, duration);

  return [modelLabel(subagent), duration, tokensLabel(subagent.tokens)].join(
    ' · ',
  );
}
