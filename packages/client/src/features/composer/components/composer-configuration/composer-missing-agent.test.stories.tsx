import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { composerUnlistedEffortConfigurations } from '../../../../../mocks/composer-mock';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';

const recorded = composerUnlistedEffortConfigurations[0];

if (!recorded) throw new Error('Recorded catalog needs a model picker.');

// An open Session whose Agent is not installed, or not loaded yet: only its id is known.
const uninstalledAgentId = 'uninstalled-agent';

const configuration = {
  ...recorded,
  agent: undefined,
  agentId: uninstalledAgentId,
};

const agentModelLabel = 'Agent and model';

const meta = {
  title: 'Tests/ComposerMissingAgent',
  component: ComposerAgentModelControl,
  args: { configuration, disabled: false },
  render: (args): React.JSX.Element => (
    <View className="p-4">
      <ComposerAgentModelControl {...args} />
    </View>
  ),
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NamedByIdInConfigureWide: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const configure = await within(document.body).findByRole('dialog', {
      name: agentModelLabel,
    });

    await waitFor(() =>
      expect(
        within(configure).getByRole('group', {
          name: `Agent, ${uninstalledAgentId}`,
        }),
      ).toBeVisible(),
    );
    await userEvent.keyboard('{Escape}');
  },
};

// With neither a model to choose nor an installed Agent to show, there is nothing to configure.
export const WithoutModelHidesControlWide: Story = {
  args: { configuration: { ...configuration, configOptions: [] } },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      canvas.queryByRole('button', { name: agentModelLabel }),
    ).not.toBeInTheDocument();
  },
};

// Before New Session has an Agent, there is nothing to configure, even with options at hand.
function withoutAgentAt(width: number): Story {
  return {
    args: { configuration: { ...configuration, agentId: undefined } },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        canvas.queryByRole('button', { name: agentModelLabel }),
      ).not.toBeInTheDocument();
    },
  };
}

export const WithoutAgentHidesControlWide = withoutAgentAt(layoutWidths.wide);

export const WithoutAgentHidesControlPhone = withoutAgentAt(layoutWidths.phone);
