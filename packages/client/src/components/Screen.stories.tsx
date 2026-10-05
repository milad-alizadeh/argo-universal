import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { ScreenPreview } from '../../mocks/screen-preview';
import { Screen } from './Screen';

const meta = { title: 'Shared/Screen', component: Screen } satisfies Meta<
  typeof Screen
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SafeArea: Story = {
  render: (args) => (
    <Variations>
      {[true, false].map((safeArea) => (
        <Variation
          key={String(safeArea)}
          label={safeArea ? 'Default safe-area insets' : 'Insets disabled'}
        >
          <ScreenPreview>
            <Screen {...args} safeArea={safeArea} className="bg-sidebar">
              <View className="flex-1 items-center justify-center bg-background">
                <Text>Screen content</Text>
              </View>
            </Screen>
          </ScreenPreview>
        </Variation>
      ))}
    </Variations>
  ),
};
export const Edges: Story = {
  render: (args) => (
    <Variations>
      <Variation label="Bottom inset only">
        <ScreenPreview>
          <Screen {...args} edges={['bottom']} className="bg-sidebar">
            <View className="flex-1 items-center justify-center bg-background">
              <Text>Screen content</Text>
            </View>
          </Screen>
        </ScreenPreview>
      </Variation>
    </Variations>
  ),
};
