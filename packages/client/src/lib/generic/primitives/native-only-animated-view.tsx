import { useEffect, useRef } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function usePresentationClosed(
  mounted: boolean,
  onClosed?: () => void,
): void {
  const wasMounted = useRef(false);
  useEffect(() => {
    if (mounted) wasMounted.current = true;
    else if (wasMounted.current) {
      wasMounted.current = false;
      onClosed?.();
    }
  }, [mounted, onClosed]);
}

/**
 * This component is used to wrap animated views that should only be animated on native.
 * @param props - The props for the animated view.
 * @returns The animated view if the platform is native, otherwise the children.
 * @example
 * <NativeOnlyAnimatedView entering={FadeIn} exiting={FadeOut}>
 *   <Text>I am only animated on native</Text>
 * </NativeOnlyAnimatedView>
 */
function NativeOnlyAnimatedView(
  props:
    | (React.ComponentProps<typeof Animated.View> &
        React.RefAttributes<typeof Animated.View> & { as?: 'View' })
    | (Omit<React.ComponentProps<typeof AnimatedPressable>, 'children'> & {
        children?: React.ReactNode;
      } & React.RefAttributes<typeof AnimatedPressable> & { as: 'Pressable' }),
) {
  if (Platform.OS === 'web') {
    return <>{props.children}</>;
  } else {
    if (props.as === 'Pressable') {
      return <AnimatedPressable {...props} />;
    }
    return <Animated.View {...props} />;
  }
}

export { NativeOnlyAnimatedView };
