import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  composerFastModeConfiguration,
  composerLongListConfiguration,
  composerUnlistedEffortConfigurations,
  composerUnavailableConfigurations,
} from '../../../../mocks/composer-mock';
import { updateComposerSettings } from '../../../../mocks/composer-settings-mock';
import { ComposerAgentModelControl } from './composer-configuration';

const configuration = composerUnlistedEffortConfigurations[0];
if (!configuration)
  throw new Error('Recorded catalog needs an Agent with effort.');
const meta = {
  title: 'Sessions/ComposerConfiguration',
  component: ComposerAgentModelControl,
  args: { configuration, disabled: false },
} satisfies Meta<typeof ComposerAgentModelControl>;
export default meta;

export const DefaultEffort: StoryObj<typeof meta> = {
  name: 'Default effort',
  render: function ConfigurationRender(args) {
    const [configOptions, setConfigOptions] = useState(
      args.configuration.configOptions,
    );
    return (
      <View className="p-4">
        <ComposerAgentModelControl
          {...args}
          configuration={{
            ...args.configuration,
            configOptions,
            onConfigChange: (configId, value) => {
              action('configuration changed')(configId, value);
              setConfigOptions((options) =>
                updateComposerSettings(options, configId, value),
              );
            },
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
  render: (args) => (
    <View className="p-4">
      <ComposerAgentModelControl
        {...args}
        configuration={{
          ...args.configuration,
          onAgentChange: action('Agent changed'),
          onAgentRetry: action('retry Agent'),
        }}
      />
    </View>
  ),
};

export const LongLists: StoryObj<typeof meta> = {
  name: 'Long Agent and model lists',
  args: { configuration: composerLongListConfiguration },
  render: DefaultEffort.render,
};

export const FastMode: StoryObj<typeof meta> = {
  name: 'Fast mode on',
  args: { configuration: composerFastModeConfiguration(true) },
  render: DefaultEffort.render,
};
