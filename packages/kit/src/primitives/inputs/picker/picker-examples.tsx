// Story examples for the Picker, shown on the Picker's pages.
import { useState } from 'react';
import { View } from 'react-native';
import { Picker } from './picker';
import type { MultiplePickerProps, SinglePickerProps } from './picker-props';

const labels = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'docs', label: 'Docs' },
  { value: 'chore', label: 'Chore' },
] as const;

type Props = Partial<
  Omit<MultiplePickerProps<string>, 'onValueChange' | 'label' | 'multiple'>
>;

const base = { label: 'Labels', placeholder: 'Choose labels', options: labels };

// A Picker is controlled, so a story draws through a wrapper that keeps the choice.
export function SingleExample({
  value: initial,
  ...props
}: SinglePickerProps<string>): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return (
    <View className="w-full max-w-96">
      <Picker {...props} value={value} onValueChange={setValue} />
    </View>
  );
}

export function MultipleExample(props: Props): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  return (
    <View className="w-full max-w-96">
      <Picker
        {...base}
        {...props}
        multiple
        value={value}
        onValueChange={setValue}
      />
    </View>
  );
}
