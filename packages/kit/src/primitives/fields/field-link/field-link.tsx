import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { RowTitle, useRowPressable } from '#primitives/fields/field-row';
import { NativeIcon } from '../../../symbols/native-icon';
import type { FieldGroupKitProps } from '../../kit-props';

// A row that opens a page ends in the kit's disclosure chevron, which the web draws itself (ADR-0041).
export function FieldLink(
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement {
  useRowPressable(!props.disabled);

  return (
    <Row
      alignment="center"
      onPress={props.disabled ? undefined : props.onPress}
    >
      <RowTitle {...props} />
      <Spacer flexible />
      <Chevron />
    </Row>
  );
}

function Chevron(): ReactElement {
  const color = useNativeTheme().colors.tertiary;

  return (
    <View className={chevronEnd}>
      <NativeIcon name="web-disclosure" size="sm" color={color} />
    </View>
  );
}

/*
 * The chevron's stroke ends three eighths of its box short of the right edge; pulling the box out by that much lines
 * the stroke's end up with the values in the rows above, as iOS does (to the nearest spacing step).
 */
const chevronEnd = '-mr-2 wide:-mr-1.5';
