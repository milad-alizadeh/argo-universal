import type { AgentServer } from '@repo/contracts';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import type { ComposerProps } from '../src/features/composer/components/composer/composer';

export const composerLongAgentCatalog: AgentServer[] = Array.from(
  { length: 40 },
  (_, index) => {
    const agent = newSessionCatalogs.bothAvailable[0];

    if (!agent) throw new Error('Composer needs an available Agent mock.');

    return {
      ...agent,
      id: `development-agent-${index + 1}`,
      name: `Agent ${String(index + 1).padStart(2, '0')}`,
    };
  },
);

export const composerUnlistedEffortConfigurations =
  newSessionCatalogs.bothAvailable.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agents: newSessionCatalogs.bothAvailable,
      agent: agent.id,
      configOptions: recordedSessionOptions(agent.id).map((option) =>
        option.category === 'thought_level' && option.type === 'select'
          ? { ...option, currentValue: 'unsupported' }
          : option,
      ),
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );
