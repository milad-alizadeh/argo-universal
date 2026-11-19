import type { SessionInfo } from '@repo/contracts';
import type { Tone } from '@repo/kit/primitives/content/text';
import type {
  ProgressBarProps,
  ProgressSteps,
} from '@repo/kit/primitives/status/progress-bar';

const statusTones = {
  needs_input: 'warning',
  running: 'success',
  failed: 'danger',
  unread: 'info',
  idle: 'muted',
} satisfies Record<SessionInfo['status'], Tone>;

type Plan = NonNullable<SessionInfo['plan']>;

function unfinished(plan: Plan): boolean {
  return plan.total > 0 && plan.done < plan.total;
}

type SessionWork = Pick<
  SessionInfo,
  'plan' | 'status' | 'shells' | 'subagents'
>;

function hasBackgroundWork({ shells, subagents }: SessionWork): boolean {
  return shells.running > 0 || subagents.running > 0;
}

// An idle Session whose Background Task or Agent still runs is not done: its bar stays green until that work ends.
function barTone(session: SessionWork): Tone {
  return session.status === 'idle' && hasBackgroundWork(session)
    ? statusTones.running
    : statusTones[session.status];
}

function planSteps({ done, inProgress = 0, total }: Plan): ProgressSteps {
  return { done, started: inProgress, total };
}

// Work is live while the Session runs, or while its Background Task or Agent does after the Turn ends.
function workIsLive(session: SessionWork): boolean {
  return barTone(session) === statusTones.running;
}

/*
 * Paper's step bar (Option A): one segment per plan step, so a last step underway reads 3 of 4, never a full bar. The
 * step underway glints only while work is live; a Session waiting on its reader holds still.
 */
export function sessionProgress(
  session: SessionWork,
): ProgressBarProps | undefined {
  const { plan } = session;

  if (!plan || !unfinished(plan)) return undefined;

  return {
    value: plan.done / plan.total,
    steps: planSteps(plan),
    tone: barTone(session),
    active: workIsLive(session),
    accessibilityLabel: progressLabel(plan),
    testID: 'session-todos',
  };
}

function progressLabel({ done, inProgress = 0, total }: Plan): string {
  const complete = `Todos: ${done} of ${total} complete`;

  return inProgress > 0 ? `${complete}, ${inProgress} in progress` : complete;
}
