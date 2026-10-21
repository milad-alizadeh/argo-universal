import * as React from 'react';
import { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { motionDuration } from '#kit/motion';
import { NativeOnlyAnimatedView } from '#primitives/native/native-only-animated-view';
import { useDialogState } from './dialog-context';
import { dialogExiting } from './dialog-motion';
import { DialogBackdrop } from './dialog-parts';

type OverlayProps = { children?: React.ReactNode; dismissible?: boolean };

const overlayClassName =
  'absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-scrim/50 p-2 web:animate-in web:fade-in-0 web:fixed web:cursor-default web:*:cursor-auto';

const contentEntering = FadeIn.delay(motionDuration.enterDelay).reduceMotion(
  ReduceMotion.System,
);

// A press on the bare backdrop closes the dialog, unless its content holds input to keep.
function useBackdropPress(dismissible: boolean | undefined): () => void {
  const { onOpenChange } = useDialogState();

  return (): void => {
    if (dismissible !== false) onOpenChange(false);
  };
}

export function DialogOverlay(props: OverlayProps): React.JSX.Element {
  const onPress = useBackdropPress(props.dismissible);

  return (
    <DialogBackdrop className={overlayClassName} onPress={onPress}>
      <NativeOnlyAnimatedView
        entering={contentEntering}
        exiting={dialogExiting}
      >
        {props.children}
      </NativeOnlyAnimatedView>
    </DialogBackdrop>
  );
}
