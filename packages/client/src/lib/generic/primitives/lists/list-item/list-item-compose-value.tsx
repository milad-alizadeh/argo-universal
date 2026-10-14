import { Row, Text } from '@expo/ui/jetpack-compose';
import { clearSemantics } from '@expo/ui/jetpack-compose/modifiers';
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
    >
      <RowValueGroup {...props} />
      <NativeRowStatus {...props} />
      <RowDisclosure visible={hasDisclosure(props)} />
    </Row>
  );
}

function RowValueGroup(
  props: Pick<ListItemProps, 'value' | 'valueLeading' | 'control'>,
): React.JSX.Element | null {
  if (props.value === undefined) return null;

  return (
    <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
      <NativeRowGlyph leading={props.valueLeading} />
      <RowValue value={props.value} decorative={!!props.control} />
    </Row>
  );
}

interface RowValueProps extends Pick<ListItemProps, 'value'> {
  decorative: boolean;
}

function RowValue({
  value,
  decorative,
}: RowValueProps): React.JSX.Element | null {
  if (value === undefined) return null;

  return <RowValueText value={value} decorative={decorative} />;
}

interface RowValueTextProps {
  value: string;
  decorative: boolean;
}

function RowValueText(props: RowValueTextProps): React.JSX.Element {
  const style = useComposeTextStyle('body');
  const { mutedForeground } = useNativeTheme().colors;

  return (
    <Text
      color={mutedForeground}
      maxLines={1}
      overflow="ellipsis"
      style={{ ...style, textAlign: 'end' }}
      modifiers={props.decorative ? [clearSemantics()] : []}
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
