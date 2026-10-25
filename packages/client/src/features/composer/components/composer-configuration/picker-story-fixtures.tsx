import type * as React from 'react';
import { View } from 'react-native';
import { composerUnlistedEffortConfigurations } from '../../../../../mocks/composer-mock';
import { ComposerAgentModelControl } from './composer-configuration';

const recorded = composerUnlistedEffortConfigurations[0];

if (!recorded) throw new Error('Recorded catalog needs a model picker.');

export const configuration = recorded;

// The recorded Agent's current model, as its radio is named.
export const currentModel = 'Opus 5.5';

// Another of its recorded models.
export const otherModel = 'Haiku 4.5';

export const agentModelLabel = 'Agent and model';

export const modelPickerLabel = 'Model';

export const pickerStoryMeta = {
  component: ComposerAgentModelControl,
  args: { configuration, disabled: false },
  render: (
    args: React.ComponentProps<typeof ComposerAgentModelControl>,
  ): React.JSX.Element => (
    <View className="p-4">
      <ComposerAgentModelControl {...args} />
    </View>
  ),
};
