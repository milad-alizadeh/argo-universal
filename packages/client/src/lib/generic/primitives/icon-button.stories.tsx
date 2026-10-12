import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../variations';
import { IconButton } from './icon-button';

const meta = { title: 'Design System/Primitives/IconButton' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'IconButton',
  render: () => (
    <VariationList>
      <Variation label="Default">
        <View className="flex-row">
          <IconButton icon="more" accessibilityLabel="More actions" />
        </View>
      </Variation>
      <Variation label="Disabled">
        <View className="flex-row">
          <IconButton icon="more" accessibilityLabel="More actions" disabled />
        </View>
      </Variation>
      <Variation label="Loading">
        <View className="flex-row">
          <IconButton icon="more" accessibilityLabel="More actions" loading />
        </View>
      </Variation>
    </VariationList>
  ),
};
