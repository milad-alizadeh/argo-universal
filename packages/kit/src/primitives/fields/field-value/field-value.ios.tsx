import { LabeledContent } from '@expo/ui/swift-ui';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

// SwiftUI's LabeledContent: the title at the leading edge, the value at the trailing edge in secondary.
export function FieldValue(
  props: FieldGroupKitProps<'FieldGroup.Value'>,
): ReactElement {
  return (
    <LabeledContent label={<RowTitle {...props} />}>
      <NativeText>{props.value}</NativeText>
    </LabeledContent>
  );
}
