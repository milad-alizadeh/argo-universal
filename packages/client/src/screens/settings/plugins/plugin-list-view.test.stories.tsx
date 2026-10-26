import { layoutWidths } from '@repo/kit/each-layout';
import { findToast } from '@repo/kit/mocks/find-toast';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginListView } from './plugin-list-view';
import {
  githubPlugin,
  helloPlugin,
  pluginRows,
} from './plugin-settings.fixtures';

const sessionRowsSlotId = 'argo/session/row/v1';

const sessionRowsTitle = 'Session rows';

const meta = {
  title: 'Tests/Screens/Settings/Plugins',
  component: PluginListView,
  parameters: { screenPreview: true },
  args: {
    plugins: { status: 'loaded', plugins: pluginRows },
    slots: [],
    onOpenPlugin: fn(),
    onOpenSlot: fn(),
  },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof PluginListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ListsEachPluginAsARow: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Plugins', level: 1 }),
    ).toBeVisible();

    for (const plugin of pluginRows)
      await expect(canvas.getByText(plugin.name)).toBeVisible();

    await expect(canvas.queryByRole('switch')).toBeNull();
  },
};

export const ARowOpensItsPlugin: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText(helloPlugin.name));
    await expect(args.onOpenPlugin).toHaveBeenCalledWith(helloPlugin.pluginId);
    await userEvent.click(canvas.getByText(githubPlugin.name));
    await expect(args.onOpenPlugin).toHaveBeenLastCalledWith(
      githubPlugin.pluginId,
    );
  },
};

export const ASlotRowOpensItsPage: Story = {
  args: {
    slots: [{ slotId: sessionRowsSlotId, title: sessionRowsTitle, count: 3 }],
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('3 on')).toBeVisible();
    await userEvent.click(canvas.getByText(sessionRowsTitle));
    await expect(args.onOpenSlot).toHaveBeenCalledWith(sessionRowsSlotId);
  },
};

export const LeavesSlotsOutUntilAPluginFillsOne: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(sessionRowsTitle)).toBeNull();
  },
};

export const SaysWhenThereAreNoPlugins: Story = {
  args: { plugins: { status: 'loaded', plugins: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/No Plugins/)).toBeVisible();
  },
};

export const ShowsALoadErrorAsAToast: Story = {
  args: { plugins: { status: 'error' } },
  play: async ({ canvas }) => {
    await expect(await findToast('Could not load Plugins')).toBeVisible();
    await expect(canvas.getByText('Loading Plugins…')).toBeVisible();
  },
};
