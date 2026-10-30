import type * as React from 'react';
import type { ViewProps, ViewStyle, ViewInstance } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useGlassBarSpace } from './composer-cover';
import { ComposerColumn } from './session-column';

interface GlassComposerProps extends Pick<ViewProps, 'onLayout' | 'children'> {
  measure: (view: ViewInstance | null) => void;
}

/*
 * The Composer column is measured without the home indicator's space, which follows the keyboard frame by frame.
 * `max-h-full` states the height the stage leaves above the keyboard rather than leaving it to be inferred: the
 * column inside gives its own height up against that, so the toolbar is never the part left below it (#1529).
 */
export function GlassComposer({
  measure,
  ...props
}: GlassComposerProps): React.JSX.Element {
  const homeIndicatorSpace = useHomeIndicatorSpace();

  return (
    <Animated.View
      className="absolute bottom-0 left-0 right-0 z-10 max-h-full"
      style={homeIndicatorSpace}
    >
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
