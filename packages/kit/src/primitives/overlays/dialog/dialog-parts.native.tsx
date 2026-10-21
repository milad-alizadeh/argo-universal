import { type ReactElement, type ReactNode, useEffect, useId } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { motionDuration } from '#kit/motion';
import { NativeOnlyAnimatedView } from '#primitives/native/native-only-animated-view';
import { triggerChild } from '#primitives/overlays/open-state';
import { Portal } from '#primitives/overlays/portal';
import { DialogContext, useDialogState } from './dialog-context';
import { dialogExiting } from './dialog-motion';
import type {
  DialogBackdropProps,
  DialogFrameProps,
  DialogRootProps,
  DialogTextProps,
  DialogTriggerProps,
} from './dialog-props';

// The phone's dialog parts, drawn with React Native views.
export function DialogRootView(props: DialogRootProps): ReactElement {
  return (
    <View className={props.className} style={props.style}>
      {props.children}
    </View>
  );
}

export function DialogTrigger(props: DialogTriggerProps): ReactElement | null {
  const { open, onOpenChange } = useDialogState();

  return triggerChild(
    props.children,
    { onPress: () => onOpenChange(!open) },
    { role: 'button' },
  );
}

// Drawn at the app root's portal host, which sits outside the dialog, so the dialog's state comes along.
export function DialogPortal(props: { children: ReactNode }): ReactElement {
  const state = useDialogState();
  const name = useId();

  return (
    <Portal name={name}>
      {state.open ? (
        <DialogContext.Provider value={state}>
          {props.children}
        </DialogContext.Provider>
      ) : null}
    </Portal>
  );
}

const entering = FadeIn.duration(motionDuration.enter).reduceMotion(
  ReduceMotion.System,
);

export function DialogBackdrop(props: DialogBackdropProps): ReactElement {
  return (
    <NativeOnlyAnimatedView
      as="Pressable"
      accessible={false}
      entering={entering}
      exiting={dialogExiting}
      className={props.className}
      onPress={props.onPress}
    >
      {props.children}
    </NativeOnlyAnimatedView>
  );
}

// Back on Android closes the dialog, as Escape does on the web.
function useBackCloses(onOpenChange: (open: boolean) => void): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onOpenChange(false);

        return true;
      },
    );

    return (): void => subscription.remove();
  }, [onOpenChange]);
}

// A press inside the dialog stays there instead of reaching the backdrop behind it.
const keepsPresses = { onStartShouldSetResponder: (): boolean => true };

export function DialogFrame(props: DialogFrameProps): ReactElement {
  const { onOpenChange } = useDialogState();
  useBackCloses(onOpenChange);

  return (
    <View
      {...frameRole}
      {...keepsPresses}
      className={props.className}
      accessibilityLabel={props.accessibilityLabel}
      onAccessibilityEscape={() => onOpenChange(false)}
    >
      {props.children}
    </View>
  );
}

const frameRole = { role: 'dialog', 'aria-modal': true } as const;

export function DialogTitleText(props: DialogTextProps): ReactElement {
  return (
    <Text role="heading" aria-level={2} className={props.className}>
      {props.children}
    </Text>
  );
}

export function DialogDescriptionText(props: DialogTextProps): ReactElement {
  return <Text className={props.className}>{props.children}</Text>;
}
