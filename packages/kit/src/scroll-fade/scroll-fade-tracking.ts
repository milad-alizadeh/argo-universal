import { useCallback } from 'react';
import type { ScrollViewInstance } from 'react-native';
import {
  type AnimatedRef,
  type SharedValue,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';
import type { ScrollFadeTracking } from './scroll-fade-options';

function useAttach(
  scrollView: AnimatedRef<ScrollViewInstance>,
): (instance: ScrollViewInstance | null) => void {
  return useCallback(
    (instance: ScrollViewInstance | null) => {
      if (instance) scrollView(instance);
    },
    [scrollView],
  );
}

interface ContentLength {
  content: SharedValue<number>;
  onContentSizeChange: (width: number, height: number) => void;
}

// The content's length along the scroll's axis: its width when it scrolls sideways.
function useContentLength(horizontal: boolean): ContentLength {
  const content = useSharedValue(0);

  const onContentSizeChange = useCallback(
    (width: number, height: number) => content.set(horizontal ? width : height),
    [content, horizontal],
  );

  return { content, onContentSizeChange };
}

// Follows a scroll view's offset on the UI thread, and its content length as it changes, so scrolling never renders React. Reanimated's offset is the horizontal one for a scroll view that scrolls sideways.
export function useScrollFadeTracking(
  horizontal = false,
): Required<ScrollFadeTracking> {
  const scrollView = useAnimatedRef<ScrollViewInstance>();
  const offset = useScrollOffset(scrollView);
  const viewport = useSharedValue(0);
  const { content, onContentSizeChange } = useContentLength(horizontal);

  return {
    attachScrollView: useAttach(scrollView),
    onContentSizeChange,
    metrics: { offset, content, viewport },
  };
}
