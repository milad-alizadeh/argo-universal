import { type ReactElement, useState } from 'react';
import { NativeText } from '#primitives/content/native-text';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';
import { FieldTextDialog } from './field-text-dialog.android';
import type { FieldTextProps } from './field-text-props';
import { fieldTextTone } from './field-text-tone';

/*
 * Android Settings' text row, as its EditTextPreference draws it: a ListItem with the title and, once there is one,
 * the value as its supporting line. Pressing it opens a dialog to edit the value.
 */
export function FieldText(props: FieldTextProps): ReactElement {
  // `autoFocus` opens the dialog as the row appears, as it would be pressed; the dialog focuses its field.
  const [open, setOpen] = useState(props.autoFocus === true);

  return (
    <>
      <RowListItem
        {...textRowProps(props)}
        supporting={props.hideTitle ? undefined : summary(props)}
        onPress={() => setOpen(true)}
      />
      {open ? (
        <FieldTextDialog {...props} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

// A hidden title leaves the value (or its placeholder) as the row's one line.
function rowOf(props: FieldTextProps): FieldTextProps {
  return props.hideTitle ? { ...props, title: shownText(props) } : props;
}

const shownText = (props: FieldTextProps): string =>
  summaryText(props) || props.placeholder || props.title;

/*
 * The value under the title, masked for a secret; nothing while empty. A secret never comes back, so its field is
 * always empty and its placeholder says whether one is saved.
 */
function summary(props: FieldTextProps): ReactElement | undefined {
  const text = summaryText(props);

  if (!text) return undefined;

  return (
    <NativeText role="secondary" tone="muted" numberOfLines={1}>
      {text}
    </NativeText>
  );
}

function summaryText(props: FieldTextProps): string | undefined {
  if (props.secure) return secretSummary(props);

  return props.value === '' ? undefined : props.value;
}

const secretSummary = (props: FieldTextProps): string | undefined =>
  props.value ? secretMask : props.placeholder;

const secretMask = '••••••••';

const textRowProps = (
  props: FieldTextProps,
): React.ComponentProps<typeof RowListItem> => ({
  ...rowListItemProps(rowOf(props)),
  tone: fieldTextTone(props.error),
});
