// Story examples for the multiple Picker, shown on the Picker page.
import { useState } from 'react';
import { View } from 'react-native';
import { Picker } from './picker';
import type { MultiplePickerProps } from './picker-props';

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

export const multipleExamples: {
  label: string;
  props: Props;
}[] = [
  { label: 'Multiple: none selected', props: {} },
  { label: 'Multiple: one selected', props: { value: ['bug'] } },
  {
    label: 'Multiple: several selected',
    props: { value: ['bug', 'feature', 'docs'] },
  },
  {
    label: 'Multiple: disabled',
    props: { value: ['bug', 'feature'], disabled: true },
  },
  { label: 'Multiple: loading options', props: { loading: true } },
  { label: 'Multiple: no options', props: { options: [] } },
  {
    label: 'Multiple: options unavailable',
    props: { loadError: 'Could not load labels' },
  },
  {
    label: 'Multiple: previous choice unavailable',
    props: { value: ['removed'] },
  },
  {
    label: 'Multiple: invalid',
    props: {
      required: true,
      errors: [{ message: 'Choose at least one label.' }],
    },
  },
];
