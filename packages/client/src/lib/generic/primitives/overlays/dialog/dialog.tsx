import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/buttons/button';
import type { ButtonDataProps } from '#primitives/buttons/button';
import { useWide } from '../../../use-wide/use-wide';
import { DialogBody } from './dialog-body';
import { useDialogState } from './dialog-context';
import { DialogOverlay } from './dialog-overlay';
import {
  DialogDescriptionText,
  DialogPortal,
  DialogTitleText,
  DialogTrigger,
} from './dialog-parts';
import type {
  DialogContentProps as ContentProps,
  DialogProps,
  DialogTextProps,
} from './dialog-props';
import { DialogRoot } from './dialog-root';
import { DialogSheet } from './dialog-sheet';

function Dialog(props: DialogProps): React.JSX.Element {
  return <DialogRoot {...props} />;
}

// A wide window centres the dialog; a narrow one, phone or web, raises the same content as a bottom sheet.
function DialogContent(props: ContentProps): React.JSX.Element {
  if (useWide()) return <CentredDialog {...props} />;

  return (
    <DialogSheet
      label={props.accessibilityLabel}
      dismissible={props.dismissible}
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
    <DialogPortal>
      <DialogOverlay dismissible={props.dismissible}>
        <DialogBody {...props} />
      </DialogOverlay>
    </DialogPortal>
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
  const { onOpenChange } = useDialogState();

  return (
    <Button
      {...props}
      variant="outline"
      fullWidth="narrow"
      onPress={() => onOpenChange(false)}
    />
  );
}

function DialogTitle(props: DialogTextProps): React.JSX.Element {
  return (
    <DialogTitleText className={cn('type-heading', props.className)}>
      {props.children}
    </DialogTitleText>
  );
}

function DialogDescription(props: DialogTextProps): React.JSX.Element {
  return (
    <DialogDescriptionText className={cn('type-secondary', props.className)}>
      {props.children}
    </DialogDescriptionText>
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
