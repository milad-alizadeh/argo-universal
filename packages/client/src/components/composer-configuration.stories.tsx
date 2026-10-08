import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import {
  composerNoEffortSelections,
  composerUnavailableConfigurations,
} from '../../mocks/composer-mock';
import { ComposerAgentModelControl } from './composer-configuration';

const configuration = composerNoEffortSelections[0];
if (!configuration)
  throw new Error('Recorded catalog needs an Agent with effort.');
const meta = {
  title: 'Sessions/ComposerConfiguration',
  component: ComposerAgentModelControl,
  args: { configuration, disabled: false },
} satisfies Meta<typeof ComposerAgentModelControl>;
export default meta;

export const NoEffortSelection: StoryObj<typeof meta> = {
  name: 'No effort selection',
  render: function NoEffortSelectionRender(args) {
    const [options, setOptions] = useState(args.configuration.configOptions);
    return (
      <View className="p-4">
        <ComposerAgentModelControl
          {...args}
          configuration={{
            ...args.configuration,
            configOptions: options,
            onConfigChange: (configId, value) =>
              setOptions((previous) =>
                previous.map((option) => {
                  if (
                    option.configId === configId &&
                    option.type === 'select' &&
                    typeof value === 'string'
                  )
                    return { ...option, currentValue: value };
                  return option;
                }),
              ),
          }}
        />
      </View>
    );
  },
};

const unavailableConfiguration = composerUnavailableConfigurations[0];
if (!unavailableConfiguration)
  throw new Error('Recorded catalog needs an unavailable Agent');
export const UnavailableAgent: StoryObj<typeof meta> = {
  name: 'Agent unavailable',
  args: { configuration: unavailableConfiguration },
  render: function UnavailableAgentRender(args) {
    const [agents, setAgents] = useState(args.configuration.agents);
    const [agent, setAgent] = useState(args.configuration.agent);
    return (
      <View className="p-4">
        <ComposerAgentModelControl
          {...args}
          configuration={{
            ...args.configuration,
            agents,
            agent,
            configOptions:
              agents.find((entry) => entry.agent === agent)?.configOptions ??
              [],
            onAgentChange: setAgent,
            onAgentRetry: () => setAgents(newSessionCatalogs.bothAvailable),
          }}
        />
      </View>
    );
  },
};

import { newSessionCatalogs } from '@repo/api/mocks';
