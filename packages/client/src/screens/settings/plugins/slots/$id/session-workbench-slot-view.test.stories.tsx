import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { noWorkbenchCards } from './session-workbench-preview';
import type { SlotPlugin } from './slot-detail-model';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionWorkbenchSlot } from './slot-fixture-detail';
import {
  coverageBar,
  issueTrackerBar,
  previewReady,
  slotPlugins,
} from './slot-fixtures';

const meta = {
  title: 'Tests/Screens/Settings/Plugins/Workbench cards',
  component: SlotDetailView,
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionWorkbenchSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    owner: null,
    onShownChange: fn(),
    onOwnerChange: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof SlotDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The App keeps the switches; a story keeps them in state so the preview can redraw as they change.
function Live(props: { plugins: SlotPlugin[] }): React.JSX.Element {
  const [plugins, setPlugins] = useState(props.plugins);

  return (
    <SlotDetailView
      settings={fixtureSessionWorkbenchSlot}
      plugins={{ status: 'loaded', plugins }}
      owner={null}
      onOwnerChange={fn()}
      onShownChange={(pluginId, shown) =>
        setPlugins((all) =>
          all.map((plugin) =>
            plugin.pluginId === pluginId ? { ...plugin, shown } : plugin,
          ),
        )
      }
    />
  );
}

const everyPluginOff = (plugins: SlotPlugin[]): SlotPlugin[] =>
  plugins.map((plugin) => ({ ...plugin, shown: false }));

export const PreviewsACardForEachPlugin: Story = {
  play: async ({ canvas }) => {
    for (const summary of [issueTrackerBar, previewReady, coverageBar]) {
      await expect(canvas.getByText(summary)).toBeVisible();
    }

    await expect(canvas.getByText('Deploy')).toBeVisible();
  },
};

// A switch takes that Plugin's card out of the Workbench.
export const ASwitchTakesAPluginsCardOutOfTheWorkbench: Story = {
  render: () => <Live plugins={slotPlugins} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('switch', { name: 'Issue tracker' }),
    );
    await expect(canvas.queryByText(issueTrackerBar)).toBeNull();
    await expect(canvas.getByText(coverageBar)).toBeVisible();
  },
};

// With every Plugin off the preview says so rather than showing an empty Workbench.
export const SaysWhenNoPluginAddsACard: Story = {
  args: {
    plugins: { status: 'loaded', plugins: everyPluginOff(slotPlugins) },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(noWorkbenchCards)).toBeVisible();
  },
};

// The Workbench page hands nothing to one Plugin, so it offers no choice of writer.
export const OffersNoOwnerChoice: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('radio')).toBeNull();
  },
};
