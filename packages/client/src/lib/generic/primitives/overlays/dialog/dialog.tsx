import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/buttons/button';
import type { ButtonDataProps } from '#primitives/buttons/button';
import { useWide } from '../../../use-wide/use-wide';
import { DialogBody } from './dialog-body';
import { DialogOverlay } from './dialog-overlay';
import type { DialogContentProps as ContentProps } from './dialog-props';
import { DialogSheet } from './dialog-sheet';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

// A wide window centres the dialog; a narrow one, phone or web, raises the same content as a bottom sheet.
function DialogContent(props: ContentProps): React.JSX.Element {
  if (useWide()) return <CentredDialog {...props} />;

  return (
    <DialogSheet
      label={props.accessibilityLabel}
      dismissible={props.dismissible}
      onCloseAutoFocus={props.onCloseAutoFocus}
    >
      {/* Paper's iOS sheet pads its content 16 on every side; Android's drag handle zone already sets the top. */}
      <View className={cn('gap-6 px-4 ios:py-4', props.className)}>
        {props.children}
      </View>
    </DialogSheet>
  );
}

function CentredDialog(props: ContentProps): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay dismissible={props.dismissible}>
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
      className={cn('type-heading', className)}
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
      className={cn('type-secondary', className)}
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
