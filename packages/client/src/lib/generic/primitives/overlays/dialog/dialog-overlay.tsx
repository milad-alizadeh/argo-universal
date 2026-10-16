import * as React from 'react';
import { type GestureResponderEvent, Platform } from 'react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { motionDuration } from '#lib/generic/motion';
import { NativeOnlyAnimatedView } from '#primitives/native/native-only-animated-view';
import { useDialogState } from './dialog-context';
import { DialogBackdrop } from './dialog-parts';
import { DialogWindow } from './dialog-window';

type OverlayProps = { children?: React.ReactNode; dismissible?: boolean };

const overlayClassName =
  'absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-scrim/50 p-2 web:animate-in web:fade-in-0 web:fixed web:cursor-default web:*:cursor-auto';

const exiting = FadeOut.duration(motionDuration.exit).reduceMotion(
  ReduceMotion.System,
);

const contentEntering = FadeIn.delay(motionDuration.enterDelay).reduceMotion(
  ReduceMotion.System,
);

// On the web a press inside the content bubbles to the backdrop; phones keep it in the content.
function isBackdropPress(event: GestureResponderEvent): boolean {
  if (Platform.OS !== 'web') return true;

  return event.target === event.currentTarget && !event.isDefaultPrevented();
}

// A press on the bare backdrop closes the dialog, unless its content holds input to keep.
function useBackdropPress(
  dismissible: boolean | undefined,
): (event: GestureResponderEvent) => void {
  const { onOpenChange } = useDialogState();

  return (event): void => {
    if (dismissible !== false && isBackdropPress(event)) onOpenChange(false);
  };
}

export function DialogOverlay(props: OverlayProps): React.JSX.Element {
  const onPress = useBackdropPress(props.dismissible);

  return (
    <DialogWindow dismissible={props.dismissible}>
      <DialogBackdrop className={overlayClassName} onPress={onPress}>
        <NativeOnlyAnimatedView entering={contentEntering} exiting={exiting}>
          {props.children}
        </NativeOnlyAnimatedView>
      </DialogBackdrop>
    </DialogWindow>
  );
}
