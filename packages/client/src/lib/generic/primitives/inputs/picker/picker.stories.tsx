import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { Variation, Variations as VariationList } from '../../../variations';
import { Picker } from './picker';
import type { PickerProps } from './picker-props';

const options = [
  { value: 'low', label: 'Low' },
  {
    value: 'medium',
    label: 'Medium',
    supporting: 'A balanced amount of reasoning',
  },
  { value: 'high', label: 'High' },
] as const;

const longOptions = [
  ...options,
  {
    value: 'maximum',
    label:
      'Maximum reasoning for a complex implementation with several linked changes',
    supporting: 'Uses more time and more of your plan',
  },
  { value: 'legacy', label: 'Legacy', disabled: true },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'quick', label: 'Quick' },
  { value: 'automatic', label: 'Automatic' },
] as const;

type ExampleProps = Partial<
  Omit<PickerProps<string>, 'onValueChange' | 'label'>
>;

function PickerExample(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  return (
    <View className="w-full max-w-96">
      <Picker
        label="Effort"
        options={options}
        {...props}
        value={value}
        onValueChange={setValue}
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
  {
    label: 'Options unavailable',
    props: { loadError: 'Could not load options' },
  },
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
      <Variation label="GroupedListItem accessory">
        <AccessoryExample />
      </Variation>
      <Variation label="Drill row">
        <DrillRowExample />
      </Variation>
    </VariationList>
  ),
};

function AccessoryExample(): React.JSX.Element {
  return (
    <GroupedListSection>
      <GroupedListItem
        label="Effort"
        accessory={<PickerExample value="medium" />}
      />
    </GroupedListSection>
  );
}

const modes = [
  { value: 'ask', label: 'Ask' },
  { value: 'edit', label: 'Edit' },
  { value: 'plan', label: 'Plan mode' },
] as const;

type DrillRowProps = Pick<PickerProps<string>, 'label' | 'options'> & {
  initial: string;
};

function DrillRow(props: DrillRowProps): React.JSX.Element {
  const [value, setValue] = useState(props.initial);

  return (
    <Picker
      variant="row"
      label={props.label}
      options={props.options}
      value={value}
      onValueChange={setValue}
    />
  );
}

// Rows in a menu: a wide window opens the options beside the row, a phone sheet pushes them.
function DrillRowExample(): React.JSX.Element {
  return (
    <GroupedListSection>
      <DrillRow label="Mode" options={modes} initial="ask" />
      <DrillRow label="Effort" options={options} initial="medium" />
    </GroupedListSection>
  );
}
