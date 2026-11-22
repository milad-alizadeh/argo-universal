import { Box } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';
import { FieldLinkMark } from './field-link-mark';
import type { FieldLinkRowProps } from './field-link-props';
import { linkTone } from './field-link-tone';

/*
 * A pressable ListItem puts its value in the trailing slot and its optional subtitle in the supporting slot.
 * Android's Settings draws no disclosure chevron on a row that opens a page.
 */
export function FieldLink(props: FieldLinkRowProps): ReactElement {
  return (
    <RowListItem
      {...rowListItemProps(props)}
      tone={linkTone(props)}
      supporting={subtitleOf(props)}
      trailing={trailingValue(props.value)}
      leadingContent={leadingMark(props.leadingMark)}
      onPress={props.onPress}
      modifiers={props.roomy ? roomyRowModifiers : undefined}
    />
  );
}

// Material's two-line item is 72dp. Leave six more dp at each edge of a roomy row.
const roomyRowModifiers = [defaultMinSize({ minHeight: 84 })];

const leadingMark = (
  mark: FieldGroupKitProps<'FieldGroup.Link'>['leadingMark'],
): ReactElement | undefined =>
  mark ? <FieldLinkMark mark={mark} /> : undefined;

const subtitleOf = ({
  subtitle,
  subtitleTone,
}: FieldGroupKitProps<'FieldGroup.Link'>): ReactElement | undefined =>
  subtitle ? (
    <NativeText role="secondary" tone={subtitleTone ?? 'muted'}>
      {subtitle}
    </NativeText>
  ) : undefined;

// Like FieldGroup.Value, leave room for the title when the trailing value is long.
const valueShare = 0.6;

const valueModifiers = [fillMaxWidth(valueShare)];

const trailingValue = (value?: string): ReactElement | undefined =>
  value ? (
    <Box contentAlignment="centerEnd" modifiers={valueModifiers}>
      <NativeText tone="muted" numberOfLines={1}>
        {value}
      </NativeText>
    </Box>
  ) : undefined;
