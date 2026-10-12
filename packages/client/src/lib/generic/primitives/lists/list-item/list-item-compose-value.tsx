import { Row, Text } from '@expo/ui/jetpack-compose';
import { weight } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import type { ListItemProps } from '../../fields/field-props';
import { useComposeTextStyle } from '../../native/native-typography';
import { hasDisclosure } from './list-item-styles';
import { NativeRowGlyph, NativeRowIcon, NativeRowStatus } from './native-row';
const gutter = 16;

export function RowTrailing(props: ListItemProps): React.JSX.Element {
  return (
    <Row
      horizontalArrangement={{ spacedBy: gutter }}
      verticalAlignment="center"
      modifiers={valueWidth(props.value)}
    >
      <NativeRowGlyph leading={props.valueLeading} />
      <RowValue value={props.value} />
      <NativeRowStatus {...props} />
      <RowDisclosure visible={hasDisclosure(props)} />
    </Row>
  );
}

function valueWidth(value: string | undefined): ReturnType<typeof weight>[] {
  return value === undefined ? [] : [weight(1)];
}
function RowValue({
  value,
}: Pick<ListItemProps, 'value'>): React.JSX.Element | null {
  const style = useComposeTextStyle('body');
  const { mutedForeground } = useNativeTheme().colors;
  return value === undefined ? null : (
    <Text
      color={mutedForeground}
      style={{ ...style, textAlign: 'end' }}
      modifiers={[weight(1)]}
    >
      {value}
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
