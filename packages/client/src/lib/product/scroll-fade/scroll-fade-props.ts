import type { StyleProp, ViewStyle } from 'react-native';
import { useScrollColumnStyle } from '#lib/generic/scroll-column';
import type { ScrollFadeFrameProps } from './scroll-fade-frame-view';
import {
  type ScrollFadeOptions,
  type ScrollFadeTracking,
  type SizeChange,
  useFadeDepth,
} from './scroll-fade-options';
import { useScrollFadeTracking } from './scroll-fade-tracking';

// What every scroll view takes, whether a ScrollView or a Legend List.
interface ScrollableProps {
  onContentSizeChange?: SizeChange;
  contentContainerStyle?: StyleProp<ViewStyle>;
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

function useScrollProps<P extends ScrollableProps>(
  { onContentSizeChange, contentContainerStyle, ...props }: P,
  tracking: ScrollFadeTracking,
): Omit<P, keyof ScrollableProps> & ScrollableProps {
  return {
    ...props,
    contentContainerStyle: useScrollColumnStyle(contentContainerStyle),
    ...sizeChangeProp(
      bothCallbacks(tracking.onContentSizeChange, onContentSizeChange),
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

// The frame's props, each edge's depth filled in.
function useFrame(
  { depth, ...options }: ScrollFadeOptions,
  tracking: ScrollFadeTracking,
): ScrollFade<object>['frame'] {
  return { ...options, depth: useFadeDepth(depth), tracking };
}

// Splits any scroll view's props into its frame's and its own, and wires the two together so the fade follows the scroll.
export function useScrollFade<P extends ScrollFadeOptions & ScrollableProps>(
  props: P,
): ScrollFade<P> {
  const { options, rest } = splitOptions(props);
  const tracking = useScrollFadeTracking();
  const scroll = useScrollProps(rest, tracking);

  return {
    frame: useFrame(options, tracking),
    scroll: { scrollEventThrottle: 16, ...scroll },
    attachScrollView: tracking.attachScrollView,
  };
}
