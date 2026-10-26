import * as React from 'react';
import { Pressable, Text } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import {
  CentredModal,
  useCentredModalState,
} from '#primitives/overlays/centred-overlay';
import type { DialogContentProps as ContentProps } from './dialog-props';

const contentClassName =
  'bg-card border-border z-50 mx-auto flex w-full flex-col gap-4 rounded-2xl border p-6 min-w-90 sm:max-w-lg web:border-0 web:dark:border web:shadow-card web:animate-in web:fade-in-0 web:zoom-in-95 web:max-w-full web:duration-200 native:shadow-raised';

const closeClassName =
  'absolute right-4 top-4 rounded opacity-70 active:opacity-100 web:ring-offset-card web:focus:ring-focus web:transition-opacity web:hover:opacity-100 web:focus:outline-none web:focus:ring-2 web:focus:ring-offset-2';

const closeButton = {
  role: 'button',
  className: closeClassName,
  hitSlop: 12,
} as const;

function ContentClose(): React.JSX.Element {
  const { onOpenChange } = useCentredModalState();

  return (
    <Pressable {...closeButton} onPress={() => onOpenChange(false)}>
      <Icon
        name="close"
        className="text-foreground web:pointer-events-none shrink-0"
      />
      <Text className="sr-only">Close</Text>
    </Pressable>
  );
}

// The centred card of a dialog, with its close button.
export function DialogBody(props: ContentProps): React.JSX.Element {
  return (
    <CentredModal {...modalProps(props)}>
      {props.children}
      {props.showClose === false ? null : <ContentClose />}
    </CentredModal>
  );
}

type ModalProps = Omit<React.ComponentProps<typeof CentredModal>, 'children'>;

function modalProps(props: ContentProps): ModalProps {
  return {
    accessibilityLabel: props.accessibilityLabel,
    dismissible: props.dismissible,
    onCloseAutoFocus: props.onCloseAutoFocus,
    className: cn(
      contentClassName,
      props.size === 'sm' && 'sm:max-w-100',
      props.className,
    ),
  };
}
