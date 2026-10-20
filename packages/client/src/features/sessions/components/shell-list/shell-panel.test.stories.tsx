import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { endedShells, runningShell } from './shell-list.mocks';
import panelMeta from './shell-panel.stories';

const meta = {
  ...panelMeta,
  title: 'Tests/ShellPanel',
  args: { ...panelMeta.args, onSelect: fn(), onStop: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

const openWide = async (
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
  name: RegExp,
): Promise<void> => {
  await settleViewport(layoutWidths.wide);
  await userEvent.click(canvas.getByRole('button', { name }));
};

// A row opens that Shell's output under a header naming it, with Stop while it runs.
export const StopsARunningShell: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await openWide(canvas, userEvent, /pnpm dev/);
    await expect(canvas.getByText('Running · 4m 12s')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Stop pnpm dev' }),
    );
    await expect(args.onStop).toHaveBeenCalledWith(runningShell);
  },
};

// Back returns to the list, so another Shell can be opened.
export const GoesBackToTheList: Story = {
  play: async ({ canvas, userEvent }) => {
    await openWide(canvas, userEvent, /pnpm dev/);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to Shells' }),
    );
    await expect(
      canvas.getByRole('button', { name: /pnpm e2e/ }),
    ).toBeVisible();
    await expect(canvas.queryByText('Running · 4m 12s')).toBeNull();
  },
};

// An ended Shell's header names how it ended and offers no Stop.
export const EndedShellsOfferNoStop: Story = {
  args: { shells: endedShells },
  play: async ({ canvas, userEvent }) => {
    await openWide(canvas, userEvent, /pnpm storybook, Stopped/);
    await expect(canvas.getByText('after 2m 14s')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Back to Shells' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /^Stop / })).toBeNull();
  },
};
