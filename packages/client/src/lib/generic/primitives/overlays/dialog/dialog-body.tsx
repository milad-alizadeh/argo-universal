import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { Platform, Text } from 'react-native';
import { Icon } from '#lib/generic/primitives/display/icon/icon';
import { cn } from '#lib/generic/utils';
import { keepOpen } from '../keep-open';

// Only what both the centred dialog and the narrow window's sheet honour.
export type ContentProps = {
  className?: string;
  // Names a dialog that has no DialogTitle of its own.
  accessibilityLabel?: string;
  // False while the content holds unsaved input: only its own actions close it.
  dismissible?: boolean;
  children: React.ReactNode;
};
const contentClassName = cn(
  'bg-background web:bg-popover border-border z-50 mx-auto flex w-full flex-col gap-4 rounded-2xl border p-6 min-w-[360px] sm:max-w-lg',
  Platform.select({
    web: 'border-0 dark:border shadow-card animate-in fade-in-0 zoom-in-95 web:max-w-[calc(100%-2rem)] duration-200',
    native: 'shadow-lg shadow-black/5',
  }),
);
const closeClassName = cn(
  'absolute right-4 top-4 rounded opacity-70 active:opacity-100',
  Platform.select({
    web: 'ring-offset-background focus:ring-ring data-[state=open]:bg-accent transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2',
  }),
);

function ContentClose(): React.JSX.Element {
  return (
    <DialogPrimitive.Close className={closeClassName} hitSlop={12}>
      <Icon
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
    <ContentClose />,
  );
}

function contentProps({
  className,
  dismissible,
  accessibilityLabel,
}: ContentProps): React.ComponentProps<typeof DialogPrimitive.Content> {
  return {
    accessibilityLabel,
    className: cn(contentClassName, className),
    onEscapeKeyDown: keepOpen(dismissible),
  };
}
