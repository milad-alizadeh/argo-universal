import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { triggerChild, useOpenState } from '#primitives/overlays/open-state';
import { DialogContext, useDialogState } from './dialog-context';
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
export function DialogRoot(props: DialogRootProps): ReactElement {
  const state = useOpenState(props);

  return (
    <DialogContext.Provider value={state}>
      <RadixDialog.Root open={state.open} onOpenChange={state.onOpenChange}>
        <View className={props.className} style={props.style}>
          {props.children}
        </View>
      </RadixDialog.Root>
    </DialogContext.Provider>
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

export function DialogBackdrop(props: DialogBackdropProps): ReactElement {
  return (
    <RadixDialog.Overlay>
      <Pressable className={props.className} onPress={props.onPress}>
        {props.children}
      </Pressable>
    </RadixDialog.Overlay>
  );
}

export function DialogFrame(props: DialogFrameProps): ReactElement {
  return (
    <RadixDialog.Content
      onCloseAutoFocus={props.onCloseAutoFocus}
      onEscapeKeyDown={props.onEscapeKeyDown}
    >
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
