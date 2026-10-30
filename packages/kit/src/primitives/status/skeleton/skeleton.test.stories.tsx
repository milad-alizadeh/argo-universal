import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { loadedSkeleton, loadingSkeleton } from './skeleton-fixtures';
import { SkeletonNoData, SkeletonWithRows } from './skeleton-no-data';
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

/*
 * A List with no rows and a Text with no words stand in for themselves: the Skeleton has lines to measure, and
 * assistive technology reads none of the placeholder words.
 */
export const DrawsPlaceholdersWithNoData: Story = {
  args: loadingSkeleton,
  render: (args): ReactElement => <SkeletonNoData {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = await canvas.findByRole('status');

    await expect(status).toHaveAttribute('aria-busy', 'true');
    await waitFor(() =>
      expect(
        within(canvas.getByTestId('skeleton-no-data')).queryAllByText(
          /Placeholder/,
        ).length,
      ).toBeGreaterThan(0),
    );
    await expect(within(status).queryAllByRole('button')).toHaveLength(0);
    await expect(within(status).queryAllByRole('link')).toHaveLength(0);
  },
};

// What `Skeleton.Ignore` holds stays as drawn, so a List with no rows inside it draws none of its own.
export const IgnoredContentDrawsNoPlaceholders: Story = {
  args: loadingSkeleton,
  render: (args): ReactElement => <SkeletonNoData {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('status');

    await expect(
      within(canvas.getByTestId('skeleton-ignored')).queryAllByText(
        /Placeholder/,
      ),
    ).toHaveLength(0);
  },
};

// A loading List keeps every row it already has: only what has nothing of its own stands in for itself.
export const KeepsTheRowsItHas: Story = {
  args: loadingSkeleton,
  render: (args): ReactElement => <SkeletonWithRows {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Kept row')).toBeInTheDocument();
    await expect(canvas.queryAllByText(/Placeholder/)).toHaveLength(0);
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
