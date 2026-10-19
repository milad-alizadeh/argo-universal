import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { configurationChoices } from '#lib/product/session-configuration';
import { composerUnlistedEffortConfigurations } from '../../../../../mocks/composer-mock';
import { ComposerAgentModelControl } from './composer-configuration';

const recorded = composerUnlistedEffortConfigurations[0];

if (!recorded) throw new Error('Recorded catalog needs a model picker.');

export const configuration = recorded;

// The recorded current model's name, which its choice is announced by.
function recordedCurrentModel(): string {
  const model = configuration.configOptions.find(
    (option) => option.category === 'model',
  );

  if (model?.type !== 'select')
    throw new Error('Recorded catalog needs a model.');

  return currentChoiceName(model);
}

function currentChoiceName(
  model: Extract<SessionConfigOption, { type: 'select' }>,
): string {
  const current = configurationChoices(model).find(
    (choice) => choice.value === model.currentValue,
  );

  if (!current) throw new Error('Recorded model needs its current choice.');

  return current.name;
}

export const currentModel = recordedCurrentModel();

export const agentModelLabel = 'Agent and model';

export const modelPickerLabel = 'Select Model';

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
