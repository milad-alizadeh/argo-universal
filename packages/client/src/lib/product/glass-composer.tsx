import type * as React from 'react';
import type { ViewProps, ViewStyle, ViewInstance } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useGlassBarSpace } from './composer-cover';
import { ComposerColumn } from './session-column';

interface GlassComposerProps extends Pick<ViewProps, 'onLayout' | 'children'> {
  // How far down the stage a floating header reaches: the Composer never grows up past it.
  top: number;
  measure: (view: ViewInstance | null) => void;
}

// The box takes no touches itself, so the Feed behind it still scrolls.
const boxProps = {
  pointerEvents: 'box-none',
  className: 'absolute bottom-0 left-0 right-0 z-10 justify-end',
} as const;

/*
 * The Composer column is measured without the home indicator's space, which follows the keyboard frame by frame.
 * The box runs from the floating header's bottom edge to the stage's bottom and leaves the Composer at its end: the
 * column inside gives its own height up against that, so the toolbar is never the part left below it (#1529) and
 * its pills never reach up under the status bar and the Back button, which a transparent header lays the page
 * under (#1648).
 */
export function GlassComposer({
  top,
  measure,
  ...props
}: GlassComposerProps): React.JSX.Element {
  const style = [useHomeIndicatorSpace(), { top }];

  return (
    <Animated.View {...boxProps} style={style}>
      <ComposerColumn {...props} ref={measure} />
    </Animated.View>
  );
}

function useHomeIndicatorSpace(): ReturnType<
  typeof useAnimatedStyle<ViewStyle>
> {
  const bottom = useGlassBarSpace();
  const { progress } = useReanimatedKeyboardAnimation();

  return useAnimatedStyle(
    () => ({ paddingBottom: bottom * (1 - progress.get()) }),
    [bottom, progress],
  );
}
