import { Row, Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import { useComposeTextStyle } from '../../native/native-typography';
import type { ListItemProps } from './list-item-props';
import { hasDisclosure } from './list-item-styles';
import { NativeRowGlyph, NativeRowIcon, NativeRowStatus } from './native-row';

const gutter = 16;

export function RowTrailing(props: ListItemProps): React.JSX.Element {
  return (
    <Row
      horizontalArrangement={{ spacedBy: gutter }}
      verticalAlignment="center"
    >
      <RowValueGroup {...props} />
      <NativeRowStatus {...props} />
      <RowDisclosure visible={hasDisclosure(props)} />
    </Row>
  );
}

function RowValueGroup(
  props: Pick<ListItemProps, 'value' | 'valueLeading'>,
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
}: Pick<ListItemProps, 'value'>): React.JSX.Element | null {
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

function RowDisclosure({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element | null {
  return visible ? <NativeRowIcon icon="chevron-right" /> : null;
}
