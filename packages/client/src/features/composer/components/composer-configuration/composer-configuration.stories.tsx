import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { updateComposerSettings } from '../../../../../mocks/composer-mock';
import {
  ComposerAgentModelControl,
  type ComposerConfigurationProps,
} from './composer-configuration';
import {
  defaultEffortConfiguration,
  fastModeConfiguration,
  longListsConfiguration,
  newSessionConfiguration,
  openingConfiguration,
  otherOptionsConfiguration,
} from './composer-configuration-fixtures';

const meta = {
  title: 'Composer/ComposerConfiguration',
  component: ComposerAgentModelControl,
  args: defaultEffortConfiguration,
  argTypes: {
    configuration: { control: false },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * No story for a configuration with no Agent, no Agent choices and no model: the control draws
 * nothing at all.
 */

// An effort the Agent's own catalog does not list falls back to its default.
export const DefaultEffort: Story = {
  name: 'Default effort',
  args: defaultEffortConfiguration,
  render: function ConfigurationRender(args) {
    const configuration = useInteractiveConfiguration(args.configuration);

    return (
      <View className="p-4">
        <ComposerAgentModelControl {...args} configuration={configuration} />
      </View>
    );
  },
};

// Enough Agents and models that both lists scroll inside the picker.
export const LongLists: Story = {
  name: 'Long Agent and model lists',
  args: longListsConfiguration,
  render: DefaultEffort.render,
};

export const FastMode: Story = {
  name: 'Fast mode on',
  args: fastModeConfiguration,
  render: DefaultEffort.render,
};

/*
 * Fast mode and an Agent's other select options sit in Configure beside its model and effort, so
 * the closed trigger cannot show them: this story opens Configure.
 */
export const OtherOptions: Story = {
  name: 'Other options',
  args: otherOptionsConfiguration,
  render: DefaultEffort.render,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Agent and model' }),
    );
  },
};

// Before Send the same Drill adds Agent selection; after Send its row is read-only.
export const NewSession: Story = { args: newSessionConfiguration };

// The Session opens and takes this device's last choices, so its options are still loading.
export const LoadingConfiguration: Story = { args: openingConfiguration };

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
