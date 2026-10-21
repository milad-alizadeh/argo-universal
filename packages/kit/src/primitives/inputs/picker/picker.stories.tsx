import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Picker } from './picker';
import {
  disabledPicker,
  loadingOptionsPicker,
  multipleDisabledPicker,
  multipleInvalidPicker,
  multipleLoadingOptionsPicker,
  multipleNoOptionsPicker,
  multipleNoneSelectedPicker,
  multipleOneSelectedPicker,
  multipleOptionsUnavailablePicker,
  multiplePreviousChoiceUnavailablePicker,
  multipleSeveralSelectedPicker,
  noOptionsPicker,
  optionsUnavailablePicker,
  placeholderPicker,
  previousChoiceUnavailablePicker,
  requiredWithErrorPicker,
  rowPicker,
  searchableListPicker,
  selectedPicker,
} from './picker-fixtures';
import { MultipleExample } from './picker-multiple-examples';
import type { SinglePickerProps } from './picker-props';

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
  args: { ...placeholderPicker, onValueChange: (): void => {} },
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
          trailing={<PickerExample {...args} {...rowPicker} />}
        />
      </ListSection>
    </List>
  ),
};

export const Placeholder: Story = { args: placeholderPicker };

export const Selected: Story = { args: selectedPicker };

export const RequiredWithError: Story = { args: requiredWithErrorPicker };

export const Disabled: Story = { args: disabledPicker };

export const LoadingOptions: Story = { args: loadingOptionsPicker };

export const NoOptions: Story = { args: noOptionsPicker };

export const OptionsUnavailable: Story = { args: optionsUnavailablePicker };

export const PreviousChoiceUnavailable: Story = {
  args: previousChoiceUnavailablePicker,
};

export const SearchableList: Story = {
  args: searchableListPicker,
  parameters: {
    docs: {
      description: {
        story: 'Enough options to search, with long labels and a disabled one.',
      },
    },
  },
};

export const MultipleNoneSelected: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleNoneSelectedPicker} />
  ),
};

export const MultipleOneSelected: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleOneSelectedPicker} />
  ),
};

export const MultipleSeveralSelected: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleSeveralSelectedPicker} />
  ),
};

export const MultipleDisabled: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleDisabledPicker} />
  ),
};

export const MultipleLoadingOptions: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleLoadingOptionsPicker} />
  ),
};

export const MultipleNoOptions: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleNoOptionsPicker} />
  ),
};

export const MultipleOptionsUnavailable: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleOptionsUnavailablePicker} />
  ),
};

export const MultiplePreviousChoiceUnavailable: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multiplePreviousChoiceUnavailablePicker} />
  ),
};

export const MultipleInvalid: Story = {
  render: (): React.JSX.Element => (
    <MultipleExample {...multipleInvalidPicker} />
  ),
};
