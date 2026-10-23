import { type ReactElement, useState } from 'react';
import { NativeText } from '#primitives/content/native-text';
/* oxlint-disable-next-line no-restricted-imports -- the Android-only drawing stays out of the folder's index so the web never loads Compose. */
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';
import { FieldTextDialog } from './field-text-dialog.android';
import type { FieldTextProps } from './field-text-props';

/*
 * Android Settings' text row, as its EditTextPreference draws it: a ListItem with the title and, once there is one,
 * the value as its supporting line. Pressing it opens a dialog to edit the value.
 */
export function FieldText(props: FieldTextProps): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <RowListItem
        {...rowListItemProps(props)}
        supporting={summary(props)}
        onPress={() => setOpen(true)}
      />
      {open ? (
        <FieldTextDialog {...props} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

// The value under the title, masked for a secret; nothing while empty.
function summary(props: FieldTextProps): ReactElement | undefined {
  if (!props.value) return undefined;

  return (
    <NativeText role="secondary" tone="muted" numberOfLines={1}>
      {props.secure ? secretMask : props.value}
    </NativeText>
  );
}

const secretMask = '••••••••';
