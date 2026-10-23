import * as React from 'react';
import { Pressable, Text } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { useDialogState } from './dialog-context';
import { DialogFrame } from './dialog-parts';
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
  const { onOpenChange } = useDialogState();

  return (
    <Pressable {...closeButton} onPress={() => onOpenChange(false)}>
      <Icon
        size="sm"
        name="close"
        className="text-foreground web:pointer-events-none shrink-0"
      />
      <Text className="sr-only">Close</Text>
    </Pressable>
  );
}

export function DialogBody(props: ContentProps): React.JSX.Element {
  return (
    <DialogFrame {...frameProps(props)}>
      {props.children}
      {props.showClose === false ? null : <ContentClose />}
    </DialogFrame>
  );
}

type FrameProps = Omit<React.ComponentProps<typeof DialogFrame>, 'children'>;

function frameProps({
  className,
  size,
  dismissible,
  accessibilityLabel,
  onCloseAutoFocus,
}: Omit<ContentProps, 'children'>): FrameProps {
  return {
    accessibilityLabel,
    onCloseAutoFocus,
    className: cn(contentClassName, size === 'sm' && 'sm:max-w-100', className),
    onEscapeKeyDown: keepOpen(dismissible),
  };
}

// Radix closes a dialog on Escape unless the event is cancelled.
function keepOpen(
  dismissible: boolean | undefined,
): (event: KeyboardEvent) => void {
  return (event) => {
    if (dismissible === false) event.preventDefault();
  };
}
