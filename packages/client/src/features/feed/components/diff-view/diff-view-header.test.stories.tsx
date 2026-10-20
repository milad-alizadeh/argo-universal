import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { DiffView } from './diff-view';

const largeHeader = { name: 'Diff for /repo/large.txt' };

const meta = {
  title: 'Tests/DiffView',
  component: DiffView,
  globals: { mode: 'light' },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: { file: recordedFile('agent-2', 'edit-states') },
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

// Wide, the path button fills the header up to Copy path, so there is no dead space to miss.
export const WideHeaderCopiesThePath: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    await settleViewport(layoutWidths.wide);
    const header = canvas.getByRole('button', largeHeader);
    const copy = canvas.getByRole('button', { name: 'Copy path' });

    await expect(copy).toBeVisible();
    await page.elementLocator(header).hover();
    await expect(header.getBoundingClientRect().right).toBeLessThanOrEqual(
      copy.getBoundingClientRect().left,
    );
  },
};

// Phone file headers keep the path and counts reachable without a Copy path action.
export const PhoneHeaderHasNoCopy: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    await settleViewport(layoutWidths.phone);
    await expect(canvas.getByRole('button', largeHeader)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Copy path' }),
    ).toBeNull();
    await expect(canvas.getByText(/^\+\d+$/)).toBeVisible();
  },
};
