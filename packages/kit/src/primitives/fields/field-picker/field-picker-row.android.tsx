import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowListItem } from '../field-row/field-row-list-item.android';
import type { FieldPickerProps } from './field-picker-model';

type ChoiceRowProps = Pick<
  FieldPickerProps,
  'title' | 'leading' | 'disabled'
> & {
  logo?: string;
  summary: string;
  onPress?: () => void;
};

/*
 * Android Settings' ListPreference row, and the row a `page` opens from: the title with the chosen value as its
 * supporting line, once there is one. Material settings rows have no chevron.
 */
export function ChoiceRow(props: ChoiceRowProps): ReactElement {
  return (
    <RowListItem
      title={props.title}
      leading={props.leading}
      logo={props.logo}
      disabled={props.disabled}
      supporting={supporting(props.summary)}
      onPress={props.onPress}
    />
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
