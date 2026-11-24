import type { LegendListRef } from '@legendapp/list/react-native';
import { List } from '@repo/kit/primitives/lists/list';
import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
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
import { throttle } from './throttle';

// A scroll event comes every frame; a few saves a second keep the read position close enough.
const positionSaveInterval = 250;

type ListRef = RefObject<LegendListRef | null>;

type OnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

const webViewport = (): WebFeedViewport | undefined =>
  Platform.OS === 'web' ? new WebFeedViewport() : undefined;

function useWebViewport(
  list: ListRef,
  sessionId: string | undefined,
  focused: boolean,
): void {
  const [viewport] = useState(webViewport);
  useLayoutEffect(() => {
    if (!focused) return;

    return viewport?.watch(list.current);
  }, [focused, list, sessionId, viewport]);
}

export function useFeedOnScroll(
  sessionId: string | undefined,
  list: ListRef,
): OnScroll {
  const focused = useScreenFocused();
  useWebViewport(list, sessionId, focused);

  const save = useMemo(
    () =>
      throttle(() => {
        if (focused) rememberFeedPosition(sessionId, list);
      }, positionSaveInterval),
    [focused, sessionId, list],
  );

  useEffect(() => save.cancel, [save]);

  return save.call;
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
