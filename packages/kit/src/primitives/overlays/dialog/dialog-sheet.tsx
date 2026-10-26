import type * as React from 'react';
import { Platform } from 'react-native';
import { useCentredModalState } from '#primitives/overlays/centred-overlay';
import { Sheet, type SheetProps } from '#primitives/overlays/sheet';
import type { DialogSheetProps } from './dialog-props';

// A narrow window, phone or web, presents the dialog as a sheet as tall as its content, opened and closed by the dialog's root; a FieldGroup fills its page, so a sheet of fields rests at the medium and large heights instead.
export function DialogSheet(props: DialogSheetProps): React.JSX.Element {
  const { open, onOpenChange } = useCentredModalState();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      label={props.label}
      dismissible={props.dismissible}
      footer={props.footer}
      {...(props.fields ? fieldsSheet : undefined)}
    >
      {props.children}
    </Sheet>
  );
}

type FieldsSheet = Pick<SheetProps, 'detents' | 'contentScrolls'>;

// Material's half-open stop cuts a sheet that fills the window, and its footer with it, so Android's sheet rests only at its full height.
const fieldsSheet = Platform.select<FieldsSheet>({
  android: { detents: ['large'], contentScrolls: true },
  default: { detents: ['medium', 'large'], contentScrolls: true },
});

DialogSheet satisfies React.ComponentType<DialogSheetProps>;
