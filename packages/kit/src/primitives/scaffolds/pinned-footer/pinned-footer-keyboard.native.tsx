import type { ReactNode } from 'react';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const fill = { flex: 1, minHeight: 0 };

/*
 * How far the open keyboard lifts the footer: its own height less the bottom inset the page already holds clear, so the Connect button stays above it. KeyboardAvoidingView measures where the view sits in the window and, under a native header, comes up the header's height short (the Screen in the client's `KeyboardAvoidingContent` says the same), so the keyboard's own height is used instead.
 */
function keyboardSpace(keyboard: number, inset: number): number {
  'worklet';

  return Math.max(-keyboard - inset, 0);
}

// The footer rides above the soft keyboard, frame by frame, so the button that finishes the form never sits behind it.
export function PinnedFooterKeyboard({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const { bottom } = useSafeAreaInsets();
  const { height } = useReanimatedKeyboardAnimation();

  const lift = useAnimatedStyle(
    () => ({ paddingBottom: keyboardSpace(height.get(), bottom) }),
    [bottom],
  );

  return <Animated.View style={[fill, lift]}>{children}</Animated.View>;
}
