import type { ReactElement } from 'react';
import {
  Platform,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { cn } from '#kit/utils';
import type { TextAreaProps } from './text-area-props';

// It grows to six of the reader's lines, then scrolls; the cap scales with Dynamic Type, as the Composer's does.
const maximumVisibleLines = 6;

// The body role's line height at the unscaled text size.
const lineHeight = 20;

function useMaxHeight(): number {
  const { fontScale } = useWindowDimensions();

  return maximumVisibleLines * lineHeight * Math.max(1, fontScale);
}

// Return sends on web and desktop, where Shift-Return adds a line; a phone's Return adds a line and its action sends.
const submitBehavior = Platform.OS === 'web' ? 'submit' : 'newline';

function inputProps(props: TextAreaProps): TextInputProps {
  const { onSubmit } = props;

  return {
    multiline: true,
    value: props.value,
    onChangeText: props.onChangeText,
    onSubmitEditing: onSubmit ? (): void => onSubmit() : undefined,
    submitBehavior: onSubmit ? submitBehavior : 'newline',
    placeholder: props.placeholder ?? props.label,
    accessibilityLabel: props.label,
    editable: props.disabled !== true,
    textAlignVertical: 'top',
  };
}

const fieldClass = (disabled: boolean | undefined): string =>
  cn(
    'min-h-5 min-w-0 flex-1 overflow-hidden border-0 bg-transparent p-0 py-1.5 type-body text-foreground shadow-none web:outline-none',
    disabled === true && 'opacity-50',
  );

/*
 * A multi-line field on a card, with its one action beside it at the foot, as the Composer's envelope holds Send. It
 * grows with its text, so a Screen's footer holds it at its foot as a chat's message field.
 */
export function TextArea(props: TextAreaProps): ReactElement {
  return (
    <View
      testID={props.testID}
      className="w-full flex-row items-end gap-2 rounded-2xl bg-card py-1.5 pr-1.5 pl-4 shadow-card"
    >
      <TextInput
        {...inputProps(props)}
        placeholderTextColorClassName="accent-muted-foreground/70 dark:accent-muted-foreground"
        style={{ maxHeight: useMaxHeight() }}
        className={fieldClass(props.disabled)}
      />
      {props.action ? <View className="shrink-0">{props.action}</View> : null}
    </View>
  );
}
