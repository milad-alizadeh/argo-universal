import {
  OutlinedTextField,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement } from 'react';
import { useMemo } from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { Host } from '../../native/host';
import { useComposeTextStyle } from '../../native/native-typography';
import { useFollowedText } from './field-input-text';
import { isInvalid } from './field-input-view.tsx';
import { blurOnFocusLoss } from './focus-loss';
import { StandaloneField } from './standalone-field';
import type { StandaloneFieldInputProps } from './standalone-field-input-props';
import { StandaloneFieldInput as WebField } from './standalone-field-input.tsx';

export function StandaloneFieldInput(
  props: StandaloneFieldInputProps,
): ReactElement {
  if (useWide()) return <WebField {...props} />;
  return (
    <StandaloneField {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <NativeField {...props} />
      </Host>
    </StandaloneField>
  );
}

function NativeField(props: StandaloneFieldInputProps): ReactElement {
  const field = useFieldProps(props);
  return (
    <OutlinedTextField {...field}>
      <OutlinedTextField.Label>
        <Text>
          {props.label}
          {props.required ? ' *' : ''}
        </Text>
      </OutlinedTextField.Label>
      {props.placeholder && (
        <OutlinedTextField.Placeholder>
          <Text>{props.placeholder}</Text>
        </OutlinedTextField.Placeholder>
      )}
    </OutlinedTextField>
  );
}

function useFieldProps(
  props: StandaloneFieldInputProps,
): ComponentProps<typeof OutlinedTextField> {
  const value = useNativeState(props.value);
  useFollowedText(value, props.value);
  const { fontFamily, fontSize, lineHeight, fontWeight } = useComposeTextStyle(
    props.mono ? 'code' : 'body',
  );
  const textStyle = { fontFamily, fontSize, lineHeight, fontWeight };
  const onFocusChanged = useMemo(
    () => blurOnFocusLoss(props.onBlur),
    [props.onBlur],
  );
  return {
    value,
    textStyle,
    onFocusChanged,
    onValueChange: props.onChange,
    enabled: !props.disabled,
    isError: isInvalid(props),
    singleLine: true,
    modifiers: [fillMaxWidth()],
    keyboardOptions: {
      capitalization: 'none',
      autoCorrectEnabled: false,
      keyboardType: props.numeric ? 'decimal' : 'text',
    },
  };
}
