import type { SessionInfo } from '@repo/contracts';
import type { Tone } from '@repo/kit/primitives/content/text';
import type { ProgressBarProps } from '@repo/kit/primitives/status/progress-bar';

const statusTones = {
  needs_input: 'warning',
  running: 'success',
  failed: 'danger',
  unread: 'info',
  idle: 'muted',
} satisfies Record<SessionInfo['status'], Tone>;

function unfinished(plan: NonNullable<SessionInfo['plan']>): boolean {
  return plan.total > 0 && plan.done < plan.total;
}

const activeStatuses: ReadonlySet<SessionInfo['status']> = new Set([
  'running',
  'needs_input',
]);

type SessionWork = Pick<
  SessionInfo,
  'plan' | 'status' | 'shells' | 'subagents'
>;

function backgroundWork({ shells, subagents }: SessionWork): boolean {
  return shells.running > 0 || subagents.running > 0;
}

// An idle Session whose Background Task or Agent still runs is not done: its bar stays green, and still, until that work ends.
function barTone(session: SessionWork): Tone {
  return session.status === 'idle' && backgroundWork(session)
    ? statusTones.running
    : statusTones[session.status];
}

export function sessionProgress(
  session: SessionWork,
): ProgressBarProps | undefined {
  const { plan, status } = session;

  if (!plan) return undefined;

  if (!unfinished(plan)) return undefined;

  return {
    value: plan.done / plan.total,
    tone: barTone(session),
    active: activeStatuses.has(status),
    accessibilityLabel: `Todos: ${plan.done} of ${plan.total} complete`,
    testID: 'session-todos',
  };
}
