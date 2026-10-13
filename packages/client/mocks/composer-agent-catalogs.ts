import type { AgentInfo } from '@repo/contracts';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import type { ComposerProps } from '../src/features/composer/components/composer/composer';

export const composerLongAgentCatalog: AgentInfo[] = Array.from(
  { length: 40 },
  (_, index) => {
    const agent = newSessionCatalogs.bothAvailable[0];

    if (!agent) throw new Error('Composer needs an available Agent mock.');

    return {
      ...agent,
      agent: `development-agent-${index + 1}`,
      label: `Agent ${String(index + 1).padStart(2, '0')}`,
    };
  },
);

export const composerUnlistedEffortConfigurations =
  newSessionCatalogs.bothAvailable.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agents: newSessionCatalogs.bothAvailable,
      agent: agent.agent,
      configOptions: recordedSessionOptions(agent.agent).map((option) =>
        option.category === 'thought_level' && option.type === 'select'
          ? { ...option, currentValue: 'unsupported' }
          : option,
      ),
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );

export const composerUnavailableConfigurations =
  newSessionCatalogs.bothUnavailable.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agents: newSessionCatalogs.bothUnavailable,
      agent: agent.agent,
      configOptions: recordedSessionOptions(agent.agent),
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );
