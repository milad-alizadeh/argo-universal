import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { IconButton } from './icon-button';

const sizes = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

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
      <Variation label="Sizes">
        <View className="flex-row items-center gap-2">
          {sizes.map((size) => (
            <IconButton
              key={size}
              icon="sidebar"
              size={size}
              variant="ghost"
              accessibilityLabel={`Sidebar, ${size}`}
            />
          ))}
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
