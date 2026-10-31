import { bezierEasing } from '@repo/kit/bezier-easing';
import { Surface } from '@repo/kit/primitives/layout/surface';
import type * as React from 'react';
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { FrameTiming } from '../../utils/frame-timing';
import { type PaneSpan, paneShift } from '../../utils/pane-shift';
import { useStableContentWidth } from './stable-content-width';

export interface FramePaneProps {
  testID: string;
  width: number;
  offset: number;
  contentWidth?: number;
  hidden: boolean;
  transitionKey: string;
  animate?: boolean;
  timing: FrameTiming;
  children: ReactNode;
  // The window owns a glass pane's material; its content clips inside the material's shadow.
  surface?: 'glass';
}

type AnimatedViewStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

type PaneContentProps = Pick<
  FramePaneProps,
  'testID' | 'width' | 'contentWidth' | 'children'
> & { shiftStyle: AnimatedViewStyle };

interface HiddenPaneProps extends ViewProps {
  inert: boolean;
}

interface PaneMotionValues {
  width: SharedValue<number>;
  shift: SharedValue<number>;
}

const timed = (value: number, { duration, curve }: FrameTiming): number =>
  withTiming(value, {
    duration,
    easing: bezierEasing(curve),
    reduceMotion: ReduceMotion.System,
  });

// A pane with content of its own width, or one showing or hiding, clips it by its width; a reflowing pane that stays takes its new width at once and slides its content there (FLIP), so the Feed lays out once.
const slidesBetween = (props: FramePaneProps, last: PaneSpan): boolean =>
  props.contentWidth === undefined && last.width > 0 && props.width > 0;

function play(
  values: PaneMotionValues,
  props: FramePaneProps,
  last: PaneSpan,
): void {
  if (slidesBetween(props, last)) {
    values.width.set(props.width);
    values.shift.set(values.shift.get() + paneShift(last, props));
    values.shift.set(timed(0, props.timing));

    return;
  }

  values.width.set(timed(props.width, props.timing));
}

const moves = (props: FramePaneProps, last: FramePaneProps): boolean =>
  (props.animate ?? true) && last.transitionKey !== props.transitionKey;

function usePaneMotion(values: PaneMotionValues, props: FramePaneProps): void {
  const last = useRef(props);
  useLayoutEffect(() => {
    if (moves(props, last.current)) play(values, props, last.current);
    else values.width.set(props.width);

    last.current = props;
  }, [values, props]);
}

/*
 * A closed pane is 0 wide and waits at the window's edge, but a native Surface's shadow is not clipped by its box, so it
 * would bleed back across the content (#1703). Once the width reaches 0 nothing of it is drawn; while it animates the
 * shadow goes with the edge, as on the web.
 */
const drawn = (width: number): number => (width > 0 ? 1 : 0);

interface PaneStyles {
  // The pane's clip, and its content's slide.
  widthStyle: AnimatedViewStyle;
  shiftStyle: AnimatedViewStyle;
}

function usePaneStyles(props: FramePaneProps): PaneStyles {
  const width = useSharedValue(props.width);
  const shift = useSharedValue(0);
  usePaneMotion({ width, shift }, props);

  return {
    widthStyle: useAnimatedStyle<ViewStyle>(
      () => ({ width: width.get(), opacity: drawn(width.get()) }),
      [width],
    ),
    shiftStyle: useAnimatedStyle<ViewStyle>(
      () => ({ transform: [{ translateX: shift.get() }] }),
      [shift],
    ),
  };
}

function hiddenPaneProps(hidden: boolean): HiddenPaneProps {
  return {
    className: hidden
      ? 'min-w-0 shrink-0 pointer-events-none'
      : 'min-w-0 shrink-0 pointer-events-auto',
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? 'no-hide-descendants' : 'auto',
    'aria-hidden': hidden,
    inert: hidden,
  };
}

function PaneContent(props: PaneContentProps): React.JSX.Element {
  const width = useStableContentWidth(props.width, props.contentWidth);

  return (
    <Animated.View
      testID={`${props.testID}-content`}
      className="flex-1"
      style={[{ width }, props.shiftStyle]}
    >
      {props.children}
    </Animated.View>
  );
}

type PaneDrawingProps = PaneContentProps & Pick<FramePaneProps, 'surface'>;

function PaneClip({ surface, ...props }: PaneDrawingProps): React.JSX.Element {
  const className = surface
    ? 'flex-1 overflow-hidden rounded-2xl'
    : 'flex-1 overflow-hidden';

  return (
    <View className={className}>
      <PaneContent {...props} />
    </View>
  );
}

function PaneMaterial(props: PaneDrawingProps): React.JSX.Element {
  const content = <PaneClip {...props} />;

  return props.surface ? (
    <Surface kind={props.surface} fill>
      {content}
    </Surface>
  ) : (
    content
  );
}

export function FramePane(props: FramePaneProps): React.JSX.Element {
  const { widthStyle, shiftStyle } = usePaneStyles(props);

  return (
    <Animated.View
      testID={props.testID}
      style={widthStyle}
      {...hiddenPaneProps(props.hidden)}
    >
      <PaneMaterial {...props} shiftStyle={shiftStyle} />
    </Animated.View>
  );
}
