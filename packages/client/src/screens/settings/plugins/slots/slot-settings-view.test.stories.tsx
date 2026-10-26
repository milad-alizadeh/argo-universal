import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { deploys, sessionRowsPlugins } from './session-rows-fixtures';
import {
  type ActivityOwner,
  argoActivity,
  issueRef,
  type SessionRowsPlugin,
} from './session-rows-model';
import { SessionRowsView } from './session-rows-view';

const previewReady = deploys.sample.text;

const deploysName = 'Deploys';

const issueTrackerName = 'Issue tracker';

const meta = {
  title: 'Tests/Screens/Settings/Plugins/Session rows',
  component: SessionRowsView,
  parameters: { screenPreview: true },
  args: {
    plugins: { status: 'loaded', plugins: sessionRowsPlugins },
    activityOwner: null,
    onShownChange: fn(),
    onActivityOwnerChange: fn(),
  },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof SessionRowsView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The App keeps both choices; a story keeps them in state so the preview can redraw as they change.
function Live(props: { plugins: SessionRowsPlugin[] }): React.JSX.Element {
  const [plugins, setPlugins] = useState(props.plugins);
  const [owner, setOwner] = useState<ActivityOwner>(null);

  return (
    <SessionRowsView
      plugins={{ status: 'loaded', plugins }}
      activityOwner={owner}
      onActivityOwnerChange={setOwner}
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

export const PreviewsTheRowWithAllPluginsOn: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Fix login redirect')).toBeVisible();
    await expect(canvas.getByText(issueRef(412))).toBeVisible();
    await expect(canvas.getByText(previewReady)).toBeVisible();
    await expect(canvas.getByText('78%')).toBeVisible();
    await expect(canvas.getByText(argoActivity)).toBeVisible();
  },
};

export const ASwitchTakesAPluginOffTheRow: Story = {
  render: () => <Live plugins={sessionRowsPlugins} />,
  play: async ({ canvas, userEvent }) => {
    const deploysSwitch = canvas.getByRole('switch', { name: deploysName });
    await userEvent.click(deploysSwitch);
    await expect(canvas.queryByText(previewReady)).toBeNull();
    await expect(canvas.getByText(issueRef(412))).toBeVisible();
    await userEvent.click(deploysSwitch);
    await expect(canvas.getByText(previewReady)).toBeVisible();
  },
};

export const ListsOnlyPluginsThatAskForTheActivityLine: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('radio')).toHaveLength(3);
    await expect(
      canvas.getByRole('radio', { name: /Argo’s own/ }),
    ).toBeChecked();
    await expect(canvas.queryByRole('radio', { name: /Coverage/ })).toBeNull();
  },
};

export const ChoosingAPluginWritesTheActivityLineAtOnce: Story = {
  render: () => <Live plugins={sessionRowsPlugins} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: /Issue tracker/ }));
    await expect(canvas.getByText('Awaiting review · 1 of 2')).toBeVisible();
    await expect(canvas.queryByText(argoActivity)).toBeNull();
    await expect(
      canvas.getByText('Also asks. Replaces Issue tracker.'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('radio', { name: /Deploys/ }));
    await expect(canvas.getByText('Deploying preview')).toBeVisible();
  },
};

export const APluginTurnedOffCannotBeChosen: Story = {
  render: () => <Live plugins={sessionRowsPlugins} />,
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
  render: () => <Live plugins={sessionRowsPlugins} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: /Issue tracker/ }));
    await userEvent.click(
      canvas.getByRole('switch', { name: issueTrackerName }),
    );
    await expect(canvas.getByText(argoActivity)).toBeVisible();
  },
};
