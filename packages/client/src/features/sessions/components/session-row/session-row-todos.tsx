import { startedPlanSteps, type SessionInfo } from '@repo/contracts';
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

function hasBackgroundWork({ shells, subagents }: SessionWork): boolean {
  return shells.running > 0 || subagents.running > 0;
}

// An idle Session whose Background Task or Agent still runs is not done: its bar stays green, and still, until that work ends.
function barTone(session: SessionWork): Tone {
  return session.status === 'idle' && hasBackgroundWork(session)
    ? statusTones.running
    : statusTones[session.status];
}

export function sessionProgress(
  session: SessionWork,
): ProgressBarProps | undefined {
  const { plan, status } = session;

  if (!plan || !unfinished(plan)) return undefined;

  const started = startedPlanSteps(plan);

  return {
    value: started / plan.total,
    tone: barTone(session),
    active: activeStatuses.has(status),
    accessibilityLabel: `Todos: ${started} of ${plan.total} ${progressStatus(plan)}`,
    testID: 'session-todos',
  };
}

function progressStatus(plan: NonNullable<SessionInfo['plan']>): string {
  return (plan.inProgress ?? 0) > 0 ? 'started' : 'complete';
}
