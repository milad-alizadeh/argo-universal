import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  composerLongListConfiguration,
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
  render: (args) => (
    <View className="p-4">
      <ComposerAgentModelControl
        {...args}
        configuration={{
          ...args.configuration,
          onConfigChange: action('configuration changed'),
        }}
      />
    </View>
  ),
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
  render: NoEffortSelection.render,
};
