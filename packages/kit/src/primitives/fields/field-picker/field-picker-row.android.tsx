import type { ReactElement, ReactNode } from 'react';
import { NativeText } from '#primitives/content/native-text';
/* oxlint-disable-next-line no-restricted-imports -- the Android-only drawing stays out of the folder's index so the web never loads Compose. */
import { RowListItem } from '../field-row/field-row-list-item.android';
import type { FieldPickerProps } from './field-picker-model';

type ChoiceRowProps = Pick<
  FieldPickerProps,
  'title' | 'leading' | 'disabled'
> & {
  summary: string;
  onPress?: () => void;
  // The Sheet this row opens when no enclosing Sheet holds the page; a Compose dialog takes no room in the list.
  sheet?: ReactNode;
};

/*
 * Android Settings' ListPreference row, and the row a `page` opens from: the title with the chosen value as its
 * supporting line, once there is one. Material settings rows have no chevron.
 */
export function ChoiceRow(props: ChoiceRowProps): ReactElement {
  return (
    <>
      <RowListItem
        title={props.title}
        leading={props.leading}
        disabled={props.disabled}
        supporting={supporting(props.summary)}
        onPress={props.onPress}
      />
      {props.sheet}
    </>
  );
}

function supporting(summary: string): ReactElement | undefined {
  if (!summary) return undefined;

  return (
    <NativeText role="secondary" tone="muted" numberOfLines={1}>
      {summary}
    </NativeText>
  );
}
