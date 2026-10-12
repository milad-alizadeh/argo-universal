import {
  LabeledContent,
  Text,
  TextField,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  autocorrectionDisabled,
  disabled,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparatorTint,
  multilineTextAlignment,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../native-theme';
import { useWide } from '../use-wide';
import { useFollowedText } from './field-input-text';
import { FieldInput as WebFieldInput, isInvalid } from './field-input-view.tsx';
import type { FieldInputProps } from './field-props';
import { useSwiftUITextModifiers } from './native-typography';

const rowHeight = 52;
const inset = 16;

export function FieldInput(props: FieldInputProps): React.JSX.Element {
  if (useWide()) return <WebFieldInput {...props} />;
  return <FormRow {...props} />;
}

// A Settings form row: the label leading, the SwiftUI field taking the rest of the row with its text trailing.
function FormRow(props: FieldInputProps): React.JSX.Element {
  const { muted, separator } = useNativeTheme().colors;
  return (
    <LabeledContent
      label={<RowLabel {...props} />}
      modifiers={[
        listRowBackground(muted ?? 'transparent'),
        listRowSeparatorTint(separator),
        listRowInsets({ top: 0, bottom: 0, leading: inset, trailing: inset }),
        frame({ minHeight: rowHeight }),
      ]}
    >
      <RowField {...props} />
    </LabeledContent>
  );
}

function RowLabel(props: FieldInputProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers('body', 'row');
  const { destructive } = useNativeTheme().colors;
  const color =
    isInvalid(props) && destructive ? [foregroundStyle(destructive)] : [];
  return <Text modifiers={[...bodyModifiers, ...color]}>{props.label}</Text>;
}

function RowField(props: FieldInputProps): React.JSX.Element {
  const text = useNativeState(props.value);
  useFollowedText(text, props.value);
  const fieldModifiers = useSwiftUITextModifiers(
    props.mono ? 'code' : 'body',
    'row',
  );
  return (
    <TextField
      text={text}
      placeholder={props.placeholder}
      onTextChange={props.onChange}
      onFocusChange={(focused) => focused || props.onBlur?.()}
      modifiers={[
        ...fieldModifiers,
        multilineTextAlignment('trailing'),
        disabled(!!props.disabled),
        textInputAutocapitalization('never'),
        autocorrectionDisabled(true),
        accessibilityLabel(props.label),
      ]}
    />
  );
}
