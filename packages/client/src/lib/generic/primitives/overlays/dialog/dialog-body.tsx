import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { Text } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/display/icon';
import type { DialogContentProps as ContentProps } from './dialog-props';

const contentClassName =
  'bg-card border-border z-50 mx-auto flex w-full flex-col gap-4 rounded-2xl border p-6 min-w-90 sm:max-w-lg web:border-0 web:dark:border web:shadow-card web:animate-in web:fade-in-0 web:zoom-in-95 web:max-w-[calc(100%-2rem)] web:duration-200 native:shadow-raised';

const closeClassName =
  'absolute right-4 top-4 rounded opacity-70 active:opacity-100 web:ring-offset-card web:focus:ring-focus web:data-[state=open]:bg-muted web:transition-opacity web:hover:opacity-100 web:focus:outline-none web:focus:ring-2 web:focus:ring-offset-2';

function ContentClose(): React.JSX.Element {
  return (
    <DialogPrimitive.Close className={closeClassName} hitSlop={12}>
      <Icon
        role="control"
        name="close"
        className="text-foreground web:pointer-events-none shrink-0"
      />
      <Text className="sr-only">Close</Text>
    </DialogPrimitive.Close>
  );
}

export function DialogBody(props: ContentProps): React.JSX.Element {
  return React.createElement(
    DialogPrimitive.Content,
    contentProps(props),
    props.children,
    props.showClose === false ? null : <ContentClose />,
  );
}

function contentProps({
  className,
  dismissible,
  accessibilityLabel,
  onCloseAutoFocus,
}: ContentProps): React.ComponentProps<typeof DialogPrimitive.Content> {
  return {
    accessibilityLabel,
    onCloseAutoFocus,
    className: cn(contentClassName, className),
    onEscapeKeyDown: keepOpen(dismissible),
  };
}

// Radix closes a dialog on Escape unless the event is cancelled.
function keepOpen(dismissible: boolean | undefined): (event: Event) => void {
  return (event) => {
    if (dismissible === false) event.preventDefault();
  };
}
