import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  loadedSkeleton,
  loadingSkeleton,
  stillSkeleton,
} from './skeleton-fixtures';
import { SkeletonSample } from './skeleton-sample';

const meta = {
  title: 'Design System/Primitives/Status/Skeleton',
  component: SkeletonSample,
  argTypes: {
    loading: { control: 'boolean' },
    animation: { control: 'inline-radio', options: ['pulse', 'none'] },
  },
  parameters: { screenPreview: true },
} satisfies Meta<typeof SkeletonSample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = { args: loadingSkeleton };

export const Still: Story = { args: stillSkeleton };

export const Loaded: Story = { args: loadedSkeleton };
