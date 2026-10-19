import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';
import {
  configuration,
  agentModelLabel,
  pickerStoryMeta,
} from './picker-story-fixtures';

const first = configuration.agent;

if (!first) throw new Error('Recorded catalog needs an installed Agent.');

const second = { ...first, id: 'second-agent', name: 'Second Agent' };

const agents = [first, second];

const addAgents = fn();

const loadingLabel = 'Loading configuration…';

const meta = {
  ...pickerStoryMeta,
  title: 'Tests/ComposerAgentSwitch',
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

let receiveConfiguration = (): void => {};

function SwitchingAgent(): React.JSX.Element {
  const [agent, setAgent] = useState(first);
  const [loaded, setLoaded] = useState(true);
  useEffect(() => {
    receiveConfiguration = (): void => setLoaded(true);

    return (): void => {
      receiveConfiguration = (): void => {};
    };
  }, []);

  return (
    <View className="p-4">
      <ComposerAgentModelControl
        disabled={false}
        configuration={{
          ...configuration,
          agent,
          configOptions: loaded ? configuration.configOptions : [],
          opening: !loaded,
          agentChoices: {
            agents,
            onAdd: addAgents,
            onChange: (id) => {
              setAgent(agents.find((a) => a.id === id));
              setLoaded(false);
            },
          },
        }}
      />
    </View>
  );
}

export const SwitchKeepsPickerOpenWhileLoading: Story = {
  render: () => <SwitchingAgent />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await userEvent.click(trigger);
    const picker = await body.findByRole('dialog', { name: agentModelLabel });
    await userEvent.click(
      within(picker).getByRole('button', { name: /^Agent,/ }),
    );
    const choices = await body.findByRole('dialog', { name: 'Select Agent' });
    await userEvent.click(
      within(choices).getByRole('button', { name: 'Second Agent' }),
    );
    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await expect(picker).toHaveAttribute('data-state', 'open');
    await expect(within(picker).getByText(loadingLabel)).toBeVisible();
    await expect(
      within(picker).queryByRole('button', { name: /^Model,/ }),
    ).not.toBeInTheDocument();
    await expect(
      within(picker).getByRole('button', { name: 'Agent, Second Agent' }),
    ).toBeEnabled();
    // A props update from discovery must fill the existing picker, not remount it.
    receiveConfiguration();
    await waitFor(() =>
      expect(
        within(picker).getByRole('button', { name: /^Model,/ }),
      ).toBeVisible(),
    );
    await expect(picker).toHaveAttribute('data-state', 'open');
    await expect(
      within(picker).queryByText(loadingLabel),
    ).not.toBeInTheDocument();
  },
};

export const SavedOptionsStayVisibleDuringRefresh: Story = {
  args: {
    configuration: {
      ...configuration,
      opening: true,
      agentChoices: { agents, onChange: fn(), onAdd: addAgents },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );

    const picker = await within(document.body).findByRole('dialog', {
      name: agentModelLabel,
    });

    await waitFor(() =>
      expect(
        within(picker).getByRole('button', { name: /^Model,/ }),
      ).toBeVisible(),
    );
    await expect(
      within(picker).queryByText(loadingLabel),
    ).not.toBeInTheDocument();
  },
};
