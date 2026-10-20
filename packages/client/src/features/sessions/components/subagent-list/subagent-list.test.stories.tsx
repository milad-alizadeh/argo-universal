import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { subagentStates } from './subagent-list.mocks';
import listMeta from './subagent-list.stories';

const meta = {
  ...listMeta,
  title: 'Tests/SubagentList',
  args: { ...listMeta.args, onSelect: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const None: Story = {
  args: { subagents: subagentStates.none },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.queryByText('Running')).toBeNull();
      await expect(canvas.queryByText('Finished')).toBeNull();
    }),
};

export const OneRunning: Story = {
  args: { subagents: subagentStates.oneRunning },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText(/Running/)).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: /Find every Feed reader/ }),
      ).toBeVisible();
      await expect(
        canvas.getByText('Sonnet 4.5 · 34s · 8.2k tokens'),
      ).toBeVisible();
      await expect(canvas.queryByText(/Finished/)).toBeNull();
    }),
};

export const SeveralMixed: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText(/Running/)).toBeVisible();
      await expect(canvas.getByText(/Finished/)).toBeVisible();
      await expect(
        canvas.getByText('Opus 4.5 · 1m 02s · 21.4k tokens'),
      ).toBeVisible();
      await expect(
        canvas.getByText('Haiku 4.5 · 2m 18s · 12.9k tokens'),
      ).toBeVisible();
    }),
};

export const SelectFinished: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      canvas.getByRole('button', { name: /Port the mock CLIs/ }),
    );
    await expect(args.onSelect).toHaveBeenCalledWith(
      subagentStates.severalMixed[3],
    );
  },
};

export const AllFinished: Story = {
  args: { subagents: subagentStates.allFinished },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.queryByText(/Running/)).toBeNull();
      await expect(canvas.getByText(/Finished/)).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: /Port the mock CLIs/ }),
      ).toBeVisible();
    }),
};
