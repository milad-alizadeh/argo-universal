import { type ReactElement, type ReactNode, useState } from 'react';
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

type FittedHeight = Pick<TextInputProps, 'onContentSizeChange'> & {
  height?: number;
};

/*
 * An empty field is one line tall. iOS measures a field again only when its reader types, so one a send clears keeps
 * the height of the text it held; a native field holds the height it had while empty whenever it is empty again.
 * Web's textarea sizes itself to its text (`fieldClass`).
 */
function useEmptyHeight(value: string): FittedHeight {
  const [emptyHeight, setEmptyHeight] = useState<number>();

  if (Platform.OS === 'web') return {};

  return {
    height: value === '' ? emptyHeight : undefined,
    // The least height seen while empty: text pasted into an empty field can report its size before its value.
    onContentSizeChange: (event): void => {
      const { height } = event.nativeEvent.contentSize;

      if (value === '')
        setEmptyHeight((seen) => Math.min(seen ?? height, height));
    },
  };
}

// Return sends on web and desktop, where Shift-Return adds a line; a phone's Return adds a line and its action sends.
const submitBehavior = Platform.OS === 'web' ? 'submit' : 'newline';

// Without an `onSubmit`, Return always adds a line.
function submitProps({
  onSubmit,
}: TextAreaProps): Pick<TextInputProps, 'onSubmitEditing' | 'submitBehavior'> {
  if (!onSubmit) return { submitBehavior: 'newline' };

  return { onSubmitEditing: (): void => onSubmit(), submitBehavior };
}

function inputProps(props: TextAreaProps): TextInputProps {
  return {
    ...submitProps(props),
    multiline: true,
    value: props.value,
    onChangeText: props.onChangeText,
    placeholder: props.placeholder ?? props.label,
    accessibilityLabel: props.label,
    editable: props.disabled !== true,
    textAlignVertical: 'top',
  };
}

const fieldClass = (disabled: boolean | undefined): string =>
  cn(
    'min-h-5 min-w-0 flex-1 overflow-hidden border-0 bg-transparent p-0 py-1.5 type-body text-foreground shadow-none web:field-sizing-content web:resize-none web:outline-none',
    disabled === true && 'opacity-50',
  );

const cardClass =
  'w-full flex-row items-end gap-2 rounded-2xl bg-card py-1.5 pr-1.5 pl-4 shadow-card';

/*
 * A multi-line field on a card, with its one action beside it at the foot, as the Composer's envelope holds Send. It
 * grows with its text, so a Screen's footer holds it at its foot as a chat's message field.
 */
export function TextArea(props: TextAreaProps): ReactElement {
  const { height, onContentSizeChange } = useEmptyHeight(props.value);

  return (
    <View testID={props.testID} className={cardClass}>
      <TextInput
        {...inputProps(props)}
        onContentSizeChange={onContentSizeChange}
        placeholderTextColorClassName="accent-muted-foreground/70 dark:accent-muted-foreground"
        style={{ height, maxHeight: useMaxHeight() }}
        className={fieldClass(props.disabled)}
      />
      <TextAreaAction action={props.action} />
    </View>
  );
}

function TextAreaAction({ action }: Pick<TextAreaProps, 'action'>): ReactNode {
  return action ? <View className="shrink-0">{action}</View> : null;
}
