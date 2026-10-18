import type { SessionInfo } from '@repo/contracts';
import type { StatusDotProps } from '#primitives/status/status-dot';

export const sessionStatusLabels = {
  needs_input: 'Needs input',
  running: 'Running',
  failed: 'Failed',
  unread: 'Unread',
  idle: 'Idle',
} satisfies Record<SessionInfo['status'], string>;

const sessionStatusDots = {
  needs_input: { tone: 'warning', pulse: true },
  running: { tone: 'success', pulse: true },
  failed: { tone: 'danger', pulse: false },
  unread: { tone: 'info', pulse: false },
  idle: { tone: 'muted', pulse: false },
} satisfies Record<
  SessionInfo['status'],
  Pick<StatusDotProps, 'tone' | 'pulse'>
>;

export const sessionStatusDot = (
  status: SessionInfo['status'],
): (typeof sessionStatusDots)[SessionInfo['status']] =>
  sessionStatusDots[status];
