import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Icon } from '../lib/icon';
import { Button } from './button';
import { ButtonGroup } from './button-group';
import { Text } from './text';

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
          <Button>
            <Text>Allow</Text>
          </Button>
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
            <Button key={label} variant="secondary">
              <Text>{label}</Text>
            </Button>
          ))}
        </ButtonGroup>
      </View>
    </Variation>
  );
}

function AllowOptions(): React.JSX.Element {
  return (
    <Button size="icon" accessibilityLabel="Allow options">
      <Icon name="chevron-down" size="sm" />
    </Button>
  );
}
