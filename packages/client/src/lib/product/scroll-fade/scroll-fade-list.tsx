import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
} from '@legendapp/list/react-native';
import type * as React from 'react';
import {
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { ScrollFadeFrame } from './scroll-fade-frame-view';
import type { ScrollFadeOptions } from './scroll-fade-options';
import { useScrollFade } from './scroll-fade-props';

interface ListDefaults {
  style: ViewStyle;
  maintainVisibleContentPosition: false;
  recycleItems: false;
  keyboardShouldPersistTaps?: 'handled';
}

const listDefaults: ListDefaults = {
  style: { position: 'absolute', inset: 0 },
  // Otherwise it shifts the scroll position as rows are measured.
  maintainVisibleContentPosition: false,
  recycleItems: false,
};

// Legend List's web build hands this to the scroll element as an unknown DOM attribute.
if (Platform.OS !== 'web') listDefaults.keyboardShouldPersistTaps = 'handled';

export type ScrollFadeListProps<T> = LegendListProps<T> &
  ScrollFadeOptions & {
    ref?: Ref<LegendListRef>;
    // Grows with its content up to this height, then scrolls; without it the list fills its parent.
    maxHeight?: number;
  };

const sizeSignals = ['totalSize', 'headerSize', 'footerSize'] as const;

// Reports the list's content length now and whenever it changes; returns how to stop.
function followContentLength(
  list: LegendListRef,
  report: (length: number) => void,
): () => void {
  const update = (): void => report(list.getState().contentLength);
  update();
  const stops = sizeSignals.map((size) => list.getState().listen(size, update));

  return (): void => {
    for (const stop of stops) stop();
  };
}

// The list's content length, followed only while capped: Legend List's web build never calls onContentSizeChange.
function useContentLength(
  list: RefObject<LegendListRef | null>,
  follow: boolean,
): number | undefined {
  const [length, setLength] = useState<number>();
  useEffect(() => {
    if (!follow || !list.current) return;

    return followContentLength(list.current, setLength);
  }, [list, follow]);

  return length;
}

interface FrameSize {
  className?: string;
  style?: { height: number };
}

// As tall as the content, up to the cap; with no cap the frame fills its parent.
function useFrameSize(
  list: RefObject<LegendListRef | null>,
  maxHeight: number | undefined,
): FrameSize {
  const length = useContentLength(list, maxHeight !== undefined);

  if (maxHeight === undefined) return { className: 'min-h-0 flex-1' };

  return { style: { height: Math.min(length ?? maxHeight, maxHeight) } };
}

const assignRef = <T,>(ref: Ref<T> | undefined, instance: T | null): void => {
  if (typeof ref === 'function') ref(instance);
  else if (ref) ref.current = instance;
};

// One ref that sets both.
function useBothRefs<T>(
  first: Ref<T> | undefined,
  second: Ref<T> | undefined,
): (instance: T | null) => void {
  return useCallback(
    (instance: T | null) => {
      assignRef(first, instance);
      assignRef(second, instance);
    },
    [first, second],
  );
}

// A Legend List whose content fades under each edge that hides more of it.
export function ScrollFadeList<T>(
  props: ScrollFadeListProps<T>,
): React.JSX.Element {
  const { ref, maxHeight, refScrollView, ...rest } = props;
  const list = useRef<LegendListRef>(null);
  const { frame, scroll, attachScrollView } = useScrollFade(rest);
  const listRef = useBothRefs(list, ref);
  const scrollRef = useBothRefs(attachScrollView, refScrollView);
  const listProps = { ...listDefaults, ...scroll, refScrollView: scrollRef };

  return (
    <ScrollFadeFrame {...frame} {...useFrameSize(list, maxHeight)}>
      <LegendList {...listProps} ref={listRef} />
    </ScrollFadeFrame>
  );
}
