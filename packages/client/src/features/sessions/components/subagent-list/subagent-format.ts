import type { Subagent } from '@repo/contracts';
import { formatElapsed } from '#lib/generic/format-elapsed';

const thousand = 1_000;

function tokensLabel(tokens: number | null): string {
  if (tokens === null) return '— tokens';

  if (tokens < thousand) return `${tokens} tokens`;

  return `${Number((tokens / thousand).toFixed(1))}k tokens`;
}

const durationLabel = (elapsed: number | null): string =>
  elapsed === null ? '—' : formatElapsed(elapsed);

const modelLabel = (subagent: Subagent): string =>
  subagent.model ?? 'Unknown model';

function runningElapsed(subagent: Subagent, now: number): number | null {
  return subagent.startedAt === null ? null : now - subagent.startedAt;
}

// Paper "Components / SubagentRow": a finished row leads with its outcome; a cancelled one drops its tokens.
function finishedSupporting(subagent: Subagent): string {
  const duration = durationLabel(subagent.durationMs);

  if (subagent.stopReason === 'cancelled') return `Cancelled · ${duration}`;

  return ['Finished', duration, tokensLabel(subagent.tokens)].join(' · ');
}

export function subagentSupporting(subagent: Subagent, now: number): string {
  if (subagent.state === 'idle') return finishedSupporting(subagent);

  if (subagent.state === 'requires_action')
    return `${modelLabel(subagent)} · Needs input`;

  return [
    modelLabel(subagent),
    durationLabel(runningElapsed(subagent, now)),
    tokensLabel(subagent.tokens),
  ].join(' · ');
}

// What the row's status says aloud; a finished row's subtitle already leads with its outcome.
export function subagentStatusLabel(subagent: Subagent): string | undefined {
  if (subagent.state === 'requires_action') return 'Needs input';

  return subagent.state === 'idle' ? undefined : 'Running';
}
