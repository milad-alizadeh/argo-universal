import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { composerUnlistedEffortConfigurations } from '../../../../../mocks/composer-mock';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';

const configuration = composerUnlistedEffortConfigurations[0];

const agentModelLabel = 'Agent and model';

if (!configuration) throw new Error('Recorded catalog needs a model picker.');

const meta = {
  title: 'Tests/ComposerConfigurationPicker',
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

export const EscapeReturnsToConfigure: Story = {
  args: { configuration: { ...configuration, onConfigChange: fn() } },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await userEvent.click(trigger);

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const model = await within(configure).findByRole('button', {
      name: /^(Choose model|Model,)/,
    });

    await userEvent.click(model);
    const picker = await overlay.findByRole('dialog', { name: 'Select Model' });
    await expect(configure).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(picker).not.toBeInTheDocument());
    await waitFor(() => expect(model).toHaveFocus());
    await expect(configure).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const HoverReplacesAdjacentPicker: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await userEvent.hover(trigger);

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    const agent = within(configure).getByRole('button', { name: /^Agent,/ });
    const model = within(configure).getByRole('button', { name: /^Model,/ });
    await userEvent.hover(agent);
    const picker = await overlay.findByRole('dialog', { name: 'Select Agent' });
    await userEvent.unhover(agent);
    await userEvent.hover(picker);
    await waitFor(() => expect(picker).toBeVisible());
    await userEvent.hover(model);
    await overlay.findByRole('dialog', { name: 'Select Model' });
    await waitFor(() => expect(picker).not.toBeInTheDocument());
    await expect(configure).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

export const RunningTurnWithoutTuning: Story = {
  args: {
    configuration: {
      ...configuration,
      turnRunning: true,
      configOptions: configuration.configOptions.filter(
        (option) => option.category === 'model',
      ),
    },
  },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );
    const overlay = within(document.body);
    await waitFor(() =>
      expect(
        overlay.getByText(
          'A Turn is running. Changes apply from the next Turn.',
        ),
      ).toBeVisible(),
    );
    await expect(overlay.queryByRole('slider')).not.toBeInTheDocument();
  },
};
