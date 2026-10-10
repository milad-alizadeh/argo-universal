import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import { Icon } from '../symbols/icon';
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
      <Variation label="Split button">
        <View className="flex-row">
          <ButtonGroup>
            <Button>
              <Text>Allow</Text>
            </Button>
            <Button size="icon" accessibilityLabel="Allow options">
              <Icon name="chevron-down" size="sm" />
            </Button>
          </ButtonGroup>
        </View>
      </Variation>
      <Variation label="Secondary">
        <View className="flex-row">
          <ButtonGroup>
            <Button variant="secondary">
              <Text>Previous</Text>
            </Button>
            <Button variant="secondary">
              <Text>Today</Text>
            </Button>
            <Button variant="secondary">
              <Text>Next</Text>
            </Button>
          </ButtonGroup>
        </View>
      </Variation>
    </Variations>
  ),
};
