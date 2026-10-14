import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { FieldSection } from '#primitives/fields/field-section';
import { ListItem } from '#primitives/lists/list-item';
import { Variation, Variations as VariationList } from '../../../variations';
import { Picker } from './picker';
import type { PickerProps } from './picker-props';

const options = [
  { value: 'low', label: 'Low' },
  {
    value: 'medium',
    label: 'Medium',
    supportingText: 'A balanced amount of reasoning',
  },
  { value: 'high', label: 'High' },
] as const;

const longOptions = [
  ...options,
  {
    value: 'maximum',
    label:
      'Maximum reasoning for a complex implementation with several linked changes',
    supportingText: 'Uses more time and more of your plan',
  },
  { value: 'legacy', label: 'Legacy', disabled: true },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'quick', label: 'Quick' },
  { value: 'automatic', label: 'Automatic' },
] as const;

type ExampleProps = Partial<Omit<PickerProps<string>, 'onChange' | 'label'>>;

function PickerExample(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  return (
    <View className="w-full max-w-96">
      <Picker
        label="Effort"
        options={options}
        {...props}
        value={value}
        onChange={setValue}
      />
    </View>
  );
}

const examples: { label: string; props: ExampleProps }[] = [
  { label: 'Placeholder', props: {} },
  { label: 'Selected', props: { value: 'medium' } },
  {
    label: 'Required with error',
    props: { required: true, errors: [{ message: 'Choose an effort' }] },
  },
  { label: 'Disabled', props: { value: 'medium', disabled: true } },
  { label: 'Loading options', props: { loading: true } },
  { label: 'No options', props: { options: [] } },
  { label: 'Options unavailable', props: { error: 'Could not load options' } },
  { label: 'Previous choice unavailable', props: { value: 'removed' } },
  {
    label: 'Searchable list, long labels and disabled option',
    props: { options: longOptions },
  },
];

const meta = { title: 'Design System/Primitives/Picker' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Picker',
  render: () => (
    <VariationList>
      {examples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <PickerExample {...props} />
        </Variation>
      ))}
      <Variation label="ListItem accessory">
        <AccessoryExample />
      </Variation>
    </VariationList>
  ),
};

function AccessoryExample(): React.JSX.Element {
  return (
    <FieldSection>
      <ListItem
        title="Effort"
        accessory={<PickerExample value="medium" appearance="row" />}
      />
    </FieldSection>
  );
}
