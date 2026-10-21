import type { StopReason, TurnEnd, TurnError } from '@repo/contracts';
import { formatElapsed } from '@repo/kit/format-elapsed';
import type { ReactElement } from 'react';
import type { FeedViewItem } from '../../view/feed-view';
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

function rowIds(item: FeedViewItem): string[] {
  if (item.type === 'group') return item.items.flatMap(rowIds);

  return 'row' in item ? [item.row.id] : [];
}

function isDisclosedEnd(item: FeedViewItem, ids: Set<string>): boolean {
  return (
    item.type === 'turn_end' &&
    item.end.stopReason === 'error' &&
    ids.has(`${item.row.turnId}:interrupted`)
  );
}

// A lifecycle disclosure covers its Turn's interrupted ending, even inside a Tool call group.
export function withoutDisclosedTurnEnds(
  items: readonly FeedViewItem[],
): FeedViewItem[] {
  const ids = new Set(items.flatMap(rowIds));

  return items.filter((item) => !isDisclosedEnd(item, ids));
}

export const turnEndNotice = (end: TurnEnd): NoticeMessageProps | null =>
  notices[end.stopReason](end);

export interface TurnEndRowProps {
  // How the Turn ended; the row draws one Notice per stop reason.
  end: TurnEnd;
}

export function TurnEndRow({ end }: TurnEndRowProps): ReactElement | null {
  const notice = turnEndNotice(end);

  return notice && <NoticeMessage {...notice} />;
}
