import { Circle, HStack, LabeledContent } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  foregroundStyle,
  frame,
  redacted,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { toneClass } from '#primitives/content/text';
import { RowTitle } from '#primitives/fields/field-row';
import { usePrimitiveColor } from '#primitives/native/primitive-color';
import type { FieldValueProps } from './field-value-props';

// SwiftUI's LabeledContent: the title at the leading edge, the value at the trailing edge in secondary.
export function FieldValue(props: FieldValueProps): ReactElement {
  if (props.loading) return <Placeholder title={props.title} />;

  return (
    <LabeledContent label={<RowTitle {...props} />}>
      <HStack spacing={dotGap}>
        {props.dot && <Dot tone={props.dot} />}
        <NativeText>{props.value}</NativeText>
      </HStack>
    </LabeledContent>
  );
}

const dotGap = 6;

const dotSize = 8;

// A filled circle, drawn at the size of a status dot, in the tone's colour.
function Dot(props: {
  tone: NonNullable<FieldValueProps['dot']>;
}): ReactElement {
  const color = usePrimitiveColor(toneClass(props.tone) ?? 'text-foreground');

  return (
    <Circle
      modifiers={[
        frame({ width: dotSize, height: dotSize }),
        foregroundStyle(color ?? 'clear'),
        accessibilityHidden(),
      ]}
    />
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
