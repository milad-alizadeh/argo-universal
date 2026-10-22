import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import { cn } from '#kit/utils';
import { Button } from '#primitives/actions/button';
import type { ButtonProps } from '#primitives/actions/button';
import {
  CentredOverlayScope,
  useInCentredOverlay,
} from '#primitives/overlays/centred-overlay';
import { DialogBody } from './dialog-body';
import { useDialogState } from './dialog-context';
import { DialogOverlay } from './dialog-overlay';
import {
  DialogDescriptionText,
  DialogPortal,
  DialogTitleText,
  DialogTrigger,
} from './dialog-parts';
import { useDialogPresentation } from './dialog-presentation';
import type {
  DialogContentProps as ContentProps,
  DialogProps,
  DialogPresentation,
  DialogTextProps,
} from './dialog-props';
import { DialogRoot } from './dialog-root';
import { DialogSheet } from './dialog-sheet';

function Dialog(props: DialogProps): React.JSX.Element {
  return <DialogRoot {...props} />;
}

// The web centres the dialog from the medium size class up; a compact web window, and a phone or tablet at any width, raises the same content as a sheet.
function DialogContent(props: ContentProps): React.JSX.Element {
  const presentation = useDialogPresentation();

  if (presentation.centred) return <CentredDialog {...props} />;

  return <NarrowDialog {...props} presentation={presentation} />;
}

function NarrowDialog({
  presentation,
  ...props
}: ContentProps & { presentation: DialogPresentation }): React.JSX.Element {
  return (
    <DialogSheet
      open={presentation.sheetOpen}
      label={props.accessibilityLabel}
      dismissible={props.dismissible}
    >
      <NarrowDialogBody {...props} />
    </DialogSheet>
  );
}

// Paper's iOS sheet pads its content on every side; Android's drag handle zone sets the top.
function NarrowDialogBody(
  props: Pick<ContentProps, 'className' | 'children'>,
): React.JSX.Element {
  return (
    <View className={cn('gap-6 px-4 ios:py-4', props.className)}>
      {props.children}
    </View>
  );
}

function CentredDialog(props: ContentProps): React.JSX.Element {
  return (
    <DialogPortal>
      <DialogOverlay dismissible={props.dismissible}>
        <DialogBody {...props}>
          <CentredOverlayScope>{props.children}</CentredOverlayScope>
        </DialogBody>
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

// A centred dialog lines its actions up at the trailing edge; a sheet stacks them, the main action on top.
function DialogFooter({ className, ...props }: ViewProps): React.JSX.Element {
  const centred = useInCentredOverlay();

  return (
    <View
      className={cn(
        'flex gap-2',
        centred ? 'flex-row justify-end' : 'flex-col-reverse',
        className,
      )}
      {...props}
    />
  );
}

// The dialog's own dismiss action, drawn as the same Button as its other actions so they share shape and height.
function DialogCancel(
  props: Omit<ButtonProps, 'onPress' | 'variant' | 'fullWidth'>,
): React.JSX.Element {
  const { onOpenChange } = useDialogState();
  const wide = useWide();

  return (
    <Button
      {...props}
      variant="secondary"
      fullWidth={!wide}
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
