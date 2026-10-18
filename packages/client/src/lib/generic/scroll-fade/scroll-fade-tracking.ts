import { useCallback } from 'react';
import type { ScrollView } from 'react-native';
import {
  type AnimatedRef,
  type SharedValue,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
} from 'react-native-reanimated';
import type { ScrollFadeTracking } from './scroll-fade-options';

function useAttach(
  scrollView: AnimatedRef<ScrollView>,
): (instance: ScrollView | null) => void {
  return useCallback(
    (instance: ScrollView | null) => {
      if (instance) scrollView(instance);
    },
    [scrollView],
  );
}

interface ContentHeight {
  content: SharedValue<number>;
  onContentSizeChange: (width: number, height: number) => void;
}

function useContentHeight(): ContentHeight {
  const content = useSharedValue(0);

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => content.set(height),
    [content],
  );

  return { content, onContentSizeChange };
}

// Follows a scroll view's offset on the UI thread, and its content height as it changes, so scrolling never renders React.
export function useScrollFadeTracking(): Required<ScrollFadeTracking> {
  const scrollView = useAnimatedRef<ScrollView>();
  const offset = useScrollOffset(scrollView);
  const viewport = useSharedValue(0);
  const { content, onContentSizeChange } = useContentHeight();

  return {
    attachScrollView: useAttach(scrollView),
    onContentSizeChange,
    metrics: { offset, content, viewport },
  };
}
