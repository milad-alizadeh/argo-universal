import {
  type LegendListProps,
  type LegendListRef,
} from '@legendapp/list/react-native';
import type * as React from 'react';
import {
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useRef,
} from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { useClaimColumn } from '#kit/content-column/content-column';
import { SheetScrollContext } from '#kit/scroll-surface';
import { assignRef, useLegendScrollRef } from './legend-scroll-ref';
import { MeasuredLegendList } from './remeasure-after-entrance';
import {
  type FrameCaps,
  type FrameSize,
  useFrameSize,
} from './scroll-fade-frame-size';
import {
  ScrollFadeFrame,
  type ScrollFadeFrameProps,
} from './scroll-fade-frame-view';
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
  /*
   * Android switches nested scrolling off on every scroll view unless it is asked for. A list inside a
   * Compose sheet needs it on: it scrolls its own rows first and offers Material what is left, which is
   * how a sheet React Native draws the content of is dragged (owner, 2026-10-20).
   */
  nestedScrollEnabled: true,
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

// One ref that sets both; the second may hold more than `T`.
function useBothRefs<T extends Wider, Wider>(
  first: Ref<T> | undefined,
  second: Ref<Wider> | undefined,
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

const noEdgeFades = {
  top: 'never',
  bottom: 'never',
  leading: 'never',
  trailing: 'never',
} as const;

// The frame's props and the list's own, wired so the fade follows the scroll.
function useFadingList<T>({
  refScrollView,
  ...props
}: Omit<
  ScrollFadeListProps<T>,
  'ref' | 'maxHeight' | 'fitHeight'
>): FadingList<T> {
  const fade = useScrollFade(useSheetListProps(props));
  const scrollRef = useLegendScrollRef(fade.attachScrollView, refScrollView);
  const scroll = { ...fade.scroll, refScrollView: scrollRef };

  return {
    frame: fade.frame,
    list: platformListProps({ ...listDefaults, ...scroll }),
  };
}

function useSheetListProps<T>(
  props: ScrollFadeListProps<T>,
): LegendListProps<T> {
  const insideSheet = useContext(SheetScrollContext);

  return useSizeClassListProps(
    insideSheet ? { ...props, edges: noEdgeFades } : props,
  );
}

const capped = (caps: FrameCaps): boolean =>
  caps.maxHeight !== undefined || caps.fitHeight !== undefined;

// The frame's size, and the column it claims on the way: a list keeps to the Screen's column itself, its own inset inside it; only a vertical one under no cap at all fills it.
function useFrame(
  list: RefObject<LegendListRef | null>,
  caps: FrameCaps,
  horizontal: ScrollFadeListProps<unknown>['horizontal'],
): Pick<ScrollFadeFrameProps, 'className' | 'style'> {
  const frame = useFrameSize(list, caps);

  useClaimColumn(horizontal || capped(caps) ? 'keep' : 'fill');

  return { ...frame, style: useViewportStyle(frame.style, horizontal) };
}

function useViewportStyle(
  style: FrameSize['style'],
  horizontal: ScrollFadeListProps<unknown>['horizontal'],
): ViewStyle | undefined {
  const sheet = useContext(SheetScrollContext);

  return keepInViewport(style, horizontal ? undefined : sheet?.viewportHeight);
}

function keepInViewport(
  style: FrameSize['style'],
  viewport: number | undefined,
): ViewStyle | undefined {
  if (viewport === undefined) return style;

  return style
    ? { ...style, maxHeight: Math.min(style.maxHeight, viewport) }
    : { maxHeight: viewport };
}

// A Legend List whose content fades under each edge that hides more of it.
export function ScrollFadeList<T>({
  ref,
  maxHeight,
  fitHeight,
  ...props
}: ScrollFadeListProps<T>): React.JSX.Element {
  const list = useRef<LegendListRef>(null);
  const fading = useFadingList(props);
  const frame = useFrame(list, { maxHeight, fitHeight }, props.horizontal);

  return (
    <ScrollFadeFrame {...fading.frame} {...frame}>
      <MeasuredLegendList {...fading.list} ref={useBothRefs(list, ref)} />
    </ScrollFadeFrame>
  );
}
