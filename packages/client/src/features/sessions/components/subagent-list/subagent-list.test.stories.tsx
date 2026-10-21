import { eachLayout, layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { interleavedSubagents, subagentStates } from './subagent-list.mocks';
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
      await expect(canvas.queryByText('Running')).toBeNull();
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
      await expect(canvas.queryByText('Running')).toBeNull();
      await expect(
        canvas.queryByRole('heading', { name: 'Finished' }),
      ).toBeNull();
      await expect(
        canvas.getByText('Finished · 2m 18s · 12.9k tokens'),
      ).toBeVisible();
      await expect(canvas.getByText('Opus 4.5 · Needs input')).toBeVisible();
      await expect(canvas.getByText('Cancelled · 12s')).toBeVisible();
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
      await expect(
        canvas.getByText('Finished · 2m 18s · 12.9k tokens'),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: /Port the mock CLIs/ }),
      ).toBeVisible();
    }),
};

// A finished Subagent stays between its neighbours; the component never regroups by state.
export const SpawnOrder: Story = {
  args: {
    subagents: interleavedSubagents,
  },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas
          .getAllByRole('button')
          .map((row) => row.getAttribute('aria-label')?.split(',')[0]),
      ).toEqual([
        'Find every Feed reader',
        'Draft the Plan schema',
        'Migrate tokens to kit roles',
        'Port the mock CLIs',
      ]);
    }),
};
