import * as RadixDialog from '@radix-ui/react-dialog';
import { type ReactElement, type ReactNode, useMemo } from 'react';
import { type GestureResponderEvent, Pressable, View } from 'react-native';
import {
  triggerChild,
  type TriggerElement,
} from '#primitives/overlays/open-state';
import type {
  CentredModalFrameProps,
  CentredModalRootProps,
} from './centred-modal-props';
import {
  CentredModalContext,
  useCentredModalState,
} from './centred-modal-state';
import { CentredModalTitle } from './centred-modal-text';
import { CentredOverlayScope } from './centred-overlay';
import { dismissesOnBackdropPress, mayDismiss } from './dismissal';

/*
 * The web's centred modal, on Radix Dialog (`@radix-ui/react-dialog`): Root `open`/`onOpenChange`, Trigger,
 * Portal, Overlay, Content `onCloseAutoFocus`/`onEscapeKeyDown`/`onPointerDownOutside`, Title and Description.
 * Radix keeps focus inside, closes on Escape and hands focus back to the trigger; React Native views draw the rest.
 */
export function CentredModalRoot(props: CentredModalRootProps): ReactElement {
  const { open, onOpenChange } = props;
  const state = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);

  return (
    <CentredModalContext.Provider value={state}>
      <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        {props.children}
      </RadixDialog.Root>
    </CentredModalContext.Provider>
  );
}

// The caller's own element, which Radix takes focus back to on close; its press toggles the modal.
export function CentredModalTrigger(props: {
  children: TriggerElement;
}): ReactElement | null {
  const { open, onOpenChange } = useCentredModalState();

  if (!props.children) return null;

  return (
    <RadixDialog.Trigger asChild disabled={!!props.children.props.disabled}>
      {triggerChild(props.children, { onPress: () => onOpenChange(!open) })}
    </RadixDialog.Trigger>
  );
}

const scrimClass =
  'fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-2 web:animate-in web:fade-in-0 web:cursor-default web:*:cursor-auto';

// The card over a scrim, centred on the window.
export function CentredModal(props: CentredModalFrameProps): ReactElement {
  return (
    <RadixDialog.Portal>
      <Scrim dismissible={props.dismissible}>
        <CentredOverlayScope>
          <CentredModalFrame {...props} />
        </CentredOverlayScope>
      </Scrim>
    </RadixDialog.Portal>
  );
}

// A press on the bare scrim closes the modal, as Escape does, while it may be dismissed.
function Scrim(props: {
  dismissible?: boolean;
  children: ReactNode;
}): ReactElement {
  const onPress = useScrimPress(props.dismissible);

  return (
    <RadixDialog.Overlay>
      <Pressable className={scrimClass} onPress={onPress}>
        {props.children}
      </Pressable>
    </RadixDialog.Overlay>
  );
}

function useScrimPress(
  dismissible: boolean | undefined,
): (press: GestureResponderEvent) => void {
  const { onOpenChange } = useCentredModalState();

  return (press) => {
    if (dismissesOnBackdropPress(press, dismissible)) onOpenChange(false);
  };
}

type ContentHandlers = Pick<
  RadixDialog.DialogContentProps,
  'onCloseAutoFocus' | 'onEscapeKeyDown' | 'onPointerDownOutside'
>;

function contentHandlers(props: CentredModalFrameProps): ContentHandlers {
  return {
    onCloseAutoFocus: props.onCloseAutoFocus,
    onEscapeKeyDown: (event) => {
      if (!mayDismiss(props.dismissible)) event.preventDefault();
    },
    // The scrim's own press decides, so a modal holding input stays open.
    onPointerDownOutside: (event) => event.preventDefault(),
  };
}

// The card alone, for a modal drawn in a region of its own with no scrim.
export function CentredModalFrame(props: CentredModalFrameProps): ReactElement {
  return (
    <RadixDialog.Content {...contentHandlers(props)} className="outline-none">
      <View
        className={props.className}
        accessibilityLabel={props.accessibilityLabel}
      >
        <ModalLabel label={props.label} />
        {props.children}
      </View>
    </RadixDialog.Content>
  );
}

function ModalLabel(props: { label?: string }): ReactElement | null {
  if (!props.label) return null;

  return (
    <CentredModalTitle className="sr-only">{props.label}</CentredModalTitle>
  );
}
