import { newSessionCatalogs } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { fn } from 'storybook/test';
import {
  composerFastModeConfiguration,
  composerLongListConfiguration,
  composerLongSettingsOptions,
  composerUnlistedEffortConfigurations,
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

// Fast mode and an Agent's other select options sit in Configure beside its model and effort.
export const OtherOptions: StoryObj<typeof meta> = {
  name: 'Other options',
  args: {
    configuration: {
      ...configuration,
      configOptions: [
        ...configuration.configOptions,
        ...composerLongSettingsOptions,
      ],
    },
  },
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

// Before Send the same Drill adds Agent selection; after Send its row is read-only.
export const NewSession: StoryObj<typeof meta> = {
  args: {
    configuration: {
      ...configuration,
      agentChoices: {
        agents: newSessionCatalogs.bothAvailable,
        onChange: fn(),
        onAdd: fn(),
      },
    },
  },
};

export const LoadingConfiguration: StoryObj<typeof meta> = {
  args: {
    configuration: {
      ...configuration,
      configOptions: [],
      opening: true,
      agentChoices: {
        agents: newSessionCatalogs.bothAvailable,
        onChange: fn(),
        onAdd: fn(),
      },
    },
  },
};
