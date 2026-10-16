import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactElement, ReactNode } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import { triggerChild } from '#primitives/overlays/open-state';
import { useDialogState } from './dialog-context';
import type {
  DialogBackdropProps,
  DialogFrameProps,
  DialogRootProps,
  DialogTextProps,
  DialogTriggerProps,
} from './dialog-props';

/*
 * The web's dialog parts, on Radix Dialog (`@radix-ui/react-dialog`): Root `open`/`onOpenChange`, Trigger,
 * Portal, Overlay, Content `onCloseAutoFocus`/`onEscapeKeyDown`, Title and Description. Radix keeps focus
 * inside, closes on Escape and hands focus back to the trigger; React Native views draw every part.
 */
export function DialogRootView(props: DialogRootProps): ReactElement {
  const state = useDialogState();

  return (
    <RadixDialog.Root open={state.open} onOpenChange={state.onOpenChange}>
      <View className={props.className} style={props.style}>
        {props.children}
      </View>
    </RadixDialog.Root>
  );
}

export function DialogTrigger(props: DialogTriggerProps): ReactElement {
  const { open, onOpenChange } = useDialogState();

  return (
    <RadixDialog.Trigger asChild>
      {triggerChild(props.children, { onPress: () => onOpenChange(!open) })}
    </RadixDialog.Trigger>
  );
}

export function DialogPortal(props: { children: ReactNode }): ReactElement {
  return <RadixDialog.Portal>{props.children}</RadixDialog.Portal>;
}

// A press inside the content bubbles up to the backdrop, so only a press on the bare backdrop counts.
function isBackdropPress(event: GestureResponderEvent): boolean {
  return event.target === event.currentTarget && !event.isDefaultPrevented();
}

export function DialogBackdrop(props: DialogBackdropProps): ReactElement {
  return (
    <RadixDialog.Overlay>
      <Pressable
        className={props.className}
        onPress={(event) => {
          if (isBackdropPress(event)) props.onPress?.(event);
        }}
      >
        {props.children}
      </Pressable>
    </RadixDialog.Overlay>
  );
}

// The backdrop's own press decides, so a dialog holding input stays open.
const contentHandlers = (
  props: DialogFrameProps,
): RadixDialog.DialogContentProps => ({
  onCloseAutoFocus: props.onCloseAutoFocus,
  onEscapeKeyDown: props.onEscapeKeyDown,
  onPointerDownOutside: (event) => event.preventDefault(),
});

export function DialogFrame(props: DialogFrameProps): ReactElement {
  return (
    <RadixDialog.Content {...contentHandlers(props)}>
      <View
        className={props.className}
        accessibilityLabel={props.accessibilityLabel}
      >
        {props.children}
      </View>
    </RadixDialog.Content>
  );
}

export function DialogTitleText(props: DialogTextProps): ReactElement {
  return (
    <RadixDialog.Title asChild>
      <Text className={props.className}>{props.children}</Text>
    </RadixDialog.Title>
  );
}

export function DialogDescriptionText(props: DialogTextProps): ReactElement {
  return (
    <RadixDialog.Description asChild>
      <Text className={props.className}>{props.children}</Text>
    </RadixDialog.Description>
  );
}
