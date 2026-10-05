import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Skeleton } from '#primitives/skeleton';

function SkeletonPreview() {
  return (
    <View className="flex flex-row items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <View className="gap-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </View>
    </View>
  );
}

const meta = {
  title: 'Design System/Primitives/Skeleton',
  tags: ['third-party'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Skeleton',
  render: () => <SkeletonPreview />,
};
