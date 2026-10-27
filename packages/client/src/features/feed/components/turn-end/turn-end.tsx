import type { TurnEnd } from '@repo/contracts';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { FeedViewItem } from '../../view/feed-view';
import { NoticeMessage } from '../feed-notice/notice-message';
import { turnEndNotice } from './turn-end-notice';

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

export interface TurnEndRowProps {
  // How the Turn ended; the row draws one Notice per stop reason.
  end: TurnEnd;
}

const ruleClassName = 'h-px flex-1 bg-border';

// The notice sits between two rules that mark where the Turn stopped.
export function TurnEndRow({ end }: TurnEndRowProps): ReactElement | null {
  const notice = turnEndNotice(end);

  return (
    notice && (
      <View className="w-full flex-row items-center gap-3">
        <View className={ruleClassName} />
        <View className="min-w-0 shrink">
          <NoticeMessage {...notice} />
        </View>
        <View className={ruleClassName} />
      </View>
    )
  );
}
