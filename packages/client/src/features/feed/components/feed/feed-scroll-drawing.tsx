import type { LegendListRef } from '@legendapp/list/react-native';
import { List } from '@repo/kit/primitives/lists/list';
import { type RefObject, useCallback, useState } from 'react';
import type * as React from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  View,
} from 'react-native';
import { useFeedFade } from '#lib/product/feed-fade';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { FeedListProps, feedListProps } from './feed-scroll';
import { rememberFeedPosition } from './feed-scroll-memory';
import { WebFeedViewport } from './follow-web-feed';
import { useFeedWheel } from './scroll-web-feed';

type ListRef = RefObject<LegendListRef | null>;

type OnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

const webViewport = (): WebFeedViewport | undefined =>
  Platform.OS === 'web' ? new WebFeedViewport() : undefined;

export function useFeedOnScroll(
  sessionId: string | undefined,
  list: ListRef,
): OnScroll {
  const [viewport] = useState(webViewport);
  const focused = useScreenFocused();

  return useCallback(
    ({ nativeEvent }) => {
      if (!focused) return;

      viewport?.scrolled(list.current, nativeEvent);
      rememberFeedPosition(sessionId, list);
    },
    [focused, sessionId, list, viewport],
  );
}

interface Drawing {
  list: ListRef;
  base: typeof feedListProps;
  listProps: FeedListProps;
  fade: ReturnType<typeof useFeedFade>;
  onScroll: OnScroll;
}

export function DrawFeedScroll({
  list,
  base,
  listProps,
  fade,
  onScroll,
}: Drawing): React.JSX.Element {
  const wheel = useFeedWheel(list);

  // On a wide window `feed-scrollbar` keeps the web scrollbar drawn while the Feed can scroll, rather than only while it moves.
  return (
    <View ref={wheel} className="feed-scrollbar min-h-0 flex-1">
      <List ref={list} {...base} {...listProps} {...fade} onScroll={onScroll} />
    </View>
  );
}
