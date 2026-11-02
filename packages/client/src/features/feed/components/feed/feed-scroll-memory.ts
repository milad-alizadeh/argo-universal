import type { LegendListRef } from '@legendapp/list/react-native';
import type { RefObject } from 'react';
import { SessionMemory } from '../../../../lib/session-memory';

export type FeedAnchor = { key: string; offset: number };

export const scrollMemory = new SessionMemory<FeedAnchor | null>(null);

type ListRef = RefObject<LegendListRef | null>;

function currentAnchor(current: LegendListRef): FeedAnchor | null | undefined {
  return current.getState().isAtEnd
    ? null
    : current.anchorVisibleContent({ hold: false });
}

const listAnchor = (list: ListRef): FeedAnchor | null | undefined =>
  list.current ? currentAnchor(list.current) : undefined;

export function rememberFeedPosition(
  sessionId: string | undefined,
  list: ListRef,
): void {
  if (!sessionId) return;

  const anchor = listAnchor(list);

  if (anchor !== undefined) scrollMemory.write(sessionId, anchor);
}
