import { Box, Row } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  semantics,
} from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import {
  RowListItem,
  rowListItemProps,
} from '../field-row/field-row-list-item.android';
import { FieldStatusDot } from '../field-row/field-status-dot.android';
import { FieldLinkMark } from './field-link-mark';
import type { FieldLinkRowProps } from './field-link-props';
import { linkLabel, linkTone } from './field-link-tone';

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
      trailing={trailingValue(props)}
      leadingContent={leadingMark(props.leadingMark)}
      onPress={props.onPress}
      modifiers={linkModifiers(props)}
    />
  );
}

// Material's two-line item is 72dp. Leave six more dp at each edge of a roomy row.
const roomyRowModifiers = [defaultMinSize({ minHeight: 84 })];

const linkModifiers = (props: FieldLinkRowProps): typeof roomyRowModifiers => [
  ...(props.roomy ? roomyRowModifiers : []),
  ...(props.status
    ? [semantics({ contentDescription: linkLabel(props) })]
    : []),
];

const leadingMark = (
  mark: FieldLinkRowProps['leadingMark'],
): ReactElement | undefined =>
  mark ? <FieldLinkMark mark={mark} /> : undefined;

const subtitleOf = ({
  subtitle,
  subtitleTone,
}: Pick<FieldLinkRowProps, 'subtitle' | 'subtitleTone'>):
  | ReactElement
  | undefined =>
  subtitle ? (
    <NativeText role="secondary" tone={subtitleTone ?? 'muted'}>
      {subtitle}
    </NativeText>
  ) : undefined;

// Like FieldGroup.Value, leave room for the title when the trailing value is long.
const valueShare = 0.6;

const valueModifiers = [fillMaxWidth(valueShare)];

const trailingValue = ({
  value,
  status,
}: FieldLinkRowProps): ReactElement | undefined =>
  value || status?.tone ? (
    <Box
      contentAlignment="centerEnd"
      modifiers={value ? valueModifiers : undefined}
    >
      <Row verticalAlignment="center" horizontalArrangement={{ spacedBy: 6 }}>
        {status?.tone && <FieldStatusDot tone={status.tone} />}
        {value && (
          <NativeText tone="muted" numberOfLines={1}>
            {value}
          </NativeText>
        )}
      </Row>
    </Box>
  ) : undefined;
