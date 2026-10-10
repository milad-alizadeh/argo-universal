import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { type GestureResponderEvent, Platform } from 'react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { motionDuration } from '#lib/motion';
import { cn } from '#lib/utils';
import { NativeOnlyAnimatedView } from '#primitives/native-only-animated-view';

type OverlayProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Overlay>,
  'asChild'
> & { children?: React.ReactNode };
const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;
const overlayClassName = cn(
  'absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/50 p-2',
  Platform.select({
    web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto',
  }),
);
const entering = FadeIn.duration(motionDuration.enter).reduceMotion(
  ReduceMotion.System,
);
const exiting = FadeOut.duration(motionDuration.exit).reduceMotion(
  ReduceMotion.System,
);
const contentEntering = FadeIn.delay(motionDuration.enterDelay).reduceMotion(
  ReduceMotion.System,
);

function isBackdropPress(event: GestureResponderEvent): boolean {
  return event.target === event.currentTarget && !event.isDefaultPrevented();
}

function useOverlayPress(
  onPress: OverlayProps['onPress'],
): OverlayProps['onPress'] {
  const { onOpenChange } = DialogPrimitive.useRootContext();
  return (event): void => {
    onPress?.(event);
    if (isBackdropPress(event)) onOpenChange(false);
  };
}

function ContentAnimation({
  children,
}: Pick<OverlayProps, 'children'>): React.JSX.Element {
  return React.createElement(
    NativeOnlyAnimatedView,
    { entering: contentEntering, exiting },
    children,
  );
}

const animationProps = { entering, exiting, as: 'Pressable' } as const;

function useOverlayProps({
  className,
  onPress,
  ...props
}: OverlayProps): React.ComponentProps<typeof DialogPrimitive.Overlay> {
  const onOverlayPress = useOverlayPress(onPress);
  return {
    ...props,
    className: cn(overlayClassName, className),
    onPress: Platform.select({ web: onOverlayPress, native: onPress }),
    asChild: Platform.OS !== 'web',
  };
}

function AnimatedDialogOverlay(props: OverlayProps): React.JSX.Element {
  const overlayProps = useOverlayProps(props);
  return (
    <DialogPrimitive.Overlay {...overlayProps}>
      <NativeOnlyAnimatedView {...animationProps}>
        <ContentAnimation>{props.children}</ContentAnimation>
      </NativeOnlyAnimatedView>
    </DialogPrimitive.Overlay>
  );
}

export function DialogOverlay(props: OverlayProps): React.JSX.Element {
  return (
    <FullWindowOverlay>
      <AnimatedDialogOverlay {...props} />
    </FullWindowOverlay>
  );
}
