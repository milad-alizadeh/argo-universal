import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, screen, within } from 'storybook/test';
import { menuLabels } from '../../../../sessions/$id/session-header-actions.mocks';
import type { SlotPlugin } from './slot-detail-model';
import { SlotDetailView } from './slot-detail-view';
import { fixtureSessionHeaderSlot } from './slot-fixture-detail';
import { slotPlugins } from './slot-fixtures';

const issueAction = 'Open #412';

const meta = {
  title: 'Tests/Screens/Settings/Plugins/Session header',
  component: SlotDetailView,
  parameters: { screenPreview: true },
  args: {
    settings: fixtureSessionHeaderSlot,
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
      settings={fixtureSessionHeaderSlot}
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

// The preview's "…" holds Argo's own first, then the Plugin actions that do not fit beside it.
export const PreviewsTheHeaderWithArgosActionsFirst: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('button', { name: issueAction }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));

    const labels = menuLabels(within(await screen.findByRole('menu')));

    await expect(labels.slice(0, 2)).toEqual(['Rename', 'Archive']);
    await expect(labels).toContain('Coverage report');
  },
};

// A compact window, narrow web included, keeps every Plugin action in "…".
export const PreviewsACompactWindowWithAllInMore: Story = {
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.queryByRole('button', { name: issueAction }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));

    const labels = menuLabels(within(await screen.findByRole('menu')));

    await expect(labels.slice(0, 3)).toEqual([
      'Rename',
      'Archive',
      issueAction,
    ]);
  },
};

// A switch takes a Plugin's actions out of the header, and the next one moves up beside "…".
export const ASwitchTakesAPluginOutOfTheHeader: Story = {
  render: () => <Live plugins={slotPlugins} />,
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Open preview' }),
    ).toBeNull();

    await userEvent.click(
      canvas.getByRole('switch', { name: 'Issue tracker' }),
    );
    await expect(
      canvas.queryByRole('button', { name: issueAction }),
    ).toBeNull();
    await expect(
      canvas.getByRole('button', { name: 'Open preview' }),
    ).toBeVisible();
  },
};

// The header page has no line to hand to one Plugin, so it offers no choice of writer.
export const OffersNoOwnerChoice: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('radio')).toBeNull();
  },
};
