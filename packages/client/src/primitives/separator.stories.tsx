import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { Separator } from './separator';
import { Text } from './text';

function OrientationExamples() {
  return (
    <Variations>
      {(['horizontal', 'vertical'] as const).map((orientation) => (
        <Variation key={orientation} label={orientation}>
          <View
            className={
              orientation === 'vertical'
                ? 'h-12 flex-row items-center gap-4'
                : 'gap-4'
            }
          >
            <Text>React Native</Text>
            <Separator orientation={orientation} />
            <Text>Reusables</Text>
          </View>
        </Variation>
      ))}
    </Variations>
  );
}
const meta = {
  title: 'Design System/Primitives/Separator',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Separator',
  render: OrientationExamples,
};
