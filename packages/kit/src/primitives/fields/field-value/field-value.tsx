import { Row, Spacer } from '@expo/ui';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

// The title, then the value at the trailing edge in the muted tone, as iOS's LabeledContent draws it.
export function FieldValue(
  props: FieldGroupKitProps<'FieldGroup.Value'>,
): ReactElement {
  return (
    <Row alignment="center">
      <RowTitle {...props} />
      <Spacer flexible />
      <NativeText tone="muted">{props.value}</NativeText>
    </Row>
  );
}
