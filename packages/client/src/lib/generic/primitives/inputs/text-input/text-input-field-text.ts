import type { ObservableState } from '@expo/ui';
import { useState } from 'react';
import { useFollowedText } from '#primitives/native/followed-text';
import { blurOnFocusLoss } from './focus-loss';
import type { TextFieldProps } from './text-input-props';

interface FieldText {
  onChangeText: (value: string) => void;
  onFocusChanged: (focused: boolean) => void;
}

type FieldCallbacks = Pick<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'onFocus'
>;

export function useFieldText(
  text: ObservableState<string>,
  props: FieldCallbacks,
): FieldText {
  const onChangeText = useFollowedText(text, props.value, props.onChangeText);
  const [blurOnLeave] = useState(blurOnFocusLoss);

  return { onChangeText, onFocusChanged: focusChanged(props, blurOnLeave) };
}

function focusChanged(
  props: FieldCallbacks,
  blurOnLeave: ReturnType<typeof blurOnFocusLoss>,
): FieldText['onFocusChanged'] {
  return (focused) => {
    if (focused) props.onFocus?.();
    blurOnLeave(focused, props.onBlur ?? (() => {}));
  };
}
