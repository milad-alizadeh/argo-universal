import { useEffect, useRef } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function notifyClosed(onClosed?: () => void): void {
  onClosed?.();
}

export function usePresentationClosed(
  mounted: boolean,
  onClosed?: () => void,
): void {
  const wasMounted = useRef(false);
  useEffect(() => {
    if (mounted) {
      wasMounted.current = true;
      return;
    }
    if (!wasMounted.current) return;
    wasMounted.current = false;
    notifyClosed(onClosed);
  }, [mounted, onClosed]);
}

type AnimatedViewProps =
  | (Omit<React.ComponentProps<typeof Animated.View>, 'children'> & {
      children?: React.ReactNode;
    } & React.RefAttributes<typeof Animated.View> & { as?: 'View' })
  | (Omit<React.ComponentProps<typeof AnimatedPressable>, 'children'> & {
      children?: React.ReactNode;
    } & React.RefAttributes<typeof AnimatedPressable> & { as: 'Pressable' });

function NativeOnlyAnimatedView(props: AnimatedViewProps): React.ReactNode {
  if (Platform.OS === 'web') return props.children;
  if (props.as === 'Pressable') return <AnimatedPressable {...props} />;
  return <Animated.View {...props} />;
}

export { NativeOnlyAnimatedView };
