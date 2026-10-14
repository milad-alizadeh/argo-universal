import { Badge, Row, Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { badgeCountText } from '#primitives/display/badge';
import { useComposeTextStyle } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { hasDisclosure } from './grouped-list-item-styles';
import { NativeRowGlyph, NativeRowIcon, NativeRowStatus } from './native-row';

const gutter = 16;

export function RowTrailing(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Row
      horizontalArrangement={{ spacedBy: gutter }}
      verticalAlignment="center"
    >
      <RowValueGroup {...props} />
      <RowBadge badge={props.badge} />
      <NativeRowStatus {...props} />
      <RowDisclosure visible={hasDisclosure(props)} />
    </Row>
  );
}

function RowValueGroup(
  props: Pick<GroupedListItemProps, 'value' | 'valueLeading'>,
): React.JSX.Element | null {
  if (props.value === undefined) return null;

  return (
    <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
      <NativeRowGlyph leading={props.valueLeading} />
      <RowValue value={props.value} />
    </Row>
  );
}

function RowValue({
  value,
}: Pick<GroupedListItemProps, 'value'>): React.JSX.Element | null {
  if (value === undefined) return null;

  return <RowValueText value={value} />;
}

function RowValueText(props: { value: string }): React.JSX.Element {
  const style = useComposeTextStyle('body');
  const { mutedForeground } = useNativeTheme().colors;

  return (
    <Text
      color={mutedForeground}
      maxLines={1}
      overflow="ellipsis"
      style={{ ...style, textAlign: 'end' }}
    >
      {props.value}
    </Text>
  );
}

function RowBadge({
  badge,
}: Pick<GroupedListItemProps, 'badge'>): React.JSX.Element | null {
  const text = badgeCountText(badge);

  if (text === undefined) return null;

  return (
    <Badge>
      <Text>{text}</Text>
    </Badge>
  );
}

function RowDisclosure({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element | null {
  return visible ? <NativeRowIcon icon="chevron-right" /> : null;
}
