import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  composerFastModeConfiguration,
  composerLongListConfiguration,
  composerUnlistedEffortConfigurations,
  composerCantStartConfigurations,
} from '../../../../../mocks/composer-mock';
import { updateComposerSettings } from '../../../../../mocks/composer-mock';
import {
  ComposerAgentModelControl,
  type ComposerConfigurationProps,
} from './composer-configuration';

const configuration = composerUnlistedEffortConfigurations[0];
if (!configuration)
  throw new Error('Recorded catalog needs an Agent with effort.');
const meta = {
  title: 'Composer/ComposerConfiguration',
  component: ComposerAgentModelControl,
  args: { configuration, disabled: false },
} satisfies Meta<typeof ComposerAgentModelControl>;
export default meta;

export const DefaultEffort: StoryObj<typeof meta> = {
  name: 'Default effort',
  render: function ConfigurationRender(args) {
    const configuration = useInteractiveConfiguration(args.configuration);
    return (
      <View className="p-4">
        <ComposerAgentModelControl {...args} configuration={configuration} />
      </View>
    );
  },
};

const cantStartConfiguration = composerCantStartConfigurations[0];
if (!cantStartConfiguration)
  throw new Error('Recorded catalog needs an Agent that can’t start');
export const CantStartAgent: StoryObj<typeof meta> = {
  name: 'Agent can’t start',
  args: { configuration: cantStartConfiguration },
  render: (args) => (
    <View className="p-4">
      <ComposerAgentModelControl
        {...args}
        configuration={{
          ...args.configuration,
          onAgentChange: action('Agent changed'),
          onAgentRetry: action('recheck Agent'),
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

function useInteractiveConfiguration(
  configuration: ComposerConfigurationProps,
): ComposerConfigurationProps {
  const [configOptions, setConfigOptions] = useState(
    configuration.configOptions,
  );
  const onConfigChange = configurationChanged(setConfigOptions);
  return { ...configuration, configOptions, onConfigChange };
}

type SetConfigOptions = Dispatch<
  SetStateAction<ComposerConfigurationProps['configOptions']>
>;
function configurationChanged(
  setConfigOptions: SetConfigOptions,
): ComposerConfigurationProps['onConfigChange'] {
  return (configId, value) => {
    action('configuration changed')(configId, value);
    setConfigOptions((options) =>
      updateComposerSettings(options, configId, value),
    );
  };
}
