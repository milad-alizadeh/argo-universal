import {
  HStack,
  LabeledContent,
  ProgressView,
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
  listRowInsets,
  listRowSeparatorTint,
  multilineTextAlignment,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useFollowedText } from '#primitives/native/followed-text';
import { useSwiftUITextModifiers } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import {
  isInvalid,
  type TextFieldProps,
  textInputLoadingLabel,
} from './text-input-props';
import { RowTextInput as WebRowTextInput } from './text-input-row.tsx';

const rowHeight = 52;

const inset = 16;

export function RowTextInput(props: TextFieldProps): React.JSX.Element {
  if (useWide()) return <WebRowTextInput {...props} />;

  return <FormRow {...props} />;
}

// A Settings form row: the label leading, the SwiftUI field taking the rest of the row with its text trailing.
function FormRow(props: TextFieldProps): React.JSX.Element {
  const modifiers = useRowModifiers();

  return (
    <LabeledContent label={<RowLabel {...props} />} modifiers={modifiers}>
      <RowValue {...props} />
    </LabeledContent>
  );
}

// The field, then the system spinner while the value is checked.
function RowValue(props: TextFieldProps): React.JSX.Element {
  if (!props.loading) return <RowField {...props} />;

  return (
    <HStack spacing={8}>
      <RowField {...props} />
      <ProgressView modifiers={[accessibilityLabel(textInputLoadingLabel)]} />
    </HStack>
  );
}

function useRowModifiers(): React.ComponentProps<
  typeof LabeledContent
>['modifiers'] {
  const { border } = useNativeTheme().colors;

  return [
    listRowSeparatorTint(border),
    listRowInsets({ top: 0, bottom: 0, leading: inset, trailing: inset }),
    frame({ minHeight: rowHeight }),
  ];
}

function RowLabel(props: TextFieldProps): React.JSX.Element {
  const bodyModifiers = useSwiftUITextModifiers('body', 'row');
  const { danger } = useNativeTheme().colors;

  const color = isInvalid(props) && danger ? [foregroundStyle(danger)] : [];

  return <Text modifiers={[...bodyModifiers, ...color]}>{props.label}</Text>;
}

function RowField(props: TextFieldProps): React.JSX.Element {
  const text = useNativeState(props.value);
  useFollowedText(text, props.value);
  const modifiers = useFieldModifiers(props);

  return (
    <TextField
      text={text}
      placeholder={props.placeholder}
      onTextChange={props.onChangeText}
      onFocusChange={(focused) => focused || props.onBlur?.()}
      modifiers={modifiers}
    />
  );
}

type FieldModifiers = React.ComponentProps<typeof TextField>['modifiers'];

function useFieldModifiers(props: TextFieldProps): FieldModifiers {
  const fieldModifiers = useSwiftUITextModifiers(
    props.mono ? 'code' : 'body',
    'row',
  );

  return [
    ...fieldModifiers,
    multilineTextAlignment('trailing'),
    disabled(!!props.disabled),
    textInputAutocapitalization('never'),
    autocorrectionDisabled(true),
    accessibilityLabel(props.label),
  ];
}

RowTextInput satisfies React.ComponentType<TextFieldProps>;
