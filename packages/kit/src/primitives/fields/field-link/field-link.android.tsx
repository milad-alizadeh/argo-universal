import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';
import { FieldLinkMark } from './field-link-mark';
import { linkTone } from './field-link-tone';

/*
 * A pressable ListItem with what the page holds as its supporting line, as Android Settings' Preference summary.
 * Android's Settings draws no disclosure chevron on a row that opens a page.
 */
export function FieldLink(
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement {
  return (
    <RowListItem
      {...rowListItemProps(props)}
      tone={linkTone(props)}
      supporting={summary(props)}
      trailing={trailingValue(props)}
      leadingContent={leadingMark(props.leadingMark)}
      onPress={props.onPress}
    />
  );
}

const leadingMark = (
  mark: FieldGroupKitProps<'FieldGroup.Link'>['leadingMark'],
): ReactElement | undefined =>
  mark ? <FieldLinkMark mark={mark} /> : undefined;

const summary = (
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement | undefined => {
  const text = props.subtitle ?? props.value;

  return text ? (
    <NativeText
      role={summaryRole(props.subtitle)}
      tone={supportTone(props.subtitleTone)}
    >
      {text}
    </NativeText>
  ) : undefined;
};

const supportTone = (
  tone: 'muted' | 'danger' | undefined,
): 'muted' | 'danger' => tone ?? 'muted';

const trailingValue = (
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement | undefined =>
  props.subtitle && props.value ? (
    <NativeText tone="muted">{props.value}</NativeText>
  ) : undefined;

const summaryRole = (subtitle: string | undefined): 'secondary' | undefined =>
  subtitle ? 'secondary' : undefined;
