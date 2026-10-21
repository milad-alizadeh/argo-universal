import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import type { ComposerProps } from '../src/features/composer/components/composer/composer';

export const composerUnlistedEffortConfigurations =
  newSessionCatalogs.bothAvailable.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agent,
      configOptions: recordedSessionOptions(agent.id).map((option) =>
        option.category === 'thought_level' && option.type === 'select'
          ? { ...option, currentValue: 'unsupported' }
          : option,
      ),
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );

const [firstUnlistedEffortConfiguration] = composerUnlistedEffortConfigurations;

if (!firstUnlistedEffortConfiguration)
  throw new Error('Recorded catalog needs an Agent with effort.');

// The first recorded Agent whose effort is set to a value its catalog does not list.
export const composerUnlistedEffortConfiguration =
  firstUnlistedEffortConfiguration;
