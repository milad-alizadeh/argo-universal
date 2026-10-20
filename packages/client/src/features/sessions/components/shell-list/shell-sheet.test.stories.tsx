import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  failedOutput,
  failedShell,
  longRunningOutput,
  runningShell,
} from './shell-list.mocks';
import sheetMeta from './shell-sheet.stories';

const meta = {
  ...sheetMeta,
  title: 'Tests/ShellSheet',
  args: {
    ...sheetMeta.args,
    onSelect: fn(),
    onStop: fn(),
    onOpenChange: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const shellRow = (command: string): Promise<HTMLElement> =>
  screen.findByRole('button', { name: new RegExp(`^${command},`) });

export const ListsTheSessionsShells: Story = {
  play: async () => {
    await settleViewport(layoutWidths.phone);
    await expect(
      await screen.findByText('1 running · 3 in this Session'),
    ).toBeVisible();
    await expect(await shellRow('pnpm dev')).toHaveAccessibleName(
      'pnpm dev, ready on localhost:8081, 4m 12s',
    );
    await expect(await shellRow('pnpm e2e')).toHaveAccessibleName(
      'pnpm e2e, Exit 0, 1m 47s',
    );
    await expect(await shellRow('pnpm storybook')).toHaveAccessibleName(
      'pnpm storybook, Exit 1, 8s',
    );
  },
};

// A running Shell's page is titled by its command and offers Stop.
export const RunningShellOffersStop: Story = {
  args: { output: longRunningOutput },
  play: async ({ args, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(await shellRow('pnpm dev'));
    await expect(args.onSelect).toHaveBeenCalledWith(runningShell);
    await expect(
      await screen.findByRole('heading', { name: 'pnpm dev' }),
    ).toBeVisible();
    await expect(
      await screen.findByText('ready on localhost:8081', { exact: false }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await expect(args.onStop).toHaveBeenCalledWith(runningShell);
  },
};

// An exited Shell's page shows what was dropped and how it ended, and offers no Stop.
export const ExitedShellShowsHowItEnded: Story = {
  args: { output: failedOutput },
  play: async ({ args, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(await shellRow('pnpm storybook'));
    await expect(args.onSelect).toHaveBeenCalledWith(failedShell);
    await expect(
      await screen.findByText('312 earlier lines not kept'),
    ).toBeVisible();
    await expect(await screen.findByText('after 8s')).toBeVisible();
    await expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Back to Shells' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('312 earlier lines not kept')).toBeNull(),
    );
  },
};
