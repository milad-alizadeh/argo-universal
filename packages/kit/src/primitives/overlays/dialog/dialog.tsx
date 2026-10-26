import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import {
  CentredModalTrigger,
  useCentresOverlays,
} from '#primitives/overlays/centred-overlay';
import { DialogBody } from './dialog-body';
import type {
  DialogContentProps as ContentProps,
  DialogProps,
  DialogTriggerProps,
} from './dialog-props';
import { DialogRoot } from './dialog-root';
import { DialogSheet } from './dialog-sheet';

function Dialog(props: DialogProps): React.JSX.Element {
  return <DialogRoot {...props} />;
}

function DialogTrigger(props: DialogTriggerProps): React.JSX.Element {
  return <CentredModalTrigger>{props.children}</CentredModalTrigger>;
}

// The web centres the dialog from the medium size class up; a compact web window, and a phone or tablet at any width, raises the same content as a sheet as tall as it is.
function DialogContent(props: ContentProps): React.JSX.Element {
  const centred = useCentresOverlays();

  return centred ? <DialogBody {...props} /> : <PlainDialog {...props} />;
}

function PlainDialog(props: ContentProps): React.JSX.Element {
  return (
    <DialogSheet
      label={props.accessibilityLabel}
      dismissible={props.dismissible}
    >
      <NarrowDialogBody {...props} />
    </DialogSheet>
  );
}

// The iOS sheet pads its content on every side; Android's drag handle zone sets the top, and its sheet ends at the gesture bar, so only the foot needs a pad.
function NarrowDialogBody(
  props: Pick<ContentProps, 'className' | 'children'>,
): React.JSX.Element {
  return (
    <View className={cn('gap-6 px-4 pb-4 ios:pt-4', props.className)}>
      {props.children}
    </View>
  );
}

export { DialogCancel, DialogFooter } from './dialog-actions';

export { DialogForm } from './dialog-form';

export { DialogDescription, DialogHeader, DialogTitle } from './dialog-text';

export { Dialog, DialogContent, DialogTrigger };
