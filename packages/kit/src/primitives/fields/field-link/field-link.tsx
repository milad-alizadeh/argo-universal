import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { RowTitle } from '#primitives/fields/field-row';
import { NativeIcon } from '../../../symbols/native-icon';
import type { FieldGroupKitProps } from '../../kit-props';

// A row that opens a page ends in the kit's disclosure chevron, which the web draws itself (ADR-0041).
export function FieldLink(
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement {
  const color = useNativeTheme().colors.tertiary;

  return (
    <Row
      alignment="center"
      onPress={props.disabled ? undefined : props.onPress}
    >
      <RowTitle {...props} />
      <Spacer flexible />
      <NativeIcon name="web-disclosure" size="md" color={color} />
    </Row>
  );
}
