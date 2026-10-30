import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import {
  loadedSkeleton,
  loadingSkeleton,
  stillSkeleton,
} from './skeleton-fixtures';
import { SkeletonNoData, SkeletonWithRows } from './skeleton-no-data';
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

// Nothing to draw yet: each List makes its own rows and each Text its own bar, from no data at all.
export const NoData: Story = {
  args: loadingSkeleton,
  render: (args): ReactElement => <SkeletonNoData {...args} />,
};

// Some of the data has arrived: the List keeps the rows it has, and the Skeleton draws over them.
export const SomeData: Story = {
  args: loadingSkeleton,
  render: (args): ReactElement => <SkeletonWithRows {...args} />,
};
