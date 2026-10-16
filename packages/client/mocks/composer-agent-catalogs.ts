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
