import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { ScreenPreview } from '../../mocks/screen-preview';
import { Screen, type ScreenProps } from './Screen';

const meta = { title: 'Shared/Screen', component: Screen } satisfies Meta<
  typeof Screen
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Screen',
  render: (args) => (
    <Variations>
      {(
        [
          { label: 'Default safe-area insets', props: {} },
          { label: 'Bottom inset only', props: { edges: ['bottom'] } },
          { label: 'Insets disabled', props: { safeArea: false } },
        ] satisfies { label: string; props: Partial<ScreenProps> }[]
      ).map(({ label, props }) => (
        <Variation key={label} label={label}>
          <ScreenPreview>
            <Screen {...args} {...props} className="bg-sidebar">
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
