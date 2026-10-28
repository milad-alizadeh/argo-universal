import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { argoActivity } from './session-row-slot';
import { noActivityLine } from './slot-detail-model';
import type { SlotOwner, SlotPlugin } from './slot-detail-model';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionRowSlot } from './slot-fixture-detail';
import {
  deploysLine,
  issueRef,
  issueTrackerLine,
  previewReady,
  slotPlugins,
} from './slot-fixtures';

const deploysName = 'Deploys';

const issueTrackerName = 'Issue tracker';

const meta = {
  title: 'Tests/Screens/Settings/Plugins/Session rows',
  component: SlotDetailView,
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionRowSlot,
    plugins: { status: 'loaded', plugins: slotPlugins },
    owner: null,
    onShownChange: fn(),
    onOwnerChange: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof SlotDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The App keeps both choices; a story keeps them in state so the preview can redraw as they change.
function Live(props: { plugins: SlotPlugin[] }): React.JSX.Element {
  const [plugins, setPlugins] = useState(props.plugins);
  const [owner, setOwner] = useState<SlotOwner>(null);

  return (
    <SlotDetailView
      settings={fixtureSessionRowSlot}
      plugins={{ status: 'loaded', plugins }}
      owner={owner}
      onOwnerChange={setOwner}
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
    await expect(canvas.getByText(argoActivity)).toBeVisible();
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

// Every Plugin on Session rows is listed; one that sends no Activity line says so and cannot be chosen.
export const ListsEveryPluginOnSessionRowsForTheActivityLine: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('radio')).toHaveLength(4);
    await expect(canvas.getByRole('radio', { name: /Default/ })).toBeChecked();
    await expect(
      canvas.getByRole('radio', { name: /Coverage/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(canvas.getByText(noActivityLine)).toBeVisible();
  },
};

// Choosing a Plugin asks nothing, and Default gives the line straight back to Argo.
export const DefaultGivesTheLineBackToArgo: Story = {
  render: () => <Live plugins={slotPlugins} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: /Issue tracker/ }));
    await expect(canvas.getByText(issueTrackerLine)).toBeVisible();
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    await userEvent.click(canvas.getByRole('radio', { name: /Default/ }));
    await expect(canvas.getByText(argoActivity)).toBeVisible();
    await expect(canvas.queryByText(issueTrackerLine)).toBeNull();
  },
};

export const ChoosingAPluginWritesTheActivityLineAtOnce: Story = {
  render: () => <Live plugins={slotPlugins} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: /Issue tracker/ }));
    await expect(canvas.getByText(issueTrackerLine)).toBeVisible();
    await expect(canvas.queryByText(argoActivity)).toBeNull();
    await expect(
      canvas.getByText('Also asks. Replaces Issue tracker.'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('radio', { name: /Deploys/ }));
    await expect(canvas.getByText(deploysLine)).toBeVisible();
  },
};

export const APluginTurnedOffCannotBeChosen: Story = {
  render: () => <Live plugins={slotPlugins} />,
  play: async ({ canvas, userEvent }) => {
    const deploysSwitch = canvas.getByRole('switch', { name: deploysName });
    await userEvent.click(deploysSwitch);
    await expect(
      canvas.getByText('Off. Turn it on to choose it.'),
    ).toBeVisible();
    await expect(
      canvas.getByRole('radio', { name: /Deploys/ }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

export const TurningOffTheOwnerGivesTheLineBackToArgo: Story = {
  render: () => <Live plugins={slotPlugins} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: /Issue tracker/ }));
    await userEvent.click(
      canvas.getByRole('switch', { name: issueTrackerName }),
    );
    await expect(canvas.getByText(argoActivity)).toBeVisible();
  },
};
