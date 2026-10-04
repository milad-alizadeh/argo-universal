import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { AspectRatio } from './aspect-ratio';

function RatioExamples() {
  return (
    <Variations>
      {[1, 4 / 3, 16 / 9].map((ratio) => (
        <Variation key={ratio} label={String(ratio)}>
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

export const Default: Story = { render: RatioExamples };
