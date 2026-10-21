import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Picker } from './picker';
import { MultipleExample } from './picker-multiple-examples';
import type { SinglePickerProps } from './picker-props';

const options = [
  { value: 'low', label: 'Low' },
  {
    value: 'medium',
    label: 'Medium',
    subtitle: 'A balanced amount of reasoning',
  },
  { value: 'high', label: 'High' },
] as const;

const longOptions = [
  ...options,
  {
    value: 'maximum',
    label:
      'Maximum reasoning for a complex implementation with several linked changes',
    subtitle: 'Uses more time and more of your plan',
  },
  { value: 'legacy', label: 'Legacy', disabled: true },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'quick', label: 'Quick' },
  { value: 'automatic', label: 'Automatic' },
] as const;

// A Picker is controlled, so a story draws through a wrapper that keeps the choice.
function PickerExample({
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

/*
 * The meta is typed by the single Picker's props: `multiple` splits the props into a union, and the
 * stories that pick several values draw through MultipleExample instead.
 */
const meta = {
  title: 'Design System/Primitives/Inputs/Picker',
  component: Picker,
  args: { label: 'Effort', options, onValueChange: (): void => {} },
  argTypes: kitArgTypes('Picker'),
  parameters: { screenPreview: true },
  render: (args): React.JSX.Element => <PickerExample {...args} />,
} satisfies Meta<SinglePickerProps<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Row: Story = {
  render: (args): React.JSX.Element => (
    <List appearance="grouped">
      <ListSection title="ListItem accessory">
        <ListItem
          title="Effort"
          trailing={<PickerExample {...args} value="medium" variant="row" />}
        />
      </ListSection>
    </List>
  ),
};

export const Placeholder: Story = {};

export const Selected: Story = { args: { value: 'medium' } };

export const RequiredWithError: Story = {
  args: { required: true, errors: [{ message: 'Choose an effort' }] },
};

export const Disabled: Story = { args: { value: 'medium', disabled: true } };

export const LoadingOptions: Story = { args: { loading: true } };

export const NoOptions: Story = { args: { options: [] } };

export const OptionsUnavailable: Story = {
  args: { loadError: 'Could not load options' },
};

export const PreviousChoiceUnavailable: Story = { args: { value: 'removed' } };

export const SearchableList: Story = {
  args: { options: longOptions },
  parameters: {
    docs: {
      description: {
        story: 'Enough options to search, with long labels and a disabled one.',
      },
    },
  },
};

export const MultipleNoneSelected: Story = {
  render: (): React.JSX.Element => <MultipleExample />,
};

export const MultipleOneSelected: Story = {
  render: (): React.JSX.Element => <MultipleExample value={['bug']} />,
};

export const MultipleSeveralSelected: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample value={['bug', 'feature', 'docs']} />
  ),
};

export const MultipleDisabled: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample value={['bug', 'feature']} disabled />
  ),
};

export const MultipleLoadingOptions: Story = {
  render: (): React.JSX.Element => <MultipleExample loading />,
};

export const MultipleNoOptions: Story = {
  render: (): React.JSX.Element => <MultipleExample options={[]} />,
};

export const MultipleOptionsUnavailable: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample loadError="Could not load labels" />
  ),
};

export const MultiplePreviousChoiceUnavailable: Story = {
  render: (): React.JSX.Element => <MultipleExample value={['removed']} />,
};

export const MultipleInvalid: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample
      required
      errors={[{ message: 'Choose at least one label.' }]}
    />
  ),
};
