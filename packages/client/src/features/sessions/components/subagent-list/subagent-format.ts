import type { Subagent } from '@repo/contracts';
import { formatElapsed } from '#lib/generic/format-elapsed';

const thousand = 1_000;

function tokensLabel(tokens: number | null): string {
  if (tokens === null) return '— tokens';

  if (tokens < thousand) return `${tokens} tokens`;

  return `${Number((tokens / thousand).toFixed(1))}k tokens`;
}

function elapsedMs(subagent: Subagent, now: number): number | null {
  if (subagent.state === 'idle') return subagent.durationMs;

  if (subagent.startedAt === null) return null;

  return now - subagent.startedAt;
}

export function subagentSupporting(subagent: Subagent, now: number): string {
  const elapsed = elapsedMs(subagent, now);
  const duration = elapsed === null ? '—' : formatElapsed(elapsed);

  return [
    subagent.model ?? 'Unknown model',
    duration,
    tokensLabel(subagent.tokens),
  ].join(' · ');
}
