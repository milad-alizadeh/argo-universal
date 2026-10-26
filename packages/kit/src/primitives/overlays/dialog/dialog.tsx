import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { CentredOverlayScope } from '#primitives/overlays/centred-overlay';
import { DialogBody } from './dialog-body';
import { hasSections, fieldsLayout } from './dialog-fields';
import { DialogOverlay } from './dialog-overlay';
import { DialogPortal, DialogTrigger } from './dialog-parts';
import { useDialogPresentation } from './dialog-presentation';
import type {
  DialogContentProps as ContentProps,
  DialogProps,
  DialogPresentation,
} from './dialog-props';
import { DialogRoot } from './dialog-root';
import { DialogSheet } from './dialog-sheet';

function Dialog(props: DialogProps): React.JSX.Element {
  return <DialogRoot {...props} />;
}

// What a sheet-presented dialog draws: the caller's content and how the sheet is presented.
type NarrowProps = ContentProps & { presentation: DialogPresentation };

// The web centres the dialog from the medium size class up; a compact web window, and a phone or tablet at any width, raises the same content as a sheet.
function DialogContent(props: ContentProps): React.JSX.Element {
  const presentation = useDialogPresentation();

  if (presentation.centred) return <CentredDialog {...props} />;

  return <NarrowDialog {...props} presentation={presentation} />;
}

/*
 * Content that holds FieldGroup sections is a form: its sections are one FieldGroup under the heading, which scrolls
 * and insets them, and its actions are pinned in the sheet's footer. Any other content is a plain body as tall as it is.
 */
function NarrowDialog(props: NarrowProps): React.JSX.Element {
  if (hasSections(props.children)) return <FieldsDialog {...props} />;

  return <PlainDialog {...props} />;
}

function FieldsDialog({
  presentation,
  ...props
}: NarrowProps): React.JSX.Element {
  const layout = fieldsLayout(props);

  return (
    <DialogSheet
      open={presentation.sheetOpen}
      dismissible={props.dismissible}
      fields
      {...layout}
    />
  );
}

function PlainDialog({
  presentation,
  ...props
}: NarrowProps): React.JSX.Element {
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

export { DialogCancel, DialogFooter } from './dialog-actions';

export { DialogDescription, DialogHeader, DialogTitle } from './dialog-text';

export { Dialog, DialogContent, DialogTrigger };
