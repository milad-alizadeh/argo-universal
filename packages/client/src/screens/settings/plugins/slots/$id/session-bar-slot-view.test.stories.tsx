import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { noBarLine } from './session-bar-preview';
import type { SlotPlugin } from './slot-detail-model';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionBarSlot } from './slot-fixture-detail';
import {
  coverageBar,
  issueTrackerBar,
  previewReady,
  slotPlugins,
} from './slot-fixtures';

const meta = {
  title: 'Tests/Screens/Settings/Plugins/Session bar',
  component: SlotDetailView,
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionBarSlot,
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
function Live(): React.JSX.Element {
  const [plugins, setPlugins] = useState<SlotPlugin[]>(slotPlugins);

  return (
    <SlotDetailView
      settings={fixtureSessionBarSlot}
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

export const PreviewsTheFirstPluginWithTheRestBehindMore: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(issueTrackerBar)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: '2 more Plugin lines' }),
    ).toBeVisible();
    await expect(canvas.queryByText(previewReady)).toBeNull();
  },
};

// The Session bar has no Single-owner Slot to choose: only a switch per Plugin.
export const HasASwitchPerPluginAndNoOwnerChoice: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('switch')).toHaveLength(3);
    await expect(canvas.queryByRole('radio')).toBeNull();
  },
};

export const TurningOffTheShownPluginGivesTheLineToTheNext: Story = {
  render: () => <Live />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('switch', { name: 'Issue tracker' }),
    );
    await expect(canvas.getByText(previewReady)).toBeVisible();
    await expect(canvas.queryByText(issueTrackerBar)).toBeNull();
    await expect(
      canvas.getByRole('button', { name: '1 more Plugin line' }),
    ).toBeVisible();
  },
};

export const TurningEveryPluginOffLeavesNoBar: Story = {
  render: () => <Live />,
  play: async ({ canvas, userEvent }) => {
    for (const name of ['Issue tracker', 'Deploys', 'Coverage'])
      await userEvent.click(canvas.getByRole('switch', { name }));

    await expect(canvas.getByText(noBarLine)).toBeVisible();
    await expect(canvas.queryByText(coverageBar)).toBeNull();
  },
};
