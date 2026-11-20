import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import type { SlotPlugin } from './slot-detail-model';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionRowSlot } from './slot-fixture-detail';
import { issueRef, previewReady, slotPlugins } from './slot-fixtures';

const deploysName = 'Deploys';

const meta = {
  title: 'Tests/Screens/Settings/Plugins/Session rows',
  component: SlotDetailView,
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionRowSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    onShownChange: fn(),
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
      settings={fixtureSessionRowSlot}
      plugins={{ status: 'loaded', plugins }}
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

export const PreviewsTheSlotsOwnComponentWithAllPluginsOn: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Fix login redirect')).toBeVisible();
    await expect(canvas.getByText(issueRef(412))).toBeVisible();
    await expect(canvas.getByText(previewReady)).toBeVisible();
    await expect(canvas.getByText('78%')).toBeVisible();
  },
};

export const ASwitchTakesAPluginOffTheRow: Story = {
  render: () => <Live plugins={slotPlugins} />,
  play: async ({ canvas, userEvent }) => {
    const deploysSwitch = canvas.getByRole('switch', { name: deploysName });
    await userEvent.click(deploysSwitch);
    await expect(canvas.queryByText(previewReady)).toBeNull();
    await expect(canvas.getByText(issueRef(412))).toBeVisible();
    await userEvent.click(deploysSwitch);
    await expect(canvas.getByText(previewReady)).toBeVisible();
  },
};

// The page lists a switch per Plugin and nothing to choose a line's writer with.
export const ListsASwitchPerPluginAndNoLineToChoose: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('switch')).toHaveLength(3);
    await expect(canvas.queryByRole('radio')).not.toBeInTheDocument();
  },
};
