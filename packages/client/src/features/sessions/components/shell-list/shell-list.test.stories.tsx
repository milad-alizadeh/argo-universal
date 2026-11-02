import {
  eachLayout,
  layoutWidths,
  settleLayout,
} from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import {
  endedShells,
  interleavedShells,
  runningShell,
} from './shell-list.mocks';
import listMeta from './shell-list.stories';

const meta = {
  ...listMeta,
  title: 'Tests/Sessions/ShellList',
  args: { ...listMeta.args, onSelect: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

// A running Shell shows what it last printed and its time so far; an ended one, how it ended.
export const Running: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('heading', { name: 'Running' }),
      ).toBeVisible();
      await expect(canvas.getByRole('heading', { name: 'Done' })).toBeVisible();
      await expect(canvas.getByText('1')).toBeVisible();
      await expect(canvas.getByText('2')).toBeVisible();
      await expect(canvas.getByText('ready on localhost:8081')).toBeVisible();
      await expect(canvas.getByText('4m 12s')).toBeVisible();
      await expect(canvas.getByText('Exit 0')).toBeVisible();
      await expect(canvas.getByText('Exit 1')).toBeVisible();
      await expect(canvas.queryByText('Stopped')).toBeNull();
    }),
};

// Every ended state reads its own outcome, and only the running count is left out of the heading.
export const Ended: Story = {
  args: { shells: endedShells },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText('Stopped')).toBeVisible();
      await expect(canvas.getByText('Lost')).toBeVisible();
      await expect(canvas.getByText('Exited')).toBeVisible();
      await expect(
        canvas.queryByRole('heading', { name: 'Running' }),
      ).toBeNull();
      await expect(canvas.getByRole('heading', { name: 'Done' })).toBeVisible();
      await expect(canvas.getByText('5')).toBeVisible();
      await expect(canvas.queryByRole('img', { name: 'Running' })).toBeNull();
      await expect(canvas.queryByText(/running ·/)).toBeNull();
    }),
};

const opensARow = (width: number): Story => ({
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout(width);
    await userEvent.click(canvas.getByRole('button', { name: /pnpm dev/ }));
    await expect(args.onSelect).toHaveBeenCalledWith(runningShell);
  },
});

export const OpensAShellOnAPhone: Story = opensARow(layoutWidths.phone);

export const OpensAShellWhenWide: Story = opensARow(layoutWidths.wide);

export const StatusOnLeadingMark: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      const status = canvas.getByRole('img', { name: 'Running' });
      const command = canvas.getByText('pnpm dev');

      const mark = canvas
        .getByLabelText('Background Task')
        .getBoundingClientRect();

      const dot = status.getBoundingClientRect();

      await expect(dot.width).toBeGreaterThan(0);
      await expect(dot.left).toBeGreaterThanOrEqual(mark.left);
      await expect(dot.top).toBeGreaterThanOrEqual(mark.top);
      await expect(dot.right).toBeLessThanOrEqual(mark.right);
      await expect(dot.bottom).toBeLessThanOrEqual(mark.bottom);
      await expect(status.getBoundingClientRect().right).toBeLessThan(
        command.getBoundingClientRect().left,
      );
    }),
};

export const SectionOrder: Story = {
  args: { shells: interleavedShells },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getAllByRole('heading').map((heading) => heading.textContent),
      ).toEqual(['Running', 'Done']);
      await expect(
        canvas
          .getAllByRole('button')
          .map((row) => row.getAttribute('aria-label')?.split(',')[0]),
      ).toEqual(['pnpm dev', 'pnpm e2e', 'pnpm storybook']);
    }),
};

export const OnlyRunning: Story = {
  args: { shells: [runningShell] },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.getByRole('heading', { name: 'Running' }),
      ).toBeVisible();
      await expect(canvas.getByText('1')).toBeVisible();
      await expect(canvas.queryByRole('heading', { name: 'Done' })).toBeNull();
    }),
};

export const Empty: Story = {
  args: { shells: [] },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.queryByRole('heading', { name: 'Running' }),
      ).toBeNull();
      await expect(canvas.queryByRole('heading', { name: 'Done' })).toBeNull();
      await expect(canvas.queryByRole('button')).toBeNull();
    }),
};
