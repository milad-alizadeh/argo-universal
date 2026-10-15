import type { ObservableState } from '@expo/ui';
import { useState } from 'react';
import { useFollowedText } from '#primitives/native/followed-text';
import { blurOnFocusLoss } from './focus-loss';
import type { TextFieldProps } from './text-input-props';

interface FieldText {
  onChangeText: (value: string) => void;
  onFocusChanged: (focused: boolean) => void;
}

/*
 * The native field's text, in its own platform's native state, follows the form's
 * value; leaving the field, not its first unfocused report, blurs the form field.
 */
export function useFieldText(
  text: ObservableState<string>,
  {
    onBlur = () => {},
    ...props
  }: Pick<TextFieldProps, 'value' | 'onChangeText' | 'onBlur'>,
): FieldText {
  const onChangeText = useFollowedText(text, props.value, props.onChangeText);
  const [focus] = useState(blurOnFocusLoss);

  return {
    onChangeText,
    onFocusChanged: (focused) => focus(focused, onBlur),
  };
}
