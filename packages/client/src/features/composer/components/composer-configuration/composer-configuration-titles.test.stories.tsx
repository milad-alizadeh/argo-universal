import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { composerUnlistedEffortConfigurations } from '../../../../../mocks/composer-mock';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';

const configuration = composerUnlistedEffortConfigurations[0];

const agentModelLabel = 'Agent and model';

const modelPickerLabel = 'Select Model';

if (!configuration) throw new Error('Recorded catalog needs a model picker.');

const meta = {
  title: 'Tests/ComposerConfigurationTitles',
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

export const PanelsShowTheirTitles: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const configure = await overlay.findByRole('dialog', {
      name: agentModelLabel,
    });

    await waitFor(() =>
      expect(
        within(configure).getByRole('heading', { name: 'Configure' }),
      ).toBeVisible(),
    );
    await userEvent.click(
      within(configure).getByRole('button', { name: /^Model,/ }),
    );

    const picker = await overlay.findByRole('dialog', {
      name: modelPickerLabel,
    });

    await waitFor(() =>
      expect(
        within(picker).getByRole('heading', { name: modelPickerLabel }),
      ).toBeVisible(),
    );
  },
};
