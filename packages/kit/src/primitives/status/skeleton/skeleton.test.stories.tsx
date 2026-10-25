import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { loadedSkeleton, loadingSkeleton } from './skeleton-fixtures';
import { SkeletonSample } from './skeleton-sample';

const meta = {
  title: 'Tests/Design System/Primitives/Status/Skeleton',
  component: SkeletonSample,
} satisfies Meta<typeof SkeletonSample>;

export default meta;

type Story = StoryObj<typeof meta>;

const heading = { name: 'Quarterly report' };

const ignored = { name: 'Always visible' };

// While loading, what the children drew is hidden from assistive technology and an ignored note stays readable.
export const HidesContentWhileLoading: Story = {
  args: loadingSkeleton,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('status')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await waitFor(() =>
      expect(canvas.queryByRole('heading', heading)).toBeNull(),
    );
    await expect(canvas.getByRole('heading', ignored)).toBeVisible();
  },
};

// Once loaded the Skeleton is no longer a status, and the content is readable again.
export const ShowsContentOnceLoaded: Story = {
  args: loadedSkeleton,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', heading)).toBeVisible();
    await expect(canvas.queryByRole('status')).toBeNull();
    await expect(canvas.getByRole('heading', ignored)).toBeVisible();
  },
};
