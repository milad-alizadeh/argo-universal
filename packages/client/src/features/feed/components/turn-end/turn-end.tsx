import type { StopReason, TurnEnd, TurnError } from '@repo/contracts';
import type { ReactElement } from 'react';
import { formatElapsed } from '#lib/generic/format-elapsed';
import {
  NoticeMessage,
  type NoticeMessageProps,
} from '../feed-notice/notice-message';

const notices: Record<StopReason, (end: TurnEnd) => NoticeMessageProps | null> =
  {
    end_turn: () => null,
    cancelled: (end) => ({
      severity: 'info',
      icon: 'cancelled',
      title: `You stopped after ${formatElapsed(end.durationMs)}`,
    }),
    error: errorNotice,
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

// Lifecycle endings already leave their own Notice, including crash output.
function errorNotice(end: TurnEnd): NoticeMessageProps | null {
  return end.error?.code === 'interrupted' ? null : errorDetails(end.error);
}

export const turnEndNotice = (end: TurnEnd): NoticeMessageProps | null =>
  notices[end.stopReason](end);

export function TurnEndRow({ end }: { end: TurnEnd }): ReactElement | null {
  const notice = turnEndNotice(end);

  return notice && <NoticeMessage {...notice} />;
}
