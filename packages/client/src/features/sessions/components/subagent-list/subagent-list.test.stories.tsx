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

const rowNames = (canvas: { getAllByRole: (role: 'button') => HTMLElement[] }) =>
  canvas.getAllByRole('button').map((row) => row.getAttribute('aria-label'));

export const None: Story = {
  args: { subagents: subagentStates.none },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.queryByRole('button')).toBeNull();
      await expect(canvas.queryByLabelText('Subagents')).toBeNull();
    }),
};

export const OneRunning: Story = {
  args: { subagents: subagentStates.oneRunning },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('button', {
          name: 'Find every Feed reader, Explore, Running, Sonnet 4.5 · 34s · 8.2k tokens',
        }),
      ).toBeVisible();
      await expect(canvas.getAllByTestId('subagent-status')).toHaveLength(1);
    }),
};

// One flat list in spawn order: no Running or Finished sections, and finished rows keep their place.
export const SeveralMixed: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.queryByRole('heading')).toBeNull();
      await expect(rowNames(canvas)).toEqual([
        'Find every Feed reader, Explore, Running, Sonnet 4.5 · 34s · 8.2k tokens',
        'Migrate tokens to kit roles, General, Needs input, Opus 4.5 · Needs input',
        'Draft the Plan schema, Plan, Finished · 2m 18s · 12.9k tokens',
        'Review the Shells ADR, Review, Finished · 47s · 6.1k tokens',
        'Port the mock CLIs, Test, Cancelled · 12s',
      ]);
      await expect(canvas.getByText('Opus 4.5 · Needs input')).toBeVisible();
      await expect(canvas.getByText('Cancelled · 12s')).toBeVisible();
    }),
};

// Only running and waiting Subagents show the status dot; finished and cancelled rows have none.
export const StatusDots: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getAllByTestId('subagent-status')).toHaveLength(2);
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
      subagentStates.severalMixed[4],
    );
  },
};

export const SelectFinishedWide: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: /Draft the Plan schema/ }),
    );
    await expect(args.onSelect).toHaveBeenCalledWith(
      subagentStates.severalMixed[2],
    );
  },
};

export const AllFinished: Story = {
  args: { subagents: subagentStates.allFinished },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.queryByTestId('subagent-status')).toBeNull();
      await expect(rowNames(canvas)).toHaveLength(5);
    }),
};
