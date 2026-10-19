import type { SessionInfo } from '@repo/contracts';
import type { Tone } from '#primitives/content/text';
import type { ProgressBarProps } from '#primitives/status/progress-bar';

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

export function sessionProgress({
  plan,
  status,
}: Pick<SessionInfo, 'plan' | 'status'>): ProgressBarProps | undefined {
  if (!plan) return undefined;

  if (!unfinished(plan)) return undefined;

  return {
    value: plan.done / plan.total,
    tone: statusTones[status],
    active: activeStatuses.has(status),
    accessibilityLabel: `Plan: ${plan.done} of ${plan.total} complete`,
    testID: 'session-plan',
  };
}
