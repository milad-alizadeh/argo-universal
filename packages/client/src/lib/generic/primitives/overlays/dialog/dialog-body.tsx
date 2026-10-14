import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { Text } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/display/icon/icon';
import { keepOpen } from '../bottom-sheet/keep-open';

// Only what both the centred dialog and the narrow window's sheet honour.
export type ContentProps = {
  className?: string;
  // Names a dialog that has no DialogTitle of its own.
  accessibilityLabel?: string;
  // False while the content holds unsaved input: only its own actions close it.
  dismissible?: boolean;
  showClose?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  children: React.ReactNode;
};

const contentClassName =
  'bg-background web:bg-popover border-border z-50 mx-auto flex w-full flex-col gap-4 rounded-2xl border p-6 min-w-[360px] sm:max-w-lg web:border-0 web:dark:border web:shadow-card web:animate-in web:fade-in-0 web:zoom-in-95 web:max-w-[calc(100%-2rem)] web:duration-200 native:shadow-lg native:shadow-black/5';

const closeClassName =
  'absolute right-4 top-4 rounded opacity-70 active:opacity-100 web:ring-offset-background web:focus:ring-ring web:data-[state=open]:bg-accent web:transition-opacity web:hover:opacity-100 web:focus:outline-none web:focus:ring-2 web:focus:ring-offset-2';

function ContentClose(): React.JSX.Element {
  return (
    <DialogPrimitive.Close className={closeClassName} hitSlop={12}>
      <Icon
        role="control"
        name="close"
        className="text-accent-foreground web:pointer-events-none shrink-0"
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
