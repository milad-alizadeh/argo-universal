import { eachLayout, settleLayout } from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { interleavedSubagents, subagentStates } from './subagent-list.mocks';
import listMeta from './subagent-list.stories';

const meta = {
  ...listMeta,
  title: 'Tests/Sessions/SubagentList',
  args: { ...listMeta.args, onSelect: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const None: Story = {
  args: { subagents: subagentStates.none },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.queryByRole('heading', { name: 'Running' }),
      ).toBeNull();
      await expect(canvas.queryByRole('heading', { name: 'Done' })).toBeNull();
    }),
};

export const OneRunning: Story = {
  args: { subagents: subagentStates.oneRunning },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('heading', { name: 'Running' }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: /Find every Feed reader/ }),
      ).toBeVisible();
      await expect(
        canvas.getByText('Sonnet 4.5 · 34s · 8.2k tokens'),
      ).toBeVisible();
      await expect(canvas.queryByRole('heading', { name: 'Done' })).toBeNull();
      await expect(canvas.getByText('1')).toBeVisible();
    }),
};

export const SeveralMixed: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('heading', { name: 'Running' }),
      ).toBeVisible();
      await expect(canvas.getByRole('heading', { name: 'Done' })).toBeVisible();
      await expect(canvas.getAllByText('2')).toHaveLength(2);
      await expect(
        canvas.getByRole('img', { name: 'Needs input' }),
      ).toBeVisible();
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
    await settleLayout('phone');
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
      await expect(
        canvas.queryByRole('heading', { name: 'Running' }),
      ).toBeNull();
      await expect(canvas.getByRole('heading', { name: 'Done' })).toBeVisible();
      await expect(canvas.getByText('2')).toBeVisible();
      await expect(
        canvas.getByText('Finished · 2m 18s · 12.9k tokens'),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: /Port the mock CLIs/ }),
      ).toBeVisible();
    }),
};

// Running work comes first; spawn order remains stable within each section.
export const SectionOrder: Story = {
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
        'Migrate tokens to kit roles',
        'Draft the Plan schema',
        'Port the mock CLIs',
      ]);
    }),
};

export const StatusOnLeadingMark: Story = {
  args: { subagents: subagentStates.oneRunning },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const row = canvas.getByRole('button', {
        name: /Find every Feed reader/,
      });

      const status = canvas.getByRole('img', { name: 'Running' });
      const title = canvas.getByText('Find every Feed reader');
      await expect(row.contains(status)).toBe(true);

      const mark = canvas
        .getByLabelText('Explore Agent')
        .getBoundingClientRect();

      const dot = status.getBoundingClientRect();

      await expect(dot.width).toBeGreaterThan(0);
      await expect(dot.left).toBeGreaterThanOrEqual(mark.left);
      await expect(dot.top).toBeGreaterThanOrEqual(mark.top);
      await expect(dot.right).toBeLessThanOrEqual(mark.right);
      await expect(dot.bottom).toBeLessThanOrEqual(mark.bottom);
      await expect(status.getBoundingClientRect().right).toBeLessThan(
        title.getBoundingClientRect().left,
      );
    }),
};
