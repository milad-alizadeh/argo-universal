import { HStack, LabeledContent } from '@expo/ui/swift-ui';
import { accessibilityHidden, redacted } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import { FieldStatusDot } from '../field-row/field-status-dot.ios';
import type { FieldValueProps } from './field-value-props';

// SwiftUI's LabeledContent: the title at the leading edge, the value at the trailing edge in secondary.
export function FieldValue(props: FieldValueProps): ReactElement {
  if (props.loading) return <Placeholder title={props.title} />;

  return (
    <LabeledContent label={<RowTitle {...props} />}>
      <HStack spacing={dotGap}>
        {props.dot && <FieldStatusDot tone={props.dot} />}
        <NativeText>{props.value}</NativeText>
      </HStack>
    </LabeledContent>
  );
}

const dotGap = 6;

// SwiftUI's own placeholder redaction draws the bar as wide as the title; VoiceOver skips it.
function Placeholder(props: { title: string }): ReactElement {
  return (
    <NativeText modifiers={[redacted('placeholder'), accessibilityHidden()]}>
      {props.title}
    </NativeText>
  );
}
