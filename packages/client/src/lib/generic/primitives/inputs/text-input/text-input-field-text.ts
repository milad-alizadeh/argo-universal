import type { ObservableState } from '@expo/ui';
import { useState } from 'react';
import { useFollowedText } from '#primitives/native/followed-text';
import { blurOnFocusLoss } from './focus-loss';
import type { TextFieldProps } from './text-input-props';

interface FieldText {
  onChangeText: (value: string) => void;
  onFocusChanged: (focused: boolean) => void;
}

export function useFieldText(
  text: ObservableState<string>,
  {
    onBlur = () => {},
    ...props
  }: Pick<TextFieldProps, 'value' | 'onChangeText' | 'onBlur'>,
): FieldText {
  const onChangeText = useFollowedText(text, props.value, props.onChangeText);
  const [blurOnLeave] = useState(blurOnFocusLoss);

  return {
    onChangeText,
    onFocusChanged: (focused) => blurOnLeave(focused, onBlur),
  };
}
