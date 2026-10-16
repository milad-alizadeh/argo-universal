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
import { Platform } from 'react-native';
import { useSizeClassValue } from '../../generic/use-size-class/use-size-class-value';
import { ScrollFadeFrame } from './scroll-fade-frame-view';
import {
  type ScrollFadeListProps,
  useSizeClassListProps,
} from './scroll-fade-list-props';
import { type ScrollFade, useScrollFade } from './scroll-fade-props';

export type { ScrollFadeListProps } from './scroll-fade-list-props';

const listDefaults = {
  style: { position: 'absolute', inset: 0 },
  // Otherwise it shifts the scroll position as rows are measured.
  maintainVisibleContentPosition: false,
  recycleItems: false,
  keyboardShouldPersistTaps: 'handled',
} as const;

// Props only native scroll views take: Legend List's web build hands them to its scroll element, where React warns of unknown attributes.
interface NativeOnlyListProps {
  keyboardShouldPersistTaps?: unknown;
  keyboardDismissMode?: unknown;
  nestedScrollEnabled?: unknown;
  contentInsetAdjustmentBehavior?: unknown;
}

type WebListProps<P> = Omit<P, keyof NativeOnlyListProps>;

function webListProps<P extends NativeOnlyListProps>({
  keyboardShouldPersistTaps: _taps,
  keyboardDismissMode: _dismiss,
  nestedScrollEnabled: _nested,
  contentInsetAdjustmentBehavior: _inset,
  ...props
}: P): WebListProps<P> {
  return props;
}

const platformListProps = <P extends NativeOnlyListProps>(
  props: P,
): P | WebListProps<P> => (Platform.OS === 'web' ? webListProps(props) : props);

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

// As tall as the content, up to the window's size class's cap; with no cap the frame fills its parent.
function useFrameSize(
  list: RefObject<LegendListRef | null>,
  cap: ScrollFadeListProps<unknown>['maxHeight'],
): FrameSize {
  const maxHeight = useSizeClassValue(cap);
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

interface FadingList<T> {
  frame: ScrollFade<object>['frame'];
  list: LegendListProps<T>;
}

// The frame's props and the list's own, wired so the fade follows the scroll.
function useFadingList<T>({
  refScrollView,
  ...props
}: Omit<ScrollFadeListProps<T>, 'ref' | 'maxHeight'>): FadingList<T> {
  const fade = useScrollFade(useSizeClassListProps(props));
  const scrollRef = useBothRefs(fade.attachScrollView, refScrollView);
  const scroll = { ...fade.scroll, refScrollView: scrollRef };

  return {
    frame: fade.frame,
    list: platformListProps({ ...listDefaults, ...scroll }),
  };
}

// A Legend List whose content fades under each edge that hides more of it.
export function ScrollFadeList<T>({
  ref,
  maxHeight,
  ...props
}: ScrollFadeListProps<T>): React.JSX.Element {
  const list = useRef<LegendListRef>(null);
  const listRef = useBothRefs(list, ref);
  const fading = useFadingList(props);

  return (
    <ScrollFadeFrame {...fading.frame} {...useFrameSize(list, maxHeight)}>
      <LegendList {...fading.list} ref={listRef} />
    </ScrollFadeFrame>
  );
}
