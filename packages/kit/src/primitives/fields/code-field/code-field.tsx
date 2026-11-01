import type * as React from 'react';
import { useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { Text } from '#primitives/content/text';

export interface CodeFieldProps {
  // What has been typed so far: the code's own characters, as many as it has.
  value: string;
  // How many characters the code has, one box each.
  length: number;
  // How many boxes sit together before a gap; a code read aloud is said in groups.
  groupSize: number;
  // The code's own characters as they are typed or pasted, with whatever else was in them (spaces, a dash) already dropped.
  onChangeText: (value: string) => void;
  // Return in the field.
  onSubmit?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  // What assistive technology calls the field.
  label: string;
}

// Only the code's own characters stay: a pasted "7KQ4M-9XD2B" or "7kq4m 9xd2b" lands as ten.
export const codeCharacters = (typed: string, length: number): string =>
  typed
    .replaceAll(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, length);

/*
 * One box per character (#1490, "Enter the code by hand"). A single bare input lies over the boxes and takes the typing, the pasting and the autofill, so the boxes only draw what it holds; the box the next character lands in carries the focus ring. App-only: a Plugin has no code to take.
 */
export function CodeField(props: CodeFieldProps): React.JSX.Element {
  const [focused, setFocused] = useState(false);

  return (
    <View className="py-1">
      <Boxes {...props} focused={focused} />
      <CodeInput {...props} onFocusChange={setFocused} />
    </View>
  );
}

function Boxes(
  props: CodeFieldProps & { focused: boolean },
): React.JSX.Element {
  const groups = Math.ceil(props.length / props.groupSize);

  return (
    <View className="w-full flex-row items-center justify-center gap-6">
      {Array.from({ length: groups }, (_, group) => (
        <BoxGroup key={group} {...props} group={group} />
      ))}
    </View>
  );
}

function BoxGroup(
  props: CodeFieldProps & { focused: boolean; group: number },
): React.JSX.Element {
  const first = props.group * props.groupSize;

  return (
    <View className="max-w-68 min-w-0 flex-1 flex-row gap-2">
      {Array.from({ length: props.groupSize }, (_, offset) => (
        <CodeBox key={first + offset} {...boxOf(props, first + offset)} />
      ))}
    </View>
  );
}

interface BoxProps {
  character: string | undefined;
  focused: boolean;
}

// The next character lands in the first empty box, and a full code rests on the last.
const boxOf = (
  props: CodeFieldProps & { focused: boolean },
  index: number,
): BoxProps => ({
  character: props.value[index],
  focused:
    props.focused && index === Math.min(props.value.length, props.length - 1),
});

function CodeInput(
  props: CodeFieldProps & { onFocusChange: (focused: boolean) => void },
): React.JSX.Element {
  return (
    <TextInput
      className="absolute inset-0 opacity-0 web:cursor-text"
      {...valueProps(props)}
      {...eventProps(props)}
    />
  );
}

const valueProps = (props: CodeFieldProps): TextInputProps => ({
  accessibilityLabel: props.label,
  value: props.value,
  editable: !props.disabled,
  'aria-disabled': props.disabled,
  autoFocus: props.autoFocus,
  autoCapitalize: 'characters',
  autoCorrect: false,
  autoComplete: 'one-time-code',
});

const eventProps = (
  props: CodeFieldProps & { onFocusChange: (focused: boolean) => void },
): TextInputProps => ({
  onChangeText: (typed) =>
    props.onChangeText(codeCharacters(typed, props.length)),
  onSubmitEditing: props.onSubmit,
  onFocus: () => props.onFocusChange(true),
  onBlur: () => props.onFocusChange(false),
});

function CodeBox(props: BoxProps): React.JSX.Element {
  return (
    <View
      className={`h-14 min-w-0 max-w-12 flex-1 items-center justify-center rounded-lg bg-card ${props.focused ? 'border-2 border-focus' : 'border border-border'}`}
    >
      <Text role="title-code">{props.character}</Text>
    </View>
  );
}
