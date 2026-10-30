import type { StopReason, TurnEnd, TurnError } from '@repo/contracts';
import { formatElapsed } from '@repo/kit/format-elapsed';
import type { NoticeMessageProps } from '../feed-notice/notice-message';

const notices: Record<StopReason, (end: TurnEnd) => NoticeMessageProps | null> =
  {
    end_turn: () => null,
    cancelled: (end) => ({
      severity: 'info',
      icon: 'cancelled',
      title: end.permissionDenied
        ? 'Turn ended after you denied a Permission request'
        : `You stopped after ${formatElapsed(end.durationMs)}`,
    }),
    error: (end) => errorDetails(end.error),
    max_tokens: () => ({
      severity: 'warning',
      title: 'Stopped at the output limit. Send “continue” to pick up.',
    }),
    max_turn_requests: () => ({
      severity: 'warning',
      title: 'Stopped after too many steps in one Turn',
    }),
    refusal: () => ({
      severity: 'info',
      icon: 'refused',
      title: 'The Agent declined this request',
    }),
    auth_required: () => ({
      severity: 'warning',
      icon: 'key',
      title: 'Authentication required',
    }),
  };

function errorDetails(error: TurnError | null): NoticeMessageProps {
  return {
    severity: 'error',
    title: 'The Turn ended with an error',
    description: error?.message,
    inlineDescription: true,
  };
}

export const turnEndNotice = (end: TurnEnd): NoticeMessageProps | null =>
  notices[end.stopReason](end);
