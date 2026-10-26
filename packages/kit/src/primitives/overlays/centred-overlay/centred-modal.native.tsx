import { type ReactElement, useCallback, useEffect, useId } from 'react';
import { BackHandler, View } from 'react-native';
import { NativeOnlyAnimatedView } from '#primitives/native/native-only-animated-view';
import {
  triggerChild,
  type TriggerElement,
} from '#primitives/overlays/open-state';
import { Portal } from '#primitives/overlays/portal';
import {
  cardEntering,
  modalExiting,
  scrimEntering,
} from './centred-modal-motion';
import type { CentredModalFrameProps } from './centred-modal-props';
import {
  CentredModalContext,
  useCentredModalState,
} from './centred-modal-state';
import { CentredOverlayScope } from './centred-overlay';
import { mayDismiss } from './dismissal';

// The phone's centred modal, drawn with React Native views. A phone raises a sheet at every width, so this draws only where the app asks for a centred card.
export { CentredModalProvider as CentredModalRoot } from './centred-modal-provider';

export function CentredModalTrigger(props: {
  children: TriggerElement;
}): ReactElement | null {
  const { open, onOpenChange } = useCentredModalState();

  return triggerChild(
    props.children,
    { onPress: () => onOpenChange(!open) },
    { role: 'button' },
  );
}

const scrimClass =
  'absolute inset-0 z-50 flex items-center justify-center bg-scrim/50 p-2';

// Drawn at the app root's portal host, which sits outside the modal, so the modal's state comes along.
export function CentredModal(props: CentredModalFrameProps): ReactElement {
  const state = useCentredModalState();

  return (
    <Portal name={useId()}>
      {state.open ? (
        <CentredModalContext.Provider value={state}>
          <Card {...props} />
        </CentredModalContext.Provider>
      ) : null}
    </Portal>
  );
}

const scrimProps = {
  as: 'Pressable',
  accessible: false,
  entering: scrimEntering,
  exiting: modalExiting,
  className: scrimClass,
} as const;

function Card(props: CentredModalFrameProps): ReactElement {
  const onPress = useDismissal(props.dismissible);

  return (
    <NativeOnlyAnimatedView {...scrimProps} onPress={onPress}>
      <NativeOnlyAnimatedView entering={cardEntering} exiting={modalExiting}>
        <CentredOverlayScope>
          <CentredModalFrame {...props} />
        </CentredOverlayScope>
      </NativeOnlyAnimatedView>
    </NativeOnlyAnimatedView>
  );
}

// The scrim's press, the system's escape gesture and Back all close the modal only while it may be dismissed.
function useDismissal(dismissible: boolean | undefined): () => void {
  const { onOpenChange } = useCentredModalState();

  return useCallback(() => {
    if (mayDismiss(dismissible)) onOpenChange(false);
  }, [dismissible, onOpenChange]);
}

function useBackCloses(dismiss: () => void): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        dismiss();

        return true;
      },
    );

    return (): void => subscription.remove();
  }, [dismiss]);
}

// A press inside the card stays there instead of reaching the scrim behind it.
const keepsPresses = { onStartShouldSetResponder: (): boolean => true };

const frameRole = { role: 'dialog', 'aria-modal': true } as const;

export function CentredModalFrame(props: CentredModalFrameProps): ReactElement {
  const dismiss = useDismissal(props.dismissible);
  useBackCloses(dismiss);

  return (
    <View
      {...frameRole}
      {...keepsPresses}
      className={props.className}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      onAccessibilityEscape={dismiss}
    >
      {props.children}
    </View>
  );
}
