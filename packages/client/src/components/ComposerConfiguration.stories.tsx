import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { composerNoEffortSelections } from '../../mocks/composer-mock';
import { ComposerAgentModelControl } from './ComposerConfiguration';

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
  name: 'ComposerConfiguration',
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
