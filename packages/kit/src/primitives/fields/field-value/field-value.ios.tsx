import { LabeledContent } from '@expo/ui/swift-ui';
import { accessibilityHidden, redacted } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

// SwiftUI's LabeledContent: the title at the leading edge, the value at the trailing edge in secondary.
export function FieldValue(
  props: FieldGroupKitProps<'FieldGroup.Value'>,
): ReactElement {
  if (props.loading) return <Placeholder title={props.title} />;

  return (
    <LabeledContent label={<RowTitle {...props} />}>
      <NativeText>{props.value}</NativeText>
    </LabeledContent>
  );
}

// SwiftUI's own placeholder redaction draws the bar as wide as the title; VoiceOver skips it.
function Placeholder(props: { title: string }): ReactElement {
  return (
    <NativeText modifiers={[redacted('placeholder'), accessibilityHidden()]}>
      {props.title}
    </NativeText>
  );
}
