import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import { Spinner } from '#primitives/display/spinner';
import { Text } from '#primitives/display/text';
import { Field } from '#primitives/fields/field';
import { useFooterDescription } from '#primitives/fields/field-description';
import { BareTextInput } from './text-input-bare';
import {
  fieldLoadingLabel,
  isInvalid,
  type StandaloneTextInputProps,
} from './text-input-props';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  return (
    <Field {...props}>
      <TextField {...props} />
    </Field>
  );
}

function TextField(props: StandaloneTextInputProps): ReactElement {
  const describedBy = useFooterDescription({
    invalid: isInvalid(props),
    hint: props.hint,
  });

  return (
    <View className="gap-1.5">
      <FieldLabel {...props} />
      <View className="flex-row items-center gap-2">
        <BareTextInput {...inputProps(props)} aria-describedby={describedBy} />
        <FieldSpinner {...props} />
      </View>
    </View>
  );
}

function FieldLabel(props: StandaloneTextInputProps): ReactElement {
  return (
    <Text aria-hidden role="body">
      {props.label}
      {props.required ? ' *' : ''}
    </Text>
  );
}

function FieldSpinner(
  props: Pick<StandaloneTextInputProps, 'label' | 'loading'>,
): ReactElement | null {
  if (!props.loading) return null;

  return <Spinner accessibilityLabel={fieldLoadingLabel(props.label)} />;
}

type InputProps = ComponentProps<typeof BareTextInput>;

function inputProps(props: StandaloneTextInputProps): InputProps & {
  'aria-invalid': boolean;
  'aria-required'?: boolean;
} {
  return {
    ...inputBehaviour(props),
    'aria-invalid': isInvalid(props),
    'aria-required': props.required,
    className: 'flex-1 rounded-control type-control shadow-none dark:bg-card',
  };
}

function inputBehaviour(props: StandaloneTextInputProps): InputProps {
  return {
    variant: 'bare',
    accessibilityLabel: props.label,
    value: props.value,
    onChangeText: props.onChangeText,
    onBlur: props.onBlur,
    placeholder: props.placeholder,
    editable: !props.disabled,
    keyboardType: props.numeric ? 'numbers-and-punctuation' : 'default',
  };
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;
