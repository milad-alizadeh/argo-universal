import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../variations';
import { Button } from './button';
import { ButtonGroup } from './button-group';
import { IconButton } from './icon-button';

const meta = {
  title: 'Design System/Primitives/ButtonGroup',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'ButtonGroup',
  render: () => (
    <Variations>
      <SplitButtonExample />
      <SecondaryButtonsExample />
    </Variations>
  ),
};

function SplitButtonExample(): React.JSX.Element {
  return (
    <Variation label="Split button">
      <View className="flex-row">
        <ButtonGroup>
          <Button label={'Allow'} appearance="content" />
          <AllowOptions />
        </ButtonGroup>
      </View>
    </Variation>
  );
}
function SecondaryButtonsExample(): React.JSX.Element {
  return (
    <Variation label="Secondary">
      <View className="flex-row">
        <ButtonGroup>
          {['Previous', 'Today', 'Next'].map((label) => (
            <Button
              key={label}
              variant="secondary"
              label={label}
              appearance="content"
            />
          ))}
        </ButtonGroup>
      </View>
    </Variation>
  );
}

function AllowOptions(): React.JSX.Element {
  return (
    <IconButton
      accessibilityLabel="Allow options"
      icon={'chevron-down'}
      iconSize="xs"
      size="md"
      variant="filled"
    />
  );
}
