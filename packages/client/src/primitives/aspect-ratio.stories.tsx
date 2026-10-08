import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { AspectRatio } from './aspect-ratio';

function RatioExamples() {
  return (
    <Variations>
      {(
        [
          ['1:1', 1],
          ['4:3', 4 / 3],
          ['16:9', 16 / 9],
        ] as const
      ).map(([label, ratio]) => (
        <Variation key={label} label={label}>
          <AspectRatio ratio={ratio}>
            <View className="h-full w-full rounded-md bg-muted" />
          </AspectRatio>
        </Variation>
      ))}
    </Variations>
  );
}
const meta = {
  title: 'Design System/Primitives/Aspect Ratio',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Aspect Ratio',
  render: RatioExamples,
};
