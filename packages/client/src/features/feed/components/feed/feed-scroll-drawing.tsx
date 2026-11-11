import type { LegendListRef } from '@legendapp/list/react-native';
import { List } from '@repo/kit/primitives/lists/list';
import { type RefObject, useCallback } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { useFeedFade } from '#lib/product/feed-fade';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { FeedListProps, feedListProps } from './feed-scroll';
import { rememberFeedPosition } from './feed-scroll-memory';

type ListRef = RefObject<LegendListRef | null>;

export function useFeedOnScroll(
  sessionId: string | undefined,
  list: ListRef,
): () => void {
  const focused = useScreenFocused();

  return useCallback(() => {
    if (focused) rememberFeedPosition(sessionId, list);
  }, [focused, sessionId, list]);
}

interface Drawing {
  list: ListRef;
  base: typeof feedListProps;
  listProps: FeedListProps;
  fade: ReturnType<typeof useFeedFade>;
  onScroll: () => void;
}

export function DrawFeedScroll({
  list,
  base,
  listProps,
  fade,
  onScroll,
}: Drawing): React.JSX.Element {
  // On a wide window `feed-scrollbar` keeps the web scrollbar drawn while the Feed can scroll, rather than only while it moves.
  return (
    <View className="feed-scrollbar min-h-0 flex-1">
      <List ref={list} {...base} {...listProps} {...fade} onScroll={onScroll} />
    </View>
  );
}
