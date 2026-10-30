import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { recordedFile } from '../../../../../mocks/feed-edit-mock';
import { DiffView } from './diff-view';
import { movedDiff } from './diff-view-fixtures';

const largeHeader = { name: 'Diff for /repo/large.txt' };

const meta = {
  title: 'Tests/Feed/DiffView/Header',
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

function headerWithoutCopy(width: number): Story {
  return {
    play: async ({ canvas }) => {
      if (process.env.NODE_ENV !== 'test') return;

      await settleLayout(width);
      await expect(canvas.getByRole('button', largeHeader)).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Copy path' }),
      ).toBeNull();
      await expect(canvas.getByText(/^\+\d+$/)).toBeVisible();
    },
  };
}

export const WideHeaderHasNoCopy = headerWithoutCopy(layoutWidths.wide);

export const PhoneHeaderHasNoCopy = headerWithoutCopy(layoutWidths.phone);

// A rename is a fact about the change, so the header's name tells a screen reader both paths, as the sighted see old and new.
function headerNamesRename(width: number): Story {
  const { path, oldPath } = movedDiff.file;

  return {
    args: movedDiff,
    play: async ({ canvas }) => {
      if (process.env.NODE_ENV !== 'test') return;

      await settleLayout(width);
      await expect(
        canvas.getByRole('button', {
          name: `Diff for ${path}, renamed from ${oldPath}`,
        }),
      ).toBeVisible();
    },
  };
}

export const WideHeaderNamesRename = headerNamesRename(layoutWidths.wide);

export const PhoneHeaderNamesRename = headerNamesRename(layoutWidths.phone);

export const UnmovedHeaderNamesNoRename: Story = {
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;

    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByRole('button', largeHeader)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /renamed/ })).toBeNull();
  },
};
