import { useMemo } from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { inColumn, useClaimColumn } from '#kit/content-column/content-column';
import { useSpacing } from '#kit/use-spacing';
import type { ScrollFadeFrameProps } from './scroll-fade-frame-view';
import {
  type ScrollFadeOptions,
  type ScrollFadeTracking,
  type SizeChange,
  fadeDepth,
  scrollFadeEndGap,
} from './scroll-fade-options';
import { useScrollFadeTracking } from './scroll-fade-tracking';

// What every scroll view takes, whether a ScrollView or a Legend List.
interface ScrollableProps {
  onContentSizeChange?: SizeChange;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentContainerClassName?: string;
}

type ScrollProps<P> = Omit<
  Omit<P, keyof ScrollFadeOptions>,
  keyof ScrollableProps
> &
  ScrollableProps & { scrollEventThrottle: number };

export interface ScrollFade<P> {
  // For the ScrollFadeFrame around the scroll view.
  frame: Omit<ScrollFadeFrameProps, 'children'>;
  // For the scroll view itself.
  scroll: ScrollProps<P>;
  // For its ref, or a Legend List's `refScrollView`.
  attachScrollView: ScrollFadeTracking['attachScrollView'];
}

// Both callbacks, or whichever is set.
function bothCallbacks(
  first: SizeChange | undefined,
  second: SizeChange | undefined,
): SizeChange | undefined {
  if (!first) return second;

  if (!second) return first;

  return (width, height) => {
    first(width, height);
    second(width, height);
  };
}

// Leaves the prop out when neither is set: Legend List's web build hands it to the DOM, which warns of an unknown handler even when it is undefined.
const sizeChangeProp = (
  onContentSizeChange: SizeChange | undefined,
): ScrollableProps => (onContentSizeChange ? { onContentSizeChange } : {});

const bottomPaddings = [
  'paddingBottom',
  'paddingBlockEnd',
  'paddingBlock',
  'paddingVertical',
  'padding',
] as const;

const setsBottomPadding = (style: ViewStyle): boolean =>
  bottomPaddings.some((key) => style[key] !== undefined);

function withEndGap(
  style: StyleProp<ViewStyle>,
  endGap: number,
): StyleProp<ViewStyle> {
  const own = StyleSheet.flatten(style) ?? {};

  return setsBottomPadding(own) ? style : { paddingBottom: endGap, ...own };
}

// Left out when unset, as Legend List's web build hands it to the DOM.
const classNameProp = (className: string | undefined): ScrollableProps =>
  className ? { contentContainerClassName: className } : {};

const useClassNamePads = (className: string | undefined): boolean =>
  setsBottomPadding(useResolveClassNames(className ?? ''));

// The last row rests a small gap above the bottom, where the fade lies, unless the content sets its own bottom padding.
function useEndGap({
  contentContainerStyle,
  contentContainerClassName,
}: ScrollableProps): StyleProp<ViewStyle> {
  const endGap = useSpacing(scrollFadeEndGap);
  const classNamePads = useClassNamePads(contentContainerClassName);

  return useMemo(
    () =>
      classNamePads
        ? contentContainerStyle
        : withEndGap(contentContainerStyle, endGap),
    [contentContainerStyle, classNamePads, endGap],
  );
}

// Whether the scroll view scrolls sideways, as a ScrollView or a Legend List says.
interface AxisProps {
  horizontal?: boolean | null;
}

// The content's class and style: a vertical scroll view's gains the end gap and the column it was offered, which a horizontal one's never takes.
function useContentProps(own: ScrollableProps & AxisProps): ScrollableProps {
  const column = useClaimColumn();
  const ended = useEndGap(own);
  const vertical = useMemo(() => inColumn(column, ended), [column, ended]);

  return {
    ...classNameProp(own.contentContainerClassName),
    contentContainerStyle: own.horizontal
      ? own.contentContainerStyle
      : vertical,
  };
}

// The scroll view's props without the ones the fade takes over.
function ownProps<P extends ScrollableProps>({
  onContentSizeChange: _sizeChange,
  contentContainerStyle: _style,
  contentContainerClassName: _className,
  ...rest
}: P): Omit<P, keyof ScrollableProps> {
  return rest;
}

function useScrollProps<P extends ScrollableProps & AxisProps>(
  props: P,
  tracking: ScrollFadeTracking,
): Omit<P, keyof ScrollableProps> & ScrollableProps {
  return {
    ...ownProps(props),
    ...useContentProps(props),
    ...sizeChangeProp(
      bothCallbacks(tracking.onContentSizeChange, props.onContentSizeChange),
    ),
  };
}

interface SplitProps<P> {
  options: ScrollFadeOptions;
  rest: Omit<P, keyof ScrollFadeOptions>;
}

// The fade's options apart from the scroll view's own props.
function splitOptions<P extends ScrollFadeOptions>({
  edges,
  depth,
  inset,
  surfaceClassName,
  ...rest
}: P): SplitProps<P> {
  return { options: { edges, depth, inset, surfaceClassName }, rest };
}

// Splits any scroll view's props into its frame's and its own, and wires the two together so the fade follows the scroll.
export function useScrollFade<
  P extends ScrollFadeOptions & ScrollableProps & AxisProps,
>(props: P): ScrollFade<P> {
  const { options, rest } = splitOptions(props);
  const horizontal = Boolean(props.horizontal);
  const tracking = useScrollFadeTracking(horizontal);
  const scroll = useScrollProps(rest, tracking);
  const depth = fadeDepth(options.depth);

  return {
    frame: { ...options, depth, horizontal, tracking },
    scroll: { scrollEventThrottle: 16, ...scroll },
    attachScrollView: tracking.attachScrollView,
  };
}
