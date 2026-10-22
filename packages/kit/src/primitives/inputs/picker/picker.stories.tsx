import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Picker } from './picker';
import { MultipleExample, SingleExample } from './picker-examples';
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
  placeholderPicker,
  previousChoiceUnavailablePicker,
  requiredWithErrorPicker,
  rowPicker,
  selectedPicker,
} from './picker-fixtures';
import { Choices } from './picker-multiple-choices';
import type { MultiplePickerProps, SinglePickerProps } from './picker-props';

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
  render: (args): React.JSX.Element => <SingleExample {...args} />,
} satisfies Meta<SinglePickerProps<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * Nothing to choose from says nothing in the field, whose trigger keeps its placeholder, so those
 * states are drawn where their message is: in the choices the Picker opens.
 */
function ChoicesExample(
  props: Omit<MultiplePickerProps<string>, 'onValueChange'>,
): React.JSX.Element {
  return (
    <View className="w-full max-w-96">
      <Choices {...props} onValueChange={(): void => {}} />
    </View>
  );
}

export const Row: Story = {
  render: (args): React.JSX.Element => (
    <List appearance="grouped">
      <ListSection title="ListItem accessory">
        <ListItem
          title="Effort"
          trailing={<SingleExample {...args} {...rowPicker} />}
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

export const PreviousChoiceUnavailable: Story = {
  args: previousChoiceUnavailablePicker,
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
    <ChoicesExample {...multipleNoOptionsPicker} />
  ),
};

export const MultipleOptionsUnavailable: Story = {
  render: (): React.JSX.Element => (
    <ChoicesExample {...multipleOptionsUnavailablePicker} />
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
