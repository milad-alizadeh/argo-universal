import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { Platform, Text, View, type ViewProps } from 'react-native';
import { Icon } from '#lib/generic/primitives/icon';
import { cn } from '#lib/generic/utils';
import { useWide } from '../use-wide';
import { Button } from './button';
import type { ButtonDataProps } from './button-props';
import { DialogOverlay } from './dialog-overlay';
import { DialogSheet } from './dialog-sheet';

// Only what both the centred dialog and the narrow window's sheet honour.
type ContentProps = {
  className?: string;
  // Names a dialog that has no DialogTitle of its own.
  accessibilityLabel?: string;
  children: React.ReactNode;
};
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
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

function DialogBody({
  className,
  children,
  ...props
}: ContentProps): React.JSX.Element {
  return React.createElement(
    DialogPrimitive.Content,
    { ...props, className: cn(contentClassName, className) },
    children,
    <ContentClose />,
  );
}

// A wide window centres the dialog; a narrow one, phone or web, raises the same content as a bottom sheet.
function DialogContent(props: ContentProps): React.JSX.Element {
  if (useWide()) return <CentredDialog {...props} />;
  return (
    <DialogSheet label={props.accessibilityLabel}>
      {/* The iOS grabber sits in the sheet's top inset, so the title starts a step lower to clear it. */}
      <View className={cn('ios:pt-2 gap-6 px-4', props.className)}>
        {props.children}
      </View>
    </DialogSheet>
  );
}

function CentredDialog(props: ContentProps): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay>
        <DialogBody {...props} />
      </DialogOverlay>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: ViewProps): React.JSX.Element {
  return (
    <View
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ViewProps): React.JSX.Element {
  return (
    <View
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

// The dialog's own dismiss action, drawn as the same Button as its other actions so they share shape and height.
function DialogCancel(
  props: Omit<ButtonDataProps, 'onPress' | 'variant' | 'fullWidth'>,
): React.JSX.Element {
  const { onOpenChange } = DialogPrimitive.useRootContext();
  return (
    <Button
      {...props}
      variant="outline"
      fullWidth="narrow"
      onPress={() => onOpenChange(false)}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      className={cn(
        'text-foreground text-lg font-semibold leading-none',
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<
  typeof DialogPrimitive.Description
>): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
