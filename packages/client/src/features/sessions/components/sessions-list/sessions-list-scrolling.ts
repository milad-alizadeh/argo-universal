import type * as React from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  type ScrollView,
} from 'react-native';

const endMeasurementTolerance = 8;

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

interface LoadingFooterReveal {
  scrollView: React.RefObject<ScrollView | null>;
  trackAtEnd: ScrollHandler;
  revealIfPending: () => void;
}

function scrollToEndNextFrame(
  scrollView: React.RefObject<ScrollView | null>,
): void {
  requestAnimationFrame(() => {
    scrollView.current?.scrollToEnd({ animated: false });
  });
}

function isAtEnd({
  contentOffset,
  contentSize,
  layoutMeasurement,
}: NativeScrollEvent): boolean {
  return (
    contentSize.height - contentOffset.y - layoutMeasurement.height <=
    endMeasurementTolerance
  );
}

function recordAtEnd(
  atEnd: React.RefObject<boolean>,
  { nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>,
): void {
  atEnd.current = isAtEnd(nativeEvent);
}

function revealPendingFooter(
  revealPending: React.RefObject<boolean>,
  scrollView: React.RefObject<ScrollView | null>,
): void {
  if (!revealPending.current) return;
  revealPending.current = false;
  scrollToEndNextFrame(scrollView);
}

function useRevealWhenFetching(
  isFetchingNextPage: boolean,
  scrollView: React.RefObject<ScrollView | null>,
): {
  atEnd: React.RefObject<boolean>;
  revealPending: React.RefObject<boolean>;
} {
  const atEnd = useRef(false);
  const revealPending = useRef(false);
  useLayoutEffect(() => {
    revealPending.current = isFetchingNextPage && atEnd.current;
    if (revealPending.current) scrollToEndNextFrame(scrollView);
  }, [isFetchingNextPage, scrollView]);
  return { atEnd, revealPending };
}

// When the next page starts loading while the reader is at the end, scrolls the loading footer into view.
function useRevealLoadingFooter(
  isFetchingNextPage: boolean,
): LoadingFooterReveal {
  const scrollView = useRef<ScrollView>(null);
  const reveal = useRevealWhenFetching(isFetchingNextPage, scrollView);
  return {
    scrollView,
    trackAtEnd: (event) => recordAtEnd(reveal.atEnd, event),
    revealIfPending: () =>
      revealPendingFooter(reveal.revealPending, scrollView),
  };
}

// Legend List's web build hands unknown props to its DOM element, and never calls onContentSizeChange.
function nativeOnlyListProps(onContentSizeChange: () => void): {
  contentInsetAdjustmentBehavior?: 'automatic';
  onContentSizeChange?: () => void;
} {
  if (Platform.OS === 'web') return {};
  return { contentInsetAdjustmentBehavior: 'automatic', onContentSizeChange };
}

// Scroll events stop for this long before the list counts as at rest.
const scrollSettleMilliseconds = 150;

// Whether the web list is scrolling: it changes once when a scroll starts and once when it settles, never per frame.
export function useScrolling(): { scrolling: boolean; onScroll: () => void } {
  const [scrolling, setScrolling] = useState(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => (): void => clearTimeout(settle.current ?? 0), []);
  const onScroll = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setScrolling(true);
    clearTimeout(settle.current ?? 0);
    settle.current = setTimeout(
      () => setScrolling(false),
      scrollSettleMilliseconds,
    );
  }, []);
  return { scrolling, onScroll };
}

interface ListScrolling {
  refScrollView: React.RefObject<ScrollView | null>;
  onScroll: ScrollHandler;
  contentInsetAdjustmentBehavior?: 'automatic';
  onContentSizeChange?: () => void;
}

interface ListScrollingInput {
  isFetchingNextPage?: boolean;
  onScroll: ScrollHandler;
}

export function useListScrolling(props: ListScrollingInput): ListScrolling {
  const loadingFooter = useRevealLoadingFooter(
    props.isFetchingNextPage ?? false,
  );
  return {
    refScrollView: loadingFooter.scrollView,
    onScroll: (event) => {
      props.onScroll(event);
      loadingFooter.trackAtEnd(event);
    },
    ...nativeOnlyListProps(loadingFooter.revealIfPending),
  };
}
